import { storage, auth } from '../firebase-config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_TASK = 8;

const isValidFile = (file) =>
  typeof File !== 'undefined' &&
  file instanceof File &&
  typeof file.name === 'string' &&
  file.name.trim().length > 0 &&
  Number.isFinite(file.size) &&
  file.size > 0;

const sanitizeFileName = (name) => name.replace(/[^\w.\- ]+/g, '_').trim();

export async function uploadTaskAttachments(taskId, files = []) {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in');

  const validFiles = files.filter(isValidFile).slice(0, MAX_FILES_PER_TASK);
  const uploaded = [];
  const failed = [];

  for (const file of validFiles) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      failed.push({ name: file.name, error: 'File exceeds max size (5MB)' });
      continue;
    }

    try {
      const safeName = sanitizeFileName(file.name || 'attachment');
      const path = `users/${user.uid}/tasks/${taskId}/${Date.now()}_${safeName}`;
      const objectRef = ref(storage, path);
      await uploadBytes(objectRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      const url = await getDownloadURL(objectRef);

      uploaded.push({
        name: file.name,
        size: file.size,
        type: file.type || null,
        path,
        url,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      failed.push({ name: file.name, error: error?.message || 'Upload failed' });
    }
  }

  return { uploaded, failed };
}

export async function deleteTaskAttachments(files = []) {
  const deletions = files
    .filter((file) => typeof file?.path === 'string' && file.path.trim().length > 0)
    .map(async (file) => {
      try {
        await deleteObject(ref(storage, file.path));
      } catch {
        // Best-effort cleanup.
      }
    });

  await Promise.allSettled(deletions);
}

export default {
  uploadTaskAttachments,
  deleteTaskAttachments,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_TASK,
};
