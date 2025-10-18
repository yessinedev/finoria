const Database = require('better-sqlite3');
const path = require('path');

// Use the same path as in electron.js
const dbPath = path.join(__dirname, "database.db");
console.log('Database path:', dbPath);

// Since we can't easily use better-sqlite3 due to version mismatch,
// let's create a simple test to check the database structure
console.log('Please run this SQL query in your database editor:');
console.log('SELECT * FROM companies ORDER BY id;');
console.log('');
console.log('Also run this to check the count:');
console.log('SELECT COUNT(*) as count FROM companies;');
console.log('');
console.log('And this to check for non-empty records:');
console.log("SELECT * FROM companies WHERE name != '' OR address != '' OR email != '' ORDER BY id;");