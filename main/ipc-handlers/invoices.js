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
        INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unitPrice, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?)
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
      const stmt = db.prepare("UPDATE invoices SET status = ? WHERE id = ?");
      stmt.run(status, id);
      notifyDataChange("invoices", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating invoice status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de facture");
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
