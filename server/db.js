const mysql = require('mysql2/promise');

let pool = null;
let dbAvailable = false;

async function initDB() {
  try {
    pool = mysql.createPool({
      host:            process.env.MYSQL_HOST     || 'localhost',
      port:            parseInt(process.env.MYSQL_PORT || '3306'),
      user:            process.env.MYSQL_USER     || 'root',
      password:        process.env.MYSQL_PASSWORD || 'Sai@123',
      database:        process.env.MYSQL_DATABASE || 'racharlaplay',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit:      0,
      charset:         'utf8mb4',
      connectTimeout:  5000,
    });
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    dbAvailable = true;
    console.log('✅  MySQL connected → database:', process.env.MYSQL_DATABASE);
  } catch (err) {
    dbAvailable = false;
    console.warn('⚠️  MySQL unavailable — auth features disabled.');
    console.warn('   To enable: update MYSQL_PASSWORD in server/.env, then run: node setup-db.js');
  }
}

initDB();

module.exports = {
  get available() { return dbAvailable; },
  async execute(sql, params) {
    if (!dbAvailable || !pool) throw new Error('DATABASE_UNAVAILABLE');
    return pool.execute(sql, params);
  },
  async query(sql, params) {
    if (!dbAvailable || !pool) throw new Error('DATABASE_UNAVAILABLE');
    return pool.query(sql, params);
  },
};
