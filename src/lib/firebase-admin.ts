import * as admin from "firebase-admin";

export function getFirebaseAdmin() {
    // If already initialized, return the existing app instance
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // Try to init a fresh instance
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

        if (!serviceAccountRaw) {
            console.error("FIREBASE_SERVICE_ACCOUNT_JSON is completely missing from env variables!");
            return null;
        }

        const serviceAccount = JSON.parse(serviceAccountRaw);

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("FATAL: Failed to initialize Firebase Admin SDK", error);
        return null;
    }
}
