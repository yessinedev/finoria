//Quotes IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-quotes", async () => {
    try {
      const quotes = db
        .prepare("SELECT * FROM quotes ORDER BY createdAt DESC")
        .all();
      return quotes;
    } catch (error) {
      console.error("Error getting quotes:", error);
      throw new Error("Erreur lors de la récupération des devis");
    }
  });

  ipcMain.handle("create-quote", async (event, quote) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO quotes (clientId, totalAmount, taxAmount, status, createdAt) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(
        quote.clientId,
        quote.totalAmount,
        quote.taxAmount,
        quote.status || "En attente"
      );
      const newQuote = {
        id: result.lastInsertRowid,
        ...quote,
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("quotes", "create", newQuote);
      return newQuote;
    } catch (error) {
      console.error("Error creating quote:", error);
      throw new Error("Erreur lors de la création du devis");
    }
  });

  ipcMain.handle("update-quote", async (event, id, quote) => {
    try {
      const stmt = db.prepare(`
        UPDATE quotes 
        SET clientId = ?, totalAmount = ?, taxAmount = ?, status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        quote.clientId,
        quote.totalAmount,
        quote.taxAmount,
        quote.status,
        id
      );
      const updatedQuote = {
        id,
        ...quote,
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("quotes", "update", updatedQuote);
      return updatedQuote;
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
};
