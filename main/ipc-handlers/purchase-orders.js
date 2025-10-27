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
        INSERT INTO purchase_orders (number, saleId, clientId, amount, taxAmount, totalAmount, deliveryDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (purchaseOrderId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Calculate total tax amount for the purchase order based on individual product TVA rates
      let totalTaxAmount = 0;
      const getProductTva = db.prepare(`
        SELECT t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        WHERE p.id = ?
      `);
      
      for (const item of purchaseOrder.items) {
        const productTva = getProductTva.get(item.productId);
        const itemTvaRate = productTva?.tvaRate || 0; // Default to 0 if no TVA rate
        const itemTaxAmount = (item.totalPrice * itemTvaRate / 100);
        totalTaxAmount += itemTaxAmount;
      }
      
      const result = insertPurchaseOrder.run(
        purchaseOrderNumber,
        purchaseOrder.saleId,
        purchaseOrder.clientId,
        purchaseOrder.amount,
        totalTaxAmount,
        purchaseOrder.totalAmount,
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

  // Removed update-purchase-order-status handler
  
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
      
      // Calculate total tax amount for the purchase order based on individual product TVA rates
      let totalTaxAmount = 0;
      const getProductTva = db.prepare(`
        SELECT t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        WHERE p.id = ?
      `);
      
      for (const item of items) {
        const productTva = getProductTva.get(item.productId);
        const itemTvaRate = productTva?.tvaRate || 0; // Default to 0 if no TVA rate
        const itemTaxAmount = (item.totalPrice * itemTvaRate / 100);
        totalTaxAmount += itemTaxAmount;
      }
      
      // Create the purchase order object
      const purchaseOrder = {
        number: purchaseOrderNumber,
        saleId: saleId,
        clientId: sale.clientId,
        amount: sale.totalAmount - totalTaxAmount,
        taxAmount: totalTaxAmount,
        totalAmount: sale.totalAmount,
        deliveryDate: deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      // Insert the purchase order
      const insertPurchaseOrder = db.prepare(`
        INSERT INTO purchase_orders (number, saleId, clientId, amount, taxAmount, totalAmount, deliveryDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertPurchaseOrder.run(
        purchaseOrder.number,
        purchaseOrder.saleId,
        purchaseOrder.clientId,
        purchaseOrder.amount,
        purchaseOrder.taxAmount,
        purchaseOrder.totalAmount,
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