/**
 * Firebase Configuration - Neutralized for Local Auth Migration
 */

// Dummy auth for compatibility while refactoring
const auth = {
    onAuthStateChanged: (cb) => {
        const userStr = localStorage.getItem('studyflow_user');
        if (userStr) {
            try {
                cb(JSON.parse(userStr));
            } catch (e) {
                cb(null);
            }
        } else {
            cb(null);
        }
        return () => {};
    },
    signOut: async () => {
        localStorage.removeItem('studyflow_token');
        localStorage.removeItem('studyflow_user');
        window.location.href = '/';
    },
    get currentUser() {
        const userStr = localStorage.getItem('studyflow_user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

const db = {
    collection: () => ({
        doc: () => ({
            onSnapshot: (cb) => { cb({ data: () => ({}) }); return () => {}; },
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async () => {},
            update: async () => {},
            delete: async () => {}
        }),
        onSnapshot: (cb) => { cb({ docs: [] }); return () => {}; },
        get: async () => ({ docs: [] }),
        add: async () => ({ id: 'dummy' })
    })
};

const storage = {};
const app = {};

export { app, auth, db, storage };
