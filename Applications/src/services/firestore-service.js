/**
 * Firestore Service for Study Flow Web App
 * Handles data sync with Chrome Extension via shared Firebase
 */

import { db, auth } from "../firebase-config";
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
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { normalizeTaskReminder } from "../config/taskReminderOptions";

// Generate unique ID
const generateId = (prefix = "item") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Input validation helpers
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
    mon: "monday",
    monday: "monday",
    senin: "monday",
    tue: "tuesday",
    tuesday: "tuesday",
    selasa: "tuesday",
    wed: "wednesday",
    wednesday: "wednesday",
    rabu: "wednesday",
    thu: "thursday",
    thursday: "thursday",
    kamis: "thursday",
    fri: "friday",
    friday: "friday",
    jumat: "friday",
    sat: "saturday",
    saturday: "saturday",
    sabtu: "saturday",
    sun: "sunday",
    sunday: "sunday",
    minggu: "sunday",
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
      const time =
        fallbackTime || (startTime && endTime ? `${startTime} - ${endTime}` : "");
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
      const category = canEmbed ? "embedded" : "external";
      const embedUrl = canEmbed
        ? sanitizeUrl(item?.embedUrl || launchUrl) || launchUrl
        : "";

      return {
        id: sanitize(item?.id || "", 120),
        name: sanitize(item?.name || "", 120),
        description: sanitize(item?.description || "", 280),
        launchUrl,
        embedUrl,
        canEmbed,
        category,
        icon: sanitize(item?.icon || "", 60) || null,
        createdAt: Number.isFinite(item?.createdAt) ? item.createdAt : Date.now(),
        updatedAt: Number.isFinite(item?.updatedAt) ? item.updatedAt : Date.now(),
      };
    })
    .filter((item) => item && item.id && item.name);

const toDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Tasks Service
 */
export const tasksService = {
  async getTasks() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const snapshot = await getDocs(tasksRef);

    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    return tasks;
  },

  subscribeToTasks(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const tasksRef = collection(db, "users", user.uid, "tasks");

    return onSnapshot(
      tasksRef,
      (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
      },
      (error) => {
        console.error("Tasks subscription error:", error);
      },
    );
  },

  async addTask(taskData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const title = sanitize(taskData.title || taskData.text, 500);
    if (!title) throw new Error("Task title is required");

    const taskId = generateId("task");
    const taskRef = doc(db, "users", user.uid, "tasks", taskId);

    let uploadedFiles = [];
    let attachmentErrors = [];
    if (Array.isArray(taskData.newFiles) && taskData.newFiles.length > 0) {
      const uploadResult = await uploadTaskAttachments(
        taskId,
        taskData.newFiles,
      );
      uploadedFiles = uploadResult.uploaded;
      attachmentErrors = uploadResult.failed;
    }

    const normalizedReminder = taskData.dueDate
      ? normalizeTaskReminder(taskData.reminder)
      : "none";

    const newTask = {
      id: taskId,
      text: title,
      title,
      completed: false,
      type: taskData.type || "individual",
      classId: taskData.classId || null,
      className: taskData.className ? sanitize(taskData.className) : null,
      priority: ["low", "medium", "high"].includes(taskData.priority)
        ? taskData.priority
        : "medium",
      dueDate: taskData.dueDate || null,
      description: sanitize(taskData.description || "", 1200),
      links: sanitizeLinks(taskData.links || []),
      files: [...sanitizeFilesMeta(taskData.files || []), ...uploadedFiles],
      reminder: normalizedReminder,
      createdAt: Date.now(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(taskRef, newTask);
    return { ...newTask, attachmentErrors };
  },

  async updateTask(taskId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    const existing = taskSnap.exists() ? taskSnap.data() : {};
    let nextFiles = sanitizeFilesMeta(
      updates.files !== undefined ? updates.files : existing.files || [],
    );

    if (Array.isArray(updates.newFiles) && updates.newFiles.length > 0) {
      const uploadResult = await uploadTaskAttachments(
        taskId,
        updates.newFiles,
      );
      nextFiles = [...nextFiles, ...uploadResult.uploaded];
    }

    const nextTitle =
      updates.title !== undefined || updates.text !== undefined
        ? sanitize(updates.title || updates.text, 500)
        : null;

    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    const nextDueDate =
      updates.dueDate !== undefined
        ? updates.dueDate || null
        : existing.dueDate || null;

    if (nextTitle !== null) {
      payload.title = nextTitle;
      payload.text = nextTitle;
    }
    if (updates.description !== undefined)
      payload.description = sanitize(updates.description || "", 1200);
    if (updates.links !== undefined)
      payload.links = sanitizeLinks(updates.links || []);
    payload.files = nextFiles;
    if (updates.reminder !== undefined || updates.dueDate !== undefined) {
      const requestedReminder =
        updates.reminder !== undefined ? updates.reminder : existing.reminder;
      payload.reminder = nextDueDate
        ? normalizeTaskReminder(requestedReminder)
        : "none";
    }

    delete payload.newFiles;
    await updateDoc(taskRef, payload);
  },

  async toggleTask(taskId, completed) {
    return this.updateTask(taskId, { completed });
  },

  async deleteTask(taskId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
      const data = taskSnap.data();
      await deleteTaskAttachments(data.files || []);
    }
    await deleteDoc(taskRef);
  },
};

