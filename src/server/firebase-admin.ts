import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

/**
 * Server-only Firebase Admin SDK. All Firestore reads/writes go through here.
 * On App Hosting, credentials come from the runtime service account.
 * Locally, FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST route to the emulators.
 */
function getAdminApp(): App {
  return (
    getApps()[0] ??
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-onebouldering",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "demo-onebouldering.appspot.com",
    })
  );
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Storage bucket for office uploads (FIREBASE_STORAGE_EMULATOR_HOST routes to the emulator). */
export function adminBucket() {
  return getStorage(getAdminApp()).bucket();
}
