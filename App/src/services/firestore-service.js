/**
 * Firestore Service for Study Flow Web App
 * Handles data sync with Chrome Extension via shared Firebase
 */

import { db, auth } from '../firebase-config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

// Generate unique ID
const generateId = (prefix = 'item') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Input validation helpers
const sanitize = (str, maxLen = 200) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
};

const sanitizeArray = (arr, maxItems = 50) => {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems);
};

/**
 * Tasks Service
 */
export const tasksService = {
  /**
   * Get all tasks for current user
   */
  async getTasks() {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const snapshot = await getDocs(tasksRef);
    
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    return tasks;
  },

  /**
   * Subscribe to real-time task updates
   */
  subscribeToTasks(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    
    return onSnapshot(tasksRef, (snapshot) => {
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      callback(tasks);
    }, (error) => {
      console.error('Tasks subscription error:', error);
    });
  },

  /**
   * Add a new task
   */
  async addTask(taskData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const text = sanitize(taskData.text, 500);
    if (!text) throw new Error('Task text is required');

    const taskId = generateId('task');
    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
    
    const newTask = {
      id: taskId,
      text,
      completed: false,
      type: taskData.type || 'individual',
      classId: taskData.classId || null,
      className: taskData.className ? sanitize(taskData.className) : null,
      priority: ['low', 'medium', 'high'].includes(taskData.priority) ? taskData.priority : 'medium',
      dueDate: taskData.dueDate || null,
      reminder: taskData.reminder || null,
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    };

    await setDoc(taskRef, newTask);
    return newTask;
  },

  /**
   * Update a task
   */
  async updateTask(taskId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Toggle task completion
   */
  async toggleTask(taskId, completed) {
    return this.updateTask(taskId, { completed });
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  }
};

/**
 * Classes Service
 */
export const classesService = {
  /**
   * Get all classes for current user
   */
  async getClasses() {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const classesRef = collection(db, 'users', user.uid, 'classes');
    const snapshot = await getDocs(classesRef);
    
    const classes = [];
    snapshot.forEach(doc => {
      classes.push({ id: doc.id, ...doc.data() });
    });
    
    return classes;
  },

  /**
   * Subscribe to real-time class updates
   */
  subscribeToClasses(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const classesRef = collection(db, 'users', user.uid, 'classes');
    
    return onSnapshot(classesRef, (snapshot) => {
      const classes = [];
      snapshot.forEach(doc => {
        classes.push({ id: doc.id, ...doc.data() });
      });
      callback(classes);
    }, (error) => {
      console.error('Classes subscription error:', error);
    });
  },

  /**
   * Add a new class
   */
  async addClass(classData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const name = sanitize(classData.name, 100);
    if (!name) throw new Error('Class name is required');

    const classId = generateId('class');
    const classRef = doc(db, 'users', user.uid, 'classes', classId);
    
    const newClass = {
      id: classId,
      name,
      icon: sanitize(classData.icon || 'fa-graduation-cap', 50),
      days: sanitizeArray(classData.days || [], 7),
      links: sanitizeArray(classData.links || [], 10).map(l => ({
        title: sanitize(l.title || '', 100),
        url: sanitize(l.url || '', 500)
      })),
      room: sanitize(classData.room || '', 50),
      color: classData.color || '#3B82F6',
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    };

    await setDoc(classRef, newClass);
    return newClass;
  },

  /**
   * Update a class
   */
  async updateClass(classId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const classRef = doc(db, 'users', user.uid, 'classes', classId);
    await updateDoc(classRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Delete a class
   */
  async deleteClass(classId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const classRef = doc(db, 'users', user.uid, 'classes', classId);
    await deleteDoc(classRef);
  }
};

/**
 * User Profile Service
 */
export const userService = {
  /**
   * Get user profile
   */
  async getProfile() {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...updates,
      lastSync: serverTimestamp()
    }, { merge: true });
  }
};



/**
 * Study Sessions Service
 */
export const studySessionsService = {
  /**
   * Subscribe to real-time session updates
   */
  subscribeToSessions(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const sessionsRef = collection(db, 'users', user.uid, 'studySessions');
    const q = query(sessionsRef, orderBy('completedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const sessions = [];
      snapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      callback(sessions);
    }, (error) => {
      console.error('Sessions subscription error:', error);
    });
  },

  /**
   * Get sessions for a specific date range
   */
  async getSessionsForWeek() {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const sessionsRef = collection(db, 'users', user.uid, 'studySessions');
    const snapshot = await getDocs(sessionsRef);
    
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    
    return sessions;
  },

  /**
   * Add a completed study session
   */
  async addSession(sessionData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const sessionId = generateId('session');
    const sessionRef = doc(db, 'users', user.uid, 'studySessions', sessionId);
    
    const newSession = {
      id: sessionId,
      type: sessionData.type || 'pomodoro', // pomodoro, shortBreak, longBreak
      duration: sessionData.duration || 25, // in minutes
      taskId: sessionData.taskId || null,
      taskName: sessionData.taskName || null,
      completedAt: Date.now(),
      createdAt: Date.now()
    };

    await setDoc(sessionRef, newSession);
    
    // Update user's streak
    await updateStreak(user.uid);
    
    return newSession;
  }
};

/**
 * Helper: Update user streak
 */
async function updateStreak(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  
  const today = new Date().toDateString();
  const lastStudyDate = userData.lastStudyDate;
  
  let newStreak = userData.streak || 0;
  
  if (lastStudyDate === today) {
    // Already studied today, no change
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastStudyDate === yesterday.toDateString()) {
      // Studied yesterday, increment streak
      newStreak += 1;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }
  }
  
  await setDoc(userRef, {
    streak: newStreak,
    lastStudyDate: today,
    lastSync: serverTimestamp()
  }, { merge: true });
}

