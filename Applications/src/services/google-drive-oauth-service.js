import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase-config";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];
const GOOGLE_SCOPE = GOOGLE_SCOPES.join(" ");

const FALLBACK_CLIENT_ID =
  "912149378367-lei8llrsc6p5b08b1ltih3bbl8krk33u.apps.googleusercontent.com";
const TOKEN_CACHE_KEY = "studyflow_google_drive_token_v1";

let gisLoader = null;
let nativeInitPromise = null;
let tokenCache = loadTokenCache();

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function loadTokenCache() {
  if (!isBrowser()) {
    return { accessToken: null, expiresAt: 0 };
  }
  try {
    const raw = window.localStorage.getItem(TOKEN_CACHE_KEY);
    if (!raw) return { accessToken: null, expiresAt: 0 };
    const parsed = JSON.parse(raw);
    const accessToken = parsed?.accessToken || null;
    const expiresAt = Number(parsed?.expiresAt || 0);
    if (
      !accessToken ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(TOKEN_CACHE_KEY);
      return { accessToken: null, expiresAt: 0 };
    }
    return { accessToken, expiresAt };
  } catch {
    return { accessToken: null, expiresAt: 0 };
  }
}

function persistTokenCache() {
  if (!isBrowser()) return;
  try {
    if (!tokenCache?.accessToken || !tokenCache?.expiresAt) {
      window.localStorage.removeItem(TOKEN_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(tokenCache));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

function resolveClientId() {
  return import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || FALLBACK_CLIENT_ID;
}

function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

function shouldPreferFirebasePopup() {
  return isBrowser() && !isNativePlatform();
}

async function ensureNativeGoogleInitialized() {
  if (!isNativePlatform()) return;
  if (nativeInitPromise) {
    await nativeInitPromise;
    return;
  }

  nativeInitPromise = SocialLogin.initialize({
    google: {
      webClientId: resolveClientId(),
    },
  }).catch((error) => {
    nativeInitPromise = null;
    throw error;
  });

  await nativeInitPromise;
}

function loadGoogleIdentityScript() {
  if (!isBrowser())
    throw new Error("Google OAuth is only available in browser.");
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;

  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis-client="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google OAuth script.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.gisClient = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google OAuth script."));
    document.head.appendChild(script);
  });

  return gisLoader;
}

function hasValidCachedToken() {
  if (!tokenCache.accessToken) return false;
  const now = Date.now();
  const valid = tokenCache.expiresAt - now > 60 * 1000;
  if (!valid) {
    tokenCache = { accessToken: null, expiresAt: 0 };
    persistTokenCache();
  }
  return valid;
}

function requestToken({ prompt = "consent" } = {}) {
  return new Promise((resolve, reject) => {
    const clientId = resolveClientId();
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (response) => {
        if (response?.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

function shouldFallbackToFirebaseGooglePopup(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("redirect_uri_mismatch") ||
    message.includes("origin_mismatch") ||
    message.includes("invalid_request")
  );
}

async function requestFirebaseGoogleToken() {
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    // Always show the picker for interactive Drive auth so users can switch
    // accounts instead of silently reusing the last Google session.
    prompt: "consent select_account",
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  if (!token) {
    throw new Error("Failed to obtain Google Drive access token from Firebase Google popup.");
  }

  tokenCache = {
    accessToken: token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
  persistTokenCache();
  return tokenCache.accessToken;
}

async function requestNativeGoogleToken({
  forceRefresh = false,
  forceReAuth = false,
} = {}) {
  await ensureNativeGoogleInitialized();

  const response = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: GOOGLE_SCOPES,
      forceRefreshToken: forceRefresh || forceReAuth,
    },
  });

  const token = response?.result?.accessToken?.token || null;
  if (!token) {
    throw new Error(
      "Failed to obtain Google Drive access token from native Google login.",
    );
  }

  // Default 55 minutes cache for native token.
  tokenCache = {
    accessToken: token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
  persistTokenCache();

  return tokenCache.accessToken;
}

export async function getGoogleDriveAccessToken({
  interactive = false,
  forceRefresh = false,
  forceReAuth = false,
} = {}) {
  if (!forceRefresh && !forceReAuth && hasValidCachedToken()) {
    return tokenCache.accessToken;
  }

  if (!interactive && !forceReAuth && !tokenCache.accessToken) {
    throw new Error("Google Drive permission is required.");
  }

  if (isNativePlatform()) {
    return requestNativeGoogleToken({ forceRefresh, forceReAuth });
  }

  if (interactive && shouldPreferFirebasePopup()) {
    return requestFirebaseGoogleToken();
  }

  try {
    await loadGoogleIdentityScript();

    // Use account picker when forceReAuth is true to allow user to switch accounts
    const response = await requestToken({
      prompt:
        interactive || !tokenCache.accessToken || forceReAuth
          ? "consent select_account"
          : "",
    });

    tokenCache = {
      accessToken: response.access_token,
      expiresAt:
        Date.now() + Number.parseInt(response.expires_in || "3600", 10) * 1000,
    };
    persistTokenCache();
    return tokenCache.accessToken;
  } catch (error) {
    if (interactive && shouldFallbackToFirebaseGooglePopup(error)) {
      return requestFirebaseGoogleToken();
    }
    throw error;
  }
}

export function clearGoogleDriveAccessToken() {
  tokenCache = { accessToken: null, expiresAt: 0 };
  persistTokenCache();
}
