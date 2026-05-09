// Run once to create the database and tables
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

async function setup() {
  console.log('🔧 Setting up racharlaplay database...\n');

  // Connect WITHOUT specifying database first (to create it)
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    await conn.query(schema);
    console.log('✅  Database "racharlaplay" and all tables created successfully!\n');
    console.log('Tables created:');
    console.log('  • users');
    console.log('  • playlists');
    console.log('  • playlist_songs');
    console.log('  • liked_songs');
    console.log('  • listening_history');
    console.log('\n🚀 You can now start the server with: npm run dev\n');
  } catch (err) {
    console.error('❌  Setup failed:', err.message);
    if (err.message.includes('Access denied')) {
      console.log('\n💡 Tip: Update MYSQL_PASSWORD in server/.env with your MySQL root password');
    }
  } finally {
    await conn.end();
  }
}

setup();
