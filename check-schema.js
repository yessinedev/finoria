const Database = require('better-sqlite3');
const path = require('path');

// Use the same path as in electron.js
const dbPath = path.join(__dirname, 'database.db');
console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check table info
  const tableInfo = db.prepare('PRAGMA table_info(quotes);').all();
  console.log('Quotes table columns:');
  tableInfo.forEach(column => {
    console.log(`  ${column.name} (${column.type})`);
  });
  
  db.close();
} catch (error) {
  console.error('Error checking schema:', error.message);
}