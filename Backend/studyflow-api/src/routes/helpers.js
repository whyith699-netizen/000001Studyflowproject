function parseJSON(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function numberOrNow(value) {
    return Number.isFinite(Number(value)) ? Number(value) : Date.now();
}

function maybeNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
}

function toTask(row) {
    const extra = parseJSON(row.extra_json, {});
    return {
        ...extra,
        id: row.id,
        userId: row.user_id,
        text: row.title,
        title: row.title,
        type: row.type,
        classId: row.class_id,
        className: row.class_name,
        dueDate: row.due_date_value,
        completed: !!row.completed,
        notes: row.notes,
        priority: row.priority || extra.priority || 'medium',
        description: row.description || extra.description || '',
        links: parseJSON(row.links_json, extra.links || []),
        files: parseJSON(row.files_json, extra.files || []),
        reminder: row.reminder || extra.reminder || 'none',
        createdAt: maybeNumber(row.created_at_ms),
        updatedAt: maybeNumber(row.updated_at_ms),
    };
}

function toClass(row) {
    const extra = parseJSON(row.extra_json, {});
    return {
        ...extra,
        id: row.id,
        userId: row.user_id,
        name: row.name,
        color: row.color,
        days: parseJSON(row.days, extra.days || []),
        schedules: parseJSON(row.schedules_json, extra.schedules || []),
        time: row.time || extra.time || '',
        room: row.room || extra.room || '',
        instructor: row.instructor || extra.instructor || '',
        icon: row.icon || extra.icon || 'fa-graduation-cap',
        links: parseJSON(row.links_json, extra.links || []),
        order: row.order_index || 0,
        createdAt: maybeNumber(row.created_at_ms),
        updatedAt: maybeNumber(row.updated_at_ms),
    };
}

function toStudyTool(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description || '',
        launchUrl: row.launch_url || row.url,
        url: row.url || row.launch_url,
        embedUrl: row.embed_url || '',
        canEmbed: !!row.can_embed,
        category: row.category || (row.can_embed ? 'embedded' : 'external'),
        icon: row.icon,
        isDefault: !!row.is_default,
        createdAt: maybeNumber(row.created_at_ms),
        updatedAt: maybeNumber(row.updated_at_ms),
    };
}

function toCalendarEvent(row) {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        date: row.date,
        endDate: row.end_date,
        time: row.time || '',
        colorKey: row.color_key || 'sky',
        description: row.description || '',
        createdAt: maybeNumber(row.created_at_ms),
        updatedAt: maybeNumber(row.updated_at_ms),
    };
}

function toStudySession(row) {
    return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        duration: row.duration,
        taskId: row.task_id,
        taskName: row.task_name,
        classId: row.class_id,
        className: row.class_name,
        timestamp: row.timestamp_ms,
        completedAt: row.completed_at_ms,
        createdAt: row.created_at_ms,
    };
}

function toUser(row) {
    const extra = parseJSON(row.extra_json, {});
    return {
        ...extra,
        uid: row.uid,
        email: row.email,
        displayName: row.display_name,
        photoURL: row.photo_url,
        lastLogin: row.last_login,
        streak: row.streak || 0,
        lastLoginStreakDate: row.last_login_streak_date,
        lastStreakClaimDate: row.last_streak_claim_date,
        lastSync: row.last_sync_ms,
        createdAt: row.created_at_ms,
        updatedAt: row.updated_at_ms,
    };
}

module.exports = {
    parseJSON,
    numberOrNow,
    maybeNumber,
    toTask,
    toClass,
    toStudyTool,
    toCalendarEvent,
    toStudySession,
    toUser,
};
