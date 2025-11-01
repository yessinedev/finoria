// Clients IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  ipcMain.handle("get-clients", async () => {
    try {
      const clients = db.prepare("SELECT * FROM clients ORDER BY name").all();
      return clients;
    } catch (error) {
      console.error("Error getting clients:", error);
      throw new Error("Erreur lors de la récupération des clients");
    }
  });

  ipcMain.handle("create-client", async (event, client) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO clients (name, email, phone, address, company, taxId) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        client.name,
        client.email,
        client.phone,
        client.address,
        client.company,
        client.taxId || null // New tax identification number field
      );
      const newClient = {
        id: result.lastInsertRowid,
        ...client,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("clients", "create", newClient);
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      throw new Error("Erreur lors de la création du client");
    }
  });

  ipcMain.handle("update-client", async (event, id, client) => {
    try {
      const stmt = db.prepare(`
        UPDATE clients 
        SET name = ?, email = ?, phone = ?, address = ?, company = ?, taxId = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        client.name,
        client.email,
        client.phone,
        client.address,
        client.company,
        client.taxId || null, // New tax identification number field
        id
      );
      const updatedClient = {
        id,
        ...client,
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("clients", "update", updatedClient);
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      throw new Error("Erreur lors de la mise à jour du client");
    }
  });

  // Helper function to check if client can be deleted
  const canDeleteClient = (id) => {
    const checks = [
      { table: 'sales', clientId: id },
      { table: 'quotes', clientId: id },
      { table: 'invoices', clientId: id },
    ];

    for (const check of checks) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${check.table} WHERE clientId = ?`).get(check.clientId);
      if (count.count > 0) {
        return false;
      }
    }
    return true;
  };

  ipcMain.handle("can-delete-client", async (event, id) => {
    try {
      return canDeleteClient(id);
    } catch (error) {
      console.error("Error checking if client can be deleted:", error);
      return false;
    }
  });

  ipcMain.handle("delete-client", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM clients WHERE id = ?");
      stmt.run(id);
      notifyDataChange("clients", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  });
};