/**
 * Uniforms Service - Custom uniform per day
 */
export const uniformsService = {
  /**
   * Get uniforms settings
   */
  async getUniforms() {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const uniformsRef = doc(db, 'users', user.uid, 'settings', 'uniforms');
    const snapshot = await getDoc(uniformsRef);
    
    if (snapshot.exists()) {
      return snapshot.data().days || {};
    }
    return {};
  },

  /**
   * Subscribe to uniforms updates
   */
  subscribeToUniforms(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const uniformsRef = doc(db, 'users', user.uid, 'settings', 'uniforms');
    
    return onSnapshot(uniformsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data().days || {});
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Uniforms subscription error:', error);
    });
  },

  /**
   * Save uniforms settings
   */
  async saveUniforms(uniformsData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const uniformsRef = doc(db, 'users', user.uid, 'settings', 'uniforms');
    await setDoc(uniformsRef, {
      days: uniformsData,
      updatedAt: serverTimestamp()
    });
  }
};

/**
 * Delete all user data from Firestore (for account deletion)
 */
export async function deleteUserData() {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in');

  const subcollections = ['tasks', 'classes', 'studySessions', 'exams'];
  
  for (const sub of subcollections) {
    const ref = collection(db, 'users', user.uid, sub);
    const snapshot = await getDocs(ref);
    const deletePromises = [];
    snapshot.forEach(d => {
      deletePromises.push(deleteDoc(doc(db, 'users', user.uid, sub, d.id)));
    });
    await Promise.all(deletePromises);
  }

  // Delete settings subcollection
  const settingsRef = doc(db, 'users', user.uid, 'settings', 'uniforms');
  await deleteDoc(settingsRef).catch(() => {});

  // Delete user document
  const userRef = doc(db, 'users', user.uid);
  await deleteDoc(userRef);
}

export default {
  tasks: tasksService,
  classes: classesService,
  user: userService,
  studySessions: studySessionsService,
  uniforms: uniformsService
};
