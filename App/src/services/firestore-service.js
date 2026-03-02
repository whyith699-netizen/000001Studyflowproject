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

  async updateTask(taskId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async toggleTask(taskId, completed) {
    return this.updateTask(taskId, { completed });
  },

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

  async updateClass(classId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const classRef = doc(db, 'users', user.uid, 'classes', classId);
    await updateDoc(classRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

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

  async updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    const payload = {
      ...updates,
      lastSync: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (!snapshot.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
  }
};

/**
 * Study Sessions Service
 */
export const studySessionsService = {
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

  async addSession(sessionData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const sessionId = generateId('session');
    const sessionRef = doc(db, 'users', user.uid, 'studySessions', sessionId);
    
    const newSession = {
      id: sessionId,
      type: sessionData.type || 'pomodoro',
      duration: sessionData.duration || 25,
      taskId: sessionData.taskId || null,
      taskName: sessionData.taskName || null,
      completedAt: Date.now(),
      createdAt: Date.now()
    };

    await setDoc(sessionRef, newSession);
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
      newStreak += 1;
    } else {
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
 * Calendar Events Service
 */
export const calendarEventsService = {
  subscribeToEvents(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const ref = collection(db, 'users', user.uid, 'calendarEvents');
    const q = query(ref, orderBy('date', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
      callback(events);
    }, (error) => {
      console.error('CalendarEvents subscription error:', error);
    });
  },

  async addEvent(eventData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const id = generateId('cal');
    const ref = doc(db, 'users', user.uid, 'calendarEvents', id);
    const newEvent = {
      id,
      title: sanitize(eventData.title, 200),
      type: ['event', 'task', 'exam', 'reminder', 'week'].includes(eventData.type) ? eventData.type : 'event',
      date: eventData.date || '',
      endDate: eventData.endDate || null,
      time: eventData.time || '',
      description: sanitize(eventData.description || '', 500),
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, newEvent);
    return newEvent;
  },

  async updateEvent(eventId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const ref = doc(db, 'users', user.uid, 'calendarEvents', eventId);
    await updateDoc(ref, {
      title: sanitize(updates.title || '', 200),
      type: updates.type || 'event',
      date: updates.date || '',
      endDate: updates.endDate !== undefined ? updates.endDate : null,
      time: updates.time || '',
      description: sanitize(updates.description || '', 500),
      updatedAt: serverTimestamp()
    });
  },

  async deleteEvent(eventId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const ref = doc(db, 'users', user.uid, 'calendarEvents', eventId);
    await deleteDoc(ref);
  }
};

/**
 * Delete all user data from Firestore (for account deletion)
 */
export async function deleteUserData() {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in');

  const subcollections = ['tasks', 'classes', 'studySessions', 'exams', 'calendarEvents'];
  
  for (const sub of subcollections) {
    const ref = collection(db, 'users', user.uid, sub);
    const snapshot = await getDocs(ref);
    const deletePromises = [];
    snapshot.forEach(d => {
      deletePromises.push(deleteDoc(doc(db, 'users', user.uid, sub, d.id)));
    });
    await Promise.all(deletePromises);
  }

  const settingsRef = doc(db, 'users', user.uid, 'settings', 'uniforms');
  await deleteDoc(settingsRef).catch(() => {});

  const userRef = doc(db, 'users', user.uid);
  await deleteDoc(userRef);
}

export default {
  tasks: tasksService,
  classes: classesService,
  user: userService,
  studySessions: studySessionsService,
  uniforms: uniformsService,
  calendarEvents: calendarEventsService
};
