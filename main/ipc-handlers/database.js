const { app, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;

// Export database function
async function exportDatabase() {
  try {
    // Get the current database path
    const sourcePath = app.isPackaged
      ? path.join(process.resourcesPath, "database.db")
      : path.join(__dirname, "..", "..", "database.db");
    
    // Generate export filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportFileName = `database-export-${timestamp}.db`;
    
    // Determine export directory (Documents folder)
    const exportDir = path.join(app.getPath("documents"), "Finoria", "Backups");
    
    // Create export directory if it doesn't exist
    await fs.mkdir(exportDir, { recursive: true });
    
    // Full export path
    const exportPath = path.join(exportDir, exportFileName);
    
    // Copy database file
    await fs.copyFile(sourcePath, exportPath);
    
    return {
      success: true,
      path: exportPath,
      filename: exportFileName
    };
  } catch (error) {
    console.error("Database export error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Import database function
async function importDatabase() {
  try {
    // Show file dialog to select database file
    const result = await dialog.showOpenDialog({
      title: "Sélectionner un fichier de base de données",
      filters: [
        { name: "Database Files", extensions: ["db"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        error: "Import annulé"
      };
    }
    
    const filePath = result.filePaths[0];
    
    // Get the current database path
    const targetPath = app.isPackaged
      ? path.join(process.resourcesPath, "database.db")
      : path.join(__dirname, "..", "..", "database.db");
    
    // Backup current database before import
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      app.getPath("documents"), 
      "Finoria", 
      "Backups", 
      `database-backup-${timestamp}.db`
    );
    
    // Create backup directory if it doesn't exist
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    // Backup current database
    await fs.copyFile(targetPath, backupPath);
    
    // Copy imported file to database location
    await fs.copyFile(filePath, targetPath);
    
    return {
      success: true,
      backupPath: backupPath,
      message: "Base de données importée avec succès"
    };
  } catch (error) {
    console.error("Database import error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Register IPC handlers
function registerDatabaseHandlers(ipcMain, db, notifyDataChange) {
  ipcMain.handle("export-database", async () => {
    return await exportDatabase();
  });
  
  ipcMain.handle("import-database", async () => {
    return await importDatabase();
  });
}

module.exports = registerDatabaseHandlers;