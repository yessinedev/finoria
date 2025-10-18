// Products IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-products", async () => {
    try {
      const products = db.prepare("SELECT * FROM products ORDER BY name").all();
      return products;
    } catch (error) {
      console.error("Error getting products:", error);
      throw new Error("Erreur lors de la récupération des produits");
    }
  });

  ipcMain.handle("get-product-by-id", async (event, id) => {
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
      if (!product) {
        throw new Error("Produit introuvable");
      }
      return product;
    } catch (error) {
      console.error("Error getting product by ID:", error);
      throw new Error("Erreur lors de la récupération du produit");
    }
  });

  ipcMain.handle("create-product", async (event, product) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, stock, isActive) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.isActive ? 1 : 0
      );
      const newProduct = {
        id: result.lastInsertRowid,
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("products", "create", newProduct);
      return newProduct;
    } catch (error) {
      console.error("Error creating product:", error);
      throw new Error("Erreur lors de la création du produit");
    }
  });

  ipcMain.handle("get-product-stock", async (event, id) => {
    try {
      const product = db.prepare("SELECT stock FROM products WHERE id = ?").get(id);
      if (!product) {
        throw new Error("Produit introuvable");
      }
      return product.stock;
    } catch (error) {
      console.error("Error getting product stock:", error);
      throw new Error("Erreur lors de la récupération du stock du produit");
    }
  });

  ipcMain.handle("update-product-stock", async (event, id, stock) => {
    try {
      const stmt = db.prepare("UPDATE products SET stock = ? WHERE id = ?");
      stmt.run(stock, id);
      const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
      notifyDataChange("products", "update", updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error("Error updating product stock:", error);
      throw new Error("Erreur lors de la mise à jour du stock du produit");
    }
  });

  ipcMain.handle("update-product", async (event, id, product) => {
    try {
      const stmt = db.prepare(`
        UPDATE products 
        SET name = ?, description = ?, price = ?, category = ?, stock = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.isActive ? 1 : 0,
        id
      );
      const updatedProduct = {
        id,
        ...product,
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("products", "update", updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error("Error updating product:", error);
      throw new Error("Erreur lors de la mise à jour du produit");
    }
  });

  ipcMain.handle("delete-product", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM products WHERE id = ?");
      stmt.run(id);
      notifyDataChange("products", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error("Erreur lors de la suppression du produit");
    }
  });
};
