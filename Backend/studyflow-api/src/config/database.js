/**
 * database.js — MariaDB connection pool untuk StudyFlow API
 */
const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    user:             process.env.DB_USER     || 'root',
    password:         process.env.DB_PASSWORD || '',
    database:         process.env.DB_NAME     || 'studyflow',
    port:             parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit:  10,
    acquireTimeout:   10000,
    connectTimeout:   10000,
    idleTimeout:      60000,
    timezone:         'UTC',
});

/**
 * Helper query — otomatis acquire dan release connection dari pool.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(sql, params);
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Test koneksi ke database
 */
async function testConnection() {
    try {
        const rows = await query('SELECT 1 AS ok');
        console.log('✅ Koneksi MariaDB berhasil');
        return true;
    } catch (err) {
        console.error('❌ Koneksi MariaDB gagal:', err.message);
        return false;
    }
}

module.exports = { pool, query, testConnection };
