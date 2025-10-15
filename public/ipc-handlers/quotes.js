//Quotes IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-quotes", async () => {
    try {
      // Get all quotes
      const quotes = db
        .prepare(
          `
        SELECT q.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
        FROM quotes q
        JOIN clients c ON q.clientId = c.id
        ORDER BY q.createdAt DESC
      `
        )
        .all();
      
      // For each quote, get its items
      for (const quote of quotes) {
        const items = db
          .prepare("SELECT * FROM quote_items WHERE quoteId = ? ORDER BY id")
          .all(quote.id);
        quote.items = items;
      }
      
      return quotes;
    } catch (error) {
      console.error("Error getting quotes:", error);
      throw new Error("Erreur lors de la récupération des devis");
    }
  });

  // Function to generate a unique quote number
  function generateQuoteNumber(db) {
    // Get the current year
    const year = new Date().getFullYear();
    
    // Find the highest quote number for this year
    const lastQuote = db
      .prepare("SELECT number FROM quotes WHERE number LIKE ? ORDER BY number DESC LIMIT 1")
      .get(`DEV-${year}-%`);
    
    let nextNumber = 1;
    if (lastQuote) {
      // Extract the sequence number from the last quote
      const lastSequence = parseInt(lastQuote.number.split('-')[2]);
      if (!isNaN(lastSequence)) {
        nextNumber = lastSequence + 1;
      }
    }
    
    // Format: DEV-YYYY-NNN (e.g., DEV-2025-001)
    return `DEV-${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  ipcMain.handle("create-quote", async (event, quote) => {
    const trx = db.transaction(() => {
      try {
        // Generate quote number if not provided
        const quoteNumber = quote.number || generateQuoteNumber(db);
        
        const stmt = db.prepare(`
          INSERT INTO quotes (number, clientId, amount, taxAmount, totalAmount, status, issueDate, dueDate, createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        const result = stmt.run(
          quoteNumber,
          quote.clientId,
          quote.amount,
          quote.taxAmount,
          quote.totalAmount,
          quote.status || "En attente",
          quote.issueDate || new Date().toISOString(),
          quote.dueDate
        );
        
        const quoteId = result.lastInsertRowid;
        
        // Insert quote items if provided
        if (quote.items && Array.isArray(quote.items) && quote.items.length > 0) {
          const itemStmt = db.prepare(`
            INSERT INTO quote_items (quoteId, productId, productName, quantity, unitPrice, discount, totalPrice)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const item of quote.items) {
            itemStmt.run(
              quoteId,
              item.productId,
              item.name || item.productName,
              item.quantity,
              item.unitPrice,
              item.discount || 0,
              item.total || item.totalPrice
            );
          }
        }
        
        const newQuote = {
          id: quoteId,
          number: quoteNumber,
          ...quote,
          createdAt: new Date().toISOString(),
        };
        notifyDataChange("quotes", "create", newQuote);
        return newQuote;
      } catch (error) {
        console.error("Error in transaction:", error);
        throw error;
      }
    });
    
    try {
      return trx();
    } catch (error) {
      console.error("Error creating quote:", error);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Un devis avec ce numéro existe déjà");
      }
      throw new Error("Erreur lors de la création du devis");
    }
  });

  ipcMain.handle("update-quote", async (event, id, quote) => {
    const trx = db.transaction(() => {
      try {
        const stmt = db.prepare(`
          UPDATE quotes 
          SET clientId = ?, amount = ?, taxAmount = ?, totalAmount = ?, status = ?, issueDate = ?, dueDate = ?, updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        const result = stmt.run(
          quote.clientId,
          quote.amount,
          quote.taxAmount,
          quote.totalAmount,
          quote.status,
          quote.issueDate,
          quote.dueDate,
          id
        );
        
        // Delete existing quote items
        const deleteItemsStmt = db.prepare("DELETE FROM quote_items WHERE quoteId = ?");
        deleteItemsStmt.run(id);
        
        // Insert new quote items if provided
        if (quote.items && Array.isArray(quote.items) && quote.items.length > 0) {
          const itemStmt = db.prepare(`
            INSERT INTO quote_items (quoteId, productId, productName, quantity, unitPrice, discount, totalPrice)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const item of quote.items) {
            itemStmt.run(
              id,
              item.productId,
              item.name || item.productName,
              item.quantity,
              item.unitPrice,
              item.discount || 0,
              item.total || item.totalPrice
            );
          }
        }
        
        // Verify the update was successful by fetching the updated record
        const updatedQuote = db
          .prepare("SELECT * FROM quotes WHERE id = ?")
          .get(id);
          
        if (!updatedQuote) {
          throw new Error("Quote not found after update");
        }
        
        notifyDataChange("quotes", "update", updatedQuote);
        return updatedQuote;
      } catch (error) {
        console.error("Error in transaction:", error);
        throw error;
      }
    });
    
    try {
      return trx();
    } catch (error) {
      console.error("Error updating quote:", error);
      throw new Error("Erreur lors de la mise à jour du devis");
    }
  });

  ipcMain.handle("delete-quote", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM quotes WHERE id = ?");
      stmt.run(id);
      notifyDataChange("quotes", "delete", { id });
      return { id };
    } catch (error) {
      console.error("Error deleting quote:", error);
      throw new Error("Erreur lors de la suppression du devis");
    }
  });
  
  // Get quote items for a specific quote
  ipcMain.handle("get-quote-items", async (event, quoteId) => {
    try {
      const items = db
        .prepare("SELECT * FROM quote_items WHERE quoteId = ? ORDER BY id")
        .all(quoteId);
      return items;
    } catch (error) {
      console.error("Error getting quote items:", error);
      throw new Error("Erreur lors de la récupération des articles du devis");
    }
  });
};