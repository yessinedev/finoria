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

  // Units table
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      symbol TEXT,
      description TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default units if they don't exist
  const defaultUnits = [
    { name: "Kilogramme", symbol: "kg", description: "Unité de masse" },
    { name: "Mètre", symbol: "m", description: "Unité de longueur" },
    { name: "Pièce", symbol: "pce", description: "Unité par pièce" },
    { name: "Litre", symbol: "L", description: "Unité de volume" },
    { name: "Heure", symbol: "h", description: "Unité de temps" },
  ];
  
  const checkUnit = db.prepare("SELECT COUNT(*) as count FROM units WHERE name = ?");
  const insertUnit = db.prepare("INSERT OR IGNORE INTO units (name, symbol, description) VALUES (?, ?, ?)");
  
  for (const unit of defaultUnits) {
    const result = checkUnit.get(unit.name);
    if (result.count === 0) {
      insertUnit.run(unit.name, unit.symbol, unit.description);
    }
  }

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
      unitId INTEGER,
      sellingPriceHT REAL,
      sellingPriceTTC REAL,
      purchasePriceHT REAL,
      fodecApplicable BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category) REFERENCES categories(name),
      FOREIGN KEY (tvaId) REFERENCES tva(id),
      FOREIGN KEY (unitId) REFERENCES units(id)
    )
  `);

  // Add unitId column to existing products table if it doesn't exist
  try {
    db.exec(`ALTER TABLE products ADD COLUMN unitId INTEGER REFERENCES units(id)`);
  } catch (error) {
    // Column already exists, ignore
  }

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      totalAmount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      discountAmount REAL DEFAULT 0,
      fodecAmount REAL DEFAULT 0, -- New FODEC tax amount column
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
      fodecApplicable BOOLEAN DEFAULT 0,
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
      fodecAmount REAL DEFAULT 0,
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
      fodecApplicable BOOLEAN DEFAULT 0,
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
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);
  
  // Add updatedAt column to existing quotes table if it doesn't exist
  try {
    // Try to add the column - this will fail if it already exists
    db.exec(`ALTER TABLE quotes ADD COLUMN updatedAt DATETIME`);
    // Update existing rows to have a default value
    db.exec(`UPDATE quotes SET updatedAt = datetime('now') WHERE updatedAt IS NULL`);
  } catch (e) {
    // Column already exists or other error, ignore
    // console.log('Quotes table already has updatedAt column or error occurred:', e.message);
  }

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
      name TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      taxId TEXT,
      taxStatus TEXT,
      tvaNumber INTEGER,
      logo TEXT,
      timbreFiscal REAL DEFAULT 1.000,
      fodecRate REAL DEFAULT 1.0
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

  // Delivery receipts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      deliveryNumber TEXT NOT NULL UNIQUE,
      driverName TEXT,
      vehicleRegistration TEXT,
      deliveryDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);

  // Delivery receipt items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deliveryReceiptId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (deliveryReceiptId) REFERENCES delivery_receipts(id) ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS idx_delivery_receipts_sale ON delivery_receipts(saleId);
      CREATE INDEX IF NOT EXISTS idx_delivery_receipts_date ON delivery_receipts(deliveryDate);
      CREATE INDEX IF NOT EXISTS idx_delivery_receipt_items_receipt ON delivery_receipt_items(deliveryReceiptId);
      CREATE INDEX IF NOT EXISTS idx_reception_notes_order ON reception_notes(supplierOrderId);
      CREATE INDEX IF NOT EXISTS idx_reception_notes_date ON reception_notes(receptionDate);
      CREATE INDEX IF NOT EXISTS idx_reception_note_items_note ON reception_note_items(receptionNoteId);
    `);
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
  
  // Migrations for existing databases
  try {
    // Check if fodecAmount column exists in invoices table
    const invoicesTableInfo = db.prepare("PRAGMA table_info(invoices)").all();
    const hasFodecAmount = invoicesTableInfo.some(col => col.name === 'fodecAmount');
    
    if (!hasFodecAmount) {
      console.log("Adding fodecAmount column to invoices table...");
      db.exec("ALTER TABLE invoices ADD COLUMN fodecAmount REAL DEFAULT 0");
      console.log("fodecAmount column added successfully");
    }

    // Add fodecRate to companies table
    const companiesTableInfo = db.prepare("PRAGMA table_info(companies)").all();
    const hasFodecRate = companiesTableInfo.some(col => col.name === 'fodecRate');
    
    if (!hasFodecRate) {
      console.log("Adding fodecRate column to companies table...");
      db.exec("ALTER TABLE companies ADD COLUMN fodecRate REAL DEFAULT 1.0");
      console.log("fodecRate column added successfully");
    }

    // Add fodecApplicable to products table
    const productsTableInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasFodecApplicableProducts = productsTableInfo.some(col => col.name === 'fodecApplicable');
    
    if (!hasFodecApplicableProducts) {
      console.log("Adding fodecApplicable column to products table...");
      db.exec("ALTER TABLE products ADD COLUMN fodecApplicable BOOLEAN DEFAULT 0");
      console.log("fodecApplicable column added successfully to products table");
    }

    // Add fodecApplicable to sale_items table
    const saleItemsTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const hasFodecApplicableSaleItems = saleItemsTableInfo.some(col => col.name === 'fodecApplicable');
    
    if (!hasFodecApplicableSaleItems) {
      console.log("Adding fodecApplicable column to sale_items table...");
      db.exec("ALTER TABLE sale_items ADD COLUMN fodecApplicable BOOLEAN DEFAULT 0");
      console.log("fodecApplicable column added successfully to sale_items table");
    }

    // Add fodecApplicable to invoice_items table
    const invoiceItemsTableInfo = db.prepare("PRAGMA table_info(invoice_items)").all();
    const hasFodecApplicableInvoiceItems = invoiceItemsTableInfo.some(col => col.name === 'fodecApplicable');
    
    if (!hasFodecApplicableInvoiceItems) {
      console.log("Adding fodecApplicable column to invoice_items table...");
      db.exec("ALTER TABLE invoice_items ADD COLUMN fodecApplicable BOOLEAN DEFAULT 0");
      console.log("fodecApplicable column added successfully to invoice_items table");
    }

    // Remove weightedAverageCostHT from products table if it exists
    const productsTableCheckInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasWeightedAverageCost = productsTableCheckInfo.some(col => col.name === 'weightedAverageCostHT');
    
    if (hasWeightedAverageCost) {
      try {
        console.log("Removing weightedAverageCostHT column from products table...");
        db.exec("ALTER TABLE products DROP COLUMN weightedAverageCostHT");
        console.log("weightedAverageCostHT column removed successfully from products table");
      } catch (dropError) {
        // If DROP COLUMN is not supported, recreate the table without weightedAverageCostHT
        console.log("DROP COLUMN not supported, recreating products table...");
        
        // Disable foreign key constraints temporarily
        db.exec("PRAGMA foreign_keys = OFF");
        
        try {
          db.exec(`
            CREATE TABLE IF NOT EXISTS products_new (
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
              fodecApplicable BOOLEAN DEFAULT 0,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (category) REFERENCES categories(name),
              FOREIGN KEY (tvaId) REFERENCES tva(id)
            )
          `);
          
          db.exec(`
            INSERT INTO products_new (id, name, description, category, stock, isActive, reference, tvaId, sellingPriceHT, sellingPriceTTC, purchasePriceHT, fodecApplicable, createdAt, updatedAt)
            SELECT id, name, description, category, stock, isActive, reference, tvaId, sellingPriceHT, sellingPriceTTC, purchasePriceHT, fodecApplicable, createdAt, updatedAt
            FROM products
          `);
          
          db.exec("DROP TABLE products");
          db.exec("ALTER TABLE products_new RENAME TO products");
          console.log("Products table recreated without weightedAverageCostHT column");
        } finally {
          // Re-enable foreign key constraints
          db.exec("PRAGMA foreign_keys = ON");
        }
      }
    }

    // Remove status column from sales table if it exists (SQLite 3.35.0+)
    const salesTableInfo = db.prepare("PRAGMA table_info(sales)").all();
    const hasStatus = salesTableInfo.some(col => col.name === 'status');
    
    if (hasStatus) {
      try {
        console.log("Removing status column from sales table...");
        db.exec("ALTER TABLE sales DROP COLUMN status");
        console.log("Status column removed successfully from sales table");
      } catch (dropError) {
        // If DROP COLUMN is not supported, recreate the table without status
        console.log("DROP COLUMN not supported, recreating sales table...");
        
        // Disable foreign key constraints temporarily
        db.exec("PRAGMA foreign_keys = OFF");
        
        try {
          db.exec(`
            CREATE TABLE IF NOT EXISTS sales_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              clientId INTEGER NOT NULL,
              totalAmount REAL NOT NULL,
              taxAmount REAL NOT NULL,
              discountAmount REAL DEFAULT 0,
              fodecAmount REAL DEFAULT 0,
              saleDate DATETIME DEFAULT CURRENT_TIMESTAMP,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (clientId) REFERENCES clients(id)
            )
          `);
          
          db.exec(`
            INSERT INTO sales_new (id, clientId, totalAmount, taxAmount, discountAmount, fodecAmount, saleDate, createdAt)
            SELECT id, clientId, totalAmount, taxAmount, discountAmount, fodecAmount, saleDate, createdAt
            FROM sales
          `);
          
          db.exec("DROP TABLE sales");
          db.exec("ALTER TABLE sales_new RENAME TO sales");
          console.log("Sales table recreated without status column");
        } finally {
          // Re-enable foreign key constraints
          db.exec("PRAGMA foreign_keys = ON");
        }
      }
    }
  } catch (error) {
    console.error("Error running migrations:", error);
  }
}

module.exports = {
  createTables,
  createIndexes,
};