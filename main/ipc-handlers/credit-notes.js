// Credit Notes IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-credit-notes", async () => {
    try {
      const creditNotes = db
        .prepare(
          `
        SELECT cn.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.taxId as clientTaxId, i.number as originalInvoiceNumber
        FROM credit_notes cn
        JOIN clients c ON cn.clientId = c.id
        JOIN invoices i ON cn.originalInvoiceId = i.id
        ORDER BY cn.issueDate DESC
      `
        )
        .all();
      
      // Add items to each credit note
      const getItems = db.prepare(`
        SELECT * FROM credit_note_items WHERE creditNoteId = ?
      `);
      
      const creditNotesWithItems = creditNotes.map(creditNote => ({
        ...creditNote,
        items: getItems.all(creditNote.id)
      }));
      
      return creditNotesWithItems;
    } catch (error) {
      console.error("Error getting credit notes:", error);
      throw new Error("Erreur lors de la récupération des factures d'avoir");
    }
  });

  ipcMain.handle("create-credit-note", async (event, creditNote) => {
    try {
      console.log("Creating credit note with data:", creditNote);
      
      // Generate a unique credit note number
      const getLastCreditNoteNumber = db.prepare(`
        SELECT number FROM credit_notes 
        WHERE number LIKE 'AV-' || strftime('%Y', 'now') || '-' || '%' 
        ORDER BY id DESC LIMIT 1
      `);
      
      let creditNoteNumber = "AV-" + new Date().getFullYear() + "-0001";
      const lastCreditNote = getLastCreditNoteNumber.get();
      
      if (lastCreditNote) {
        const lastNumber = parseInt(lastCreditNote.number.split("-")[2]);
        creditNoteNumber = "AV-" + new Date().getFullYear() + "-" + 
                          String(lastNumber + 1).padStart(4, "0");
      }
      
      const insertCreditNote = db.prepare(`
        INSERT INTO credit_notes (number, originalInvoiceId, clientId, amount, taxAmount, totalAmount, reason, status, dueDate, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO credit_note_items (creditNoteId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Calculate total tax amount for the credit note based on individual product TVA rates
      let totalTaxAmount = 0;
      const getProductTva = db.prepare(`
        SELECT t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        WHERE p.id = ?
      `);
      
      for (const item of creditNote.items) {
        const productTva = getProductTva.get(item.productId);
        const itemTvaRate = productTva?.tvaRate || 0; // Default to 0 if no TVA rate
        const itemTaxAmount = (item.totalPrice * itemTvaRate / 100);
        totalTaxAmount += itemTaxAmount;
      }
      
      const result = insertCreditNote.run(
        creditNoteNumber,
        creditNote.originalInvoiceId,
        creditNote.clientId,
        creditNote.amount,
        totalTaxAmount,
        creditNote.totalAmount,
        creditNote.reason,
        creditNote.status,
        creditNote.dueDate
      );
      
      const creditNoteId = result.lastInsertRowid;
      console.log("Created credit note with ID:", creditNoteId);
      
      // Insert credit note items
      for (const item of creditNote.items) {
        console.log("Inserting item:", item);
        insertItem.run(
          creditNoteId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
      }
      
      const newCreditNote = {
        id: creditNoteId,
        ...creditNote,
        number: creditNoteNumber,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("credit-notes", "create", newCreditNote);
      return newCreditNote;
    } catch (error) {
      console.error("Error creating credit note:", error);
      console.error("Credit note data:", creditNote);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Une facture d'avoir avec ce numéro existe déjà");
      }
      throw new Error("Erreur lors de la création de la facture d'avoir: " + error.message);
    }
  });

  ipcMain.handle("update-credit-note-status", async (event, id, status) => {
    try {
      // Get the current credit note to check if we need to return stock
      const currentCreditNote = db.prepare("SELECT * FROM credit_notes WHERE id = ?").get(id);
      
      // Update the credit note status
      const stmt = db.prepare("UPDATE credit_notes SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
      const result = stmt.run(status, id);
      
      // Check if any rows were affected
      if (result.changes === 0) {
        throw new Error("Facture d'avoir non trouvée ou statut déjà mis à jour");
      }
      
      // If the status is being changed to "Confirmée" and wasn't already "Confirmée", return the stock
      if (status === "Confirmée" && currentCreditNote.status !== "Confirmée") {
        // Get credit note items
        const items = db.prepare("SELECT * FROM credit_note_items WHERE creditNoteId = ?").all(id);
        
        // Return stock for each item (add back the quantity that was credited)
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
            'credit_note',
            id,
            `CREDIT-${id}`, 
            'Retour de marchandise'
          );
        }
      }
      
      const updatedCreditNote = {
        id,
        status,
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("credit-notes", "update", updatedCreditNote);
      return updatedCreditNote;
    } catch (error) {
      console.error("Error updating credit note status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de la facture d'avoir: " + error.message);
    }
  });
  
  ipcMain.handle("generate-credit-note-from-invoice", async (event, invoiceId, reason) => {
    try {
      // Get the invoice with client information
      const invoice = db.prepare(`
        SELECT i.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.taxId as clientTaxId
        FROM invoices i
        JOIN clients c ON i.clientId = c.id
        WHERE i.id = ?
      `).get(invoiceId);
      
      if (!invoice) {
        throw new Error("Facture non trouvée");
      }
      
      // Get invoice items
      const items = db.prepare("SELECT * FROM invoice_items WHERE invoiceId = ?").all(invoiceId);
      
      // Generate a unique credit note number
      const getLastCreditNoteNumber = db.prepare(`
        SELECT number FROM credit_notes 
        WHERE number LIKE 'AV-' || strftime('%Y', 'now') || '-' || '%' 
        ORDER BY id DESC LIMIT 1
      `);
      
      let creditNoteNumber = "AV-" + new Date().getFullYear() + "-0001";
      const lastCreditNote = getLastCreditNoteNumber.get();
      
      if (lastCreditNote) {
        const lastNumber = parseInt(lastCreditNote.number.split("-")[2]);
        creditNoteNumber = "AV-" + new Date().getFullYear() + "-" + 
                          String(lastNumber + 1).padStart(4, "0");
      }
      
      // Calculate total tax amount for the credit note based on individual product TVA rates
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
      
      // Create the credit note object
      const creditNote = {
        number: creditNoteNumber,
        originalInvoiceId: invoiceId,
        clientId: invoice.clientId,
        amount: invoice.amount,
        taxAmount: totalTaxAmount,
        totalAmount: invoice.totalAmount,
        reason: reason,
        status: "En attente",
        dueDate: new Date().toISOString() // Credit notes are typically due immediately
      };
      
      // Insert the credit note
      const insertCreditNote = db.prepare(`
        INSERT INTO credit_notes (number, originalInvoiceId, clientId, amount, taxAmount, totalAmount, reason, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertCreditNote.run(
        creditNote.number,
        creditNote.originalInvoiceId,
        creditNote.clientId,
        creditNote.amount,
        creditNote.taxAmount,
        creditNote.totalAmount,
        creditNote.reason,
        creditNote.status,
        creditNote.dueDate
      );
      
      const creditNoteId = result.lastInsertRowid;
      
      // Insert credit note items based on invoice items
      const insertItem = db.prepare(`
        INSERT INTO credit_note_items (creditNoteId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        insertItem.run(
          creditNoteId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
      }
      
      const newCreditNote = {
        id: creditNoteId,
        ...creditNote,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: invoice.clientName,
        clientCompany: invoice.clientCompany,
        clientAddress: invoice.clientAddress,
        clientTaxId: invoice.clientTaxId,
        originalInvoiceNumber: invoice.number,
        items: items
      };
      
      notifyDataChange("credit-notes", "create", newCreditNote);
      
      return newCreditNote;
    } catch (error) {
      console.error("Error generating credit note from invoice:", error);
      throw new Error("Erreur lors de la génération de la facture d'avoir à partir de la facture");
    }
  });
  
  ipcMain.handle("get-credit-note-items", async (event, creditNoteId) => {
    try {
      const items = db.prepare("SELECT * FROM credit_note_items WHERE creditNoteId = ?").all(creditNoteId);
      return items;
    } catch (error) {
      console.error("Error getting credit note items:", error);
      throw new Error("Erreur lors de la récupération des articles de la facture d'avoir");
    }
  });
};