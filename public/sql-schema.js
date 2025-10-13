function createTables(db) {
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

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      taxId TEXT,
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

  // Supplier orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierId INTEGER NOT NULL,
      orderNumber TEXT NOT NULL UNIQUE,
      totalAmount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      deliveryDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id)
    )
  `);

  // Supplier order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES supplier_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Supplier invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierId INTEGER NOT NULL,
      orderId INTEGER,
      invoiceNumber TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      issueDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      dueDate DATETIME,
      paymentDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id),
      FOREIGN KEY (orderId) REFERENCES supplier_orders(id)
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

  // Quotes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      clientId INTEGER NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      issueDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      dueDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  // Stock movements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      movementType TEXT NOT NULL, -- 'IN' for purchases, 'OUT' for sales
      sourceType TEXT, -- 'supplier_order', 'sale', etc.
      sourceId INTEGER, -- ID of the source document
      reference TEXT, -- Reference number of the source document
      reason TEXT, -- Reason for the movement
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Enterprise settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS enterprise_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row
      companyName TEXT,
      address TEXT,
      city TEXT,
      postalCode TEXT,
      country TEXT,
      phone TEXT,
      email TEXT,
      taxId TEXT,
      invoicePrefix TEXT DEFAULT 'INV',
      nextInvoiceNumber INTEGER DEFAULT 1001,
      paymentDueDays INTEGER DEFAULT 30,
      defaultTaxRate REAL DEFAULT 19.0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if table is empty
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM enterprise_settings").get();
  if (settingsCount.count === 0) {
    db.exec(`
      INSERT INTO enterprise_settings (id) VALUES (1)
    `);
  }
}

function createIndexes(db) {
  try {
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
      CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(clientId);
      CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(issueDate);
      CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company);
      CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_orders(supplierId);
      CREATE INDEX IF NOT EXISTS idx_supplier_orders_date ON supplier_orders(orderDate);
      CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplierId);
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_date ON supplier_invoices(issueDate);
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
    `);
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

module.exports = {
  createTables,
  createIndexes,
};