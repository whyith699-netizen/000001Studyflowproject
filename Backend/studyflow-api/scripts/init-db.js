const pool = require('../src/config/database');

async function initDB() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to MariaDB');

        // Create Users table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                uid VARCHAR(128) PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table ready');

        // Create Classes table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
            )
        `);
        console.log('Classes table ready');

        // Create Tasks table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                title VARCHAR(255) NOT NULL,
                text TEXT,
                class_id INT,
                status VARCHAR(50) DEFAULT 'pending',
                due_date DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
            )
        `);
        console.log('Tasks table ready');

        console.log('Database initialization completed successfully');
    } catch (err) {
        console.error('Error during database initialization:', err);
    } finally {
        if (conn) conn.end();
        pool.end();
    }
}

initDB();
