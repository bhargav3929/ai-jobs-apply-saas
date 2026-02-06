import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, initializeFirestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is available
const isConfigured = Object.entries(firebaseConfig).every(([key, value]) => {
    if (value === undefined || value === "") {
        console.warn(`Firebase config missing key: ${key}`);
        return false;
    }
    return true;
});

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isConfigured) {
    // Initialize Firebase (prevent re-initialization in development)
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Initialize Firestore with settings to avoid hangs
    try {
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true,
        });
    } catch (error) {
        // If already initialized (e.g. fast refresh), use existing instance
        db = getFirestore(app);
    }

    storage = getStorage(app);
}

export { app, auth, db, storage };
export default app;
