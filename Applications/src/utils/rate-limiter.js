/**
 * Client-side Rate Limiter for Gemini API — Per-Model Tracking
 *
 * Tracks request timestamps PER MODEL using a sliding window to prevent
 * exceeding RPM (requests per minute) and RPD (requests per day) limits.
 * Also supports cooldown: when a model gets a 429, it is marked as
 * "cooling down" and skipped until the cooldown expires.
 *
 * Persists data in localStorage so limits survive page refreshes.
 */

import { CHATBOT_CONFIG } from '../config/chatbot-config';

const STORAGE_KEY = 'studyflow_rate_limiter_v2';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { models: {} };
    const parsed = JSON.parse(raw);
    return { models: parsed.models || {} };
  } catch {
    return { models: {} };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

function getModelState(state, modelId) {
  if (!state.models[modelId]) {
    state.models[modelId] = { timestamps: [], cooldownUntil: 0 };
  }
  return state.models[modelId];
}

/** Remove timestamps older than 24 hours */
function pruneTimestamps(timestamps) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return timestamps.filter((ts) => ts > oneDayAgo);
}

/** Count timestamps within a time window */
function countInWindow(timestamps, windowMs) {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((ts) => ts > cutoff).length;
}

/** Calculate ms until next slot opens in a window */
function msUntilSlotOpens(timestamps, windowMs, maxRequests) {
  const cutoff = Date.now() - windowMs;
  const inWindow = timestamps.filter((ts) => ts > cutoff).sort((a, b) => a - b);
  if (inWindow.length < maxRequests) return 0;
  return Math.max(0, inWindow[0] + windowMs - Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a specific model can accept a request right now.
 *
 * @param {string} modelId - Model identifier (e.g. 'gemini-3-flash')
 * @param {number} rpm - Max requests per minute for this model
 * @param {number} rpd - Max requests per day for this model
 * @returns {{ allowed: boolean, retryAfterMs: number, reason: string|null }}
 */
export function canRequestModel(modelId, rpm, rpd) {
  const state = loadState();
  const ms = getModelState(state, modelId);
  ms.timestamps = pruneTimestamps(ms.timestamps);

  // Check cooldown first
  if (ms.cooldownUntil > Date.now()) {
    const waitMs = ms.cooldownUntil - Date.now();
    return {
      allowed: false,
      retryAfterMs: waitMs,
      reason: `${modelId} sedang cooldown (${Math.ceil(waitMs / 1000)}s)`,
    };
  }

  const rpmUsed = countInWindow(ms.timestamps, 60_000);
  const rpdUsed = countInWindow(ms.timestamps, 24 * 60 * 60 * 1000);

  // RPD check
  if (rpdUsed >= rpd) {
    const retryAfterMs = msUntilSlotOpens(ms.timestamps, 24 * 60 * 60 * 1000, rpd);
    return {
      allowed: false,
      retryAfterMs,
      reason: `${modelId}: limit harian tercapai (${rpdUsed}/${rpd})`,
    };
  }

  // RPM check
  if (rpmUsed >= rpm) {
    const retryAfterMs = msUntilSlotOpens(ms.timestamps, 60_000, rpm);
    return {
      allowed: false,
      retryAfterMs,
      reason: `${modelId}: limit per menit tercapai (${rpmUsed}/${rpm})`,
    };
  }

  return { allowed: true, retryAfterMs: 0, reason: null };
}

/**
 * Record that a request was sent to a specific model.
 * @param {string} modelId
 */
export function recordRequest(modelId) {
  const state = loadState();
  const ms = getModelState(state, modelId);
  ms.timestamps = pruneTimestamps(ms.timestamps);
  ms.timestamps.push(Date.now());
  saveState(state);
}

/**
 * Mark a model as "cooling down" after receiving a 429 from the API.
 * The model will be skipped by findAvailableModel until cooldown expires.
 *
 * @param {string} modelId
 * @param {number} [durationMs] - Cooldown duration (default from config)
 */
export function markCooldown(modelId, durationMs) {
  const cooldown = durationMs || CHATBOT_CONFIG.retry.cooldownMs || 60000;
  const state = loadState();
  const ms = getModelState(state, modelId);
  ms.cooldownUntil = Date.now() + cooldown;
  saveState(state);
  console.warn(`[rate-limiter] ${modelId} cooldown for ${Math.round(cooldown / 1000)}s`);
}

/**
 * Scan the model chain and return the first model that is currently available.
 * Returns null if ALL models are rate-limited.
 *
 * @param {Array<{ id: string, rpm: number, rpd: number, label: string }>} [modelChain]
 * @returns {{ model: { id, rpm, rpd, label }, index: number } | null}
 */
export function findAvailableModel(modelChain) {
  const chain = modelChain || CHATBOT_CONFIG.modelChain;

  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    const check = canRequestModel(m.id, m.rpm, m.rpd);
    if (check.allowed) {
      return { model: m, index: i };
    }
  }

  return null; // all models exhausted
}

/**
 * Get remaining quota for all models in the chain.
 *
 * @param {Array} [modelChain]
 * @returns {Array<{ id, label, rpm: { used, remaining, limit }, rpd: { used, remaining, limit }, cooldownRemaining: number, available: boolean }>}
 */
export function getRemainingQuota(modelChain) {
  const chain = modelChain || CHATBOT_CONFIG.modelChain;
  const state = loadState();

  return chain.map((m) => {
    const ms = getModelState(state, m.id);
    const timestamps = pruneTimestamps(ms.timestamps);
    const rpmUsed = countInWindow(timestamps, 60_000);
    const rpdUsed = countInWindow(timestamps, 24 * 60 * 60 * 1000);
    const cooldownRemaining = Math.max(0, (ms.cooldownUntil || 0) - Date.now());

    return {
      id: m.id,
      label: m.label,
      rpm: { used: rpmUsed, remaining: Math.max(0, m.rpm - rpmUsed), limit: m.rpm },
      rpd: { used: rpdUsed, remaining: Math.max(0, m.rpd - rpdUsed), limit: m.rpd },
      cooldownRemaining,
      available: rpmUsed < m.rpm && rpdUsed < m.rpd && cooldownRemaining === 0,
    };
  });
}

/**
 * Get a short summary string showing overall availability.
 * @returns {{ totalAvailable: number, totalModels: number, nextAvailableIn: number }}
 */
export function getQuotaSummary() {
  const quota = getRemainingQuota();
  const available = quota.filter((m) => m.available);

  let nextAvailableIn = 0;
  if (available.length === 0) {
    // Find the model that will be available soonest
    const chain = CHATBOT_CONFIG.modelChain;
    let minWait = Infinity;
    for (const m of chain) {
      const check = canRequestModel(m.id, m.rpm, m.rpd);
      if (check.retryAfterMs < minWait) {
        minWait = check.retryAfterMs;
      }
    }
    nextAvailableIn = minWait === Infinity ? 60000 : minWait;
  }

  return {
    totalAvailable: available.length,
    totalModels: quota.length,
    nextAvailableIn,
  };
}

/**
 * Reset rate limiter state (for testing or API key change).
 */
export function resetRateLimiter() {
  localStorage.removeItem(STORAGE_KEY);
  // Also clean up old v1 key
  localStorage.removeItem('studyflow_rate_limiter');
}

export default {
  canRequestModel,
  recordRequest,
  markCooldown,
  findAvailableModel,
  getRemainingQuota,
  getQuotaSummary,
  resetRateLimiter,
};