/**
 * Classes Service
 */
export const classesService = {
  async getClasses() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const classesRef = collection(db, "users", user.uid, "classes");
    const snapshot = await getDocs(classesRef);

    const classes = [];
    snapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() });
    });

    return classes;
  },

  subscribeToClasses(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const classesRef = collection(db, "users", user.uid, "classes");

    return onSnapshot(
      classesRef,
      (snapshot) => {
        const classes = [];
        snapshot.forEach((doc) => {
          classes.push({ id: doc.id, ...doc.data() });
        });
        callback(classes);
      },
      (error) => {
        console.error("Classes subscription error:", error);
      },
    );
  },

  async addClass(classData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const name = sanitize(classData.name, 100);
    if (!name) throw new Error("Class name is required");

    const schedules = sanitizeSchedules(classData.schedules || []);
    const normalizedDays =
      schedules.length > 0
        ? [...new Set(schedules.map((entry) => entry.day))]
        : sanitizeArray(classData.days || [], 7)
            .map(normalizeDay)
            .filter(Boolean);
    const fallbackTime = sanitize(classData.time || "", 20);
    const resolvedTime = schedules[0]?.time || fallbackTime || "";

    const classId = generateId("class");
    const classRef = doc(db, "users", user.uid, "classes", classId);

    const newClass = {
      id: classId,
      name,
      icon: sanitize(classData.icon || "fa-graduation-cap", 50),
      days: normalizedDays,
      schedules,
      time: resolvedTime,
      links: sanitizeLinks(classData.links || []),
      room: sanitize(classData.room || "", 50),
      color: classData.color || "#3B82F6",
      createdAt: Date.now(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(classRef, newClass);
    return newClass;
  },

  async updateClass(classId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const classRef = doc(db, "users", user.uid, "classes", classId);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) payload.name = sanitize(updates.name, 100);
    if (updates.icon !== undefined)
      payload.icon = sanitize(updates.icon || "fa-graduation-cap", 50);
    if (updates.room !== undefined)
      payload.room = sanitize(updates.room || "", 50);
    if (updates.links !== undefined)
      payload.links = sanitizeLinks(updates.links || []);

    if (updates.schedules !== undefined) {
      const schedules = sanitizeSchedules(updates.schedules || []);
      payload.schedules = schedules;
      payload.days = [...new Set(schedules.map((entry) => entry.day))];
      payload.time =
        schedules[0]?.time || sanitize(updates.time || "", 20) || "";
    } else if (updates.days !== undefined) {
      payload.days = sanitizeArray(updates.days || [], 7)
        .map(normalizeDay)
        .filter(Boolean);
      if (updates.time !== undefined)
        payload.time = sanitize(updates.time || "", 20);
    }

    await updateDoc(classRef, payload);
  },

  async deleteClass(classId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const classRef = doc(db, "users", user.uid, "classes", classId);
    await deleteDoc(classRef);
  },
};

