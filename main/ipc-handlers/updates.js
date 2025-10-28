const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

// Configure autoUpdater to use your VPS
autoUpdater.autoDownload = false; // We'll download manually
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

// Set the update feed URL to your VPS
autoUpdater.setFeedURL({
  provider: "generic",
  url: "https://updates-finoria.etudionet.life",
});

// Function to check for updates from your VPS
async function checkForUpdates() {
  return new Promise((resolve) => {
    // For electron-updater, we use its built-in checkForUpdates method
    autoUpdater
      .checkForUpdates()
      .then((result) => {
        if (result && result.updateInfo) {
          const currentVersion = app.getVersion();
          const latestVersion = result.updateInfo.version;

          // Simple version comparison
          const isNewer = latestVersion > currentVersion;

          resolve({
            success: true,
            data: {
              available: isNewer,
              version: latestVersion,
              // Point to your VPS for update information
              url: "https://updates-finoria.etudionet.life",
            },
          });
        } else {
          resolve({
            success: true,
            data: {
              available: false,
            },
          });
        }
      })
      .catch((error) => {
        console.error("Error checking for updates:", error);
        resolve({
          success: false,
          error: "Failed to check for updates: " + error.message,
        });
      });
  });
}

// Function to download updates
async function downloadUpdate() {
  return new Promise((resolve) => {
    // Listen for update events
    const downloadedHandler = (info) => {
      autoUpdater.removeListener("update-downloaded", downloadedHandler);
      autoUpdater.removeListener("error", errorHandler);

      resolve({
        success: true,
        data: {
          version: info.version,
        },
      });
    };

    const errorHandler = (error) => {
      autoUpdater.removeListener("update-downloaded", downloadedHandler);
      autoUpdater.removeListener("error", errorHandler);

      resolve({
        success: false,
        error: error.message || "Failed to download update",
      });
    };

    autoUpdater.on("update-downloaded", downloadedHandler);
    autoUpdater.on("error", errorHandler);

    // Start the download
    autoUpdater.downloadUpdate().catch((error) => {
      console.error("Error downloading update:", error);
      errorHandler(error);
    });
  });
}

// Function to quit and install update
async function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

// Register IPC handlers
function registerUpdateHandlers(ipcMain, db, notifyDataChange) {
  ipcMain.handle("check-for-updates", async () => {
    return await checkForUpdates();
  });

  ipcMain.handle("download-update", async () => {
    return await downloadUpdate();
  });

  ipcMain.handle("quit-and-install", async () => {
    return await quitAndInstall();
  });

  // Set up autoUpdater events
  autoUpdater.on("update-available", (info) => {
    // Notify the renderer process about available updates
    if (global.mainWindow) {
      global.mainWindow.webContents.send("update-available", info);
    }
  });

  autoUpdater.on("update-not-available", () => {
    // Notify the renderer process that no updates are available
    if (global.mainWindow) {
      global.mainWindow.webContents.send("update-not-available");
    }
  });

  autoUpdater.on("error", (error) => {
    // Notify the renderer process about update errors
    if (global.mainWindow) {
      global.mainWindow.webContents.send("update-error", error.message);
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    // Notify the renderer process about download progress
    if (global.mainWindow) {
      global.mainWindow.webContents.send("update-download-progress", progress);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    // Notify the renderer process when update is downloaded
    if (global.mainWindow) {
      global.mainWindow.webContents.send("update-downloaded", info);
    }
  });
}

module.exports = registerUpdateHandlers;