// Device IPC handlers
const { machineId } = require("node-machine-id");

module.exports = (ipcMain) => {
  ipcMain.handle("get-machine-fingerprint", async () => {
    try {
      // Get stable machine ID
      const id = await machineId({ original: true });
      return id;
    } catch (error) {
      console.error("Error getting machine fingerprint:", error);
      throw new Error("Erreur lors de la récupération de l'identifiant machine");
    }
  });
};