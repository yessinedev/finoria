// Quote to Invoice conversion IPC handler
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("generate-invoice-from-quote", async (event, quoteId) => {
    try {
      // Get the quote with client information
      const quote = db.prepare(`
        SELECT q.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress, c.taxId as clientTaxId
        FROM quotes q
        JOIN clients c ON q.clientId = c.id
        WHERE q.id = ?
      `).get(quoteId);
      
      if (!quote) {
        throw new Error("Devis non trouvé");
      }
      
      // Get quote items
      const items = db.prepare("SELECT * FROM quote_items WHERE quoteId = ?").all(quoteId);
      
      // Generate a unique invoice number
      const getLastInvoiceNumber = db.prepare(`
        SELECT number FROM invoices 
        WHERE number LIKE 'FAC-' || strftime('%Y', 'now') || '-' || '%' 
        ORDER BY id DESC LIMIT 1
      `);
      
      let invoiceNumber = "FAC-" + new Date().getFullYear() + "-0001";
      const lastInvoice = getLastInvoiceNumber.get();
      
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.number.split("-")[2]);
        invoiceNumber = "FAC-" + new Date().getFullYear() + "-" + 
                       String(lastNumber + 1).padStart(4, "0");
      }
      
      // Create the invoice object
      const invoice = {
        number: invoiceNumber,
        quoteId: quoteId, // Store reference to the original quote
        clientId: quote.clientId,
        amount: quote.amount,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        status: "En attente",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };
      
      // Insert the invoice
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (number, quoteId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertInvoice.run(
        invoice.number,
        invoice.quoteId,
        invoice.clientId,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate
      );
      
      const invoiceId = result.lastInsertRowid;
      
      // Insert invoice items based on quote items
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        insertItem.run(
          invoiceId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
      }
      
      // Update the quote status to "Accepté" to indicate it has been converted
      const updateQuoteStmt = db.prepare("UPDATE quotes SET status = ? WHERE id = ?");
      updateQuoteStmt.run("Accepté", quoteId);
      
      const newInvoice = {
        id: invoiceId,
        ...invoice,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: quote.clientName,
        clientCompany: quote.clientCompany,
        clientAddress: quote.clientAddress,
        clientTaxId: quote.clientTaxId,
        items: items
      };
      
      notifyDataChange("invoices", "create", newInvoice);
      notifyDataChange("quotes", "update", { id: quoteId, status: "Accepté" });
      
      return newInvoice;
    } catch (error) {
      console.error("Error generating invoice from quote:", error);
      throw new Error("Erreur lors de la génération de la facture à partir du devis");
    }
  });
};