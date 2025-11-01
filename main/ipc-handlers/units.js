// Units IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-units", async () => {
    try {
      const units = db.prepare(`
        SELECT * FROM units ORDER BY name
      `).all();
      return units;
    } catch (error) {
      console.error("Error getting units:", error);
      throw new Error("Erreur lors de la récupération des unités");
    }
  });

  ipcMain.handle("get-unit-by-id", async (event, id) => {
    try {
      const unit = db.prepare("SELECT * FROM units WHERE id = ?").get(id);
      if (!unit) {
        throw new Error("Unité introuvable");
      }
      return unit;
    } catch (error) {
      console.error("Error getting unit by ID:", error);
      throw new Error("Erreur lors de la récupération de l'unité");
    }
  });

  ipcMain.handle("create-unit", async (event, unit) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO units (name, symbol, description, isActive) 
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(
        unit.name,
        unit.symbol || null,
        unit.description || null,
        unit.isActive !== undefined ? (unit.isActive ? 1 : 0) : 1
      );
      const newUnit = {
        id: result.lastInsertRowid,
        ...unit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("units", "create", newUnit);
      return newUnit;
    } catch (error) {
      console.error("Error creating unit:", error);
      throw new Error("Erreur lors de la création de l'unité");
    }
  });

  ipcMain.handle("update-unit", async (event, id, unit) => {
    try {
      const stmt = db.prepare(`
        UPDATE units 
        SET name = ?, symbol = ?, description = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        unit.name,
        unit.symbol || null,
        unit.description || null,
        unit.isActive !== undefined ? (unit.isActive ? 1 : 0) : 1,
        id
      );
      const updatedUnit = {
        id,
        ...unit,
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("units", "update", updatedUnit);
      return updatedUnit;
    } catch (error) {
      console.error("Error updating unit:", error);
      throw new Error("Erreur lors de la mise à jour de l'unité");
    }
  });

  // Helper function to check if unit can be deleted
  const canDeleteUnit = (id) => {
    const productsUsingUnit = db.prepare("SELECT COUNT(*) as count FROM products WHERE unitId = ?").get(id);
    return productsUsingUnit.count === 0;
  };

  ipcMain.handle("can-delete-unit", async (event, id) => {
    try {
      return canDeleteUnit(id);
    } catch (error) {
      console.error("Error checking if unit can be deleted:", error);
      return false;
    }
  });

  ipcMain.handle("delete-unit", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM units WHERE id = ?");
      stmt.run(id);
      notifyDataChange("units", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting unit:", error);
      throw error;
    }
  });
};

