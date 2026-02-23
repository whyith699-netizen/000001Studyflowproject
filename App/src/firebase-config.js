/**
 * Firebase Configuration for Study Flow Web Dashboard
 * Shared with Chrome Extension
 */

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

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

// Initialize Firestore with persistent cache (replaces deprecated enableIndexedDbPersistence)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({})
    })
});

// Set auth persistence to LOCAL (survives browser restarts)
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting auth persistence:', error);
    });

export { app, auth, db };


