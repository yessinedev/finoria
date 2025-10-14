const Database = require('better-sqlite3');
const path = require('path');

// Use the same path as in electron.js
const dbPath = path.join(__dirname, "database.db");
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:');
  tables.forEach(table => {
    console.log('- ' + table.name);
  });
  
  // Check if payment tables exist
  const clientPaymentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='client_payments'").get();
  const supplierPaymentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_payments'").get();
  
  console.log('\nPayment tables check:');
  console.log('client_payments table exists:', !!clientPaymentsTable);
  console.log('supplier_payments table exists:', !!supplierPaymentsTable);
  
  if (clientPaymentsTable) {
    console.log('\nclient_payments table structure:');
    const columns = db.prepare("PRAGMA table_info(client_payments)").all();
    columns.forEach(column => {
      console.log(`- ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
  
  if (supplierPaymentsTable) {
    console.log('\nsupplier_payments table structure:');
    const columns = db.prepare("PRAGMA table_info(supplier_payments)").all();
    columns.forEach(column => {
      console.log(`- ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
} catch (error) {
  console.error('Error checking database:', error);
} finally {
  db.close();
}