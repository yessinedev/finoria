const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Function to clear all data from tables
function clearAllData() {
  console.log('Clearing all data from tables...');
  
  // List of tables to clear in order to maintain referential integrity
  const tables = [
    'delivery_receipt_items',
    'delivery_receipts',
    'reception_note_items',
    'reception_notes',
    'credit_note_items',
    'credit_notes',
    'invoice_items',
    'invoices',
    'quote_items',
    'quotes',
    'purchase_order_items',
    'purchase_orders',
    'sale_items',
    'sales',
    'supplier_invoice_items',
    'supplier_invoices',
    'supplier_order_items',
    'supplier_orders',
    'stock_movements',
    'client_payments',
    'supplier_payments',
    'products',
    'clients',
    'suppliers',
    'categories',
    'tva',
    'companies'
  ];
  
  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    // Clear each table
    for (const table of tables) {
      console.log(`Clearing table: ${table}`);
      db.prepare(`DELETE FROM ${table}`).run();
    }
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('All data cleared successfully!');
  } catch (error) {
    // Rollback transaction on error
    db.exec('ROLLBACK');
    console.error('Error clearing data:', error.message);
  }
}

// Run the script
clearAllData();