// TVA IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // Get all TVA rates
  ipcMain.handle("get-tva-rates", async () => {
    try {
      const tvaRates = db
        .prepare("SELECT * FROM tva ORDER BY rate")
        .all();
      return tvaRates;
    } catch (error) {
      console.error("Error getting TVA rates:", error);
      throw new Error("Erreur lors de la récupération des taux de TVA");
    }
  });

  // Create a new TVA rate
  ipcMain.handle("create-tva-rate", async (event, tvaRate) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO tva (rate, isActive, createdAt, updatedAt) 
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(
        tvaRate.rate,
        tvaRate.isActive !== undefined ? (tvaRate.isActive ? 1 : 0) : 1
      );

      const newTvaRate = {
        id: result.lastInsertRowid,
        ...tvaRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      notifyDataChange("tva", "create", newTvaRate);
      return newTvaRate;
    } catch (error) {
      console.error("Error creating TVA rate:", error);
      throw new Error("Erreur lors de la création du taux de TVA");
    }
  });

  // Update a TVA rate
  ipcMain.handle("update-tva-rate", async (event, id, tvaRate) => {
    try {
      const stmt = db.prepare(`
        UPDATE tva 
        SET rate = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        tvaRate.rate,
        tvaRate.isActive !== undefined ? (tvaRate.isActive ? 1 : 0) : 1,
        id
      );

      // Verify the update was successful by fetching the updated record
      const updatedTvaRate = db
        .prepare("SELECT * FROM tva WHERE id = ?")
        .get(id);

      if (!updatedTvaRate) {
        throw new Error("TVA rate not found after update");
      }

      notifyDataChange("tva", "update", updatedTvaRate);
      return updatedTvaRate;
    } catch (error) {
      console.error("Error updating TVA rate:", error);
      throw new Error("Erreur lors de la mise à jour du taux de TVA");
    }
  });

  // Delete a TVA rate
  ipcMain.handle("delete-tva-rate", async (event, id) => {
    try {
      // Check if the TVA rate is used by any products
      const productCount = db
        .prepare("SELECT COUNT(*) as count FROM products WHERE tvaId = ?")
        .get(id).count;

      if (productCount > 0) {
        throw new Error("Impossible de supprimer ce taux de TVA car il est utilisé par des produits");
      }

      const stmt = db.prepare("DELETE FROM tva WHERE id = ?");
      const result = stmt.run(id);

      if (result.changes === 0) {
        throw new Error("TVA rate not found");
      }

      notifyDataChange("tva", "delete", { id });
      return { success: true };
    } catch (error) {
      console.error("Error deleting TVA rate:", error);
      throw new Error(error.message || "Erreur lors de la suppression du taux de TVA");
    }
  });

  // Get a single TVA rate by ID
  ipcMain.handle("get-tva-rate", async (event, id) => {
    try {
      const tvaRate = db
        .prepare("SELECT * FROM tva WHERE id = ?")
        .get(id);

      return tvaRate || null;
    } catch (error) {
      console.error("Error getting TVA rate:", error);
      throw new Error("Erreur lors de la récupération du taux de TVA");
    }
  });
};