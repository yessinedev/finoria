const Database = require('better-sqlite3');
const path = require('path');

// Use the same path as in electron.js
const dbPath = path.join(__dirname, "database.db");
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Check if companies table exists
  const companiesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'").get();
  console.log('Companies table exists:', !!companiesTable);
  
  if (companiesTable) {
    console.log('\ncompanies table structure:');
    const columns = db.prepare("PRAGMA table_info(companies)").all();
    columns.forEach(column => {
      console.log(`- ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check data in companies table
    console.log('\nCompanies data:');
    const companies = db.prepare("SELECT * FROM companies").all();
    console.log(companies);
    
    // Check count
    const count = db.prepare("SELECT COUNT(*) as count FROM companies").get();
    console.log('\nCompanies count:', count.count);
  }
} catch (error) {
  console.error('Error checking database:', error);
} finally {
  db.close();
}