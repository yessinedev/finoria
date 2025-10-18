const { app } = require("electron");
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

// Register IPC handlers
function registerDatabaseHandlers(ipcMain, db, notifyDataChange) {
  ipcMain.handle("export-database", async () => {
    return await exportDatabase();
  });
}

module.exports = registerDatabaseHandlers;