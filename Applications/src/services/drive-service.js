import { auth } from "../firebase-config";
import {
  clearGoogleDriveAccessToken,
  getGoogleDriveAccessToken,
} from "./google-drive-oauth-service";

const MAX_FILES_PER_UPLOAD = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_NOTES_API_BASE_URL =
  "https://studyflow-notes-worker.studyflow-notes-azz.workers.dev";

function getApiBaseUrl() {
  const configured = String(import.meta.env.VITE_NOTES_API_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return DEFAULT_NOTES_API_BASE_URL;
}

async function getFirebaseToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in.");
  return user.getIdToken();
}

async function request(
  path,
  {
    method = "GET",
    body,
    formData,
    interactiveGoogleAuth = false,
    requireGoogleAuth = true,
    forceReAuth = false,
  } = {},
) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("VITE_NOTES_API_BASE_URL is not configured.");
  }

  const firebaseToken = await getFirebaseToken();
  let googleToken = null;
  if (requireGoogleAuth) {
    try {
      // If forceReAuth is true, clear existing token first
      if (forceReAuth) {
        await clearGoogleDriveAccessToken();
      }
      googleToken = await getGoogleDriveAccessToken({
        interactive: interactiveGoogleAuth || forceReAuth,
        forceReAuth,
      });
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();
      const missingPermission = message.includes(
        "google drive permission is required",
      );
      if (!interactiveGoogleAuth && !forceReAuth && missingPermission) {
        googleToken = await getGoogleDriveAccessToken({
          interactive: true,
        });
      } else {
        throw error;
      }
    }
  }

  const runRequest = async (token) => {
    const headers = {
      Authorization: `Bearer ${firebaseToken}`,
    };
    if (requireGoogleAuth && token) {
      headers["x-google-access-token"] = token;
    }
    const options = {
      method,
      headers,
    };

    if (formData) {
      options.body = formData;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, options);
    } catch {
      throw new Error(
        `Cannot reach API at ${baseUrl}. Make sure backend is running.`,
      );
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(
        payload?.error?.message || `Request failed (${response.status})`,
      );
      err.statusCode = response.status;
      throw err;
    }
    return payload;
  };

  try {
    return await runRequest(googleToken);
  } catch (error) {
    if (requireGoogleAuth && error.statusCode === 401) {
      clearGoogleDriveAccessToken();
      googleToken = await getGoogleDriveAccessToken({
        interactive: true,
        forceRefresh: true,
      });
      return runRequest(googleToken);
    }
    throw error;
  }
}

function extractFiles(payload) {
  return Array.isArray(payload?.data?.files) ? payload.data.files : [];
}

export const driveService = {
  maxFilesPerUpload: MAX_FILES_PER_UPLOAD,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,

  async getStatus() {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("VITE_NOTES_API_BASE_URL is not configured.");
    }
    const firebaseToken = await getFirebaseToken();
    let response;
    try {
      response = await fetch(`${baseUrl}/v1/drive/status`, {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      });
    } catch {
      throw new Error(
        `Cannot reach API at ${baseUrl}. Make sure backend is running.`,
      );
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.error?.message || "Failed to load Drive status.",
      );
    }
    return payload.data;
  },

  async connectFolder(folderLinkOrId, forceReAuth = true) {
    const payload = await request("/v1/drive/connect", {
      method: "POST",
      body: { folderLinkOrId, forceReAuth },
      interactiveGoogleAuth: true,
      forceReAuth,
    });
    return payload.data;
  },

  async listFiles({ pageSize = 30, pageToken = "", parentId = "" } = {}) {
    const query = new URLSearchParams({
      pageSize: String(pageSize),
      pageToken,
    });
    if (parentId) query.set("parentId", parentId);
    const payload = await request(`/v1/drive/files?${query.toString()}`, {
      interactiveGoogleAuth: false,
    });
    return {
      folderId: payload?.data?.folderId || null,
      folderName: payload?.data?.folderName || null,
      currentFolderId: payload?.data?.currentFolderId || null,
      currentFolderName: payload?.data?.currentFolderName || null,
      files: extractFiles(payload),
      nextPageToken: payload?.meta?.nextPageToken || null,
    };
  },

  async uploadFiles(files, { parentId = "" } = {}) {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return [];
    if (selectedFiles.length > MAX_FILES_PER_UPLOAD) {
      throw new Error(`Maximum ${MAX_FILES_PER_UPLOAD} files per upload.`);
    }
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`${file.name} exceeds 10MB limit.`);
      }
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    if (parentId) formData.append("parentId", parentId);
    const payload = await request("/v1/drive/upload", {
      method: "POST",
      formData,
      interactiveGoogleAuth: false,
    });
    return extractFiles(payload);
  },

  async createFolder(name, { parentId = "" } = {}) {
    const payload = await request("/v1/drive/folders", {
      method: "POST",
      body: { name, parentId: parentId || undefined },
      interactiveGoogleAuth: true,
    });
    return payload?.data?.item || null;
  },

  async createNoteFile(
    name,
    { type = "txt", content = "", parentId = "" } = {},
  ) {
    const payload = await request("/v1/drive/notes", {
      method: "POST",
      body: {
        name,
        type,
        content,
        parentId: parentId || undefined,
      },
      interactiveGoogleAuth: true,
    });
    return payload?.data?.item || null;
  },

  async getItemContent(fileId) {
    if (!fileId) throw new Error("fileId is required.");
    const payload = await request(
      `/v1/drive/items/${encodeURIComponent(fileId)}/content`,
      {
        interactiveGoogleAuth: false,
      },
    );
    return {
      item: payload?.data?.item || null,
      content: String(payload?.data?.content || ""),
      editable: Boolean(payload?.data?.editable),
    };
  },

  async updateItemContent(fileId, content) {
    if (!fileId) throw new Error("fileId is required.");
    const payload = await request(
      `/v1/drive/items/${encodeURIComponent(fileId)}/content`,
      {
        method: "PUT",
        body: { content: String(content || "") },
        interactiveGoogleAuth: true,
      },
    );
    return payload?.data?.item || null;
  },

  async updateItem(fileId, { name, parentId } = {}) {
    if (!fileId) throw new Error("fileId is required.");
    const payload = await request(
      `/v1/drive/items/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: {
          name: name !== undefined ? String(name) : undefined,
          parentId: parentId !== undefined ? String(parentId) : undefined,
        },
        interactiveGoogleAuth: true,
      },
    );
    return payload?.data?.item || null;
  },

  async deleteItem(fileId, { permanent = false } = {}) {
    if (!fileId) throw new Error("fileId is required.");
    const query = new URLSearchParams({
      permanent: permanent ? "1" : "0",
    });
    const payload = await request(
      `/v1/drive/items/${encodeURIComponent(fileId)}?${query.toString()}`,
      {
        method: "DELETE",
        interactiveGoogleAuth: true,
      },
    );
    return payload?.data || { deleted: true };
  },

  async disconnect() {
    const payload = await request("/v1/drive/disconnect", {
      method: "POST",
      body: {},
      requireGoogleAuth: false,
    });
    clearGoogleDriveAccessToken();
    return payload.data;
  },
};
