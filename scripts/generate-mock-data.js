const { faker } = require('@faker-js/faker');
const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Function to generate random categories
function generateCategories(count = 10) {
  console.log(`Generating ${count} categories...`);
  const stmt = db.prepare(`
    INSERT INTO categories (name, description, isActive) 
    VALUES (?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const name = faker.commerce.department();
    const description = faker.lorem.sentence();
    const isActive = faker.datatype.boolean();
    
    try {
      stmt.run(name, description, isActive ? 1 : 0);
    } catch (error) {
      // Ignore duplicate name errors
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error('Error inserting category:', error.message);
      }
    }
  }
  console.log('Categories generated successfully.');
}

// Function to generate TVA rates
function generateTvaRates() {
  console.log('Generating TVA rates...');
  const stmt = db.prepare(`
    INSERT INTO tva (rate, isActive) 
    VALUES (?, ?)
  `);
  
  // Common TVA rates in Tunisia
  const tvaRates = [0, 7, 13, 19];
  
  for (const rate of tvaRates) {
    try {
      stmt.run(rate, 1);
    } catch (error) {
      // Ignore duplicate rate errors
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error('Error inserting TVA rate:', error.message);
      }
    }
  }
  console.log('TVA rates generated successfully.');
}

// Function to generate clients
function generateClients(count = 100) {
  console.log(`Generating ${count} clients...`);
  const stmt = db.prepare(`
    INSERT INTO clients (name, email, phone, address, company, taxId) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    const phone = faker.phone.number('+216 ## ### ###');
    const address = `${faker.location.streetAddress()}, ${faker.location.city()}`;
    const company = faker.company.name();
    const taxId = `TAX${faker.string.numeric(8)}`;
    
    try {
      stmt.run(name, email, phone, address, company, taxId);
    } catch (error) {
      console.error('Error inserting client:', error.message);
    }
  }
  console.log('Clients generated successfully.');
}

