const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Database = require("better-sqlite3");
const InvoicePDFGenerator = require("./pdf-generator");
const fs = require("fs");
const os = require("os");

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


// Categories with enhanced error handling
ipcMain.handle("get-categories", async () => {
  try {
    const categories = db
      .prepare("SELECT * FROM categories ORDER BY name")
      .all();
    return categories;
  } catch (error) {
    console.error("Error getting categories:", error);
    throw new Error("Erreur lors de la récupération des catégories");
  }
});

ipcMain.handle("create-category", async (event, category) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO categories (name, description, color, isActive) 
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      category.name,
      category.description,
      category.color,
      category.isActive ? 1 : 0
    );
    const newCategory = { id: result.lastInsertRowid, ...category };

    notifyDataChange("categories", "create", newCategory);
    return newCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new Error("Une catégorie avec ce nom existe déjà");
    }
    throw new Error("Erreur lors de la création de la catégorie");
  }
});

ipcMain.handle("update-category", async (event, id, category) => {
  try {
    const stmt = db.prepare(`
      UPDATE categories 
      SET name = ?, description = ?, color = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(
      category.name,
      category.description,
      category.color,
      category.isActive ? 1 : 0,
      id
    );
    const updatedCategory = { id, ...category };

    notifyDataChange("categories", "update", updatedCategory);
    return updatedCategory;
  } catch (error) {
    console.error("Error updating category:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new Error("Une catégorie avec ce nom existe déjà");
    }
    throw new Error("Erreur lors de la mise à jour de la catégorie");
  }
});

ipcMain.handle("delete-category", async (event, id) => {
  try {
    // Check if category is used by products
    const productCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)"
      )
      .get(id);
    if (productCount.count > 0) {
      throw new Error(
        "Impossible de supprimer cette catégorie car elle est utilisée par des produits"
      );
    }

    const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
    stmt.run(id);

    notifyDataChange("categories", "delete", { id });
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
});

// Clients with enhanced error handling
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
      INSERT INTO clients (name, email, phone, address, company) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      client.name,
      client.email,
      client.phone,
      client.address,
      client.company
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
      SET name = ?, email = ?, phone = ?, address = ?, company = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(
      client.name,
      client.email,
      client.phone,
      client.address,
      client.company,
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

ipcMain.handle("delete-client", async (event, id) => {
  try {
    // Check if client has sales or invoices
    const salesCount = db
      .prepare("SELECT COUNT(*) as count FROM sales WHERE clientId = ?")
      .get(id);
    if (salesCount.count > 0) {
      throw new Error(
        "Impossible de supprimer ce client car il a des ventes associées"
      );
    }

    const stmt = db.prepare("DELETE FROM clients WHERE id = ?");
    stmt.run(id);

    notifyDataChange("clients", "delete", { id });
    return true;
  } catch (error) {
    console.error("Error deleting client:", error);
    throw error;
  }
});

// Products with enhanced error handling
ipcMain.handle("get-products", async () => {
  try {
    const products = db.prepare("SELECT * FROM products ORDER BY name").all();
    return products;
  } catch (error) {
    console.error("Error getting products:", error);
    throw new Error("Erreur lors de la récupération des produits");
  }
});

ipcMain.handle("create-product", async (event, product) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO products (name, description, price, category, stock, isActive) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.description,
      product.price,
      product.category,
      product.stock,
      product.isActive ? 1 : 0
    );
    const newProduct = {
      id: result.lastInsertRowid,
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    notifyDataChange("products", "create", newProduct);
    return newProduct;
  } catch (error) {
    console.error("Error creating product:", error);
    throw new Error("Erreur lors de la création du produit");
  }
});

ipcMain.handle("update-product", async (event, id, product) => {
  try {
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, category = ?, stock = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    stmt.run(
      product.name,
      product.description,
      product.price,
      product.category,
      product.stock,
      product.isActive ? 1 : 0,
      id
    );
    const updatedProduct = {
      id,
      ...product,
      updatedAt: new Date().toISOString(),
    };

    notifyDataChange("products", "update", updatedProduct);
    return updatedProduct;
  } catch (error) {
    console.error("Error updating product:", error);
    throw new Error("Erreur lors de la mise à jour du produit");
  }
});

ipcMain.handle("delete-product", async (event, id) => {
  try {
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    stmt.run(id);

    notifyDataChange("products", "delete", { id });
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("Erreur lors de la suppression du produit");
  }
});

// Sales with enhanced error handling and transactions
ipcMain.handle("create-sale", async (event, sale) => {
  const transaction = db.transaction((saleData) => {
    try {
      // Insert sale
      const saleStmt = db.prepare(`
        INSERT INTO sales (clientId, totalAmount, taxAmount, status) 
        VALUES (?, ?, ?, ?)
      `);
      const saleResult = saleStmt.run(
        saleData.clientId,
        saleData.totalAmount,
        saleData.taxAmount,
        saleData.status || "En attente"
      );
      const saleId = saleResult.lastInsertRowid;

      // Insert sale items
      const itemStmt = db.prepare(`
        INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, totalPrice) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      saleData.items.forEach((item) => {
        itemStmt.run(
          saleId,
          item.productId,
          item.name,
          item.quantity,
          item.unitPrice,
          item.total
        );
      });

      return saleId;
    } catch (error) {
      console.error("Error in sale transaction:", error);
      throw error;
    }
  });

  try {
    const saleId = transaction(sale);
    const newSale = {
      id: saleId,
      ...sale,
      saleDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    notifyDataChange("sales", "create", newSale);
    return newSale;
  } catch (error) {
    console.error("Error creating sale:", error);
    throw new Error("Erreur lors de la création de la vente");
  }
});

