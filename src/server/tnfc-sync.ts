import "server-only";
import type { DocumentData, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { tnfcControlCategory } from "@/domain/tnfc";
import { adminDb } from "./firebase-admin";

// Keeps this season's TNFC entries in step with the member (workflow diagram B-8, 2.1–2.2 and
// 1.6.3): a new Division updates division + tnfcControlCategory, a new name updates
// currentUserName. Every change is written to tnfc_sync_logs. Runs inside the caller's
// transaction, so the entries must have been read (tx.get) before any write.

export type TnfcSyncChange = { division?: string; name?: string };

export function syncTnfcEntries(
  tx: Transaction,
  entries: QueryDocumentSnapshot<DocumentData>[],
  opts: {
    seasonId: string;
    userId: string;
    now: string;
    source: "tryout" | "admin";
    change: TnfcSyncChange;
  },
): number {
  const db = adminDb();
  const { seasonId, userId, now, source, change } = opts;
  let synced = 0;
  for (const e of entries) {
    const ed = e.data();
    if (String(ed.seasonId ?? seasonId) !== seasonId || ed.status === "cancelled") continue;
    const update: Record<string, unknown> = {};
    const oldDivision = String(ed.division ?? "");
    const oldName = String(ed.currentUserName ?? ed.userName ?? "");
    if (change.division && oldDivision !== change.division) {
      update.division = change.division;
      update.tnfcControlCategory = tnfcControlCategory(change.division);
    }
    if (change.name && oldName !== change.name) update.currentUserName = change.name;
    if (Object.keys(update).length === 0) continue;

    tx.update(e.ref, {
      ...update,
      [source === "tryout" ? "autoSyncedFromTryoutAt" : "syncedFromMemberUpdateAt"]: now,
      updatedAt: now,
    });
    tx.set(db.collection("tnfc_sync_logs").doc(), {
      seasonId,
      userId,
      entryId: e.id,
      roundId: ed.roundId ?? "",
      roundName: ed.roundName ?? "",
      source,
      oldDivision,
      newDivision: String(update.division ?? oldDivision),
      tnfcControlCategory: String(update.tnfcControlCategory ?? ed.tnfcControlCategory ?? ""),
      ...(update.currentUserName ? { oldName, newName: update.currentUserName } : {}),
      syncedAt: now,
    });
    synced += 1;
  }
  return synced;
}
