function createTables(db) {
  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
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
      taxId TEXT, -- New tax identification number field
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
      category TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      reference TEXT,
      tvaId INTEGER,
      sellingPriceHT REAL,
      sellingPriceTTC REAL,
      purchasePriceHT REAL,
      weightedAverageCostHT REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category) REFERENCES categories(name),
      FOREIGN KEY (tvaId) REFERENCES tva(id)
    )
  `);

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      totalAmount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      discountAmount REAL DEFAULT 0,
      fodecAmount REAL DEFAULT 0, -- New FODEC tax amount column
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
      discount REAL DEFAULT 0,
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
      discount REAL DEFAULT 0,
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

  // Supplier invoice items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (invoiceId) REFERENCES supplier_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      saleId INTEGER,
      quoteId INTEGER,
      clientId INTEGER NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      status TEXT DEFAULT 'En attente',
      issueDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      dueDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES sales(id),
      FOREIGN KEY (quoteId) REFERENCES quotes(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  // Invoice items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
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

  // Quote items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quoteId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
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

  // Companies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      website TEXT,
      taxId TEXT NOT NULL,
      taxStatus TEXT,
      tvaNumber INTEGER
    )
  `);

  // TVA table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate REAL NOT NULL,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Client payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      invoiceId INTEGER,
      amount REAL NOT NULL,
      paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      paymentMethod TEXT,
      reference TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (invoiceId) REFERENCES invoices(id)
    )
  `);

  // Supplier payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierId INTEGER NOT NULL,
      invoiceId INTEGER,
      amount REAL NOT NULL,
      paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      paymentMethod TEXT,
      reference TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id),
      FOREIGN KEY (invoiceId) REFERENCES supplier_invoices(id)
    )
  `);

  // Credit Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      originalInvoiceId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'En attente',
      issueDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      dueDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (originalInvoiceId) REFERENCES invoices(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  // Credit Note items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creditNoteId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (creditNoteId) REFERENCES credit_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Reception notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reception_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierOrderId INTEGER NOT NULL,
      receptionNumber TEXT NOT NULL UNIQUE,
      driverName TEXT,
      vehicleRegistration TEXT,
      receptionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplierOrderId) REFERENCES supplier_orders(id) ON DELETE CASCADE
    )
  `);

  // Reception note items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reception_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receptionNoteId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      orderedQuantity INTEGER NOT NULL,
      receivedQuantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (receptionNoteId) REFERENCES reception_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Purchase orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      saleId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      deliveryDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES sales(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  // Purchase order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchaseOrderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

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
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items(invoiceId);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoiceId);
      CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(clientId);
      CREATE INDEX IF NOT EXISTS idx_client_payments_invoice ON client_payments(invoiceId);
      CREATE INDEX IF NOT EXISTS idx_client_payments_date ON client_payments(paymentDate);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplierId);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice ON supplier_payments(invoiceId);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(paymentDate);
      CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quoteId);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_sale ON purchase_orders(saleId);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_client ON purchase_orders(clientId);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(orderDate);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order ON purchase_order_items(purchaseOrderId);
    `);
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

module.exports = {
  createTables,
  createIndexes,
};