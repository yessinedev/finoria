const { app, BrowserWindow, ipcMain} = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Database = require("better-sqlite3");


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
  createIndexes();

  // Create tables
  createTables();
}

function createIndexes() {
  try {
    // Indexes for better query performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
      CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(isActive);
      CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(clientId);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(saleDate);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(saleId);
      CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(clientId);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(issueDate);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    `);
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

function createTables() {
  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT 'blue',
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category) REFERENCES categories(name)
    )
  `);

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      totalAmount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      saleDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  // Sale items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      saleId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      issueDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      dueDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES sales(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);
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

  categoriesHandlers(ipcMain, db, notifyDataChange);
  clientsHandlers(ipcMain, db, notifyDataChange);
  productsHandlers(ipcMain, db, notifyDataChange);
  salesHandlers(ipcMain, db, notifyDataChange);
  dashboardHandlers(ipcMain, db);
  invoicesHandlers(ipcMain, db, notifyDataChange);
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
