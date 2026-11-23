// Gives (or removes) office access for an existing Firebase Authentication account.
//   node scripts/grant-admin.ts <email>            → admin: true
//   node scripts/grant-admin.ts <email> --revoke   → removes the claim and signs the user out
// Runs against FIREBASE_PROJECT_ID with Application Default Credentials
// (gcloud auth application-default login), or the Emulator when FIREBASE_AUTH_EMULATOR_HOST is set.
// The account itself is created in the Firebase console (Authentication → Add user).
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, flag] = process.argv.slice(2);
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!email || !projectId) {
  console.error(
    "Usage: FIREBASE_PROJECT_ID=<project> node scripts/grant-admin.ts <email> [--revoke]",
  );
  process.exit(1);
}

const auth = getAuth(initializeApp({ projectId }));
const user = await auth.getUserByEmail(email);
const revoke = flag === "--revoke";
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(user.uid, claims);
if (revoke) await auth.revokeRefreshTokens(user.uid);
console.log(`${revoke ? "Removed" : "Granted"} office access: ${email} (${projectId})`);
