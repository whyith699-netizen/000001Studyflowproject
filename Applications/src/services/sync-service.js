import { localSessionsService } from "./local-db-service";
import { studySessionsService } from "./firestore-service";
import { auth } from "../firebase-config";

/**
 * Synchronizes unsynced local sessions with Firestore.
 * This should be called whenever a new session is saved or when the app comes back online.
 */
export const syncSessionsWithCloud = async () => {
  if (!auth.currentUser) {
    console.log("Sync skipped: No user logged in.");
    return;
  }
  
  try {
    const unsynced = await localSessionsService.getUnsyncedSessions();
    if (unsynced.length === 0) return;
    
    console.log(`[Sync] Found ${unsynced.length} unsynced sessions. Uploading...`);
    
    for (const session of unsynced) {
      try {
        await studySessionsService.addSession({
          type: session.type,
          duration: session.duration,
          taskId: session.taskId,
          taskName: session.taskName,
          classId: session.classId,
          className: session.className,
          timestamp: session.timestamp
        });
        
        // Mark as synced locally
        await localSessionsService.markAsSynced(session.id);
      } catch (err) {
        console.error(`[Sync] Failed to sync session ${session.id}:`, err);
        // Break loop if it's a network error
        if (!window.navigator.onLine) break;
      }
    }
    
    console.log("[Sync] Finished background synchronization.");
  } catch (error) {
    console.error("[Sync] Critical sync error:", error);
  }
};

/**
 * Initial sync to pull historical data from Firestore to local storage.
 * Call this once on login.
 */
export const pullHistoryFromCloud = async () => {
  if (!auth.currentUser) return;
  
  try {
    const cloudSessions = await studySessionsService.fetchSessions();
    if (cloudSessions && cloudSessions.length > 0) {
      await localSessionsService.bulkAdd(cloudSessions);
      console.log(`[Sync] Pulled ${cloudSessions.length} sessions from cloud history.`);
    }
  } catch (error) {
    console.error("[Sync] Failed to pull history:", error);
  }
};
