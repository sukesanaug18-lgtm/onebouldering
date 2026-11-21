import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "./firebase-admin";

// Limits wrong-PIN attempts per license number. A 4-digit PIN has only 10,000 values, so
// after MAX_FAILURES failures the account is locked for LOCK_MINUTES.
// Stored in auth_attempts/{sha256(kind:id)} (no raw ids in document names).

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

function ref(kind: string, id: string) {
  const key = createHash("sha256").update(`${kind}:${id}`).digest("hex");
  return adminDb().collection("auth_attempts").doc(key);
}

/** Minutes left on a lock, or 0 when attempts are allowed. */
export async function lockedMinutes(kind: string, id: string): Promise<number> {
  const snap = await ref(kind, id).get();
  const until = Number(snap.data()?.lockedUntil ?? 0);
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0;
}

export async function recordFailure(kind: string, id: string): Promise<void> {
  const r = ref(kind, id);
  await adminDb().runTransaction(async (tx) => {
    const d = (await tx.get(r)).data() ?? {};
    const failures = (Number(d.lockedUntil ?? 0) > Date.now() ? 0 : Number(d.failures ?? 0)) + 1;
    tx.set(r, {
      failures: failures >= MAX_FAILURES ? 0 : failures,
      lockedUntil: failures >= MAX_FAILURES ? Date.now() + LOCK_MINUTES * 60000 : 0,
      updatedAt: Date.now(),
    });
  });
}

export async function clearFailures(kind: string, id: string): Promise<void> {
  await ref(kind, id).delete();
}
