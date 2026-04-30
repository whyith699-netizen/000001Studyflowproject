import Dexie from 'dexie';

export const dbLocal = new Dexie('StudyFlowLocalDB');

// Schema:
// sessions: id (uuid), type, duration, taskId, taskName, classId, className, timestamp, synced (0/1)
dbLocal.version(2).stores({
  sessions: '++id, type, duration, taskId, taskName, classId, className, timestamp, synced'
});

export const localSessionsService = {
  /**
   * Add a new session to local database
   */
  async addSession(sessionData) {
    return await dbLocal.sessions.add({
      ...sessionData,
      timestamp: Date.now(),
      synced: 0
    });
  },
  
  /**
   * Get all sessions from local database (sorted by latest)
   */
  async getSessions() {
    // Fetch all to avoid index missing issues, then sort in memory
    const sessions = await dbLocal.sessions.toArray();
    return sessions.sort((a, b) => {
      const tA = a.timestamp || a.completedAt || a.createdAt || 0;
      const tB = b.timestamp || b.completedAt || b.createdAt || 0;
      return tB - tA;
    });
  },
  
  /**
   * Mark a session as successfully synced to cloud
   */
  async markAsSynced(id) {
    return await dbLocal.sessions.update(id, { synced: 1 });
  },
  
  /**
   * Get sessions that haven't been synced to cloud yet
   */
  async getUnsyncedSessions() {
    return await dbLocal.sessions.where('synced').equals(0).toArray();
  },

  /**
   * Bulk add sessions (useful for initial sync from cloud to local)
   */
  async bulkAdd(sessions) {
    return await dbLocal.sessions.bulkPut(sessions.map(s => ({
      ...s,
      timestamp: s.timestamp || s.completedAt || s.createdAt || Date.now(),
      synced: 1 // Assume they are already synced if coming from cloud
    })));
  }
};
