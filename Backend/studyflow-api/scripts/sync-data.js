const { db: firestore } = require('../src/config/firebase');
const pool = require('../src/config/database');

async function syncClasses(userId, conn) {
    console.log(`Syncing classes for user: ${userId}`);
    const snapshot = await firestore.collection('users').doc(userId).collection('classes').get();
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        await conn.query(
            `INSERT INTO classes (id, user_id, name, color) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), color=VALUES(color)`,
            [doc.id, userId, data.name || '', data.color || '']
        );
    }
    console.log(`Synced ${snapshot.size} classes for user ${userId}`);
}

async function runSync() {
    if (!firestore) {
        console.error("Firestore not initialized.");
        process.exit(1);
    }

    let conn;
    try {
        conn = await pool.getConnection();
        console.log("Connected to MariaDB. Starting sync...");

        const usersSnapshot = await firestore.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            await conn.query(
                `INSERT INTO users (uid, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE uid=VALUES(uid)`,
                [userId, userDoc.data().email || '']
            );

            await syncClasses(userId, conn);
        }

        console.log("Initial sync completed successfully!");
    } catch (err) {
        console.error("Sync error:", err);
    } finally {
        if (conn) conn.release(); // Change from conn.end() to conn.release() for pool connections
        process.exit(0);
    }
}

runSync();
