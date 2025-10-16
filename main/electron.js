const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const { createTables, createIndexes } = require("./sql-schema.js");
const { spawn } = require("child_process"); // Ensure 'spawn' is imported if you used the previous fix
const net = require("net"); // 💡 Import net module

let mainWindow;
let db;
let nextServerProcess;

function notifyDataChange(table, action, data) {
  for (const listener of dataChangeListeners.values()) {
    try {
      listener(table, action, data);
    } catch (error) {
      console.error("Error in data change listener:", error);
    }
  }
}

function initDatabase() {
  const dbPath = app.isPackaged
    ? path.join(process.resourcesPath, "database.db")
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

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      if (Date.now() - start > timeout) {
        return reject(new Error(`Timeout waiting for port ${port}`));
      }

      const client = new net.Socket();
      client.once("connect", () => {
        client.destroy();
        resolve();
      });

      client.once("error", () => {
        client.destroy();
        setTimeout(tryConnect, 500); // Retry every 500ms
      });

      client.connect(port, "localhost");
    };

    tryConnect();
  });
}

async function startNextServer() {
  const nextPath = app.isPackaged
    ? path.join(process.resourcesPath, ".next/standalone/server.js")
    : path.join(__dirname, "..", ".next/standalone/server.js");

  const port = 3000;

  // 💡 Use spawn instead of fork
  nextServerProcess = spawn(process.execPath, [nextPath], {
    cwd: path.dirname(nextPath), // Keep CWD here, it's often needed for Next.js standalone
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: "production",
    },
    stdio: "inherit", // Use 'inherit' for debugging to see stdout/stderr
  });

  // Handle server process errors (optional but good practice)
  nextServerProcess.on("error", (err) =>
    console.error("Next.js Server process error:", err)
  );
  nextServerProcess.on("exit", (code) => {
    if (code !== 0 && code !== null)
      console.error(`Next.js Server process exited with code: ${code}`);
  });

  // 💡 Wait for the server port to be ready
  await waitForPort(port);

  return port;
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

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("closed", () => {
    if (nextServerProcess) nextServerProcess.kill();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Register all IPC handlers
  [
    "categories",
    "clients",
    "products",
    "sales",
    "dashboard",
    "invoices",
    "pdf",
    "quotes",
    "suppliers",
    "payments",
    "enterprise-settings",
    "device",
  ].forEach((name) => {
    require(`./ipc-handlers/${name}`)(ipcMain, db, notifyDataChange);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    if (nextServerProcess) nextServerProcess.close();
    app.quit();
  }
});

// ✅ Data change listener registration
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