// Function to generate suppliers
function generateSuppliers(count = 50) {
  console.log(`Generating ${count} suppliers...`);
  const stmt = db.prepare(`
    INSERT INTO suppliers (name, email, phone, address, company, taxId) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    const phone = faker.phone.number('+216 ## ### ###');
    const address = `${faker.location.streetAddress()}, ${faker.location.city()}`;
    const company = faker.company.name();
    const taxId = `TAX${faker.string.numeric(8)}`;
    
    try {
      stmt.run(name, email, phone, address, company, taxId);
    } catch (error) {
      console.error('Error inserting supplier:', error.message);
    }
  }
  console.log('Suppliers generated successfully.');
}

// Function to get existing categories
function getCategories() {
  const stmt = db.prepare('SELECT id, name FROM categories');
  return stmt.all();
}

// Function to get TVA rates
function getTvaRates() {
  const stmt = db.prepare('SELECT id, rate FROM tva');
  return stmt.all();
}

// Function to generate products
function generateProducts(count = 200) {
  console.log(`Generating ${count} products...`);
  
  // Get existing categories and TVA rates
  const categories = getCategories();
  const tvaRates = getTvaRates();
  
  if (categories.length === 0) {
    console.error('No categories found. Please generate categories first.');
    return;
  }
  
  if (tvaRates.length === 0) {
    console.error('No TVA rates found. Please generate TVA rates first.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT INTO products (name, description, category, stock, isActive, reference, tvaId, sellingPriceHT, sellingPriceTTC, purchasePriceHT) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const productName = faker.commerce.productName();
    const description = faker.commerce.productDescription();
    const category = faker.helpers.arrayElement(categories);
    const stock = faker.number.int({ min: 0, max: 1000 });
    const isActive = faker.datatype.boolean();
    const reference = `REF${faker.string.alphanumeric(8).toUpperCase()}`;
    const tva = faker.helpers.arrayElement(tvaRates);
    const purchasePriceHT = parseFloat(faker.commerce.price({ min: 5, max: 500 }));
    const sellingPriceHT = purchasePriceHT * (1 + faker.number.float({ min: 0.1, max: 0.5 }));
    const sellingPriceTTC = sellingPriceHT * (1 + tva.rate / 100);
    
    try {
      stmt.run(
        productName,
        description,
        category.name,
        stock,
        isActive ? 1 : 0,
        reference,
        tva.id,
        purchasePriceHT,
        sellingPriceTTC,
        purchasePriceHT
      );
    } catch (error) {
      console.error('Error inserting product:', error.message);
    }
  }
  console.log('Products generated successfully.');
}

// Function to get clients
function getClients() {
  const stmt = db.prepare('SELECT id FROM clients');
  return stmt.all();
}

// Function to get products
function getProducts() {
  const stmt = db.prepare('SELECT id, name, sellingPriceHT FROM products');
  return stmt.all();
}

// Function to generate sales
function generateSales(count = 100) {
  console.log(`Generating ${count} sales...`);
  
  // Get clients and products
  const clients = getClients();
  const products = getProducts();
  
  if (clients.length === 0) {
    console.error('No clients found. Please generate clients first.');
    return;
  }
  
  if (products.length === 0) {
    console.error('No products found. Please generate products first.');
    return;
  }
  
  // Insert sale
  const saleStmt = db.prepare(`
    INSERT INTO sales (clientId, totalAmount, taxAmount, discountAmount, fodecAmount, saleDate) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Insert sale items
  const itemStmt = db.prepare(`
    INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, discount, totalPrice) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const client = faker.helpers.arrayElement(clients);
    const saleDate = faker.date.past({ years: 2 });
    
    // Create a sale with 1-10 items
    const itemCount = faker.number.int({ min: 1, max: 10 });
    const selectedProducts = faker.helpers.arrayElements(products, itemCount);
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    try {
      // Insert the sale first
      const saleResult = saleStmt.run(
        client.id,
        0, // Will be updated later
        0, // Will be updated later
        0,
        0,
        saleDate.toISOString()
      );
      
      const saleId = saleResult.lastInsertRowid;
      
      // Insert sale items
      for (const product of selectedProducts) {
        const quantity = faker.number.int({ min: 1, max: 20 });
        const unitPrice = product.sellingPriceHT;
        const discount = 0;
        const totalPrice = quantity * unitPrice;
        
        itemStmt.run(
          saleId,
          product.id,
          product.name,
          quantity,
          unitPrice,
          discount,
          totalPrice
        );
        
        totalAmount += totalPrice;
      }
      
      // Update sale with calculated amounts (simplified tax calculation)
      const taxRate = 0.19; // Using a fixed rate for simplicity
      taxAmount = totalAmount * taxRate;
      
      const updateStmt = db.prepare(`
        UPDATE sales 
        SET totalAmount = ?, taxAmount = ? 
        WHERE id = ?
      `);
      
      updateStmt.run(totalAmount, taxAmount, saleId);
      
    } catch (error) {
      console.error('Error inserting sale:', error.message);
    }
  }
  console.log('Sales generated successfully.');
}

// Function to get suppliers
function getSuppliers() {
  const stmt = db.prepare('SELECT id FROM suppliers');
  return stmt.all();
}

// Function to generate supplier orders
function generateSupplierOrders(count = 50) {
  console.log(`Generating ${count} supplier orders...`);
  
  // Get suppliers and products
  const suppliers = getSuppliers();
  const products = getProducts();
  
  if (suppliers.length === 0) {
    console.error('No suppliers found. Please generate suppliers first.');
    return;
  }
  
  if (products.length === 0) {
    console.error('No products found. Please generate products first.');
    return;
  }
  
  // Insert supplier order
  const orderStmt = db.prepare(`
    INSERT INTO supplier_orders (supplierId, orderNumber, totalAmount, taxAmount, status, orderDate, deliveryDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Insert supplier order items
  const itemStmt = db.prepare(`
    INSERT INTO supplier_order_items (orderId, productId, productName, quantity, unitPrice, discount, totalPrice) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < count; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const orderDate = faker.date.past({ years: 2 });
    const deliveryDate = faker.date.future({ refDate: orderDate, years: 1 });
    const orderNumber = `PO-${faker.string.numeric(6)}`;
    const status = faker.helpers.arrayElement(['En attente', 'Confirmée', 'Livrée', 'Annulée']);
    
    // Create an order with 1-15 items
    const itemCount = faker.number.int({ min: 1, max: 15 });
    const selectedProducts = faker.helpers.arrayElements(products, itemCount);
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    try {
      // Insert the order first
      const orderResult = orderStmt.run(
        supplier.id,
        orderNumber,
        0, // Will be updated later
        0, // Will be updated later
        status,
        orderDate.toISOString(),
        deliveryDate.toISOString()
      );
      
      const orderId = orderResult.lastInsertRowid;
      
      // Insert order items
      for (const product of selectedProducts) {
        const quantity = faker.number.int({ min: 5, max: 100 });
        // Purchase price is typically lower than selling price
        const unitPrice = parseFloat(faker.commerce.price({ min: 5, max: 300 }));
        const discount = 0;
        const totalPrice = quantity * unitPrice;
        
        itemStmt.run(
          orderId,
          product.id,
          product.name,
          quantity,
          unitPrice,
          discount,
          totalPrice
        );
        
        totalAmount += totalPrice;
      }
      
      // Update order with calculated amounts (simplified tax calculation)
      const taxRate = 0.19; // Using a fixed rate for simplicity
      taxAmount = totalAmount * taxRate;
      
      const updateStmt = db.prepare(`
        UPDATE supplier_orders 
        SET totalAmount = ?, taxAmount = ? 
        WHERE id = ?
      `);
      
      updateStmt.run(totalAmount, taxAmount, orderId);
      
    } catch (error) {
      console.error('Error inserting supplier order:', error.message);
    }
  }
  console.log('Supplier orders generated successfully.');
}

// Main function to generate all mock data
function generateAllMockData() {
  console.log('Starting mock data generation...');
  
  try {
    // Generate in the correct order to maintain referential integrity
    generateCategories(20); // Generate more categories for variety
    generateTvaRates();
    generateClients(100);
    generateSuppliers(50);
    generateProducts(200);
    generateSales(100);
    generateSupplierOrders(50);
    
    console.log('All mock data generated successfully!');
  } catch (error) {
    console.error('Error generating mock data:', error.message);
  }
}

// Run the script
generateAllMockData();