const { app, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;

module.exports = (ipcMain, db, notifyDataChange, helpers = {}) => {
  const {
    getDatabasePath = () =>
      app.isPackaged
        ? path.join(app.getPath("userData"), "database.db")
        : path.join(__dirname, "..", "..", "database.db"),
    prepareDatabaseForImport,
    scheduleAppRestart,
  } = helpers;

  const timestampString = () => new Date().toISOString().replace(/[:.]/g, "-");

  const ensureDirectory = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
  };

  const backupWithDatabase = async (destinationPath) => {
    await ensureDirectory(path.dirname(destinationPath));

    if (db && typeof db.backup === "function") {
      await db.backup(destinationPath);
    } else {
      await fs.copyFile(getDatabasePath(), destinationPath);
    }
  };

  ipcMain.handle("export-database", async () => {
    try {
      const exportDir = path.join(app.getPath("documents"), "Finoria", "Backups");
      await ensureDirectory(exportDir);

      const exportFileName = `database-export-${timestampString()}.db`;
      const exportPath = path.join(exportDir, exportFileName);

      await backupWithDatabase(exportPath);

      return {
        success: true,
        path: exportPath,
        filename: exportFileName,
      };
    } catch (error) {
      console.error("Database export error:", error);
      return {
        success: false,
        error: error?.message || "Erreur lors de l'export de la base de données",
      };
    }
  });

  ipcMain.handle("import-database", async () => {
    let backupPath;
    const tempDir = path.join(app.getPath("temp"), "Finoria");
    let tempImportPath;

    try {
      const result = await dialog.showOpenDialog({
        title: "Sélectionner un fichier de base de données",
        filters: [
          { name: "Database Files", extensions: ["db"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: "Import annulé",
        };
      }

      const sourcePath = result.filePaths[0];
      const targetPath = getDatabasePath();
      const timestamp = timestampString();

      backupPath = path.join(
        app.getPath("documents"),
        "Finoria",
        "Backups",
        `database-backup-${timestamp}.db`
      );

      tempImportPath = path.join(tempDir, `database-import-${timestamp}.db`);

      await ensureDirectory(path.dirname(backupPath));
      await ensureDirectory(tempDir);

      // Create a stable copy of the selected file before touching the live database
      await fs.copyFile(sourcePath, tempImportPath);

      // Backup the current database while the connection is still active
      await backupWithDatabase(backupPath);

      if (typeof prepareDatabaseForImport === "function") {
        await prepareDatabaseForImport();
      }

      await fs.copyFile(tempImportPath, targetPath);

      if (typeof notifyDataChange === "function") {
        notifyDataChange("database", "import", {
          source: sourcePath,
          backupPath,
        });
      }

      if (typeof scheduleAppRestart === "function") {
        scheduleAppRestart();
      }

      return {
        success: true,
        backupPath,
        message: "Base de données importée avec succès",
        restartRequired: true,
      };
    } catch (error) {
      console.error("Database import error:", error);

      if (backupPath) {
        try {
          await fs.copyFile(backupPath, getDatabasePath());
        } catch (restoreError) {
          console.error("Failed to restore database backup:", restoreError);
        }
      }

      if (typeof scheduleAppRestart === "function") {
        scheduleAppRestart();
      }

      return {
        success: false,
        error: error?.message || "Erreur lors de l'import de la base de données",
      };
    } finally {
      if (tempImportPath) {
        try {
          await fs.unlink(tempImportPath);
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") {
            console.warn("Failed to remove temporary import file:", cleanupError);
          }
        }
      }
    }
  });
};