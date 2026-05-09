/**
 * sync-data.js - Migrasi production-safe dari Firestore ke MariaDB.
 *
 * Jalankan:
 *   node scripts/sync-data.js --dry-run
 *   node scripts/sync-data.js --user=<firebase_uid>
 *   node scripts/sync-data.js
 */
require('dotenv').config();

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH wajib di-set sebelum migrasi production.');
    process.exit(1);
}

const { db: firestore } = require('../src/config/firebase');
const { query, pool } = require('../src/config/database');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const specificUserId = args.find(arg => arg.startsWith('--user='))?.replace('--user=', '') || null;

const collections = [
    'users',
    'classes',
    'tasks',
    'studyTools',
    'studySessions',
    'calendarEvents',
    'uniforms',
    'achievements',
    'friends',
    'inbox',
];

const stats = Object.fromEntries(collections.map(name => [name, { firestore: 0, mariadb: 0, errors: 0 }]));

function ms(value, fallback = Date.now()) {
    if (!value) return fallback;
    if (Number.isFinite(Number(value))) return Number(value);
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function json(value, fallback) {
    return JSON.stringify(value ?? fallback);
}

async function write(label, sql, params) {
    if (dryRun) {
        stats[label].mariadb++;
        return;
    }
    await query(sql, params);
    stats[label].mariadb++;
}

async function safe(label, id, fn) {
    try {
        await fn();
    } catch (err) {
        stats[label].errors++;
        console.error(`[${label}] ${id}: ${err.message}`);
    }
}

async function upsertUser(userId, data = {}) {
    stats.users.firestore++;
    await write('users',
        `INSERT INTO users (
            uid, email, display_name, photo_url, last_login, streak,
            last_login_streak_date, last_streak_claim_date, last_sync_ms,
            extra_json, created_at_ms, updated_at_ms
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            email = VALUES(email), display_name = VALUES(display_name), photo_url = VALUES(photo_url),
            last_login = VALUES(last_login), streak = VALUES(streak),
            last_login_streak_date = VALUES(last_login_streak_date),
            last_streak_claim_date = VALUES(last_streak_claim_date),
            last_sync_ms = VALUES(last_sync_ms), extra_json = VALUES(extra_json),
            updated_at_ms = VALUES(updated_at_ms), updated_at = CURRENT_TIMESTAMP`,
        [
            userId,
            data.email || '',
            data.displayName || data.display_name || null,
            data.photoURL || data.photo_url || null,
            data.lastLogin || null,
            Number(data.streak || 0),
            data.lastLoginStreakDate || null,
            data.lastStreakClaimDate || null,
            ms(data.lastSync, null),
            json(data, {}),
            ms(data.createdAt),
            ms(data.updatedAt || data.lastSync),
        ]
    );
}

async function syncClasses(userId) {
    const snap = await firestore.collection('users').doc(userId).collection('classes').get();
    stats.classes.firestore += snap.size;
    for (const docSnap of snap.docs) {
        await safe('classes', `${userId}/${docSnap.id}`, async () => {
            const d = docSnap.data();
            await write('classes',
                `INSERT INTO classes (
                    id, user_id, name, color, days, schedules_json, time, room, instructor,
                    icon, links_json, order_index, extra_json, created_at_ms, updated_at_ms
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name), color = VALUES(color), days = VALUES(days),
                    schedules_json = VALUES(schedules_json), time = VALUES(time), room = VALUES(room),
                    instructor = VALUES(instructor), icon = VALUES(icon), links_json = VALUES(links_json),
                    order_index = VALUES(order_index), extra_json = VALUES(extra_json),
                    updated_at_ms = VALUES(updated_at_ms), updated_at = CURRENT_TIMESTAMP`,
                [
                    docSnap.id, userId, d.name || '', d.color || null, json(d.days, []),
                    json(d.schedules, []), d.time || null, d.room || null, d.instructor || null,
                    d.icon || null, json(d.links, []), Number(d.order || 0), json(d, {}),
                    ms(d.createdAt), ms(d.updatedAt),
                ]
            );
        });
    }
}

async function syncTasks(userId) {
    const snap = await firestore.collection('users').doc(userId).collection('tasks').get();
    stats.tasks.firestore += snap.size;
    for (const docSnap of snap.docs) {
        await safe('tasks', `${userId}/${docSnap.id}`, async () => {
            const d = docSnap.data();
            const title = d.title || d.text || 'Tanpa Judul';
            await write('tasks',
                `INSERT INTO tasks (
                    id, user_id, title, type, class_id, class_name, due_date_value, completed,
                    notes, priority, description, links_json, files_json, reminder, extra_json,
                    created_at_ms, updated_at_ms
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title), type = VALUES(type), class_id = VALUES(class_id),
                    class_name = VALUES(class_name), due_date_value = VALUES(due_date_value),
                    completed = VALUES(completed), notes = VALUES(notes), priority = VALUES(priority),
                    description = VALUES(description), links_json = VALUES(links_json),
                    files_json = VALUES(files_json), reminder = VALUES(reminder), extra_json = VALUES(extra_json),
                    updated_at_ms = VALUES(updated_at_ms), updated_at = CURRENT_TIMESTAMP`,
                [
                    docSnap.id, userId, title, d.type || 'other', d.classId || null,
                    d.className || null, d.dueDate || null, d.completed ? 1 : 0,
                    d.notes || null, d.priority || null, d.description || null, json(d.links, []),
                    json(d.files, []), d.reminder || null, json(d, {}), ms(d.createdAt), ms(d.updatedAt),
                ]
            );
        });
    }
}

async function syncStudyTools(userId) {
    const docSnap = await firestore.collection('users').doc(userId).collection('settings').doc('studyTools').get();
    const items = docSnap.exists ? (docSnap.data().items || []) : [];
    stats.studyTools.firestore += items.length;
    if (!dryRun) await query('DELETE FROM study_tools WHERE user_id = ? AND is_default = FALSE', [userId]);
    for (const tool of items) {
        await safe('studyTools', `${userId}/${tool.id}`, async () => {
            if (!tool.id || !tool.name || !(tool.url || tool.launchUrl)) return;
            await write('studyTools',
                `INSERT INTO study_tools (
                    id, user_id, name, description, url, launch_url, embed_url, can_embed,
                    category, icon, is_default, created_at_ms, updated_at_ms
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name), description = VALUES(description), url = VALUES(url),
                    launch_url = VALUES(launch_url), embed_url = VALUES(embed_url), can_embed = VALUES(can_embed),
                    category = VALUES(category), icon = VALUES(icon), is_default = VALUES(is_default),
                    updated_at_ms = VALUES(updated_at_ms), updated_at = CURRENT_TIMESTAMP`,
                [
                    tool.id, userId, tool.name, tool.description || '', tool.url || tool.launchUrl,
                    tool.launchUrl || tool.url, tool.embedUrl || '', tool.canEmbed ? 1 : 0,
                    tool.category || (tool.canEmbed ? 'embedded' : 'external'), tool.icon || null,
                    tool.isDefault ? 1 : 0, ms(tool.createdAt), ms(tool.updatedAt),
                ]
            );
        });
    }
}

async function syncCollection(userId, name, writer) {
    const snap = await firestore.collection('users').doc(userId).collection(name).get();
    stats[name].firestore += snap.size;
    for (const docSnap of snap.docs) {
        await safe(name, `${userId}/${docSnap.id}`, () => writer(userId, docSnap.id, docSnap.data()));
    }
}

async function syncSettingsDoc(userId, statName, docName, writer) {
    const docSnap = await firestore.collection('users').doc(userId).collection('settings').doc(docName).get();
    if (!docSnap.exists) return;
    stats[statName].firestore++;
    await safe(statName, `${userId}/settings/${docName}`, () => writer(userId, docSnap.data()));
}

async function syncUser(userDoc) {
    const userId = userDoc.id;
    const data = userDoc.data();
    console.log(`User ${userId} (${data.email || 'tanpa email'})`);

    await safe('users', userId, () => upsertUser(userId, data));
    await syncClasses(userId);
    await syncTasks(userId);
    await syncStudyTools(userId);

    await syncCollection(userId, 'studySessions', (uid, id, d) => write('studySessions',
        `INSERT INTO study_sessions (id, user_id, type, duration, task_id, task_name, class_id, class_name, timestamp_ms, completed_at_ms, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE type = VALUES(type), duration = VALUES(duration), task_id = VALUES(task_id),
            task_name = VALUES(task_name), class_id = VALUES(class_id), class_name = VALUES(class_name),
            timestamp_ms = VALUES(timestamp_ms), completed_at_ms = VALUES(completed_at_ms)`,
        [id, uid, d.type || 'pomodoro', Number(d.duration || 25), d.taskId || null, d.taskName || null,
            d.classId || null, d.className || null, ms(d.timestamp || d.completedAt), ms(d.completedAt || d.timestamp), ms(d.createdAt)]
    ));

    await syncCollection(userId, 'calendarEvents', (uid, id, d) => write('calendarEvents',
        `INSERT INTO calendar_events (id, user_id, title, date, end_date, time, color_key, description, created_at_ms, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), date = VALUES(date), end_date = VALUES(end_date),
            time = VALUES(time), color_key = VALUES(color_key), description = VALUES(description),
            updated_at_ms = VALUES(updated_at_ms), updated_at = CURRENT_TIMESTAMP`,
        [id, uid, d.title || '', d.date || '', d.endDate || null, d.time || '', d.colorKey || 'sky',
            d.description || '', ms(d.createdAt), ms(d.updatedAt)]
    ));

    await syncSettingsDoc(userId, 'uniforms', 'uniforms', (uid, d) => write('uniforms',
        `INSERT INTO uniforms (user_id, days_json) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE days_json = VALUES(days_json), updated_at = CURRENT_TIMESTAMP`,
        [uid, json(d.days, {})]
    ));

    await syncCollection(userId, 'achievements', (uid, id, d) => write('achievements',
        `INSERT INTO achievements (user_id, badge_id, badge_name, unlocked_at_ms)
         VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE badge_name = VALUES(badge_name), unlocked_at_ms = VALUES(unlocked_at_ms)`,
        [uid, id, d.badgeName || id, ms(d.unlockedAt)]
    ));

    await syncCollection(userId, 'friends', (uid, id, d) => write('friends',
        `INSERT INTO friends (user_id, friend_uid, display_name, email, photo_url, streak, added_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name),
            email = VALUES(email), photo_url = VALUES(photo_url), streak = VALUES(streak)`,
        [uid, id, d.displayName || 'Unknown', d.email || '', d.photoURL || null, Number(d.streak || 0), ms(d.addedAt)]
    ));

    await syncCollection(userId, 'inbox', (uid, id, d) => write('inbox',
        `INSERT INTO inbox (id, user_id, from_uid, from_name, content, timestamp_ms, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content), is_read = VALUES(is_read)`,
        [id, uid, d.fromUid || null, d.fromName || 'Someone', d.content || '', ms(d.timestamp), d.isRead ? 1 : 0]
    ));
}

async function compareCounts(userIds) {
    if (dryRun) return;
    const placeholders = userIds.map(() => '?').join(',');
    if (!placeholders) return;
    const countQueries = {
        users: ['SELECT COUNT(*) AS count FROM users WHERE uid IN (' + placeholders + ')', userIds],
        classes: ['SELECT COUNT(*) AS count FROM classes WHERE user_id IN (' + placeholders + ')', userIds],
        tasks: ['SELECT COUNT(*) AS count FROM tasks WHERE user_id IN (' + placeholders + ')', userIds],
        studyTools: ['SELECT COUNT(*) AS count FROM study_tools WHERE user_id IN (' + placeholders + ')', userIds],
        studySessions: ['SELECT COUNT(*) AS count FROM study_sessions WHERE user_id IN (' + placeholders + ')', userIds],
        calendarEvents: ['SELECT COUNT(*) AS count FROM calendar_events WHERE user_id IN (' + placeholders + ')', userIds],
        uniforms: ['SELECT COUNT(*) AS count FROM uniforms WHERE user_id IN (' + placeholders + ')', userIds],
        achievements: ['SELECT COUNT(*) AS count FROM achievements WHERE user_id IN (' + placeholders + ')', userIds],
        friends: ['SELECT COUNT(*) AS count FROM friends WHERE user_id IN (' + placeholders + ')', userIds],
        inbox: ['SELECT COUNT(*) AS count FROM inbox WHERE user_id IN (' + placeholders + ')', userIds],
    };
    for (const [name, [sql, params]] of Object.entries(countQueries)) {
        const rows = await query(sql, params);
        stats[name].mariadb = Number(rows[0]?.count || stats[name].mariadb);
    }
}

async function run() {
    if (!firestore) throw new Error('Firestore tidak terinisialisasi. Cek service account.');

    console.log(dryRun ? 'DRY RUN: tidak menulis ke MariaDB' : 'Migrasi akan menulis ke MariaDB');
    const userDocs = [];
    if (specificUserId) {
        const userDoc = await firestore.collection('users').doc(specificUserId).get();
        if (!userDoc.exists) throw new Error(`User ${specificUserId} tidak ditemukan`);
        userDocs.push(userDoc);
    } else {
        const usersSnap = await firestore.collection('users').get();
        userDocs.push(...usersSnap.docs);
    }

    for (const userDoc of userDocs) {
        await syncUser(userDoc);
    }

    await compareCounts(userDocs.map(doc => doc.id));

    console.log('\nComparison report');
    console.log('collection        firestore  mariadb  errors');
    for (const name of collections) {
        const s = stats[name];
        console.log(`${name.padEnd(16)} ${String(s.firestore).padStart(9)} ${String(s.mariadb).padStart(8)} ${String(s.errors).padStart(7)}`);
    }
}

run()
    .catch(err => {
        console.error('Migrasi gagal:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
