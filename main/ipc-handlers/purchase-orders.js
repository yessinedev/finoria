// Purchase Orders IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-purchase-orders", async () => {
    try {
      const purchaseOrders = db
        .prepare(
          `
        SELECT po.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.taxId as clientTaxId, s.id as saleNumber
        FROM purchase_orders po
        JOIN clients c ON po.clientId = c.id
        JOIN sales s ON po.saleId = s.id
        ORDER BY po.orderDate DESC
      `
        )
        .all();
      
      // Add items to each purchase order
      const getItems = db.prepare(`
        SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?
      `);
      
      const purchaseOrdersWithItems = purchaseOrders.map(purchaseOrder => ({
        ...purchaseOrder,
        items: getItems.all(purchaseOrder.id)
      }));
      
      return purchaseOrdersWithItems;
    } catch (error) {
      console.error("Error getting purchase orders:", error);
      throw new Error("Erreur lors de la récupération des bons de commande: " + error.message);
    }
  });

  ipcMain.handle("create-purchase-order", async (event, purchaseOrder) => {
    try {
      // Generate a unique purchase order number
      const getLastPurchaseOrderNumber = db.prepare(`
        SELECT number FROM purchase_orders 
        WHERE number LIKE 'BC-' || strftime('%Y', 'now') || '-' || '%' 
        ORDER BY id DESC LIMIT 1
      `);
      
      let purchaseOrderNumber = "BC-" + new Date().getFullYear() + "-0001";
      const lastPurchaseOrder = getLastPurchaseOrderNumber.get();
      
      if (lastPurchaseOrder) {
        const lastNumber = parseInt(lastPurchaseOrder.number.split("-")[2]);
        purchaseOrderNumber = "BC-" + new Date().getFullYear() + "-" + 
                            String(lastNumber + 1).padStart(4, "0");
      }
      
      const insertPurchaseOrder = db.prepare(`
        INSERT INTO purchase_orders (number, saleId, clientId, amount, taxAmount, totalAmount, status, deliveryDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (purchaseOrderId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertPurchaseOrder.run(
        purchaseOrderNumber,
        purchaseOrder.saleId,
        purchaseOrder.clientId,
        purchaseOrder.amount,
        purchaseOrder.taxAmount,
        purchaseOrder.totalAmount,
        purchaseOrder.status,
        purchaseOrder.deliveryDate
      );
      
      const purchaseOrderId = result.lastInsertRowid;
      
      // Insert purchase order items
      for (const item of purchaseOrder.items) {
        insertItem.run(
          purchaseOrderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
      }
      
      const newPurchaseOrder = {
        id: purchaseOrderId,
        ...purchaseOrder,
        number: purchaseOrderNumber,
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("purchase-orders", "create", newPurchaseOrder);
      return newPurchaseOrder;
    } catch (error) {
      console.error("Error creating purchase order:", error);
      console.error("Purchase order data:", purchaseOrder);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Un bon de commande avec ce numéro existe déjà");
      }
      throw new Error("Erreur lors de la création du bon de commande: " + error.message);
    }
  });

  ipcMain.handle("update-purchase-order-status", async (event, id, status) => {
    try {
      // Get the current purchase order to check if we need to update stock
      const currentPurchaseOrder = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(id);
      
      // Update the purchase order status
      const stmt = db.prepare("UPDATE purchase_orders SET status = ? WHERE id = ?");
      stmt.run(status, id);
      
      // If the status is being changed to "Livrée" and wasn't already "Livrée", update the stock
      if (status === "Livrée" && currentPurchaseOrder.status !== "Livrée") {
        // Get purchase order items
        const items = db.prepare("SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?").all(id);
        
        // Update product stock for each item (add the quantity that was ordered)
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ? AND category != 'Service'
        `);
        
        // Create stock movement records for the addition
        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (
            productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          // Only update stock for non-service products
          updateStockStmt.run(item.quantity, item.productId);
          
          // Create stock movement record for the addition
          insertMovementStmt.run(
            item.productId,
            item.productName,
            item.quantity,
            'IN',
            'purchase_order',
            id,
            `PO-${id}`, 
            'Bon de commande livré'
          );
        }
      }
      
      notifyDataChange("purchase-orders", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      throw new Error("Erreur lors de la mise à jour du statut du bon de commande");
    }
  });
  
  ipcMain.handle("generate-purchase-order-from-sale", async (event, saleId, deliveryDate) => {
    try {
      // Get the sale with client information
      const sale = db.prepare(`
        SELECT s.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.taxId as clientTaxId
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        WHERE s.id = ?
      `).get(saleId);
      
      if (!sale) {
        throw new Error("Vente non trouvée");
      }
      
      // Get sale items
      const items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(saleId);
      
      // Generate a unique purchase order number
      const getLastPurchaseOrderNumber = db.prepare(`
        SELECT number FROM purchase_orders 
        WHERE number LIKE 'BC-' || strftime('%Y', 'now') || '-' || '%' 
        ORDER BY id DESC LIMIT 1
      `);
      
      let purchaseOrderNumber = "BC-" + new Date().getFullYear() + "-0001";
      const lastPurchaseOrder = getLastPurchaseOrderNumber.get();
      
      if (lastPurchaseOrder) {
        const lastNumber = parseInt(lastPurchaseOrder.number.split("-")[2]);
        purchaseOrderNumber = "BC-" + new Date().getFullYear() + "-" + 
                            String(lastNumber + 1).padStart(4, "0");
      }
      
      // Create the purchase order object
      const purchaseOrder = {
        number: purchaseOrderNumber,
        saleId: saleId,
        clientId: sale.clientId,
        amount: sale.totalAmount - sale.taxAmount,
        taxAmount: sale.taxAmount,
        totalAmount: sale.totalAmount,
        status: "En attente",
        deliveryDate: deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      // Insert the purchase order
      const insertPurchaseOrder = db.prepare(`
        INSERT INTO purchase_orders (number, saleId, clientId, amount, taxAmount, totalAmount, status, deliveryDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertPurchaseOrder.run(
        purchaseOrder.number,
        purchaseOrder.saleId,
        purchaseOrder.clientId,
        purchaseOrder.amount,
        purchaseOrder.taxAmount,
        purchaseOrder.totalAmount,
        purchaseOrder.status,
        purchaseOrder.deliveryDate
      );
      
      const purchaseOrderId = result.lastInsertRowid;
      
      // Insert purchase order items based on sale items
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (purchaseOrderId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        insertItem.run(
          purchaseOrderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
      }
      
      const newPurchaseOrder = {
        id: purchaseOrderId,
        ...purchaseOrder,
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: sale.clientName,
        clientCompany: sale.clientCompany,
        clientAddress: sale.clientAddress,
        clientTaxId: sale.clientTaxId,
        saleNumber: sale.number,
        items: items
      };
      
      notifyDataChange("purchase-orders", "create", newPurchaseOrder);
      
      return newPurchaseOrder;
    } catch (error) {
      console.error("Error generating purchase order from sale:", error);
      throw new Error("Erreur lors de la génération du bon de commande à partir de la vente");
    }
  });
  
  ipcMain.handle("get-purchase-order-items", async (event, purchaseOrderId) => {
    try {
      const items = db.prepare("SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?").all(purchaseOrderId);
      return items;
    } catch (error) {
      console.error("Error getting purchase order items:", error);
      throw new Error("Erreur lors de la récupération des articles du bon de commande");
    }
  });
};