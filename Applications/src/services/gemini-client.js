/**
 * Google Gemini API Client
 * Communicates directly with Google AI Studio API
 * Includes: model fallback chain, per-model rate limiting, retry with exponential backoff
 */

import { CHATBOT_CONFIG } from '../config/chatbot-config';
import { getApiKey } from '../utils/encryption';
import {
  canRequestModel,
  recordRequest,
  markCooldown,
  findAvailableModel,
  getRemainingQuota,
} from '../utils/rate-limiter';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini API Client Class
 */
class GeminiClient {
  constructor() {
    this.apiKey = null;
    this.config = CHATBOT_CONFIG.gemini;
  }

  /**
   * Initialize client with API key
   * @returns {{ success: boolean, error?: string }}
   */
  initialize() {
    const apiKey = getApiKey();

    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured. Please set up your Gemini API key in Settings.',
      };
    }

    this.apiKey = apiKey;
    return { success: true };
  }

  /**
   * Check if client is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.apiKey !== null;
  }

  /**
   * Send a message to Gemini API using the model fallback chain.
   *
   * Flow:
   * 1. Find the first available model in the chain (not rate-limited/cooled down)
   * 2. Send request to that model
   * 3. If 429 → mark cooldown, instantly try the NEXT model (no sleep)
   * 4. If the LAST model also gets 429 → retry with exponential backoff
   * 5. If model not found (404) → try next model
   *
   * @param {Array<{ role: string, content: string }>} messages
   * @param {Object} options
   * @returns {Promise<{ success: boolean, response?: string, error?: string, usage?: object, isRateLimited?: boolean, retryAfterMs?: number, modelUsed?: string }>}
   */
  async sendMessage(messages, options = {}) {
    // Check initialization
    const initResult = this.initialize();
    if (!initResult.success) {
      return initResult;
    }

    // Find first available model
    const available = findAvailableModel();
    if (!available) {
      return this._buildAllModelsRateLimitedResponse();
    }

    try {
      const requestBody = this._buildRequestBody(messages, options);
      const modelChain = CHATBOT_CONFIG.modelChain;

      // Start from the first available model's index
      return await this._tryModelChain(modelChain, available.index, requestBody);
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Iterate through the model chain starting from startIndex.
   * On 429: mark cooldown → try next model instantly.
   * On last model 429: retry with backoff.
   * @private
   */
  async _tryModelChain(modelChain, startIndex, requestBody) {
    let lastError = null;

    for (let i = startIndex; i < modelChain.length; i++) {
      const modelDef = modelChain[i];
      const isLastModel = i === modelChain.length - 1;

      // Check if this model is available (might have been exhausted during this loop)
      const check = canRequestModel(modelDef.id, modelDef.rpm, modelDef.rpd);
      if (!check.allowed) {
        console.log(`[gemini-client] Skipping ${modelDef.label}: ${check.reason}`);
        continue;
      }

      // Record the request attempt
      recordRequest(modelDef.id);

      const responseData = await this._sendGenerateContentRequest(modelDef.id, requestBody);

      // ── Success ──
      if (responseData.success) {
        if (i > startIndex) {
          console.log(`[gemini-client] ✅ Fallback to ${modelDef.label} succeeded`);
        }
        const parsed = this._parseResponse(responseData.data);
        if (parsed.success) {
          parsed.modelUsed = modelDef.label;
        }
        return parsed;
      }

      // ── 429 Rate Limited ──
      if (responseData.status === 429) {
        const retryAfterMs = this._parseRetryAfterMs(responseData.headers);
        const cooldownDuration = retryAfterMs || CHATBOT_CONFIG.retry.cooldownMs || 60000;

        // Mark this model on cooldown
        markCooldown(modelDef.id, cooldownDuration);

        // If there are more models in the chain, try the next one INSTANTLY
        if (!isLastModel) {
          console.warn(
            `[gemini-client] ${modelDef.label} rate limited → trying next model`
          );
          continue;
        }

        // Last model — retry with exponential backoff
        console.warn(`[gemini-client] Last model ${modelDef.label} rate limited — retrying with backoff`);
        return await this._retryLastModel(modelDef, requestBody);
      }

      // ── Model not found (404 / unknown model) ──
      if (this._isModelNotFoundError(responseData.status, responseData.data)) {
        console.warn(`[gemini-client] ${modelDef.label} not found → trying next model`);
        lastError = this._handleApiError(responseData.data, responseData.status);
        continue;
      }

      // ── Other error (400, 401, 403, 500, 503…) → stop, don't try more models ──
      return this._handleApiError(responseData.data, responseData.status);
    }

    if (lastError) {
      return lastError;
    }

    // If we got here, every remaining model was unavailable due to quota/cooldown.
    return this._buildAllModelsRateLimitedResponse(modelChain);
  }

  /**
   * Retry the last model in the chain with exponential backoff.
   * @private
   */
  async _retryLastModel(modelDef, requestBody) {
    const {
      maxAttempts = 3,
      baseDelayMs = 2000,
      maxDelayMs = 30000,
    } = CHATBOT_CONFIG.retry;

    let retryAfterMs = CHATBOT_CONFIG.retry.cooldownMs || 60000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      console.warn(
        `[gemini-client] Retry ${attempt}/${maxAttempts} for ${modelDef.label} after ${Math.round(totalDelay)}ms`
      );
      await this._sleep(totalDelay);

      recordRequest(modelDef.id);
      const responseData = await this._sendGenerateContentRequest(modelDef.id, requestBody);

      if (responseData.success) {
        const parsed = this._parseResponse(responseData.data);
        if (parsed.success) {
          parsed.modelUsed = modelDef.label;
        }
        return parsed;
      }

      if (responseData.status !== 429) {
        return this._handleApiError(responseData.data, responseData.status);
      }

      const headerRetryAfterMs = this._parseRetryAfterMs(responseData.headers);
      retryAfterMs = headerRetryAfterMs || retryAfterMs;
      markCooldown(modelDef.id, retryAfterMs);
    }

    return this._buildRateLimitedResponse(retryAfterMs);
  }

  /**
   * Build request body for Gemini API
   * @private
   */
  _buildRequestBody(messages, options) {
    let systemInstruction = null;
    const contentMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
        return false;
      }
      return true;
    });

    const contents = contentMessages
      .filter((msg) => msg?.content && String(msg.content).trim())
      .map((msg) => ({
        role: this._mapRoleToGemini(msg.role),
        parts: [{ text: String(msg.content) }],
      }));

    const requestBody = {
      contents,
      generationConfig: {
        temperature: options.temperature || this.config.temperature,
        maxOutputTokens: options.maxTokens || this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    return requestBody;
  }

  /**
   * Send generateContent request to a specific model
   * @private
   */
  async _sendGenerateContentRequest(modelName, requestBody) {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      success: response.ok,
      status: response.status,
      headers: response.headers,
      data,
    };
  }

  /**
   * Map app roles to Gemini roles
   * @private
   */
  _mapRoleToGemini(role) {
    if (role === 'assistant' || role === 'model') return 'model';
    return 'user';
  }

  /**
   * Parse Gemini API response
   * @private
   */
  _parseResponse(data) {
    try {
      if (!data.candidates || data.candidates.length === 0) {
        if (data.promptFeedback?.blockReason) {
          return {
            success: false,
            error: `Content blocked: ${data.promptFeedback.blockReason}`,
          };
        }
        return { success: false, error: 'No response generated from Gemini' };
      }

      const candidate = data.candidates[0];

      if (candidate.finishReason === 'SAFETY') {
        return { success: false, error: 'Response blocked by safety filters' };
      }

      const text =
        candidate.content?.parts?.map((part) => part.text).join('') || '';

      const usage = {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      };

      return { success: true, response: text, usage };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return { success: false, error: 'Failed to parse response' };
    }
  }

  /**
   * Handle API errors → user-friendly messages
   * @private
   */
  _handleApiError(data, statusCode) {
    const errorMessage = this._extractErrorMessage(data);

    switch (statusCode) {
      case 400:
        return { success: false, error: `Invalid request: ${errorMessage}` };
      case 401:
        return { success: false, error: 'Invalid API key. Please check your Gemini API key in Settings.' };
      case 403:
        return { success: false, error: 'API key does not have permission to access Gemini API' };
      case 429:
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait a moment.',
          isRateLimited: true,
          retryAfterMs: CHATBOT_CONFIG.retry.cooldownMs || 60000,
        };
      case 500:
        return { success: false, error: 'Gemini API server error. Please try again later.' };
      case 503:
        return { success: false, error: 'Gemini API temporarily unavailable. Please try again later.' };
      default:
        return { success: false, error: `API error (${statusCode}): ${errorMessage}` };
    }
  }

  /**
   * Extract error text from API payload
   * @private
   */
  _extractErrorMessage(data) {
    if (data?.error?.message) return data.error.message;
    if (typeof data === 'string') return data;
    return 'Unknown error';
  }

  /**
   * Detect model-not-found errors (retry with next model)
   * @private
   */
  _isModelNotFoundError(statusCode, data) {
    if (statusCode === 404) return true;
    if (statusCode !== 400) return false;

    const message = this._extractErrorMessage(data).toLowerCase();
    return (
      message.includes('is not found') ||
      message.includes('unknown model') ||
      message.includes('unsupported model') ||
      message.includes('not supported for generatecontent')
    );
  }

  /**
   * Parse Retry-After header into milliseconds
   * @private
   */
  _parseRetryAfterMs(headers) {
    if (!headers) return null;
    const retryAfter = headers.get('retry-after') || headers.get('Retry-After');
    if (!retryAfter) return null;

    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;

    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());

    return null;
  }

  /**
   * Build a consistent all-models-rate-limited response.
   * @private
   */
  _buildAllModelsRateLimitedResponse(modelChain = CHATBOT_CONFIG.modelChain) {
    const retryAfterMs = this._getNextAvailableInMs(modelChain);
    return this._buildRateLimitedResponse(retryAfterMs);
  }

  /**
   * Build a consistent rate-limited payload.
   * @private
   */
  _buildRateLimitedResponse(retryAfterMs) {
    const waitMs = Math.max(0, Number(retryAfterMs) || 0);
    const waitSeconds = Math.max(1, Math.ceil(waitMs / 1000));

    return {
      success: false,
      error: `All models are currently rate-limited. Please try again in ${waitSeconds} seconds.`,
      isRateLimited: true,
      retryAfterMs: waitMs,
    };
  }

  /**
   * Compute how long until at least one model is available again.
   * @private
   */
  _getNextAvailableInMs(modelChain = CHATBOT_CONFIG.modelChain) {
    let minWaitMs = Infinity;

    for (const model of modelChain) {
      const check = canRequestModel(model.id, model.rpm, model.rpd);
      if (check.allowed) return 0;
      if (typeof check.retryAfterMs === 'number' && check.retryAfterMs >= 0) {
        minWaitMs = Math.min(minWaitMs, check.retryAfterMs);
      }
    }

    if (Number.isFinite(minWaitMs) && minWaitMs >= 0) {
      return minWaitMs;
    }

    // Fallback to cooldown data if checks cannot provide timing.
    const quota = getRemainingQuota(modelChain);
    const cooldowns = quota.map((m) => m.cooldownRemaining).filter((ms) => ms > 0);
    if (cooldowns.length > 0) {
      return Math.min(...cooldowns);
    }

    return CHATBOT_CONFIG.retry.cooldownMs || 60000;
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convenience method — send a single message
   */
  async sendSimpleMessage(message, systemPrompt = null) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });
    return this.sendMessage(messages);
  }

  /**
   * Get current rate limit status for all models
   */
  getRateLimitStatus() {
    return getRemainingQuota();
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
export default geminiClient;