ipcMain.handle("get-sales", async () => {
  try {
    const sales = db
      .prepare(
        `
      SELECT s.*, c.name as clientName, c.company as clientCompany
      FROM sales s
      JOIN clients c ON s.clientId = c.id
      ORDER BY s.saleDate DESC
    `
      )
      .all();
    return sales;
  } catch (error) {
    console.error("Error getting sales:", error);
    throw new Error("Erreur lors de la récupération des ventes");
  }
});

ipcMain.handle("get-sale-items", async (event, saleId) => {
  try {
    const items = db
      .prepare("SELECT * FROM sale_items WHERE saleId = ?")
      .all(saleId);
    return items;
  } catch (error) {
    console.error("Error getting sale items:", error);
    throw new Error("Erreur lors de la récupération des articles de vente");
  }
});

ipcMain.handle("update-sale-status", async (event, id, status) => {
  try {
    const stmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
    stmt.run(status, id);

    notifyDataChange("sales", "update", { id, status });
    return { id, status };
  } catch (error) {
    console.error("Error updating sale status:", error);
    throw new Error("Erreur lors de la mise à jour du statut de vente");
  }
});

// Dashboard stats with optimized queries
ipcMain.handle("get-dashboard-stats", async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Use prepared statements for better performance
    const todayRevenueStmt = db.prepare(`
      SELECT COALESCE(SUM(totalAmount + taxAmount), 0) as revenue 
      FROM sales 
      WHERE DATE(saleDate) = ?
    `);
    const todayRevenue = todayRevenueStmt.get(today);

    const totalClientsStmt = db.prepare(
      "SELECT COUNT(*) as count FROM clients"
    );
    const totalClients = totalClientsStmt.get();

    const totalProductsStmt = db.prepare(
      "SELECT COUNT(*) as count FROM products WHERE isActive = 1"
    );
    const totalProducts = totalProductsStmt.get();

    const recentSalesStmt = db.prepare(`
      SELECT s.id, c.name as client, (s.totalAmount + s.taxAmount) as amount, s.saleDate as date, s.status
      FROM sales s
      JOIN clients c ON s.clientId = c.id
      ORDER BY s.saleDate DESC
      LIMIT 10
    `);
    const recentSales = recentSalesStmt.all();

    return {
      todayRevenue: todayRevenue.revenue,
      totalClients: totalClients.count,
      totalProducts: totalProducts.count,
      recentSales,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw new Error("Erreur lors de la récupération des statistiques");
  }
});

// Invoices with enhanced error handling
ipcMain.handle("get-invoices", async () => {
  try {
    const invoices = db
      .prepare(
        `
      SELECT i.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
      FROM invoices i
      JOIN clients c ON i.clientId = c.id
      ORDER BY i.issueDate DESC
    `
      )
      .all();
    return invoices;
  } catch (error) {
    console.error("Error getting invoices:", error);
    throw new Error("Erreur lors de la récupération des factures");
  }
});

