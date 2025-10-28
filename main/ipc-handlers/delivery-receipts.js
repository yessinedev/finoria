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

  // Update a delivery receipt
  ipcMain.handle("update-delivery-receipt", async (event, id, deliveryReceipt) => {
    try {
      // Delete existing items first
      const deleteItems = db.prepare("DELETE FROM delivery_receipt_items WHERE deliveryReceiptId = ?");
      deleteItems.run(id);
      
      // Update delivery receipt
      const updateReceipt = db.prepare(`
        UPDATE delivery_receipts 
        SET driverName = ?, vehicleRegistration = ?, deliveryDate = ?
        WHERE id = ?
      `);
      updateReceipt.run(
        deliveryReceipt.driverName || null,
        deliveryReceipt.vehicleRegistration || null,
        deliveryReceipt.deliveryDate || new Date().toISOString(),
        id
      );
      
      // Insert new delivery receipt items
      const itemStmt = db.prepare(`
        INSERT INTO delivery_receipt_items (deliveryReceiptId, productId, productName, quantity, unitPrice) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      deliveryReceipt.items.forEach((item) => {
        itemStmt.run(
          id,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice
        );
      });
      
      // Get the updated delivery receipt with items
      const getReceipt = db.prepare(`
        SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany
        FROM delivery_receipts dr
        JOIN sales s ON dr.saleId = s.id
        JOIN clients c ON s.clientId = c.id
        WHERE dr.id = ?
      `).get(id);
      
      const getItems = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `).all(id);
      
      const updatedReceipt = {
        ...getReceipt,
        items: getItems
      };
      
      notifyDataChange("delivery-receipts", "update", updatedReceipt);
      return updatedReceipt;
    } catch (error) {
      console.error("Error updating delivery receipt:", error);
      throw new Error("Erreur lors de la mise à jour du bon de livraison");
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
        SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.phone as clientPhone, c.email as clientEmail, c.taxId as clientTaxId
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
      // First, check if there's any delivery receipt for this saleId
      const checkReceipt = db.prepare(`
        SELECT * FROM delivery_receipts WHERE saleId = ?
      `).get(saleId);
      
      if (!checkReceipt) {
        return null;
      }
      
      // Try to get the receipt with all joins
      let receipt;
      try {
        receipt = db.prepare(`
          SELECT dr.*, s.clientId, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.phone as clientPhone, c.email as clientEmail, c.taxId as clientTaxId
          FROM delivery_receipts dr
          JOIN sales s ON dr.saleId = s.id
          JOIN clients c ON s.clientId = c.id
          WHERE dr.saleId = ?
        `).get(saleId);
      } catch (joinError) {
        console.log("Join error for receipt:", joinError);
        // If joins fail, get basic receipt data
        receipt = db.prepare(`
          SELECT * FROM delivery_receipts WHERE saleId = ?
        `).get(saleId);
      }
      
      if (!receipt) {
        return null;
      }
      
      // Get items
      const items = db.prepare(`
        SELECT * FROM delivery_receipt_items WHERE deliveryReceiptId = ?
      `).all(receipt.id || receipt.ID); // Handle potential case sensitivity
      
      // Try to get the sale details
      let sale;
      try {
        sale = db.prepare(`
          SELECT s.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.phone as clientPhone, c.email as clientEmail, c.taxId as clientTaxId
          FROM sales s
          JOIN clients c ON s.clientId = c.id
          WHERE s.id = ?
        `).get(saleId);
      } catch (saleJoinError) {
        console.log("Join error for sale:", saleJoinError);
        // If joins fail, get basic sale data
        sale = db.prepare(`
          SELECT * FROM sales WHERE id = ?
        `).get(saleId);
      }
      
      if (!sale) {
        // Create a minimal sale object
        sale = {
          id: saleId,
          clientId: receipt.clientId || 0
        };
      }
      
      // Get sale items
      const saleItems = db.prepare(`
        SELECT * FROM sale_items WHERE saleId = ?
      `).all(saleId);
      
      // Ensure we have all required client information
      if (!sale.clientName && receipt.clientName) {
        sale.clientName = receipt.clientName;
      }
      if (!sale.clientCompany && receipt.clientCompany) {
        sale.clientCompany = receipt.clientCompany;
      }
      if (!sale.clientAddress && receipt.clientAddress) {
        sale.clientAddress = receipt.clientAddress;
      }
      if (!sale.clientPhone && receipt.clientPhone) {
        sale.clientPhone = receipt.clientPhone;
      }
      if (!sale.clientEmail && receipt.clientEmail) {
        sale.clientEmail = receipt.clientEmail;
      }
      
      // Ensure we have proper IDs for the receipt
      const receiptWithId = {
        ...receipt,
        id: receipt.id || receipt.ID || checkReceipt.id,
        items
      };
      
      // Ensure we have proper client information in the sale
      const saleWithClientInfo = {
        ...sale,
        items: saleItems,
        clientName: sale.clientName || receipt.clientName || '',
        clientCompany: sale.clientCompany || receipt.clientCompany || '',
        clientAddress: sale.clientAddress || receipt.clientAddress || '',
        clientPhone: sale.clientPhone || receipt.clientPhone || '',
        clientEmail: sale.clientEmail || receipt.clientEmail || '',
        clientTaxId: sale.clientTaxId || receipt.clientTaxId || ''
      };
      
      const result = {
        receipt: receiptWithId,
        sale: saleWithClientInfo
      };
      
      return result;
    } catch (error) {
      console.error("Error getting delivery receipt by sale:", error);
      throw new Error("Erreur lors de la récupération du bon de livraison: " + error.message);
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