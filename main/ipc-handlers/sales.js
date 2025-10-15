// Sales IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("create-sale", async (event, sale) => {
    const transaction = db.transaction((saleData) => {
      try {
        // Insert sale
        const saleStmt = db.prepare(`
          INSERT INTO sales (clientId, totalAmount, taxAmount, discountAmount, status, saleDate) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const saleResult = saleStmt.run(
          saleData.clientId,
          saleData.totalAmount,
          saleData.taxAmount,
          saleData.discountAmount || 0,
          saleData.status || "En attente",
          saleData.saleDate || new Date().toISOString()
        );
        const saleId = saleResult.lastInsertRowid;
        
        // Insert sale items
        const itemStmt = db.prepare(`
          INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, totalPrice) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        saleData.items.forEach((item) => {
          itemStmt.run(
            saleId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.totalPrice
          );
        });
        return saleId;
      } catch (error) {
        console.error("Error in sale transaction:", error);
        throw error;
      }
    });
    try {
      const saleId = transaction(sale);
      const newSale = {
        id: saleId,
        ...sale,
        saleDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notifyDataChange("sales", "create", newSale);
      return newSale;
    } catch (error) {
      console.error("Error creating sale:", error);
      throw new Error("Erreur lors de la création de la vente");
    }
  });

  ipcMain.handle("get-sales", async () => {
    try {
      const sales = db
        .prepare(
          `
        SELECT s.*, c.name as clientName, c.company as clientCompany
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        ORDER BY s.saleDate DESC
      `
        )
        .all();
      return sales;
    } catch (error) {
      console.error("Error getting sales:", error);
      throw new Error("Erreur lors de la récupération des ventes");
    }
  });

  ipcMain.handle("get-sale-items", async (event, saleId) => {
    try {
      const items = db
        .prepare("SELECT * FROM sale_items WHERE saleId = ?")
        .all(saleId);
      return items;
    } catch (error) {
      console.error("Error getting sale items:", error);
      throw new Error("Erreur lors de la récupération des articles de vente");
    }
  });

  ipcMain.handle("update-sale-status", async (event, id, status) => {
    try {
      const stmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
      stmt.run(status, id);
      notifyDataChange("sales", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating sale status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de vente");
    }
  });
};
