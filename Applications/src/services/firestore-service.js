/**
 * Firestore Service for Study Flow Web App
 * Handles data sync with Chrome Extension via shared Firebase
 * Optimized with Observable Cache Pattern to minimize Firebase reads.
 */

import { db, auth } from "../firebase-config";
import { apiService } from "./api-service";
import {
  uploadTaskAttachments,
  deleteTaskAttachments,
} from "./attachments-service";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { normalizeTaskReminder } from "../config/taskReminderOptions";
import { differenceInCalendarDays, parseISO, format } from "date-fns";

// --- HELPERS ---

const generateId = (prefix = "item") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const sanitize = (str, maxLen = 200) => {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
};

const sanitizeArray = (arr, maxItems = 50) => {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems);
};

const sanitizeLinks = (links, maxItems = 10) =>
  sanitizeArray(links, maxItems)
    .map((link) => ({
      title: sanitize(link?.title || "", 120),
      url: sanitize(link?.url || "", 500),
    }))
    .filter((link) => link.url);

const sanitizeFilesMeta = (files, maxItems = 12) =>
  sanitizeArray(files, maxItems)
    .map((file) => ({
      name: sanitize(file?.name || "", 160),
      size: Number.isFinite(file?.size) ? file.size : 0,
      type: sanitize(file?.type || "", 120) || null,
      path: sanitize(file?.path || "", 500) || null,
      url: sanitize(file?.url || "", 500) || null,
      uploadedAt: file?.uploadedAt || new Date().toISOString(),
    }))
    .filter((file) => file.name && file.url);

const normalizeDay = (value) => {
  const normalized = sanitize(value || "", 20).toLowerCase();
  const dayMap = {
    mon: "monday", monday: "monday", senin: "monday",
    tue: "tuesday", tuesday: "tuesday", selasa: "tuesday",
    wed: "wednesday", wednesday: "wednesday", rabu: "wednesday",
    thu: "thursday", thursday: "thursday", kamis: "thursday",
    fri: "friday", friday: "friday", jumat: "friday",
    sat: "saturday", saturday: "saturday", sabtu: "saturday",
    sun: "sunday", sunday: "sunday", minggu: "sunday",
  };
  return dayMap[normalized] || null;
};

const sanitizeSchedules = (schedules, maxItems = 20) =>
  sanitizeArray(schedules, maxItems)
    .map((entry) => {
      const day = normalizeDay(entry?.day);
      const startTime = sanitize(entry?.startTime || "", 5);
      const endTime = sanitize(entry?.endTime || "", 5);
      const fallbackTime = sanitize(entry?.time || "", 20);
      const time = fallbackTime || (startTime && endTime ? `${startTime} - ${endTime}` : "");
      if (!day) return null;
      return { day, time: time || "", startTime, endTime };
    })
    .filter(Boolean);

