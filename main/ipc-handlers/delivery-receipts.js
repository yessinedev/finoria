// Delivery Receipts IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // Create a delivery receipt
  ipcMain.handle("create-delivery-receipt", async (event, deliveryReceipt) => {
    const transaction = db.transaction((receiptData) => {
      try {
        // Insert delivery receipt
        const receiptStmt = db.prepare(`
          INSERT INTO delivery_receipts (saleId, deliveryNumber, driverName, vehicleRegistration, deliveryDate) 
          VALUES (?, ?, ?, ?, ?)
        `);
        const receiptResult = receiptStmt.run(
          receiptData.saleId,
          receiptData.deliveryNumber,
          receiptData.driverName || null,
          receiptData.vehicleRegistration || null,
          receiptData.deliveryDate || new Date().toISOString()
        );
        const receiptId = receiptResult.lastInsertRowid;
        
        // Insert delivery receipt items
        const itemStmt = db.prepare(`
          INSERT INTO delivery_receipt_items (deliveryReceiptId, productId, productName, quantity, unitPrice) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        receiptData.items.forEach((item) => {
          itemStmt.run(
            receiptId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice
          );
        });
        
        return receiptId;
      } catch (error) {
        console.error("Error in delivery receipt transaction:", error);
        throw error;
      }
    });
    
    try {
      const receiptId = transaction(deliveryReceipt);
      
      // Get the created delivery receipt with items
      const getReceipt = db.prepare(`
        SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany
        FROM delivery_receipts dr
        JOIN sales s ON dr.saleId = s.id
        JOIN clients c ON s.clientId = c.id
        WHERE dr.id = ?
      `).get(receiptId);
      
      const getItems = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `).all(receiptId);
      
      const newReceipt = {
        id: receiptId,
        ...deliveryReceipt,
        deliveryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: getItems
      };
      
      notifyDataChange("delivery-receipts", "create", newReceipt);
      return newReceipt;
    } catch (error) {
      console.error("Error creating delivery receipt:", error);
      throw new Error("Erreur lors de la création du bon de livraison");
    }
  });

  // Get all delivery receipts
  ipcMain.handle("get-delivery-receipts", async () => {
    try {
      const receipts = db
        .prepare(
          `
        SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany
        FROM delivery_receipts dr
        JOIN sales s ON dr.saleId = s.id
        JOIN clients c ON s.clientId = c.id
        ORDER BY dr.deliveryDate DESC
      `
        )
        .all();
      
      // Add items to each receipt
      const getItems = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `);
      
      const receiptsWithItems = receipts.map(receipt => ({
        ...receipt,
        items: getItems.all(receipt.id)
      }));
      
      return receiptsWithItems;
    } catch (error) {
      console.error("Error getting delivery receipts:", error);
      throw new Error("Erreur lors de la récupération des bons de livraison");
    }
  });

  // Get delivery receipt by ID
  ipcMain.handle("get-delivery-receipt", async (event, id) => {
    try {
      const receipt = db.prepare(`
        SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.phone as clientPhone
        FROM delivery_receipts dr
        JOIN sales s ON dr.saleId = s.id
        JOIN clients c ON s.clientId = c.id
        WHERE dr.id = ?
      `).get(id);
      
      if (!receipt) {
        throw new Error("Bon de livraison non trouvé");
      }
      
      // Get items
      const items = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `).all(id);
      
      return {
        ...receipt,
        items
      };
    } catch (error) {
      console.error("Error getting delivery receipt:", error);
      throw new Error("Erreur lors de la récupération du bon de livraison");
    }
  });

  // Get delivery receipt by sale ID
  ipcMain.handle("get-delivery-receipt-by-sale", async (event, saleId) => {
    try {
      const receipt = db.prepare(`
        SELECT * FROM delivery_receipts WHERE saleId = ?
      `).get(saleId);
      
      if (!receipt) {
        return null;
      }
      
      // Get items
      const items = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `).all(receipt.id);
      
      return {
        ...receipt,
        items
      };
    } catch (error) {
      console.error("Error getting delivery receipt by sale:", error);
      throw new Error("Erreur lors de la récupération du bon de livraison");
    }
  });

  // Delete delivery receipt
  ipcMain.handle("delete-delivery-receipt", async (event, id) => {
    try {
      // Delete delivery receipt items first (due to foreign key constraint)
      const deleteItems = db.prepare("DELETE FROM delivery_receipt_items WHERE deliveryReceiptId = ?");
      deleteItems.run(id);
      
      // Delete the delivery receipt
      const deleteReceipt = db.prepare("DELETE FROM delivery_receipts WHERE id = ?");
      const result = deleteReceipt.run(id);
      
      if (result.changes === 0) {
        throw new Error("Bon de livraison non trouvé");
      }
      
      notifyDataChange("delivery-receipts", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting delivery receipt:", error);
      throw new Error("Erreur lors de la suppression du bon de livraison");
    }
  });
};