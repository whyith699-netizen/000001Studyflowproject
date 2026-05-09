import { auth } from "../firebase-config";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

async function request(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  const token = await user.getIdToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `StudyFlow API request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  return user.uid;
};

export const apiService = {
  getProfile: () => request(`/api/users/${getUserId()}`),
  saveProfile: (data) => request("/api/users", { method: "POST", body: JSON.stringify({ uid: getUserId(), ...data }) }),

  getTasks: () => request(`/api/tasks/${getUserId()}`),
  addTask: (data) => request("/api/tasks", { method: "POST", body: JSON.stringify({ userId: getUserId(), ...data }) }),
  updateTask: (id, data) => request(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),

  getClasses: () => request(`/api/classes/${getUserId()}`),
  addClass: (data) => request("/api/classes", { method: "POST", body: JSON.stringify({ userId: getUserId(), ...data }) }),
  updateClass: (id, data) => request(`/api/classes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClass: (id) => request(`/api/classes/${id}`, { method: "DELETE" }),

  getStudyTools: () => request(`/api/study-tools/${getUserId()}`),
  saveStudyTools: (items) => request(`/api/study-tools/${getUserId()}`, { method: "PUT", body: JSON.stringify({ items }) }),

  getStudySessions: () => request(`/api/study-sessions/${getUserId()}`),
  addStudySession: (data) => request(`/api/study-sessions/${getUserId()}`, { method: "POST", body: JSON.stringify(data) }),

  getUniforms: () => request(`/api/uniforms/${getUserId()}`),
  saveUniforms: (days) => request(`/api/uniforms/${getUserId()}`, { method: "PUT", body: JSON.stringify({ days }) }),

  getCalendarEvents: () => request(`/api/calendar-events/${getUserId()}`),
  addCalendarEvent: (data) => request(`/api/calendar-events/${getUserId()}`, { method: "POST", body: JSON.stringify(data) }),
  updateCalendarEvent: (id, data) => request(`/api/calendar-events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCalendarEvent: (id) => request(`/api/calendar-events/${id}`, { method: "DELETE" }),

  getAchievements: () => request(`/api/achievements/${getUserId()}`),
  unlockBadge: (badgeId, badgeName) => request(`/api/achievements/${getUserId()}`, {
    method: "POST",
    body: JSON.stringify({ badgeId, badgeName }),
  }),

  addFriendByEmail: (email) => request(`/api/friends/${getUserId()}`, {
    method: "POST",
    body: JSON.stringify({ email }),
  }),
  getFriends: () => request(`/api/friends/${getUserId()}`),

  getInbox: () => request(`/api/inbox/${getUserId()}`),
  sendMessage: (friendUid, content) => request(`/api/inbox/${friendUid}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  }),
};

export default apiService;
