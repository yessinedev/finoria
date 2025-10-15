// Payments IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // Client Payments CRUD
  ipcMain.handle("get-client-payments", async () => {
    try {
      const payments = db.prepare(`
        SELECT 
          cp.*,
          c.name as clientName,
          c.company as clientCompany,
          i.number as invoiceNumber
        FROM client_payments cp
        LEFT JOIN clients c ON cp.clientId = c.id
        LEFT JOIN invoices i ON cp.invoiceId = i.id
        ORDER BY cp.paymentDate DESC
      `).all();
      return payments;
    } catch (error) {
      console.error("Error getting client payments:", error);
      throw new Error("Erreur lors de la récupération des paiements clients");
    }
  });

  ipcMain.handle("create-client-payment", async (event, payment) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO client_payments (
          clientId, invoiceId, amount, paymentDate, paymentMethod, reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        payment.clientId,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.reference,
        payment.notes
      );
      
      const newPayment = {
        id: result.lastInsertRowid,
        ...payment,
        createdAt: new Date().toISOString(),
      };
      
      notifyDataChange("client_payments", "create", newPayment);
      return newPayment;
    } catch (error) {
      console.error("Error creating client payment:", error);
      throw new Error("Erreur lors de la création du paiement client");
    }
  });

  ipcMain.handle("update-client-payment", async (event, id, payment) => {
    try {
      const stmt = db.prepare(`
        UPDATE client_payments 
        SET clientId = ?, invoiceId = ?, amount = ?, paymentDate = ?, 
            paymentMethod = ?, reference = ?, notes = ?
        WHERE id = ?
      `);
      
      stmt.run(
        payment.clientId,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.reference,
        payment.notes,
        id
      );
      
      const updatedPayment = {
        id,
        ...payment,
        createdAt: new Date().toISOString(),
      };
      
      notifyDataChange("client_payments", "update", updatedPayment);
      return updatedPayment;
    } catch (error) {
      console.error("Error updating client payment:", error);
      throw new Error("Erreur lors de la mise à jour du paiement client");
    }
  });

  ipcMain.handle("delete-client-payment", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM client_payments WHERE id = ?");
      stmt.run(id);
      notifyDataChange("client_payments", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting client payment:", error);
      throw error;
    }
  });

  // Supplier Payments CRUD
  ipcMain.handle("get-supplier-payments", async () => {
    try {
      const payments = db.prepare(`
        SELECT 
          sp.*,
          s.name as supplierName,
          s.company as supplierCompany,
          si.invoiceNumber as invoiceNumber
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplierId = s.id
        LEFT JOIN supplier_invoices si ON sp.invoiceId = si.id
        ORDER BY sp.paymentDate DESC
      `).all();
      return payments;
    } catch (error) {
      console.error("Error getting supplier payments:", error);
      throw new Error("Erreur lors de la récupération des paiements fournisseurs");
    }
  });

  ipcMain.handle("create-supplier-payment", async (event, payment) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO supplier_payments (
          supplierId, invoiceId, amount, paymentDate, paymentMethod, reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        payment.supplierId,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.reference,
        payment.notes
      );
      
      const newPayment = {
        id: result.lastInsertRowid,
        ...payment,
        createdAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_payments", "create", newPayment);
      return newPayment;
    } catch (error) {
      console.error("Error creating supplier payment:", error);
      throw new Error("Erreur lors de la création du paiement fournisseur");
    }
  });

  ipcMain.handle("update-supplier-payment", async (event, id, payment) => {
    try {
      const stmt = db.prepare(`
        UPDATE supplier_payments 
        SET supplierId = ?, invoiceId = ?, amount = ?, paymentDate = ?, 
            paymentMethod = ?, reference = ?, notes = ?
        WHERE id = ?
      `);
      
      stmt.run(
        payment.supplierId,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.reference,
        payment.notes,
        id
      );
      
      const updatedPayment = {
        id,
        ...payment,
        createdAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_payments", "update", updatedPayment);
      return updatedPayment;
    } catch (error) {
      console.error("Error updating supplier payment:", error);
      throw new Error("Erreur lors de la mise à jour du paiement fournisseur");
    }
  });

  ipcMain.handle("delete-supplier-payment", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM supplier_payments WHERE id = ?");
      stmt.run(id);
      notifyDataChange("supplier_payments", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting supplier payment:", error);
      throw error;
    }
  });
};