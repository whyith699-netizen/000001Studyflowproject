/**
 * Firebase Configuration for StudyFlow Mobile PWA
 * Shared Firebase project with App dashboard & Chrome Extension
 */
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentSingleTabManager
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyChGVnI_0LDmhtIKhAvP0mEOYh9KaIxFGI",
  authDomain: "studydashboard-bd8f0.firebaseapp.com",
  projectId: "studydashboard-bd8f0",
  storageBucket: "studydashboard-bd8f0.firebasestorage.app",
  messagingSenderId: "912149378367",
  appId: "1:912149378367:web:bd63f64c5b559e996f4f8a",
  measurementId: "G-KK0S1DWCQ4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// IndexedDB persistence for offline mobile support
setPersistence(auth, indexedDBLocalPersistence).catch(console.error);

function createFirestore() {
  const supportsIndexedDb = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  if (!supportsIndexedDb) {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({})
      })
    });
  } catch (error) {
    console.warn('[Firestore] Persistent cache unavailable, using memory cache.', error);
    try {
      return initializeFirestore(app, { localCache: memoryLocalCache() });
    } catch (fallbackError) {
      console.warn('[Firestore] Falling back to default Firestore config.', fallbackError);
      return getFirestore(app);
    }
  }
}

const db = createFirestore();

export { app, auth, db, googleProvider };