const sanitizeUrl = (value) => {
  const sanitized = sanitize(value || "", 500);
  if (!sanitized) return "";
  try {
    const parsed = new URL(sanitized);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const sanitizeStudyTools = (items, maxItems = 40) =>
  sanitizeArray(items, maxItems)
    .map((item) => {
      const launchUrl = sanitizeUrl(item?.launchUrl || item?.url);
      if (!launchUrl) return null;
      const canEmbed = Boolean(item?.canEmbed);
      const embedUrl = canEmbed ? sanitizeUrl(item?.embedUrl || launchUrl) || launchUrl : "";
      return {
        id: sanitize(item?.id || "", 120),
        name: sanitize(item?.name || "", 120),
        description: sanitize(item?.description || "", 280),
        launchUrl,
        embedUrl,
        canEmbed,
        category: canEmbed ? "embedded" : "external",
        icon: sanitize(item?.icon || "", 60) || null,
        createdAt: Number.isFinite(item?.createdAt) ? item.createdAt : Date.now(),
        updatedAt: Number.isFinite(item?.updatedAt) ? item.updatedAt : Date.now(),
      };
    })
    .filter((item) => item && item.id && item.name);

const buildClassNameMap = (classes = []) =>
  new Map(classes.filter(i => i?.id && i?.name).map(i => [i.id, sanitize(i.name, 100)]));

const normalizeTaskRecord = (task, classNameMap = new Map()) => {
  const title = sanitize(task?.title || task?.text, 500);
  const text = sanitize(task?.text || title, 500);
  const resolvedClassName = sanitize(task?.className || "", 100) || (task?.classId ? classNameMap.get(task.classId) || null : null);
  return { ...task, title, text, className: resolvedClassName };
};

const tryApi = async (label, fn, fallback) => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[MariaDB API fallback] ${label}:`, error);
    return fallback();
  }
};

// --- OBSERVABLE STATE UTILITY ---

class ObservableState {
  constructor(initialData = null) {
    this.data = initialData;
    this.listeners = new Set();
    this.lastFetched = 0;
    this.ttl = 300000; // 5 minutes cache TTL
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (this.data !== null) callback(this.data);
    return () => this.listeners.delete(callback);
  }

  notify(newData) {
    this.data = newData;
    this.listeners.forEach(cb => cb(this.data));
  }

  isExpired() {
    return Date.now() - this.lastFetched > this.ttl;
  }

  markFetched() {
    this.lastFetched = Date.now();
  }

  clear() {
    this.data = null;
    this.lastFetched = 0;
  }
}

// Global state instances
const tasksState = new ObservableState([]);
const classesState = new ObservableState([]);
const profileState = new ObservableState(null);
const sessionsState = new ObservableState([]);
const uniformsState = new ObservableState({});
const toolsState = new ObservableState([]);
const eventsState = new ObservableState([]);

// --- SERVICES ---

/**
 * Tasks Service
 */
export const tasksService = {
  async fetchAll() {
    const user = auth.currentUser;
    if (!user) return;

    return tryApi("tasks.fetchAll", async () => {
      const [tasks, classes] = await Promise.all([
        apiService.getTasks(),
        classesState.isExpired() ? apiService.getClasses() : Promise.resolve(classesState.data),
      ]);
      if (Array.isArray(classes)) {
        classesState.notify(classes);
        classesState.markFetched();
      }
      const classNameMap = buildClassNameMap(classesState.data || []);
      const normalized = (tasks || []).map(task => normalizeTaskRecord(task, classNameMap));
      tasksState.notify(normalized);
      tasksState.markFetched();
      return normalized;
    }, async () => {

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const classesRef = collection(db, "users", user.uid, "classes");

    const [taskSnap, classSnap] = await Promise.all([
      getDocs(tasksRef),
      getDocs(classesRef)
    ]);

    const classes = [];
    classSnap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
    classesState.notify(classes);
    classesState.markFetched();

    const classNameMap = buildClassNameMap(classes);
    const tasks = [];
    taskSnap.forEach(doc => tasks.push(normalizeTaskRecord({ id: doc.id, ...doc.data() }, classNameMap)));

    tasksState.notify(tasks);
    tasksState.markFetched();
    return tasks;
    });
  },

  subscribeToTasks(callback) {
    if (tasksState.isExpired()) this.fetchAll().catch(console.error);
    return tasksState.subscribe(callback);
  },

  async addTask(taskData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const title = sanitize(taskData.title || taskData.text, 500);
    const taskId = generateId("task");
    const taskRef = doc(db, "users", user.uid, "tasks", taskId);

    let uploadedFiles = [];
    if (Array.isArray(taskData.newFiles) && taskData.newFiles.length > 0) {
      const res = await uploadTaskAttachments(taskId, taskData.newFiles);
      uploadedFiles = res.uploaded;
    }

    const newTask = {
      id: taskId, text: title, title, completed: false,
      type: taskData.type || "individual", classId: taskData.classId || null,
      className: taskData.className ? sanitize(taskData.className) : null,
      priority: taskData.priority || "medium", dueDate: taskData.dueDate || null,
      description: sanitize(taskData.description || "", 1200),
      links: sanitizeLinks(taskData.links || []),
      files: [...sanitizeFilesMeta(taskData.files || []), ...uploadedFiles],
      reminder: taskData.dueDate ? normalizeTaskReminder(taskData.reminder) : "none",
      createdAt: Date.now(), updatedAt: Date.now()
    };

    await tryApi(
      "tasks.addTask",
      () => apiService.addTask(newTask),
      () => setDoc(taskRef, { ...newTask, updatedAt: serverTimestamp() })
    );

    // Update local state instantly
    const classNameMap = buildClassNameMap(classesState.data);
    const updatedTasks = [normalizeTaskRecord(newTask, classNameMap), ...tasksState.data];
    tasksState.notify(updatedTasks);

    return newTask;
  },

  async updateTask(taskId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    const existing = tasksState.data.find(t => t.id === taskId) || {};
    
    let nextFiles = sanitizeFilesMeta(updates.files !== undefined ? updates.files : existing.files || []);
    if (Array.isArray(updates.newFiles) && updates.newFiles.length > 0) {
      const res = await uploadTaskAttachments(taskId, updates.newFiles);
      nextFiles = [...nextFiles, ...res.uploaded];
    }

    const nextTitle = (updates.title || updates.text) ? sanitize(updates.title || updates.text, 500) : null;
    const nextDueDate = updates.dueDate !== undefined ? updates.dueDate : existing.dueDate;

    const payload = {
      ...updates,
      files: nextFiles,
      updatedAt: serverTimestamp()
    };
    if (nextTitle) { payload.title = nextTitle; payload.text = nextTitle; }
    if (updates.description !== undefined) payload.description = sanitize(updates.description, 1200);
    if (updates.links !== undefined) payload.links = sanitizeLinks(updates.links);
    if (updates.reminder !== undefined || updates.dueDate !== undefined) {
      payload.reminder = nextDueDate ? normalizeTaskReminder(updates.reminder || existing.reminder) : "none";
    }

    delete payload.newFiles;
    await tryApi(
      "tasks.updateTask",
      () => apiService.updateTask(taskId, { ...payload, updatedAt: Date.now() }),
      () => updateDoc(taskRef, payload)
    );

    // Update local state instantly
    const classNameMap = buildClassNameMap(classesState.data);
    const updatedTasks = tasksState.data.map(t =>
      t.id === taskId ? normalizeTaskRecord({ ...t, ...updates, files: nextFiles, updatedAt: Date.now() }, classNameMap) : t
    );
    tasksState.notify(updatedTasks);
  },

  async toggleTask(taskId, completed) {
    return this.updateTask(taskId, { completed });
  },

  async deleteTask(taskId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    const task = tasksState.data.find(t => t.id === taskId);
    if (task) await deleteTaskAttachments(task.files || []);

    await tryApi(
      "tasks.deleteTask",
      () => apiService.deleteTask(taskId),
      () => deleteDoc(taskRef)
    );

    // Update local state instantly
    tasksState.notify(tasksState.data.filter(t => t.id !== taskId));
  }
};

/**
 * Classes Service
 */
export const classesService = {
  async fetchAll() {
    const user = auth.currentUser;
    if (!user) return;
    return tryApi("classes.fetchAll", async () => {
      const classes = await apiService.getClasses();
      classesState.notify(classes || []);
      classesState.markFetched();
      return classes || [];
    }, async () => {
    const ref = collection(db, "users", user.uid, "classes");
    const snap = await getDocs(ref);
    const classes = [];
    snap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
    classesState.notify(classes);
    classesState.markFetched();
    return classes;
    });
  },

  subscribeToClasses(callback) {
    if (classesState.isExpired()) this.fetchAll().catch(console.error);
    return classesState.subscribe(callback);
  },

  async addClass(classData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const classId = generateId("class");
    const classRef = doc(db, "users", user.uid, "classes", classId);
    const schedules = sanitizeSchedules(classData.schedules || []);

    const newClass = {
      id: classId,
      name: sanitize(classData.name, 100),
      icon: sanitize(classData.icon || "fa-graduation-cap", 50),
      days: schedules.length > 0 ? [...new Set(schedules.map(s => s.day))] : (classData.days || []),
      schedules,
      time: schedules[0]?.time || sanitize(classData.time || "", 20),
      links: sanitizeLinks(classData.links || []),
      room: sanitize(classData.room || "", 50),
      color: classData.color || "#3B82F6",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await tryApi(
      "classes.addClass",
      () => apiService.addClass(newClass),
      () => setDoc(classRef, { ...newClass, updatedAt: serverTimestamp() })
    );
    classesState.notify([...classesState.data, newClass]);
    return newClass;
  },

  async updateClass(classId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const ref = doc(db, "users", user.uid, "classes", classId);
    
    const payload = { ...updates, updatedAt: serverTimestamp() };
    if (updates.schedules) {
      const s = sanitizeSchedules(updates.schedules);
      payload.schedules = s;
      payload.days = [...new Set(s.map(i => i.day))];
      payload.time = s[0]?.time || "";
    }

    await tryApi(
      "classes.updateClass",
      () => apiService.updateClass(classId, { ...payload, updatedAt: Date.now() }),
      () => updateDoc(ref, payload)
    );
    classesState.notify(classesState.data.map(c => c.id === classId ? { ...c, ...updates, updatedAt: Date.now() } : c));
  },

  async deleteClass(classId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    await tryApi(
      "classes.deleteClass",
      () => apiService.deleteClass(classId),
      () => deleteDoc(doc(db, "users", user.uid, "classes", classId))
    );
    classesState.notify(classesState.data.filter(c => c.id !== classId));
  }
};

/**
 * User Profile Service
 */
export const userService = {
  async fetchProfile() {
    const user = auth.currentUser;
    if (!user) {
      console.log("fetchProfile: No user authenticated");
      return;
    }
    return tryApi("user.fetchProfile", async () => {
      const data = await apiService.getProfile();
      profileState.notify(data);
      profileState.markFetched();
      return data;
    }, async () => {
    console.log("fetchProfile: Fetching profile for user:", user.uid);
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    let data = snap.exists() ? snap.data() : null;
    console.log("fetchProfile: Document exists?", snap.exists(), "Data:", data);
    
    // Streak reset logic: if more than 1 day has passed since last claim, streak is broken
    if (data && data.lastStreakClaimDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const diff = differenceInCalendarDays(parseISO(today), parseISO(data.lastStreakClaimDate));
      if (diff > 1) {
        data.streak = 0;
        // Persist the reset to Firestore to ensure consistency across devices/remounts
        await updateDoc(ref, { streak: 0, updatedAt: serverTimestamp() }).catch(err => 
          console.error("Failed to persist streak reset:", err)
        );
      }
    }
    
    profileState.notify(data);
    profileState.markFetched();
    return data;
    });
  },

  async getProfile() {
    if (profileState.isExpired() || !profileState.data) await this.fetchProfile();
    return profileState.data;
  },

  subscribeToProfile(callback) {
    if (profileState.isExpired()) this.fetchProfile().catch(console.error);
    return profileState.subscribe(callback);
  },

  async updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const ref = doc(db, "users", user.uid);
    const payload = { ...updates, lastSync: serverTimestamp(), updatedAt: serverTimestamp() };
    await tryApi(
      "user.updateProfile",
      () => apiService.saveProfile({ ...updates, lastSync: Date.now(), updatedAt: Date.now() }),
      () => setDoc(ref, payload, { merge: true })
    );
    profileState.notify({ ...profileState.data, ...updates });
  },

  async claimLoginStreak() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const userData = snap.exists() ? snap.data() : {};
    const currentStreak = Number(userData.streak || 0);

    const today = format(new Date(), 'yyyy-MM-dd');
    if (userData.lastStreakClaimDate === today) return { alreadyClaimed: true, streak: currentStreak };

    let nextStreak = 1;
    if (userData.lastStreakClaimDate) {
      const diff = differenceInCalendarDays(parseISO(today), parseISO(userData.lastStreakClaimDate));
      if (diff === 1) {
        nextStreak = currentStreak + 1;
      }
    }

    const updates = { 
      streak: nextStreak, 
      lastLoginStreakDate: today, 
      lastStreakClaimDate: today, 
      updatedAt: serverTimestamp() 
    };
    await tryApi(
      "user.claimLoginStreak",
      () => apiService.saveProfile(updates),
      () => setDoc(ref, updates, { merge: true })
    );
    
    profileState.notify({ ...profileState.data, ...updates });
    return { alreadyClaimed: false, streak: nextStreak };
  }
};

/**
 * Study Sessions Service
 */
export const studySessionsService = {
  async fetchSessions() {
    const user = auth.currentUser;
    if (!user) return;
    return tryApi("sessions.fetchSessions", async () => {
      const sessions = await apiService.getStudySessions();
      sessionsState.notify(sessions || []);
      sessionsState.markFetched();
      return sessions || [];
    }, async () => {
    const ref = collection(db, "users", user.uid, "studySessions");
    const q = query(ref, orderBy("completedAt", "desc"), limit(50));
    const snap = await getDocs(q);
    const sessions = [];
    snap.forEach(doc => sessions.push({ id: doc.id, ...doc.data() }));
    sessionsState.notify(sessions);
    sessionsState.markFetched();
    return sessions;
    });
  },

  subscribeToSessions(callback) {
    if (sessionsState.isExpired()) this.fetchSessions().catch(console.error);
    return sessionsState.subscribe(callback);
  },

  async addSession(sessionData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const id = generateId("session");
    const ref = doc(db, "users", user.uid, "studySessions", id);
    const newSession = {
      id, type: sessionData.type || "pomodoro", duration: sessionData.duration || 25,
      taskId: sessionData.taskId || null, taskName: sessionData.taskName || null,
      classId: sessionData.classId || null, className: sessionData.className || null,
      completedAt: Date.now(), createdAt: Date.now()
    };
    await tryApi(
      "sessions.addSession",
      () => apiService.addStudySession(newSession),
      () => setDoc(ref, newSession)
    );
    sessionsState.notify([newSession, ...sessionsState.data.slice(0, 49)]);
    return newSession;
  }
};

/**
 * Uniforms Service
 */
export const uniformsService = {
  async fetchUniforms() {
    const user = auth.currentUser;
    if (!user) return;
    return tryApi("uniforms.fetchUniforms", async () => {
      const data = await apiService.getUniforms();
      uniformsState.notify(data || {});
      uniformsState.markFetched();
      return data || {};
    }, async () => {
    const ref = doc(db, "users", user.uid, "settings", "uniforms");
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data().days || {} : {};
    uniformsState.notify(data);
    uniformsState.markFetched();
    return data;
    });
  },

  subscribeToUniforms(callback) {
    if (uniformsState.isExpired()) this.fetchUniforms().catch(console.error);
    return uniformsState.subscribe(callback);
  },

  async saveUniforms(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    await tryApi(
      "uniforms.saveUniforms",
      () => apiService.saveUniforms(data),
      () => setDoc(doc(db, "users", user.uid, "settings", "uniforms"), { days: data, updatedAt: serverTimestamp() })
    );
    uniformsState.notify(data);
  }
};

/**
 * Study Tools Service
 */
export const studyToolsService = {
  async fetchTools() {
    const user = auth.currentUser;
    if (!user) return;
    return tryApi("tools.fetchTools", async () => {
      const data = sanitizeStudyTools(await apiService.getStudyTools());
      toolsState.notify(data);
      toolsState.markFetched();
      return data;
    }, async () => {
    const ref = doc(db, "users", user.uid, "settings", "studyTools");
    const snap = await getDoc(ref);
    const data = snap.exists() ? sanitizeStudyTools(snap.data().items || []) : [];
    toolsState.notify(data);
    toolsState.markFetched();
    return data;
    });
  },

  subscribeToStudyTools(callback) {
    if (toolsState.isExpired()) this.fetchTools().catch(console.error);
    return toolsState.subscribe(callback);
  },

  async saveStudyTools(items) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const sanitized = sanitizeStudyTools(items);
    await tryApi(
      "tools.saveStudyTools",
      () => apiService.saveStudyTools(sanitized),
      () => setDoc(doc(db, "users", user.uid, "settings", "studyTools"), { items: sanitized, updatedAt: serverTimestamp() }, { merge: true })
    );
    toolsState.notify(sanitized);
    return sanitized;
  },

  async upsertStudyTool(toolData) {
    const current = toolsState.data;
    const id = toolData.id || generateId("studytool");
    const nextTool = { ...toolData, id, updatedAt: Date.now() };
    const idx = current.findIndex(i => i.id === id);
    const nextItems = idx >= 0 ? current.map((i, k) => k === idx ? { ...i, ...nextTool } : i) : [...current, nextTool];
    return this.saveStudyTools(nextItems);
  },

  async deleteStudyTool(id) {
    return this.saveStudyTools(toolsState.data.filter(i => i.id !== id));
  }
};

/**
 * Calendar Events Service
 */
export const calendarEventsService = {
  async fetchEvents() {
    const user = auth.currentUser;
    if (!user) return;
    return tryApi("calendar.fetchEvents", async () => {
      const events = await apiService.getCalendarEvents();
      eventsState.notify(events || []);
      eventsState.markFetched();
      return events || [];
    }, async () => {
    const ref = collection(db, "users", user.uid, "calendarEvents");
    const q = query(ref, orderBy("date", "asc"));
    const snap = await getDocs(q);
    const events = [];
    snap.forEach(d => events.push({ id: d.id, ...d.data() }));
    eventsState.notify(events);
    eventsState.markFetched();
    return events;
    });
  },

  subscribeToEvents(callback) {
    if (eventsState.isExpired()) this.fetchEvents().catch(console.error);
    return eventsState.subscribe(callback);
  },

  async addEvent(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    const id = generateId("cal");
    const newEvent = {
      id, title: sanitize(data.title, 200), colorKey: data.colorKey || "sky",
      date: data.date || "", endDate: data.endDate || null, time: data.time || "",
      description: sanitize(data.description || "", 500), createdAt: Date.now(), updatedAt: Date.now()
    };
    await tryApi(
      "calendar.addEvent",
      () => apiService.addCalendarEvent(newEvent),
      () => setDoc(doc(db, "users", user.uid, "calendarEvents", id), { ...newEvent, updatedAt: serverTimestamp() })
    );
    eventsState.notify([...eventsState.data, newEvent].sort((a,b) => a.date.localeCompare(b.date)));
    return newEvent;
  },

  async updateEvent(id, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    await tryApi(
      "calendar.updateEvent",
      () => apiService.updateCalendarEvent(id, { ...updates, updatedAt: Date.now() }),
      () => updateDoc(doc(db, "users", user.uid, "calendarEvents", id), { ...updates, updatedAt: serverTimestamp() })
    );
    eventsState.notify(eventsState.data.map(e => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e).sort((a,b) => a.date.localeCompare(b.date)));
  },

  async deleteEvent(id) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    await tryApi(
      "calendar.deleteEvent",
      () => apiService.deleteCalendarEvent(id),
      () => deleteDoc(doc(db, "users", user.uid, "calendarEvents", id))
    );
    eventsState.notify(eventsState.data.filter(e => e.id !== id));
  }
};

// Static badge catalog — app-defined, no Firestore read needed
export const BADGE_CATALOG = [
  { id: 'first_session',    icon: 'fa-play-circle',   name: 'First Session',    description: 'Complete your first study session.' },
  { id: 'streak_3',        icon: 'fa-fire',           name: '3-Day Streak',     description: 'Maintain a 3-day login streak.' },
  { id: 'streak_7',        icon: 'fa-fire-alt',       name: 'Week Warrior',     description: 'Maintain a 7-day login streak.' },
  { id: 'streak_30',       icon: 'fa-dragon',         name: 'Monthly Legend',   description: 'Maintain a 30-day login streak.' },
  { id: 'tasks_10',        icon: 'fa-check-double',   name: 'Task Crusher',     description: 'Complete 10 tasks.' },
  { id: 'tasks_50',        icon: 'fa-trophy',         name: 'Productivity Pro', description: 'Complete 50 tasks.' },
  { id: 'focus_1h',        icon: 'fa-hourglass-half', name: '1 Hour Focus',     description: 'Accumulate 1 hour of focus time.' },
  { id: 'focus_10h',       icon: 'fa-hourglass-end',  name: 'Deep Worker',      description: 'Accumulate 10 hours of focus time.' },
  { id: 'focus_50h',       icon: 'fa-brain',          name: 'Focus Master',     description: 'Accumulate 50 hours of focus time.' },
  { id: 'classes_added',   icon: 'fa-graduation-cap', name: 'Scholar',          description: 'Add your first class.' },
  { id: 'night_owl',       icon: 'fa-moon',           name: 'Night Owl',        description: 'Study after 10 PM.' },
  { id: 'early_bird',      icon: 'fa-sun',            name: 'Early Bird',       description: 'Study before 7 AM.' },
];

/**
 * Achievement Service
 */
export const achievementService = {
  fetchBadges() {
    // Badges are defined locally — no Firestore read required
    return Promise.resolve(BADGE_CATALOG);
  },
  async getMyAchievements() {
    const user = auth.currentUser;
    if (!user) {
      console.log("getMyAchievements: No user authenticated");
      return [];
    }
    return tryApi("achievements.getMyAchievements", () => apiService.getAchievements(), async () => {
    console.log("getMyAchievements: Fetching for user:", user.uid);
    const ref = collection(db, "users", user.uid, "achievements");
    console.log("getMyAchievements: Collection path:", ref.path);
    const snap = await getDocs(ref);
    console.log("getMyAchievements: Query successful, docs:", snap.size);
    const achievements = [];
    snap.forEach(doc => achievements.push({ id: doc.id, ...doc.data() }));
    return achievements;
    });
  },
  async unlockBadge(badgeId, badgeName) {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, "users", user.uid, "achievements", badgeId);
    await tryApi(
      "achievements.unlockBadge",
      () => apiService.unlockBadge(badgeId, badgeName),
      () => setDoc(ref, { badgeName, unlockedAt: Date.now() })
    );
  }
};

/**
 * Friend Service
 */
export const friendService = {
  async addFriendByEmail(email) {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");
    return tryApi("friends.addFriendByEmail", () => apiService.addFriendByEmail(email), async () => {
    const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("User not found");
    const friendData = snap.docs[0].data();
    const friendUid = snap.docs[0].id;
    
    const friendRef = doc(db, "users", user.uid, "friends", friendUid);
    await setDoc(friendRef, {
      displayName: friendData.displayName || "Unknown",
      email: friendData.email,
      photoURL: friendData.photoURL || null,
      streak: friendData.streak || 0,
      addedAt: Date.now()
    });
    return friendData;
    });
  },
  async getFriends() {
    const user = auth.currentUser;
    if (!user) return [];
    return tryApi("friends.getFriends", () => apiService.getFriends(), async () => {
    const snap = await getDocs(collection(db, "users", user.uid, "friends"));
    const friends = [];
    snap.forEach(doc => friends.push({ id: doc.id, ...doc.data() }));
    return friends;
    });
  }
};

/**
 * Inbox Service
 */
export const inboxService = {
  async sendMessage(friendUid, content) {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");
    return tryApi("inbox.sendMessage", () => apiService.sendMessage(friendUid, content), async () => {
    const msgId = `msg_${Date.now()}`;
    const ref = doc(db, "users", friendUid, "inbox", msgId);
    await setDoc(ref, {
      fromUid: user.uid,
      fromName: user.displayName || "Someone",
      content,
      timestamp: Date.now(),
      isRead: false
    });
    });
  },
  subscribeToInbox(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    apiService.getInbox()
      .then(callback)
      .catch(error => console.warn("[MariaDB API fallback] inbox.subscribeToInbox:", error));
    const q = query(collection(db, "users", user.uid, "inbox"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const msgs = [];
      snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      callback(msgs);
    });
  }
};

/**
 * Delete all user data from Firestore (for account deletion)
 */
export async function deleteUserData() {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");

  const subcollections = [
    "tasks",
    "classes",
    "studySessions",
    "exams",
    "calendarEvents",
    "achievements",
    "friends",
    "inbox",
  ];

  for (const sub of subcollections) {
    const ref = collection(db, "users", user.uid, sub);
    const snapshot = await getDocs(ref);
    const deletePromises = [];
    snapshot.forEach((d) => {
      deletePromises.push(deleteDoc(doc(db, "users", user.uid, sub, d.id)));
    });
    await Promise.all(deletePromises);
  }

  const settingsRef = doc(db, "users", user.uid, "settings", "uniforms");
  await deleteDoc(settingsRef).catch(() => {});
  const studyToolsRef = doc(db, "users", user.uid, "settings", "studyTools");
  await deleteDoc(studyToolsRef).catch(() => {});

  const userRef = doc(db, "users", user.uid);
  await deleteDoc(userRef);

  // Clear all global states
  tasksState.clear();
  classesState.clear();
  profileState.clear();
  sessionsState.clear();
  uniformsState.clear();
  toolsState.clear();
  eventsState.clear();
}

export default {
  tasks: tasksService,
  classes: classesService,
  user: userService,
  studySessions: studySessionsService,
  achievements: achievementService,
  friends: friendService,
  inbox: inboxService,
  uniforms: uniformsService,
  studyTools: studyToolsService,
  calendarEvents: calendarEventsService,
};
