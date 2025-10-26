// Sales IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("create-sale", async (event, sale) => {
    const transaction = db.transaction((saleData) => {
      try {
        // Insert sale
        const saleStmt = db.prepare(`
          INSERT INTO sales (clientId, totalAmount, taxAmount, discountAmount, fodecAmount, status, saleDate) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const saleResult = saleStmt.run(
          saleData.clientId,
          saleData.totalAmount,
          saleData.taxAmount,
          saleData.discountAmount || 0,
          saleData.fodecAmount || 0, // New FODEC amount
          saleData.status || "Confirmé",
          saleData.saleDate || new Date().toISOString()
        );
        const saleId = saleResult.lastInsertRowid;
        
        // Insert sale items
        const itemStmt = db.prepare(`
          INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, discount, totalPrice) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Update product stock for non-service products
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET stock = stock - ? 
          WHERE id = ? AND category != 'Service'
        `);
        
        saleData.items.forEach((item) => {
          itemStmt.run(
            saleId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.totalPrice
          );
          
          // Only reduce stock for non-service products
          // Fix: Make sure we're reducing the correct quantity for each product
          updateStockStmt.run(item.quantity, item.productId);
        });
        return saleId;
      } catch (error) {
        console.error("Error in sale transaction:", error);
        throw error;
      }
    });
    try {
      const saleId = transaction(sale);
      const newSale = {
        id: saleId,
        ...sale,
        saleDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("sales", "create", newSale);
      return newSale;
    } catch (error) {
      console.error("Error creating sale:", error);
      throw new Error("Erreur lors de la création de la vente");
    }
  });

  ipcMain.handle("get-sales", async () => {
    try {
      const sales = db
        .prepare(
          `
        SELECT s.*, c.name as clientName, c.company as clientCompany
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        ORDER BY s.saleDate DESC
      `
        )
        .all();
      return sales;
    } catch (error) {
      console.error("Error getting sales:", error);
      throw new Error("Erreur lors de la récupération des ventes");
    }
  });

  ipcMain.handle("get-sales-with-items", async () => {
    try {
      const sales = db
        .prepare(
          `
        SELECT s.*, c.name as clientName, c.company as clientCompany, c.email as clientEmail, c.phone as clientPhone, c.address as clientAddress, c.taxId as clientTaxId
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        ORDER BY s.saleDate DESC
      `
        )
        .all();
      
      // Add items to each sale
      const getItems = db.prepare(`
        SELECT * FROM sale_items WHERE saleId = ?
      `);
      
      const salesWithItems = sales.map(sale => ({
        ...sale,
        items: getItems.all(sale.id)
      }));
      
      return salesWithItems;
    } catch (error) {
      console.error("Error getting sales with items:", error);
      throw new Error("Erreur lors de la récupération des ventes avec articles");
    }
  });

  ipcMain.handle("get-sale-items", async (event, saleId) => {
    try {
      const items = db
        .prepare("SELECT * FROM sale_items WHERE saleId = ?")
        .all(saleId);
      return items;
    } catch (error) {
      console.error("Error getting sale items:", error);
      throw new Error("Erreur lors de la récupération des articles de vente");
    }
  });

  ipcMain.handle("update-sale-status", async (event, id, status) => {
    try {
      // Get the current sale to check if we need to return stock
      const currentSale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
      
      // Update the sale status
      const stmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
      stmt.run(status, id);
      
      // If the status is being changed to "Annulée" and wasn't already "Annulée", return the stock
      if (status === "Annulée" && currentSale.status !== "Annulée") {
        // Get sale items
        const items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(id);
        
        // Return stock for each item (add back the quantity that was deducted)
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ? AND category != 'Service'
        `);
        
        // Create stock movement records for the return
        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (
            productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          // Only return stock for non-service products
          updateStockStmt.run(item.quantity, item.productId);
          
          // Create stock movement record for the return
          insertMovementStmt.run(
            item.productId,
            item.productName,
            item.quantity,
            'IN',
            'sale_cancellation',
            id,
            `SALE-${id}`, 
            'Vente annulée'
          );
        }
      }
      
      notifyDataChange("sales", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating sale status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de vente");
    }
  });

  ipcMain.handle("delete-sale", async (event, id) => {
    try {
      // First check if sale exists and get its status
      const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
      if (!sale) {
        throw new Error("Vente non trouvée");
      }

      // If sale is not already cancelled, we should cancel it first to return stock
      if (sale.status !== "Annulée") {
        // Get sale items
        const items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(id);
        
        // Return stock for each item (add back the quantity that was deducted)
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ? AND category != 'Service'
        `);
        
        // Create stock movement records for the return
        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (
            productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          // Only return stock for non-service products
          updateStockStmt.run(item.quantity, item.productId);
          
          // Create stock movement record for the return
          insertMovementStmt.run(
            item.productId,
            item.productName,
            item.quantity,
            'IN',
            'sale_cancellation',
            id,
            `SALE-${id}`, 
            'Vente annulée'
          );
        }
      }

      // Delete sale items first (due to foreign key constraint)
      const deleteItems = db.prepare("DELETE FROM sale_items WHERE saleId = ?");
      deleteItems.run(id);
      
      // Delete the sale
      const deleteSale = db.prepare("DELETE FROM sales WHERE id = ?");
      deleteSale.run(id);
      
      notifyDataChange("sales", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting sale:", error);
      throw new Error("Erreur lors de la suppression de la vente");
    }
  });
};