/**
 * User Profile Service
 */
export const userService = {
  async getProfile() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  },

  async updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    const payload = {
      ...updates,
      lastSync: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!snapshot.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
  },

  subscribeToProfile(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const userRef = doc(db, "users", user.uid);
    return onSnapshot(
      userRef,
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.error("Profile subscription error:", error);
      },
    );
  },

  async updateLoginStreak() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    const userData = snapshot.exists() ? snapshot.data() : {};

    const today = toDateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toDateKey(yesterdayDate);

    const previousDate = userData.lastLoginStreakDate || null;
    const currentStreak = Number.parseInt(userData.streak, 10);
    let nextStreak = Number.isNaN(currentStreak) ? 0 : currentStreak;

    if (previousDate === today) {
      // Already counted today.
    } else if (previousDate === yesterday) {
      nextStreak += 1;
    } else {
      nextStreak = 1;
    }

    await setDoc(
      userRef,
      {
        streak: nextStreak,
        lastLoginStreakDate: today,
        lastLogin: new Date().toISOString(),
        lastSync: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async claimLoginStreak() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    const userData = snapshot.exists() ? snapshot.data() : {};

    const today = toDateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toDateKey(yesterdayDate);

    const alreadyClaimed = userData.lastStreakClaimDate === today;
    if (alreadyClaimed) {
      return {
        alreadyClaimed: true,
        streak: Number.parseInt(userData.streak, 10) || 0,
      };
    }

    const previousDate = userData.lastLoginStreakDate || null;
    const currentStreak = Number.parseInt(userData.streak, 10);
    let nextStreak = Number.isNaN(currentStreak) ? 0 : currentStreak;

    if (previousDate === yesterday) {
      nextStreak += 1;
    } else if (previousDate === today) {
      nextStreak = nextStreak || 1;
    } else {
      nextStreak = 1;
    }

    await setDoc(
      userRef,
      {
        streak: nextStreak,
        lastLoginStreakDate: today,
        lastStreakClaimDate: today,
        lastLogin: new Date().toISOString(),
        lastSync: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      alreadyClaimed: false,
      streak: nextStreak,
    };
  },
};

/**
 * Study Sessions Service
 */
export const studySessionsService = {
  subscribeToSessions(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const sessionsRef = collection(db, "users", user.uid, "studySessions");
    const q = query(sessionsRef, orderBy("completedAt", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const sessions = [];
        snapshot.forEach((doc) => {
          sessions.push({ id: doc.id, ...doc.data() });
        });
        callback(sessions);
      },
      (error) => {
        console.error("Sessions subscription error:", error);
      },
    );
  },

  async getSessionsForWeek() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const sessionsRef = collection(db, "users", user.uid, "studySessions");
    const snapshot = await getDocs(sessionsRef);

    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return sessions;
  },

  async addSession(sessionData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const sessionId = generateId("session");
    const sessionRef = doc(db, "users", user.uid, "studySessions", sessionId);

    const newSession = {
      id: sessionId,
      type: sessionData.type || "pomodoro",
      duration: sessionData.duration || 25,
      taskId: sessionData.taskId || null,
      taskName: sessionData.taskName || null,
      completedAt: Date.now(),
      createdAt: Date.now(),
    };

    await setDoc(sessionRef, newSession);

    return newSession;
  },
};

/**
 * Uniforms Service - Custom uniform per day
 */
export const uniformsService = {
  async getUniforms() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const uniformsRef = doc(db, "users", user.uid, "settings", "uniforms");
    const snapshot = await getDoc(uniformsRef);

    if (snapshot.exists()) {
      return snapshot.data().days || {};
    }
    return {};
  },

  subscribeToUniforms(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const uniformsRef = doc(db, "users", user.uid, "settings", "uniforms");

    return onSnapshot(
      uniformsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data().days || {});
        } else {
          callback({});
        }
      },
      (error) => {
        console.error("Uniforms subscription error:", error);
      },
    );
  },

  async saveUniforms(uniformsData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const uniformsRef = doc(db, "users", user.uid, "settings", "uniforms");
    await setDoc(uniformsRef, {
      days: uniformsData,
      updatedAt: serverTimestamp(),
    });
  },
};

