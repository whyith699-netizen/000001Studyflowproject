/**
 * Firebase Configuration for Study Flow Web Dashboard
 * Shared with Chrome Extension
 */

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Capacitor } from "@capacitor/core";

// Firebase configuration - Same as extension
const firebaseConfig = {
    apiKey: "AIzaSyChGVnI_0LDmhtIKhAvP0mEOYh9KaIxFGI",
    authDomain: "studydashboard-bd8f0.firebaseapp.com",
    projectId: "studydashboard-bd8f0",
    storageBucket: "studydashboard-bd8f0.firebasestorage.app",
    messagingSenderId: "912149378367",
    appId: "1:912149378367:web:bd63f64c5b559e996f4f8a",
    measurementId: "G-KK0S1DWCQ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const isNativePlatform = Capacitor.isNativePlatform();

let db;

if (isNativePlatform) {
    // Some Android WebView environments can fail on persistent tab-manager init.
    db = getFirestore(app);
} else {
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentSingleTabManager({})
            })
        });
    } catch (error) {
        console.warn('Failed to initialize Firestore persistent cache, using default Firestore:', error);
        db = getFirestore(app);
    }
}

// Set auth persistence to LOCAL (survives browser restarts)
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting auth persistence:', error);
    });

export { app, auth, db, storage };


