// Categories IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-categories", async () => {
    try {
      const categories = db
        .prepare("SELECT * FROM categories ORDER BY name")
        .all();
      return categories;
    } catch (error) {
      console.error("Error getting categories:", error);
      throw new Error("Erreur lors de la récupération des catégories");
    }
  });

  ipcMain.handle("create-category", async (event, category) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO categories (name, description, isActive) 
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(
        category.name,
        category.description,
        category.isActive ? 1 : 0
      );
      const newCategory = { id: result.lastInsertRowid, ...category };
      notifyDataChange("categories", "create", newCategory);
      return newCategory;
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Une catégorie avec ce nom existe déjà");
      }
      throw new Error("Erreur lors de la création de la catégorie");
    }
  });

  ipcMain.handle("update-category", async (event, id, category) => {
    try {
      const stmt = db.prepare(`
        UPDATE categories 
        SET name = ?, description = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        category.name,
        category.description,
        category.isActive ? 1 : 0,
        id
      );
      const updatedCategory = { id, ...category };
      notifyDataChange("categories", "update", updatedCategory);
      return updatedCategory;
    } catch (error) {
      console.error("Error updating category:", error);
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Une catégorie avec ce nom existe déjà");
      }
      throw new Error("Erreur lors de la mise à jour de la catégorie");
    }
  });

  // Helper function to check if category can be deleted
  const canDeleteCategory = (id) => {
    const productCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)"
      )
      .get(id);
    return productCount.count === 0;
  };

  ipcMain.handle("can-delete-category", async (event, id) => {
    try {
      return canDeleteCategory(id);
    } catch (error) {
      console.error("Error checking if category can be deleted:", error);
      return false;
    }
  });

  ipcMain.handle("delete-category", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
      stmt.run(id);
      notifyDataChange("categories", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  });
};