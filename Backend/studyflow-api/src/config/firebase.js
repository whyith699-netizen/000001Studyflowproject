const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

if (serviceAccountPath) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (err) {
        console.warn("Failed to initialize Firebase Admin. Please check your service account key path.");
    }
} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase Admin not initialized.");
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

module.exports = { admin, db };
