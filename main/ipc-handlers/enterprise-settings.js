// Enterprise Settings IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-enterprise-settings", async () => {
    try {
      // Try to get a company with actual data first
      let settings = db
        .prepare(
          "SELECT * FROM companies WHERE (name != '' OR address != '' OR email != '' OR phone != '') ORDER BY id LIMIT 1"
        )
        .get();

      // If no company with data found, get the first company (might be default empty record)
      if (!settings) {
        settings = db
          .prepare("SELECT * FROM companies ORDER BY id LIMIT 1")
          .get();
      }

      // If still no settings, create a default empty company record
      if (!settings) {
        const stmt = db.prepare(`
          INSERT INTO companies (name, address, city, country, phone, email, website, taxId, taxStatus, tvaNumber) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run("", "", "", "", "", "", "", "", "", null);
        settings = { 
          id: result.lastInsertRowid, 
          name: "", 
          address: "", 
          city: "", 
          country: "", 
          phone: "", 
          email: "", 
          website: "", 
          taxId: "", 
          taxStatus: "", 
          tvaNumber: null 
        };
      }

      return settings || null;
    } catch (error) {
      console.error("Error getting enterprise settings:", error);
      throw new Error(
        "Erreur lors de la récupération des paramètres de l'entreprise"
      );
    }
  });

  ipcMain.handle("create-enterprise-settings", async (event, settings) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO companies (name, address, city, country, phone, email, website, taxId, taxStatus, tvaNumber) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        settings.name || "",
        settings.address || "",
        settings.city || "",
        settings.country || "",
        settings.phone || "",
        settings.email || "",
        settings.website || "",
        settings.taxId || "",
        settings.taxStatus || "",
        settings.tvaNumber
      );

      const newSettings = { id: result.lastInsertRowid, ...settings };

      notifyDataChange("companies", "create", newSettings);
      return newSettings;
    } catch (error) {
      console.error("Error creating enterprise settings:", error);
      throw new Error(
        "Erreur lors de la création des paramètres de l'entreprise"
      );
    }
  });

  ipcMain.handle("update-enterprise-settings", async (event, id, settings) => {
    try {
      const stmt = db.prepare(`
        UPDATE companies 
        SET name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ?, taxId = ?, taxStatus = ?, tvaNumber = ?
        WHERE id = ?
      `);
      const result = stmt.run(
        settings.name || "",
        settings.address || "",
        settings.city || "",
        settings.country || "",
        settings.phone || "",
        settings.email || "",
        settings.website || "",
        settings.taxId || "",
        settings.taxStatus || "",
        settings.tvaNumber,
        id
      );

      // Verify the update was successful by fetching the updated record
      const updatedSettings = db
        .prepare("SELECT * FROM companies WHERE id = ?")
        .get(id);

      notifyDataChange("companies", "update", updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error("Error updating enterprise settings:", error);
      throw new Error(
        "Erreur lors de la mise à jour des paramètres de l'entreprise"
      );
    }
  });
};