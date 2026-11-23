import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { firebaseProjectId, firebaseStorageBucket } from "./firebase-config";

/**
 * Server-only Firebase Admin SDK. All Firestore reads/writes go through here.
 * On App Hosting, credentials come from the runtime service account.
 * Locally, FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST route to the emulators.
 */
function getAdminApp(): App {
  return (
    getApps()[0] ??
    initializeApp({
      projectId: firebaseProjectId(),
      storageBucket: firebaseStorageBucket(),
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
