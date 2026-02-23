/**
 * Firestore Service for StudyFlow Mobile PWA
 * Adapted from App dashboard service — shared Firestore data model
 */
import { db, auth } from '../firebase-config';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Tasks Service ───────────────────────────────────

export const tasksService = {
  subscribeToTasks(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    const q = query(collection(db, 'users', user.uid, 'tasks'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tasks = [];
      snapshot.forEach((d) => {
        tasks.push({ id: d.id, ...d.data() });
      });
      callback(tasks);
    }, (err) => console.error('[Tasks] Subscription error:', err));
  },

  async addTask(taskData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const taskId = generateId('task');
    const task = {
      ...taskData,
      id: taskId,
      status: taskData.status || 'todo',
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid, 'tasks', taskId), task);
    return task;
  },

  async updateTask(taskId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async toggleTask(taskId, completed) {
    return this.updateTask(taskId, {
      completed,
      status: completed ? 'done' : 'todo'
    });
  },

  async deleteTask(taskId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
  }
};

// ─── Classes Service ─────────────────────────────────

export const classesService = {
  subscribeToClasses(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    const q = query(collection(db, 'users', user.uid, 'classes'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const classes = [];
      snapshot.forEach((d) => {
        classes.push({ id: d.id, ...d.data() });
      });
      callback(classes);
    }, (err) => console.error('[Classes] Subscription error:', err));
  },

  async addClass(classData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const classId = generateId('class');
    const cls = {
      ...classData,
      id: classId,
      order: classData.order || 0,
      quickLinks: classData.quickLinks || [],
      schedule: classData.schedule || [],
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid, 'classes', classId), cls);
    return cls;
  },

  async updateClass(classId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await updateDoc(doc(db, 'users', user.uid, 'classes', classId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteClass(classId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'classes', classId));
  }
};

// ─── User Profile Service ────────────────────────────

export const userService = {
  async getProfile() {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() ? snap.data() : null;
  },

  subscribeToProfile(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  },

  async updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

// ─── Study Sessions Service ──────────────────────────

export const studySessionsService = {
  subscribeToSessions(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    const q = query(collection(db, 'users', user.uid, 'studySessions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = [];
      snapshot.forEach((d) => {
        sessions.push({ id: d.id, ...d.data() });
      });
      callback(sessions);
    }, (err) => console.error('[Sessions] Subscription error:', err));
  },

  async addSession(sessionData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const sessionId = generateId('session');
    const session = {
      ...sessionData,
      id: sessionId,
      date: sessionData.date || new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid, 'studySessions', sessionId), session);
    return session;
  }
};

export default { tasks: tasksService, classes: classesService, user: userService, studySessions: studySessionsService };
