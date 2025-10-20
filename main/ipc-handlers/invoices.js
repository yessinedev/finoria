// Invoices IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-invoices", async () => {
    try {
      const invoices = db
        .prepare(
          `
        SELECT i.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
        FROM invoices i
        JOIN clients c ON i.clientId = c.id
        ORDER BY i.issueDate DESC
      `
        )
        .all();
      
      // Add items to each invoice
      const getItems = db.prepare(`
        SELECT * FROM invoice_items WHERE invoiceId = ?
      `);
      
      const invoicesWithItems = invoices.map(invoice => ({
        ...invoice,
        items: getItems.all(invoice.id)
      }));
      
      return invoicesWithItems;
    } catch (error) {
      console.error("Error getting invoices:", error);
      throw new Error("Erreur lors de la récupération des factures");
    }
  });

  ipcMain.handle("create-invoice", async (event, invoice) => {
    try {
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (number, saleId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unitPrice, discount, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertInvoice.run(
        invoice.number,
        invoice.saleId,
        invoice.clientId,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate
      );
      
      const invoiceId = result.lastInsertRowid;
      
      // Get sale items and convert them to invoice items
      if (invoice.saleId) {
        const getSaleItems = db.prepare(`
          SELECT * FROM sale_items WHERE saleId = ?
        `);
        const saleItems = getSaleItems.all(invoice.saleId);
        
        // Insert sale items as invoice items
        for (const item of saleItems) {
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
      }
      
      const newInvoice = {
        id: invoiceId,
        ...invoice,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("invoices", "create", newInvoice);
      return newInvoice;
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Une facture avec ce numéro existe déjà");
      }
      throw new Error("Erreur lors de la création de la facture");
    }
  });

  ipcMain.handle("update-invoice-status", async (event, id, status) => {
    try {
      // Get the current invoice to check if it has an associated sale
      const currentInvoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
      
      const stmt = db.prepare("UPDATE invoices SET status = ? WHERE id = ?");
      stmt.run(status, id);
      
      // If the status is being changed to "Annulée" and there's an associated sale
      if (status === "Annulée" && currentInvoice.saleId) {
        try {
          // First check if sale exists
          const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(currentInvoice.saleId);
          if (sale) {
            // Only process stock return if sale is not already cancelled
            if (sale.status !== "Annulée") {
              // Get sale items
              const items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(currentInvoice.saleId);
              
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
                  'invoice_cancellation',
                  currentInvoice.saleId,
                  `SALE-${currentInvoice.saleId}`, 
                  'Vente annulée'
                );
              }
              
              // Update the associated sale status to "Annulée" to maintain referential integrity
              const updateSaleStmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
              updateSaleStmt.run("Annulée", currentInvoice.saleId);
              
              notifyDataChange("sales", "update", { id: currentInvoice.saleId, status: "Annulée" });
            }
          }
        } catch (error) {
          console.error("Error handling associated sale:", error);
          // We don't throw an error here because the invoice status update was successful
        }
      }
      
      notifyDataChange("invoices", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating invoice status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de facture");
    }
  });
  
  ipcMain.handle("generate-invoice-from-sale", async (event, saleId) => {
    try {
      // Get the sale with client information
      const sale = db.prepare(`
        SELECT s.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        WHERE s.id = ?
      `).get(saleId);
      
      if (!sale) {
        throw new Error("Vente non trouvée");
      }
      
      // Get sale items
      const items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(saleId);
      
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
        saleId: saleId,
        clientId: sale.clientId,
        amount: sale.totalAmount - sale.taxAmount,
        taxAmount: sale.taxAmount,
        totalAmount: sale.totalAmount,
        status: "En attente",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };
      
      // Insert the invoice
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (number, saleId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertInvoice.run(
        invoice.number,
        invoice.saleId,
        invoice.clientId,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate
      );
      
      const invoiceId = result.lastInsertRowid;
      
      // Insert invoice items based on sale items
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
      
      // Update the sale status to "Facturée"
      const updateSaleStmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
      updateSaleStmt.run("Facturée", saleId);
      
      const newInvoice = {
        id: invoiceId,
        ...invoice,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: sale.clientName,
        clientCompany: sale.clientCompany,
        clientAddress: sale.clientAddress,
        items: items
      };
      
      notifyDataChange("invoices", "create", newInvoice);
      notifyDataChange("sales", "update", { id: saleId, status: "Facturée" });
      
      return newInvoice;
    } catch (error) {
      console.error("Error generating invoice from sale:", error);
      throw new Error("Erreur lors de la génération de la facture à partir de la vente");
    }
  });
  
  ipcMain.handle("get-invoice-items", async (event, invoiceId) => {
    try {
      const items = db.prepare("SELECT * FROM invoice_items WHERE invoiceId = ?").all(invoiceId);
      return items;
    } catch (error) {
      console.error("Error getting invoice items:", error);
      throw new Error("Erreur lors de la récupération des articles de facture");
    }
  });
};