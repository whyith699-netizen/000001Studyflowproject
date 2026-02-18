/**
 * Lightweight Streak Service
 * Uses localStorage for fast reads, minimal Firestore operations
 */

import { db, auth } from '../firebase-config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Storage keys
const STREAK_KEY = 'studyflow_streak';
const STUDY_DAYS_KEY = 'studyflow_study_days';
const LAST_SYNC_KEY = 'studyflow_last_sync';
const LAST_STUDY_KEY = 'studyflow_last_study';

/**
 * Get today's date in UTC (YYYY-MM-DD format)
 */
function getTodayUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get days difference between two dates in UTC
 */
function getDaysDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2 - d1;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Event name for streak updates
export const STREAK_UPDATE_EVENT = 'streak-update';

/**
 * Streak Service - All operations use localStorage first
 */
export const streakService = {
  /**
   * Get current streak from localStorage
   * Lightweight - no database operation
   */
  getStreak() {
    try {
      const streakData = localStorage.getItem(STREAK_KEY);
      return streakData ? parseInt(streakData, 10) : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get study days bitmap (last 7 days)
   * Returns object with dates as keys, booleans as values
   */
  getStudyDays() {
    try {
      const data = localStorage.getItem(STUDY_DAYS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  /**
   * Check if user studied today
   */
  hasStudiedToday() {
    const today = getTodayUTC();
    const studyDays = this.getStudyDays();
    return studyDays[today] === true;
  },

  /**
   * Record a study session (lightweight - localStorage only)
   * Call this when user completes a pomodoro/session
   * Returns the new streak value and dispatches event
   */
  recordStudy() {
    const today = getTodayUTC();
    const studyDays = this.getStudyDays();
    const lastStudyDate = localStorage.getItem(LAST_STUDY_KEY);

    let streak = this.getStreak();
    const oldStreak = streak;

    // Only update if haven't studied today
    if (!studyDays[today]) {
      // Mark today as studied
      studyDays[today] = true;

      // Clean up old entries (keep last 30 days for storage efficiency)
      const cutoffDate = new Date();
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      Object.keys(studyDays).forEach(date => {
        if (date < cutoffDateStr) {
          delete studyDays[date];
        }
      });

      // Calculate new streak
      if (lastStudyDate) {
        const daysDiff = getDaysDiff(lastStudyDate, today);

        if (daysDiff === 1) {
          // Studied yesterday - increment streak
          streak += 1;
        } else if (daysDiff > 1) {
          // Streak broken - start new
          streak = 1;
        }
        // daysDiff === 0 means already studied today, which we checked above
        // daysDiff < 0 shouldn't happen but just in case
        else if (daysDiff < 0) {
          streak = 1;
        }
      } else {
        // First time studying
        streak = 1;
      }

      // Save to localStorage
      localStorage.setItem(STREAK_KEY, streak.toString());
      localStorage.setItem(STUDY_DAYS_KEY, JSON.stringify(studyDays));
      localStorage.setItem(LAST_STUDY_KEY, today);
    }

    // Dispatch event if streak changed
    if (streak !== oldStreak) {
      window.dispatchEvent(new CustomEvent(STREAK_UPDATE_EVENT, { detail: { streak } }));
    }

    return streak;
  },

  /**
   * Load streak from Firestore (call on app load)
   * Falls back to localStorage if offline or error
   */
  async loadFromFirestore() {
    try {
      const user = auth.currentUser;
      if (!user) return this.getStreak();

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const firestoreStreak = data.streak || 0;
        const lastStudyDate = data.lastStudyDate;

        // Only update if Firestore has newer data
        const localLastSync = localStorage.getItem(LAST_SYNC_KEY);
        const firestoreLastSync = data.lastSync?.toDate?.()?.getTime() || data.lastSync;

        if (!localLastSync || (firestoreLastSync && firestoreLastSync > parseInt(localLastSync, 10))) {
          localStorage.setItem(STREAK_KEY, firestoreStreak.toString());
          if (lastStudyDate) {
            localStorage.setItem(LAST_STUDY_KEY, lastStudyDate);
            const studyDays = this.getStudyDays();
            studyDays[lastStudyDate] = true;
            localStorage.setItem(STUDY_DAYS_KEY, JSON.stringify(studyDays));
          }
          return firestoreStreak;
        }
      }
    } catch (error) {
      console.warn('Failed to load streak from Firestore, using localStorage:', error);
    }

    return this.getStreak();
  },

  /**
   * Save streak to Firestore (call on logout or periodically)
   * This is the only Firestore write operation
   */
  async saveToFirestore() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const streak = this.getStreak();
      const lastStudyDate = localStorage.getItem(LAST_STUDY_KEY) || getTodayUTC();

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        streak,
        lastStudyDate,
        lastSync: serverTimestamp()
      }, { merge: true });

      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to save streak to Firestore:', error);
    }
  },

  /**
   * Check and reset streak if broken (call on app load)
   * Handles case where user hasn't studied in multiple days
   */
  checkStreakValidity() {
    const today = getTodayUTC();
    const lastStudyDate = localStorage.getItem(LAST_STUDY_KEY);

    if (lastStudyDate) {
      const daysDiff = getDaysDiff(lastStudyDate, today);

      // If more than 1 day has passed and haven't studied today
      if (daysDiff > 1 && !this.hasStudiedToday()) {
        // Streak is broken, reset to 0
        localStorage.setItem(STREAK_KEY, '0');
        return 0;
      }
    }

    return this.getStreak();
  },

  /**
   * Get streak history for last 7 days (for UI display)
   * Returns array of 7 booleans
   */
  getLast7Days() {
    const studyDays = this.getStudyDays();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push(studyDays[dateStr] === true);
    }

    return result;
  }
};

export default streakService;
