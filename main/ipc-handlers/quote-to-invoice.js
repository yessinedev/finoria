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
      
      // Create a sale record with the same items as the quote
      const saleStmt = db.prepare(`
        INSERT INTO sales (clientId, totalAmount, taxAmount, discountAmount, saleDate) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      // Calculate discount amount from quote items
      const discountAmount = items.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity * item.discount / 100);
      }, 0);
      
      const saleResult = saleStmt.run(
        quote.clientId,
        quote.amount,
        quote.taxAmount,
        discountAmount,
        new Date().toISOString()
      );
      
      const saleId = saleResult.lastInsertRowid;
      
      // Insert sale items based on quote items
      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Prepare statement to get product TVA rate
      const getProductTva = db.prepare(`
        SELECT t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        WHERE p.id = ?
      `);
      
      // Update product stock for non-service products
      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET stock = stock - ? 
        WHERE id = ? AND category != 'Service'
      `);
      
      // Calculate total tax amount for the sale based on individual product TVA rates
      let totalTaxAmount = 0;
      
      for (const item of items) {
        insertSaleItem.run(
          saleId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
        
        // Get product TVA rate and calculate tax for this item
        const productTva = getProductTva.get(item.productId);
        const itemTvaRate = productTva?.tvaRate || 0; // Default to 0 if no TVA rate
        const itemTaxAmount = (item.totalPrice * itemTvaRate / 100);
        totalTaxAmount += itemTaxAmount;
        
        // Only reduce stock for non-service products
        updateStockStmt.run(item.quantity, item.productId);
      }
      
      // Update the sale with the calculated tax amount
      const updateTaxStmt = db.prepare(`
        UPDATE sales 
        SET taxAmount = ? 
        WHERE id = ?
      `);
      updateTaxStmt.run(totalTaxAmount, saleId);
      
      // Create the invoice object referencing the newly created sale
      const invoice = {
        number: invoiceNumber,
        saleId: saleId, // Reference to the newly created sale
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
        INSERT INTO invoices (number, saleId, quoteId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertInvoice.run(
        invoice.number,
        invoice.saleId,
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
      notifyDataChange("sales", "create", { 
        id: saleId, 
        clientId: quote.clientId,
        totalAmount: quote.amount,
        taxAmount: totalTaxAmount,
        discountAmount: discountAmount,
        saleDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: quote.clientName,
        clientCompany: quote.clientCompany
      });
      
      return newInvoice;
    } catch (error) {
      console.error("Error generating invoice from quote:", error);
      throw new Error("Erreur lors de la génération de la facture à partir du devis");
    }
  });
};