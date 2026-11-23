import "server-only";
import type { RolloverMember } from "@/domain/rollover";
import { adminDb } from "@/server/firebase-admin";

// Data for the year-end reset (workflow diagram B-7, 1.5). Read fresh every time: the preview
// must match what the apply step will change.

const text = (v: unknown) => String(v ?? "").trim();

/** Every member with the fields the rollover needs (no PINs or emails). */
export async function getRolloverMembers(): Promise<RolloverMember[]> {
  const snap = await adminDb()
    .collection("users")
    .select("name", "名前", "gender", "性別", "birthDate", "生年月日", "division", "Division")
    .get();
  return snap.docs.map((d) => {
    const u = d.data();
    return {
      id: d.id,
      name: text(u.name ?? u["名前"]),
      gender: text(u.gender ?? u["性別"]),
      birthDate: text(u.birthDate ?? u["生年月日"]),
      division: text(u.division ?? u["Division"]),
    };
  });
}

export type RolloverRecord = {
  nextSeasonId: string;
  startedAt: string;
  completedAt: string;
  by: string;
  changed: number;
};

export const rolloverDocId = (nextSeasonId: string) => `rollover_${nextSeasonId}`;

/** The run record for moving into `nextSeasonId`, or null if it has not been run. */
export async function getRolloverRecord(nextSeasonId: string): Promise<RolloverRecord | null> {
  const snap = await adminDb().collection("site_settings").doc(rolloverDocId(nextSeasonId)).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    nextSeasonId,
    startedAt: text(d.startedAt),
    completedAt: text(d.completedAt),
    by: text(d.by),
    changed: Number(d.changed ?? 0),
  };
}
