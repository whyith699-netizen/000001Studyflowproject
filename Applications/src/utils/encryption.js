/**
 * Simple Encryption Utility for API Keys
 * Uses XOR cipher with base64 encoding (NOT cryptographically secure, but sufficient for API key obfuscation)
 * For better security, consider using Web Crypto API
 */

// Simple XOR-based encryption for obfuscation
// Note: This is NOT cryptographically secure, but helps prevent casual inspection
const simpleEncrypt = (text, key) => {
  if (!text) return '';
  
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(textChar ^ keyChar));
  }
  return btoa(result.join(''));
};

const simpleDecrypt = (encrypted, key) => {
  if (!encrypted) return '';
  
  try {
    const decoded = atob(encrypted);
    const result = [];
    for (let i = 0; i < decoded.length; i++) {
      const textChar = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result.push(String.fromCharCode(textChar ^ keyChar));
    }
    return result.join('');
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
};

// Generate a consistent key based on browser fingerprint
const getStorageKey = () => {
  // Use a combination of constants for consistency across sessions
  return 'studyflow_chatbot_key_v1';
};

/**
 * Encrypt API Key before storing
 * @param {string} apiKey - The API key to encrypt
 * @returns {string} - Encrypted API key
 */
export const encryptApiKey = (apiKey) => {
  return simpleEncrypt(apiKey, getStorageKey());
};

/**
 * Decrypt API Key from storage
 * @param {string} encryptedKey - The encrypted API key
 * @returns {string} - Decrypted API key
 */
export const decryptApiKey = (encryptedKey) => {
  return simpleDecrypt(encryptedKey, getStorageKey());
};

/**
 * Validate Gemini API Key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - True if valid format
 */
export const isValidApiKeyFormat = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  // Gemini API keys typically start with "AIza" and are 39 characters
  const geminiKeyPattern = /^AIza[A-Za-z0-9_-]{35,}$/;
  return geminiKeyPattern.test(apiKey.trim());
};

/**
 * Save API Key to localStorage (encrypted)
 * @param {string} apiKey - The API key to save
 * @returns {boolean} - True if saved successfully
 */
export const saveApiKey = (apiKey) => {
  try {
    if (!isValidApiKeyFormat(apiKey)) {
      return false;
    }
    
    const encrypted = encryptApiKey(apiKey.trim());
    localStorage.setItem('studyflow_gemini_api_key', encrypted);
    localStorage.setItem('studyflow_gemini_key_timestamp', Date.now().toString());
    return true;
  } catch (e) {
    console.error('Failed to save API key:', e);
    return false;
  }
};

/**
 * Get API Key from localStorage (decrypted)
 * @returns {string|null} - Decrypted API key or null if not found
 */
export const getApiKey = () => {
  try {
    const encrypted = localStorage.getItem('studyflow_gemini_api_key');
    if (!encrypted) return null;
    
    const decrypted = decryptApiKey(encrypted);
    if (!decrypted || !isValidApiKeyFormat(decrypted)) {
      // Invalid key, clear storage
      localStorage.removeItem('studyflow_gemini_api_key');
      localStorage.removeItem('studyflow_gemini_key_timestamp');
      return null;
    }
    return decrypted;
  } catch (e) {
    console.error('Failed to get API key:', e);
    return null;
  }
};

/**
 * Remove API Key from storage
 * @returns {boolean} - True if removed successfully
 */
export const removeApiKey = () => {
  try {
    localStorage.removeItem('studyflow_gemini_api_key');
    localStorage.removeItem('studyflow_gemini_key_timestamp');
    return true;
  } catch (e) {
    console.error('Failed to remove API key:', e);
    return false;
  }
};

/**
 * Check if API Key is configured
 * @returns {boolean} - True if API key exists and is valid
 */
export const isApiKeyConfigured = () => {
  const apiKey = getApiKey();
  return apiKey !== null && isValidApiKeyFormat(apiKey);
};

/**
 * Get API Key configuration status
 * @returns {{ configured: boolean, lastUpdated: number|null }} - Status info
 */
export const getApiKeyStatus = () => {
  const configured = isApiKeyConfigured();
  const timestamp = localStorage.getItem('studyflow_gemini_key_timestamp');
  return {
    configured,
    lastUpdated: timestamp ? parseInt(timestamp, 10) : null,
  };
};

export default {
  encryptApiKey,
  decryptApiKey,
  isValidApiKeyFormat,
  saveApiKey,
  getApiKey,
  removeApiKey,
  isApiKeyConfigured,
  getApiKeyStatus,
};
