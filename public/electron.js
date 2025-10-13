const { app, BrowserWindow, ipcMain} = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Database = require("better-sqlite3");
const { createTables, createIndexes } = require("./sql-schema");


let mainWindow;
let db;

// Data change listeners for real-time updates
const dataChangeListeners = new Set();

function notifyDataChange(table, action, data) {
  dataChangeListeners.forEach((listener) => {
    try {
      listener(table, action, data);
    } catch (error) {
      console.error("Error in data change listener:", error);
    }
  });
}

// Initialize SQLite database with optimizations
function initDatabase() {
  const dbPath = isDev
    ? path.join(__dirname, "..", "database.db")
    : path.join(process.resourcesPath, "database.db");

  db = new Database(dbPath);

  // Enable optimizations
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better performance
  db.pragma("synchronous = NORMAL"); // Balance between safety and performance
  db.pragma("cache_size = 10000"); // Increase cache size
  db.pragma("temp_store = MEMORY"); // Store temporary tables in memory

  // Create indexes for better query performance
  createIndexes(db);

  // Create tables
  createTables(db);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "icon.png"), // Add your app icon
    titleBarStyle: "default",
    show: false,
  });

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../out/index.html")}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Register modular IPC handlers
  const categoriesHandlers = require("./ipc-handlers/categories");
  const clientsHandlers = require("./ipc-handlers/clients");
  const productsHandlers = require("./ipc-handlers/products");
  const salesHandlers = require("./ipc-handlers/sales");
  const dashboardHandlers = require("./ipc-handlers/dashboard");
  const invoicesHandlers = require("./ipc-handlers/invoices");
  const pdfHandlers = require("./ipc-handlers/pdf");
  const quotesHandlers = require("./ipc-handlers/quotes");

  categoriesHandlers(ipcMain, db, notifyDataChange);
  clientsHandlers(ipcMain, db, notifyDataChange);
  productsHandlers(ipcMain, db, notifyDataChange);
  salesHandlers(ipcMain, db, notifyDataChange);
  dashboardHandlers(ipcMain, db);
  invoicesHandlers(ipcMain, db, notifyDataChange);
  quotesHandlers(ipcMain, db, notifyDataChange);
  pdfHandlers(ipcMain, db, mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// Data change listener registration
ipcMain.handle("register-data-listener", (event) => {
  const webContents = event.sender;

  const listener = (table, action, data) => {
    event.sender.send("data-changed", table, action, data);
  };

  dataChangeListeners.add(listener);

  // Keep a map to allow cleanup later
  webContents.once("destroyed", () => {
    dataChangeListeners.delete(listener);
  });
});

ipcMain.handle("unregister-data-listener", (event) => {
  // Clear all listeners for this sender
  const webContents = event.sender;
  for (const listener of dataChangeListeners) {
    if (listener.webContents === webContents) {
      dataChangeListeners.delete(listener);
    }
  }
});
