// Products IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-products", async () => {
    try {
      const products = db.prepare(`
        SELECT p.*, t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        ORDER BY p.name
      `).all();
      return products;
    } catch (error) {
      console.error("Error getting products:", error);
      throw new Error("Erreur lors de la récupération des produits");
    }
  });

  ipcMain.handle("get-product-by-id", async (event, id) => {
    try {
      const product = db.prepare(`
        SELECT p.*, t.rate as tvaRate 
        FROM products p 
        LEFT JOIN tva t ON p.tvaId = t.id 
        WHERE p.id = ?
      `).get(id);
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
        INSERT INTO products (name, description, price, purchasePrice, category, stock, isActive, reference, tvaId, sellingPriceHT, sellingPriceTTC, purchasePriceHT, weightedAverageCostHT) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        product.name,
        product.description,
        product.price,
        product.purchasePrice || null,
        product.category,
        product.stock,
        product.isActive ? 1 : 0,
        product.reference || null,
        product.tvaId || null,
        product.sellingPriceHT || null,
        product.sellingPriceTTC || null,
        product.purchasePriceHT || null,
        product.weightedAverageCostHT || null
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
      const stmt = db.prepare("SELECT stock FROM products WHERE id = ?");
      const result = stmt.get(id);
      return result ? result.stock : 0;
    } catch (error) {
      console.error("Error getting product stock:", error);
      throw new Error("Erreur lors de la récupération du stock du produit");
    }
  });

  ipcMain.handle("check-product-stock", async (event, id, requestedQuantity) => {
    try {
      const stmt = db.prepare("SELECT stock, category FROM products WHERE id = ?");
      const result = stmt.get(id);
      
      if (!result) {
        return { available: false, stock: 0 };
      }
      
      // Services don't have stock limitations
      if (result.category === 'Service') {
        return { available: true, stock: result.stock };
      }
      
      return { 
        available: result.stock >= requestedQuantity, 
        stock: result.stock 
      };
    } catch (error) {
      console.error("Error checking product stock:", error);
      throw new Error("Erreur lors de la vérification du stock du produit");
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
        SET name = ?, description = ?, price = ?, purchasePrice = ?, category = ?, stock = ?, isActive = ?, reference = ?, tvaId = ?, sellingPriceHT = ?, sellingPriceTTC = ?, purchasePriceHT = ?, weightedAverageCostHT = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        product.name,
        product.description,
        product.price,
        product.purchasePrice || null,
        product.category,
        product.stock,
        product.isActive ? 1 : 0,
        product.reference || null,
        product.tvaId || null,
        product.sellingPriceHT || null,
        product.sellingPriceTTC || null,
        product.purchasePriceHT || null,
        product.weightedAverageCostHT || null,
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