ipcMain.handle("create-invoice", async (event, invoice) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO invoices (number, saleId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      invoice.number,
      invoice.saleId,
      invoice.clientId,
      invoice.amount,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.status,
      invoice.dueDate
    );
    const newInvoice = {
      id: result.lastInsertRowid,
      ...invoice,
      issueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    notifyDataChange("invoices", "create", newInvoice);
    return newInvoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new Error("Une facture avec ce numéro existe déjà");
    }
    throw new Error("Erreur lors de la création de la facture");
  }
});

ipcMain.handle("update-invoice-status", async (event, id, status) => {
  try {
    const stmt = db.prepare("UPDATE invoices SET status = ? WHERE id = ?");
    stmt.run(status, id);

    notifyDataChange("invoices", "update", { id, status });
    return { id, status };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    throw new Error("Erreur lors de la mise à jour du statut de facture");
  }
});

// PDF Generation with enhanced data fetching
ipcMain.handle("generate-invoice-pdf", async (event, invoiceId) => {
  try {
    // Get invoice data with all related information
    const invoice = db
      .prepare(
        `
      SELECT i.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
      FROM invoices i
      JOIN clients c ON i.clientId = c.id
      WHERE i.id = ?
    `
      )
      .get(invoiceId);

    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Get invoice items with current product information
    const items = db
      .prepare(
        `
      SELECT si.*, p.description as productDescription
      FROM sale_items si
      LEFT JOIN products p ON si.productId = p.id
      WHERE si.saleId = ?
    `
      )
      .all(invoice.saleId);

    // Prepare invoice data for PDF generation
    const invoiceData = {
      ...invoice,
      items: items,
    };

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `Facture_${invoice.number}_${timestamp}.pdf`;

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Enregistrer la facture PDF",
      defaultPath: path.join(os.homedir(), "Downloads", filename),
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (result.canceled) {
      return { success: false, message: "Enregistrement annulé" };
    }

    // Generate PDF
    const pdfGenerator = new InvoicePDFGenerator();
    const outputPath = await pdfGenerator.generateInvoice(
      invoiceData,
      result.filePath
    );

    return {
      success: true,
      message: "Facture PDF générée avec succès",
      filePath: outputPath,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      message: `Erreur lors de la génération du PDF: ${error.message}`,
    };
  }
});

// Open PDF file
ipcMain.handle("open-pdf", async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error("Error opening PDF:", error);
    return { success: false, message: error.message };
  }
});

// Generate invoice from sale with enhanced data validation
ipcMain.handle("generate-invoice-from-sale", async (event, saleId) => {
  try {
    // Get sale data with validation
    const sale = db
      .prepare(
        `
      SELECT s.*, c.name as clientName, c.company as clientCompany
      FROM sales s
      JOIN clients c ON s.clientId = c.id
      WHERE s.id = ?
    `
      )
      .get(saleId);

    if (!sale) {
      throw new Error("Vente introuvable");
    }

    // Check if invoice already exists for this sale
    const existingInvoice = db
      .prepare("SELECT id FROM invoices WHERE saleId = ?")
      .get(saleId);
    if (existingInvoice) {
      throw new Error("Une facture existe déjà pour cette vente");
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const invoiceCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM invoices WHERE strftime('%Y', issueDate) = ?"
      )
      .get(year.toString());
    const invoiceNumber = `FAC-${year}-${String(
      invoiceCount.count + 1
    ).padStart(3, "0")}`;

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice
    const invoiceData = {
      number: invoiceNumber,
      saleId: sale.id,
      clientId: sale.clientId,
      amount: sale.totalAmount,
      taxAmount: sale.taxAmount,
      totalAmount: sale.totalAmount + sale.taxAmount,
      status: "En attente",
      dueDate: dueDate.toISOString(),
    };

    const stmt = db.prepare(`
      INSERT INTO invoices (number, saleId, clientId, amount, taxAmount, totalAmount, status, dueDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      invoiceData.number,
      invoiceData.saleId,
      invoiceData.clientId,
      invoiceData.amount,
      invoiceData.taxAmount,
      invoiceData.totalAmount,
      invoiceData.status,
      invoiceData.dueDate
    );

    const newInvoice = {
      id: result.lastInsertRowid,
      ...invoiceData,
      issueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    notifyDataChange("invoices", "create", newInvoice);
    return newInvoice;
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw error;
  }
});
