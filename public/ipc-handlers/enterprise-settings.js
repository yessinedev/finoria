// Enterprise Settings IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-enterprise-settings", async () => {
    try {
      // Fetch the first company record ordered by id
      const settings = db
        .prepare("SELECT * FROM companies ORDER BY id LIMIT 1")
        .get();
      return settings || null;
    } catch (error) {
      console.error("Error getting enterprise settings:", error);
      throw new Error("Erreur lors de la récupération des paramètres de l'entreprise");
    }
  });

  ipcMain.handle("create-enterprise-settings", async (event, settings) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO companies (name, address, city, country, phone, email, website, taxId, taxStatus, tvaNumber, tvaRate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        settings.name,
        settings.address,
        settings.city,
        settings.country,
        settings.phone,
        settings.email,
        settings.website,
        settings.taxId,
        settings.taxStatus,
        settings.tvaNumber,
        settings.tvaRate
      );
      const newSettings = { id: result.lastInsertRowid, ...settings };
      notifyDataChange("companies", "create", newSettings);
      return newSettings;
    } catch (error) {
      console.error("Error creating enterprise settings:", error);
      throw new Error("Erreur lors de la création des paramètres de l'entreprise");
    }
  });

  ipcMain.handle("update-enterprise-settings", async (event, id, settings) => {
    try {
      const stmt = db.prepare(`
        UPDATE companies 
        SET name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ?, taxId = ?, taxStatus = ?, tvaNumber = ?, tvaRate = ?
        WHERE id = ?
      `);
      stmt.run(
        settings.name,
        settings.address,
        settings.city,
        settings.country,
        settings.phone,
        settings.email,
        settings.website,
        settings.taxId,
        settings.taxStatus,
        settings.tvaNumber,
        settings.tvaRate,
        id
      );
      const updatedSettings = { id, ...settings };
      notifyDataChange("companies", "update", updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error("Error updating enterprise settings:", error);
      throw new Error("Erreur lors de la mise à jour des paramètres de l'entreprise");
    }
  });
};