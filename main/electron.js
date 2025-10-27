const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const { createTables, createIndexes } = require("./sql-schema.js");
const { fork } = require("child_process");
const fs = require("fs").promises;
const fsSync = require("fs");

let mainWindow;
let db;
let nextProcess;
const dataChangeListeners = new Map();

function notifyDataChange(table, action, data) {
  for (const listener of dataChangeListeners.values()) {
    try {
      listener(table, action, data);
    } catch (error) {
      console.error("Error in data change listener:", error);
    }
  }
}

// Function to migrate database from old location to new location
async function migrateDatabaseIfNeeded() {
  if (!app.isPackaged) return; // Only needed in packaged app
  
  const oldDbPath = path.join(process.resourcesPath, "database.db");
  const newDbPath = path.join(app.getPath("userData"), "database.db");
  
  // Check if old database exists and new database doesn't
  const oldDbExists = fsSync.existsSync(oldDbPath);
  const newDbExists = fsSync.existsSync(newDbPath);
  
  if (oldDbExists && !newDbExists) {
    try {
      // Ensure userData directory exists
      await fs.mkdir(app.getPath("userData"), { recursive: true });
      
      // Move database from old location to new location
      await fs.rename(oldDbPath, newDbPath);
      console.log("Database migrated successfully from resources to userData directory");
    } catch (error) {
      console.error("Failed to migrate database:", error);
    }
  } else if (oldDbExists && newDbExists) {
    // Both exist - keep the new one and remove the old one
    try {
      await fs.unlink(oldDbPath);
      console.log("Removed old database from resources directory");
    } catch (error) {
      console.error("Failed to remove old database:", error);
    }
  }
}

function initDatabase() {
  const dbPath = app.isPackaged
    ? path.join(app.getPath("userData"), "database.db")
    : path.join(__dirname, "..", "database.db");

  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = 10000");
  db.pragma("temp_store = MEMORY");

  createTables(db);
  createIndexes(db);
}

async function startNextServer() {
  if (!app.isPackaged) {
    console.log("🟢 Development mode: using localhost:3000");
    return 3000; // next dev already running
  }

  const serverDir = path.join(process.resourcesPath, "app");
  const serverPath = path.join(serverDir, "server.js");
  const port = 3000;

  console.log("🚀 Starting Next.js standalone server:", serverPath);

  return new Promise((resolve, reject) => {
    nextProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: { ...process.env, PORT: port, NODE_ENV: "production" },
    });

    nextProcess.on("error", (err) => {
      console.error("Next.js server error:", err);
      reject(err);
    });

    setTimeout(() => resolve(port), 3000);
  });
}

async function createWindow() {
  const port = await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
    icon: path.join(__dirname, "icon.png"),
  });

  // Make mainWindow available globally for update handlers
  global.mainWindow = mainWindow;

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    if (nextProcess) nextProcess.kill();
    mainWindow = null;
    global.mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Migrate database if needed (only in packaged app)
  if (app.isPackaged) {
    await migrateDatabaseIfNeeded();
  }
  
  initDatabase();
  createWindow();

  // register IPC handlers (same as before)
  [
    "categories",
    "clients",
    "products",
    "sales",
    "dashboard",
    "invoices",
    "quotes",
    "suppliers",
    "enterprise-settings",
    "device",
    "database",
    "updates",
    "credit-notes",
    "purchase-orders",
    "quote-to-invoice",
    "tva",
    "delivery-receipts"
  ].forEach((name) => {
    require(`./ipc-handlers/${name}`)(ipcMain, db, notifyDataChange);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (db) db.close();
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

// Data listeners
ipcMain.handle("register-data-listener", (event) => {
  const senderId = event.sender.id;
  const listener = (table, action, data) => {
    event.sender.send("data-changed", table, action, data);
  };
  dataChangeListeners.set(senderId, listener);
  event.sender.once("destroyed", () => {
    dataChangeListeners.delete(senderId);
  });
});

ipcMain.handle("unregister-data-listener", (event) => {
  dataChangeListeners.delete(event.sender.id);
});