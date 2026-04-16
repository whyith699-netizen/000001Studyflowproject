import { auth } from '../firebase-config';

export const NOTES_MAX_FILES_PER_NOTE = 10;
export const NOTES_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const NOTES_CACHE_KEY = 'studyflow-notes-cache-v1';
const NOTES_QUEUE_KEY = 'studyflow-notes-queue-v1';
const pendingFileUploads = new Map();
let isSyncInitialized = false;
const DEFAULT_NOTES_API_BASE_URL =
  'https://studyflow-notes-worker.studyflow-notes-azz.workers.dev';

const isBrowser = typeof window !== 'undefined';

function getApiBaseUrl() {
  const configured = String(import.meta.env.VITE_NOTES_API_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return DEFAULT_NOTES_API_BASE_URL;
}

function ensureApiBaseUrl() {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('VITE_NOTES_API_BASE_URL is not configured.');
  }
  return base;
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in');
  return user.getIdToken();
}

function sortNotes(notes) {
  return [...notes].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function readJsonStorage(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function loadCachedNotes() {
  const cached = readJsonStorage(NOTES_CACHE_KEY, []);
  return Array.isArray(cached) ? sortNotes(cached) : [];
}

function saveCachedNotes(notes) {
  writeJsonStorage(NOTES_CACHE_KEY, sortNotes(notes));
}

function loadQueue() {
  const queue = readJsonStorage(NOTES_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

function saveQueue(queue) {
  writeJsonStorage(NOTES_QUEUE_KEY, queue);
}

function enqueueOperation(operation) {
  const queue = loadQueue();
  queue.push({
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...operation,
  });
  saveQueue(queue);
}

function normalizeAttachment(attachment) {
  return {
    id: attachment.id,
    noteId: attachment.noteId || attachment.note_id,
    name: attachment.name || 'attachment',
    mimeType: attachment.mimeType || attachment.mime_type || 'application/octet-stream',
    sizeBytes: attachment.sizeBytes || attachment.size_bytes || 0,
    storagePath: attachment.storagePath || attachment.storage_path || null,
    url: attachment.url || null,
    createdAt: attachment.createdAt || attachment.created_at || new Date().toISOString(),
  };
}

function normalizeNote(note) {
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    tags: Array.isArray(note.tags) ? note.tags : [],
    createdAt: note.createdAt || note.created_at || new Date().toISOString(),
    updatedAt: note.updatedAt || note.updated_at || new Date().toISOString(),
    attachments: Array.isArray(note.attachments)
      ? note.attachments.map(normalizeAttachment)
      : [],
  };
}

function upsertCachedNote(note) {
  const cached = loadCachedNotes();
  const normalized = normalizeNote(note);
  const next = cached.filter((item) => item.id !== normalized.id);
  next.push(normalized);
  saveCachedNotes(next);
  return sortNotes(next);
}

function removeCachedNote(noteId) {
  const cached = loadCachedNotes();
  const next = cached.filter((item) => item.id !== noteId);
  saveCachedNotes(next);
  return sortNotes(next);
}

function replaceCachedNoteId(tempId, persistedNote) {
  const cached = loadCachedNotes();
  const next = cached.filter((item) => item.id !== tempId && item.id !== persistedNote.id);
  next.push(normalizeNote(persistedNote));
  saveCachedNotes(next);
  return sortNotes(next);
}

function replaceQueueNoteId(tempId, persistedId) {
  const queue = loadQueue();
  const next = queue.map((entry) => {
    if (entry.noteId === tempId) {
      return { ...entry, noteId: persistedId };
    }
    return entry;
  });
  saveQueue(next);
}

function resolveNoteId(idMap, noteId) {
  return idMap.get(noteId) || noteId;
}

function isOnline() {
  if (!isBrowser) return true;
  return window.navigator.onLine;
}

function filterBySearch(notes, search) {
  const normalizedSearch = (search || '').trim().toLowerCase();
  if (!normalizedSearch) return notes;
  return notes.filter((note) => {
    return (
      (note.title || '').toLowerCase().includes(normalizedSearch) ||
      (note.content || '').toLowerCase().includes(normalizedSearch)
    );
  });
}

async function requestJson(path, { method = 'GET', body, formData } = {}) {
  const baseUrl = ensureApiBaseUrl();
  const token = await getAuthToken();
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const requestInit = {
    method,
    headers,
  };

  if (formData) {
    requestInit.body = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, requestInit);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function queuePendingFiles(noteId, files) {
  if (!Array.isArray(files) || files.length === 0) return;
  const existing = pendingFileUploads.get(noteId) || [];
  const next = [...existing, ...files].slice(0, NOTES_MAX_FILES_PER_NOTE);
  pendingFileUploads.set(noteId, next);
}

function updateNoteAttachmentsInCache(noteId, transformFn) {
  const cached = loadCachedNotes();
  const next = cached.map((note) => {
    if (note.id !== noteId) return note;
    return {
      ...note,
      attachments: transformFn(note.attachments || []),
      updatedAt: new Date().toISOString(),
    };
  });
  saveCachedNotes(next);
  return sortNotes(next);
}

async function flushPendingOperations() {
  if (!isOnline()) return { flushed: 0, remaining: loadQueue().length };
  let queue = loadQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const idMap = new Map();
  const remaining = [];
  let flushed = 0;

  for (const operation of queue) {
    try {
      if (operation.type === 'create') {
        const payload = await requestJson('/v1/notes', {
          method: 'POST',
          body: operation.payload,
        });
        const note = normalizeNote(payload.data);
        idMap.set(operation.noteId, note.id);
        replaceCachedNoteId(operation.noteId, note);
        replaceQueueNoteId(operation.noteId, note.id);
        if (pendingFileUploads.has(operation.noteId)) {
          pendingFileUploads.set(note.id, pendingFileUploads.get(operation.noteId));
          pendingFileUploads.delete(operation.noteId);
        }
        flushed += 1;
        continue;
      }

      const resolvedNoteId = resolveNoteId(idMap, operation.noteId);
      if (resolvedNoteId.startsWith('local_')) {
        remaining.push(operation);
        continue;
      }

      if (operation.type === 'update') {
        const payload = await requestJson(`/v1/notes/${resolvedNoteId}`, {
          method: 'PUT',
          body: operation.payload,
        });
        upsertCachedNote(payload.data);
        flushed += 1;
        continue;
      }

      if (operation.type === 'delete') {
        await requestJson(`/v1/notes/${resolvedNoteId}`, { method: 'DELETE' });
        removeCachedNote(resolvedNoteId);
        flushed += 1;
        continue;
      }

      if (operation.type === 'delete_file') {
        await requestJson(`/v1/notes/${resolvedNoteId}/files/${operation.fileId}`, {
          method: 'DELETE',
        });
        updateNoteAttachmentsInCache(resolvedNoteId, (attachments) =>
          attachments.filter((file) => file.id !== operation.fileId),
        );
        flushed += 1;
        continue;
      }
    } catch (error) {
      remaining.push(operation);
      if (/must be logged in|unauthenticated|expired/i.test(error?.message || '')) {
        remaining.push(...queue.slice(queue.indexOf(operation) + 1));
        break;
      }
    }
  }

  saveQueue(remaining);
  return { flushed, remaining: remaining.length };
}

async function uploadAttachmentsOnline(noteId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const payload = await requestJson(`/v1/notes/${noteId}/files`, {
    method: 'POST',
    formData,
  });
  const uploaded = Array.isArray(payload.data) ? payload.data.map(normalizeAttachment) : [];
  updateNoteAttachmentsInCache(noteId, (attachments) => [...attachments, ...uploaded]);
  return uploaded;
}

async function flushPendingFileUploads() {
  if (!isOnline()) return { flushed: 0, pending: pendingFileUploads.size };

  let flushed = 0;
  for (const [noteId, files] of pendingFileUploads.entries()) {
    if (!files?.length) {
      pendingFileUploads.delete(noteId);
      continue;
    }
    if (noteId.startsWith('local_')) continue;
    try {
      await uploadAttachmentsOnline(noteId, files);
      pendingFileUploads.delete(noteId);
      flushed += files.length;
    } catch (error) {
      console.error('Failed to flush pending file uploads:', error);
    }
  }

  return { flushed, pending: pendingFileUploads.size };
}

function initializeSyncListeners() {
  if (!isBrowser || isSyncInitialized) return;
  isSyncInitialized = true;

  window.addEventListener('online', async () => {
    try {
      await flushPendingOperations();
      await flushPendingFileUploads();
    } catch (error) {
      console.error('Failed to flush pending notes sync:', error);
    }
  });
}

initializeSyncListeners();

export const notesApiService = {
  getCachedNotes() {
    return loadCachedNotes();
  },

  getPendingQueueSize() {
    return loadQueue().length;
  },

  async syncNow() {
    const operations = await flushPendingOperations();
    const files = await flushPendingFileUploads();
    return {
      operationsFlushed: operations.flushed,
      operationsRemaining: operations.remaining,
      filesFlushed: files.flushed,
      filesPending: files.pending,
    };
  },

  async listNotes({ search = '', page = 1, limit = 30 } = {}) {
    if (isOnline()) {
      try {
        await this.syncNow();
        const query = new URLSearchParams({
          search,
          page: String(page),
          limit: String(limit),
        });
        const payload = await requestJson(`/v1/notes?${query.toString()}`);
        const notes = Array.isArray(payload.data) ? payload.data.map(normalizeNote) : [];
        saveCachedNotes(notes);
        return {
          notes: sortNotes(notes),
          meta: payload.meta || { page, limit, total: notes.length },
          source: 'remote',
        };
      } catch (error) {
        console.error('Failed to load notes from API, using cache:', error);
      }
    }

    const cached = filterBySearch(loadCachedNotes(), search);
    return {
      notes: cached,
      meta: { page: 1, limit: cached.length, total: cached.length },
      source: 'cache',
    };
  },

  async createNote(payload) {
    const notePayload = {
      title: (payload?.title || '').trim() || 'Untitled note',
      content: payload?.content || '',
      tags: Array.isArray(payload?.tags) ? payload.tags : [],
    };

    if (isOnline()) {
      try {
        const response = await requestJson('/v1/notes', {
          method: 'POST',
          body: notePayload,
        });
        const note = normalizeNote(response.data);
        upsertCachedNote(note);
        return { note, queued: false };
      } catch (error) {
        console.error('Online create failed, fallback to queue:', error);
      }
    }

    const localNote = normalizeNote({
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: notePayload.title,
      content: notePayload.content,
      tags: notePayload.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
    });
    upsertCachedNote(localNote);
    enqueueOperation({
      type: 'create',
      noteId: localNote.id,
      payload: notePayload,
    });
    return { note: localNote, queued: true };
  },

  async updateNote(noteId, payload) {
    const updatePayload = {};
    if (payload?.title !== undefined) updatePayload.title = String(payload.title).trim();
    if (payload?.content !== undefined) updatePayload.content = String(payload.content);
    if (payload?.tags !== undefined) updatePayload.tags = Array.isArray(payload.tags) ? payload.tags : [];

    if (Object.keys(updatePayload).length === 0) {
      return { note: loadCachedNotes().find((item) => item.id === noteId) || null, queued: false };
    }

    if (isOnline() && !noteId.startsWith('local_')) {
      try {
        const response = await requestJson(`/v1/notes/${noteId}`, {
          method: 'PUT',
          body: updatePayload,
        });
        const note = normalizeNote(response.data);
        upsertCachedNote(note);
        return { note, queued: false };
      } catch (error) {
        console.error('Online update failed, fallback to queue:', error);
      }
    }

    const cached = loadCachedNotes();
    const current = cached.find((item) => item.id === noteId);
    const fallbackNote = normalizeNote({
      ...current,
      ...updatePayload,
      id: noteId,
      updatedAt: new Date().toISOString(),
    });
    upsertCachedNote(fallbackNote);
    enqueueOperation({
      type: 'update',
      noteId,
      payload: updatePayload,
    });
    return { note: fallbackNote, queued: true };
  },

  async deleteNote(noteId) {
    if (isOnline() && !noteId.startsWith('local_')) {
      try {
        await requestJson(`/v1/notes/${noteId}`, { method: 'DELETE' });
        removeCachedNote(noteId);
        return { queued: false };
      } catch (error) {
        console.error('Online delete failed, fallback to queue:', error);
      }
    }

    removeCachedNote(noteId);
    enqueueOperation({
      type: 'delete',
      noteId,
    });
    return { queued: true };
  },

  async uploadAttachments(noteId, files) {
    const selected = Array.from(files || []);
    if (selected.length === 0) {
      return { uploaded: [], queued: false };
    }
    if (selected.length > NOTES_MAX_FILES_PER_NOTE) {
      throw new Error(`You can upload up to ${NOTES_MAX_FILES_PER_NOTE} files per note.`);
    }

    selected.forEach((file) => {
      if (file.size > NOTES_MAX_FILE_SIZE_BYTES) {
        throw new Error(`${file.name} exceeds 10MB limit.`);
      }
    });

    if (!isOnline() || noteId.startsWith('local_')) {
      queuePendingFiles(noteId, selected);
      return {
        uploaded: [],
        queued: true,
        pendingFiles: selected.map((file) => file.name),
      };
    }

    const uploaded = await uploadAttachmentsOnline(noteId, selected);
    return {
      uploaded,
      queued: false,
      pendingFiles: [],
    };
  },

  async deleteAttachment(noteId, fileId) {
    if (isOnline() && !noteId.startsWith('local_')) {
      try {
        await requestJson(`/v1/notes/${noteId}/files/${fileId}`, {
          method: 'DELETE',
        });
        updateNoteAttachmentsInCache(noteId, (attachments) =>
          attachments.filter((file) => file.id !== fileId),
        );
        return { queued: false };
      } catch (error) {
        console.error('Online attachment delete failed, fallback to queue:', error);
      }
    }

    updateNoteAttachmentsInCache(noteId, (attachments) =>
      attachments.filter((file) => file.id !== fileId),
    );
    enqueueOperation({
      type: 'delete_file',
      noteId,
      fileId,
    });
    return { queued: true };
  },
};