/**
 * Study Tools Service
 */
export const studyToolsService = {
  async getStudyTools() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const ref = doc(db, "users", user.uid, "settings", "studyTools");
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return [];
    return sanitizeStudyTools(snapshot.data().items || []);
  },

  subscribeToStudyTools(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const ref = doc(db, "users", user.uid, "settings", "studyTools");
    return onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }
        callback(sanitizeStudyTools(snapshot.data().items || []));
      },
      (error) => {
        console.error("StudyTools subscription error:", error);
      },
    );
  },

  async saveStudyTools(items) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const ref = doc(db, "users", user.uid, "settings", "studyTools");
    const sanitizedItems = sanitizeStudyTools(items);
    await setDoc(
      ref,
      {
        items: sanitizedItems,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return sanitizedItems;
  },

  async upsertStudyTool(toolData) {
    const currentItems = await this.getStudyTools();
    const now = Date.now();
    const nextTool = {
      ...toolData,
      id: toolData.id || generateId("studytool"),
      createdAt:
        toolData.createdAt ||
        currentItems.find((item) => item.id === toolData.id)?.createdAt ||
        now,
      updatedAt: now,
    };

    const existingIndex = currentItems.findIndex((item) => item.id === nextTool.id);
    const nextItems =
      existingIndex >= 0
        ? currentItems.map((item, index) =>
            index === existingIndex ? { ...item, ...nextTool } : item,
          )
        : [...currentItems, nextTool];

    const saved = await this.saveStudyTools(nextItems);
    return saved.find((item) => item.id === nextTool.id) || null;
  },

  async deleteStudyTool(toolId) {
    const currentItems = await this.getStudyTools();
    const nextItems = currentItems.filter((item) => item.id !== toolId);
    await this.saveStudyTools(nextItems);
  },
};

/**
 * Calendar Events Service
 */
const CALENDAR_EVENT_COLOR_KEYS = [
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
  "teal",
];

const pickRandomCalendarColorKey = () =>
  CALENDAR_EVENT_COLOR_KEYS[
    Math.floor(Math.random() * CALENDAR_EVENT_COLOR_KEYS.length)
  ];

export const calendarEventsService = {
  subscribeToEvents(callback) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const ref = collection(db, "users", user.uid, "calendarEvents");
    const q = query(ref, orderBy("date", "asc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const events = [];
        snapshot.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));
        callback(events);
      },
      (error) => {
        console.error("CalendarEvents subscription error:", error);
      },
    );
  },

  async addEvent(eventData) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const id = generateId("cal");
    const ref = doc(db, "users", user.uid, "calendarEvents", id);
    const newEvent = {
      id,
      title: sanitize(eventData.title, 200),
      colorKey: CALENDAR_EVENT_COLOR_KEYS.includes(eventData.colorKey)
        ? eventData.colorKey
        : pickRandomCalendarColorKey(),
      date: eventData.date || "",
      endDate: eventData.endDate || null,
      time: eventData.time || "",
      description: sanitize(eventData.description || "", 500),
      createdAt: Date.now(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, newEvent);
    return newEvent;
  },

  async updateEvent(eventId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const ref = doc(db, "users", user.uid, "calendarEvents", eventId);
    const payload = {
      title: sanitize(updates.title || "", 200),
      date: updates.date || "",
      endDate: updates.endDate !== undefined ? updates.endDate : null,
      time: updates.time || "",
      description: sanitize(updates.description || "", 500),
      updatedAt: serverTimestamp(),
    };

    if (updates.colorKey && CALENDAR_EVENT_COLOR_KEYS.includes(updates.colorKey)) {
      payload.colorKey = updates.colorKey;
    }

    await updateDoc(ref, payload);
  },

  async deleteEvent(eventId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const ref = doc(db, "users", user.uid, "calendarEvents", eventId);
    await deleteDoc(ref);
  },
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
}

export default {
  tasks: tasksService,
  classes: classesService,
  user: userService,
  studySessions: studySessionsService,
  uniforms: uniformsService,
  studyTools: studyToolsService,
  calendarEvents: calendarEventsService,
};
