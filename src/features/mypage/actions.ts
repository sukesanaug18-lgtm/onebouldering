"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { adminDb } from "@/server/firebase-admin";

/** Marks all of the signed-in player's unread notifications as read. */
export async function markNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const db = adminDb();
  const snap = await db
    .collection("notifications")
    .where("userId", "==", user.id)
    .where("read", "==", false)
    .get();
  const batch = db.batch();
  for (const d of snap.docs) batch.update(d.ref, { read: true });
  if (!snap.empty) await batch.commit();
  revalidatePath("/mypage");
}
