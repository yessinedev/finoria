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
      return invoices;
    } catch (error) {
      console.error("Error getting invoices:", error);
      throw new Error("Erreur lors de la récupération des factures");
    }
  });

  ipcMain.handle("create-invoice", async (event, invoice) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO invoices (number, saleId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        invoice.number,
        invoice.saleId,
        invoice.clientId,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate
      );
      const newInvoice = {
        id: result.lastInsertRowid,
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
};
