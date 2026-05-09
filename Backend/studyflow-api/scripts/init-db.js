/**
 * init-db.js - Inisialisasi skema MariaDB untuk StudyFlow.
 * Jalankan: node scripts/init-db.js
 */
const { pool } = require('../src/config/database');

async function initDB() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Terhubung ke MariaDB');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                uid VARCHAR(128) PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                photo_url TEXT,
                last_login VARCHAR(64),
                streak INT DEFAULT 0,
                last_login_streak_date VARCHAR(32),
                last_streak_claim_date VARCHAR(32),
                last_sync_ms BIGINT,
                extra_json JSON,
                created_at_ms BIGINT,
                updated_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_users_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(50),
                days JSON,
                schedules_json JSON,
                time VARCHAR(50),
                room VARCHAR(100),
                instructor VARCHAR(255),
                icon VARCHAR(80),
                links_json JSON,
                order_index INT DEFAULT 0,
                extra_json JSON,
                created_at_ms BIGINT,
                updated_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_classes_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                title VARCHAR(500) NOT NULL,
                type VARCHAR(50) DEFAULT 'other',
                class_id VARCHAR(128),
                class_name VARCHAR(255),
                due_date_value VARCHAR(64),
                completed BOOLEAN DEFAULT FALSE,
                notes TEXT,
                priority VARCHAR(32),
                description TEXT,
                links_json JSON,
                files_json JSON,
                reminder VARCHAR(64),
                extra_json JSON,
                created_at_ms BIGINT,
                updated_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_tasks_user_due (user_id, due_date_value),
                INDEX idx_tasks_class (class_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS study_tools (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                url TEXT NOT NULL,
                launch_url TEXT,
                embed_url TEXT,
                can_embed BOOLEAN DEFAULT FALSE,
                category VARCHAR(64),
                icon VARCHAR(100),
                is_default BOOLEAN DEFAULT FALSE,
                created_at_ms BIGINT,
                updated_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_tools_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS study_sessions (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                type VARCHAR(64) DEFAULT 'pomodoro',
                duration INT DEFAULT 25,
                task_id VARCHAR(128),
                task_name VARCHAR(255),
                class_id VARCHAR(128),
                class_name VARCHAR(255),
                timestamp_ms BIGINT,
                completed_at_ms BIGINT,
                created_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_sessions_user_completed (user_id, completed_at_ms)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(32) NOT NULL,
                end_date VARCHAR(32),
                time VARCHAR(50),
                color_key VARCHAR(50),
                description TEXT,
                created_at_ms BIGINT,
                updated_at_ms BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_events_user_date (user_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS uniforms (
                user_id VARCHAR(128) PRIMARY KEY,
                days_json JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                user_id VARCHAR(128) NOT NULL,
                badge_id VARCHAR(128) NOT NULL,
                badge_name VARCHAR(255),
                unlocked_at_ms BIGINT,
                PRIMARY KEY (user_id, badge_id),
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS friends (
                user_id VARCHAR(128) NOT NULL,
                friend_uid VARCHAR(128) NOT NULL,
                display_name VARCHAR(255),
                email VARCHAR(255),
                photo_url TEXT,
                streak INT DEFAULT 0,
                added_at_ms BIGINT,
                PRIMARY KEY (user_id, friend_uid),
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS inbox (
                id VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                from_uid VARCHAR(128),
                from_name VARCHAR(255),
                content TEXT,
                timestamp_ms BIGINT,
                is_read BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_inbox_user_time (user_id, timestamp_ms)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('Skema StudyFlow MariaDB siap');
    } catch (err) {
        console.error('Error saat inisialisasi database:', err);
        process.exitCode = 1;
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

initDB();
