const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Function to check data counts
function checkData() {
  console.log('Checking data in database...\n');
  
  // Tables to check with their descriptions
  const tables = [
    { name: 'categories', description: 'Product Categories' },
    { name: 'tva', description: 'TVA Rates' },
    { name: 'clients', description: 'Clients' },
    { name: 'suppliers', description: 'Suppliers' },
    { name: 'products', description: 'Products' },
    { name: 'sales', description: 'Sales' },
    { name: 'supplier_orders', description: 'Supplier Orders' }
  ];
  
  // Check count for each table
  for (const table of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
      console.log(`${table.description}: ${count} records`);
    } catch (error) {
      console.error(`Error checking ${table.description}:`, error.message);
    }
  }
  
  console.log('\nSample data:');
  
  // Show sample categories
  console.log('\nSample Categories:');
  const categories = db.prepare('SELECT * FROM categories LIMIT 5').all();
  categories.forEach(cat => {
    console.log(`- ${cat.name}: ${cat.description} (${cat.isActive ? 'Active' : 'Inactive'})`);
  });
  
  // Show sample TVA rates
  console.log('\nTVA Rates:');
  const tvaRates = db.prepare('SELECT * FROM tva').all();
  tvaRates.forEach(tva => {
    console.log(`- ${tva.rate}% (${tva.isActive ? 'Active' : 'Inactive'})`);
  });
  
  // Show sample clients
  console.log('\nSample Clients:');
  const clients = db.prepare('SELECT * FROM clients LIMIT 3').all();
  clients.forEach(client => {
    console.log(`- ${client.name} (${client.company}) - ${client.email}`);
  });
  
  // Show sample products
  console.log('\nSample Products:');
  const products = db.prepare('SELECT * FROM products LIMIT 3').all();
  products.forEach(product => {
    console.log(`- ${product.name} (${product.category}) - ${product.stock} in stock`);
  });
  
  // Show sample sales
  console.log('\nSample Sales:');
  const sales = db.prepare(`
    SELECT s.*, c.name as clientName 
    FROM sales s 
    JOIN clients c ON s.clientId = c.id 
    LIMIT 3
  `).all();
  sales.forEach(sale => {
    console.log(`- Sale #${sale.id} for ${sale.clientName}: ${sale.totalAmount.toFixed(2)} DT`);
  });
}

// Run the script
checkData();