"use server";

import { randomInt, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath, updateTag } from "next/cache";
import * as z from "zod";
import { CANONICAL_DIVISIONS, UNDECIDED_DIVISION } from "@/domain/division";
import { GENDERS } from "@/domain/member";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";
import { hashPin } from "@/server/crypto";
import { adminDb } from "@/server/firebase-admin";
import { clearFailures } from "@/server/rate-limit";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { syncTnfcEntries } from "@/server/tnfc-sync";

// Office edits to a member (workflow diagram B-8, 1.6.3 and 2.1). A new name or Division is
// carried to this season's TNFC entries in the same transaction, the player gets a notice
// when the Division changes, and every edit is kept in admin_logs.

export type MemberFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<string, string[]>>;
  synced?: number;
};

const MemberSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  name: z.string().trim().min(1, { error: "氏名を入力してください。" }).max(40),
  furigana: z
    .string()
    .trim()
    .max(60)
    .regex(/^[ァ-ヶー\s　]*$/, { error: "フリガナは全角カタカナで入力してください。" }),
  email: z.union([z.literal(""), z.email({ error: "メールアドレスを正しく入力してください。" })]),
  birthDate: z.union([z.literal(""), z.iso.date({ error: "生年月日を正しく入力してください。" })]),
  gender: z.enum(GENDERS, { error: "性別を選んでください。" }),
  division: z.enum([...CANONICAL_DIVISIONS, UNDECIDED_DIVISION], {
    error: "Divisionを選んでください。",
  }),
});

const LEGACY_PIN_FIELDS = ["pin", "pinCode", "password", "暗証番号"] as const;

export async function updateMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };

  const parsed = MemberSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    furigana: formData.get("furigana") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    birthDate: formData.get("birthDate") ?? "",
    gender: formData.get("gender"),
    division: formData.get("division"),
  });
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  const db = adminDb();
  const ref = db.collection("users").doc(v.id);
  const now = new Date().toISOString();
  const seasonId = CURRENT_SEASON_ID;

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not found");
      const entries = await tx.get(db.collection("tnfc_entries").where("userId", "==", v.id));
      const u = snap.data()!;
      const before = {
        name: String(u.name ?? u["名前"] ?? ""),
        furigana: String(u.furigana ?? u.kana ?? u["フリガナ"] ?? ""),
        email: String(u.email ?? u["メールアドレス"] ?? ""),
        birthDate: String(u.birthDate ?? u["生年月日"] ?? ""),
        gender: String(u.gender ?? u["性別"] ?? ""),
        division: String(u.division ?? u["Division"] ?? UNDECIDED_DIVISION),
      };
      const changes = Object.fromEntries(
        (Object.keys(before) as (keyof typeof before)[])
          .filter((k) => before[k] !== v[k])
          .map((k) => [k, { from: before[k], to: v[k] }]),
      );
      if (Object.keys(changes).length === 0) return { changed: false, synced: 0, ranking: false };

      tx.update(ref, {
        name: v.name,
        displayName: v.name,
        furigana: v.furigana,
        kana: v.furigana,
        email: v.email,
        birthDate: v.birthDate,
        生年月日: v.birthDate,
        gender: v.gender,
        division: v.division,
        divisionStatus: v.division === UNDECIDED_DIVISION ? "undecided" : "confirmed",
        updatedAt: now,
        updatedBy: admin.email,
      });
      const synced = syncTnfcEntries(tx, entries.docs, {
        seasonId,
        userId: v.id,
        now,
        source: "admin",
        change: {
          division: changes.division ? v.division : undefined,
          name: changes.name ? v.name : undefined,
        },
      });
      if (changes.division) {
        tx.set(db.collection("notifications").doc(`notif_${randomUUID()}`), {
          seasonId,
          userId: v.id,
          title: "Division 変更のお知らせ",
          message: `事務局で Division を「${before.division}」から「${v.division}」に変更しました。`,
          createdAt: now,
          read: false,
          type: "division_change",
          oldDivision: before.division,
          newDivision: v.division,
        });
      }
      tx.set(db.collection("admin_logs").doc(), {
        action: "member_update",
        targetUserId: v.id,
        by: admin.email,
        at: now,
        changes,
      });
      return { changed: true, synced, ranking: Boolean(changes.division || changes.name) };
    });

    if (!result.changed) return { ok: true, message: "変更はありませんでした。" };
    updateTag("members");
    if (result.ranking) {
      await rebuildRankingCache(seasonId);
      updateTag("ranking");
    }
    revalidatePath(`/admin/members/${v.id}`);
    return {
      ok: true,
      synced: result.synced,
      message:
        "保存しました。" +
        (result.synced ? `今シーズンの TNFC エントリー ${result.synced}件にも反映しました。` : ""),
    };
  } catch (err) {
    console.error("[member] update failed", err);
    return { message: "保存できませんでした。時間をおいて、もう一度お試しください。" };
  }
}

export type TempPinState = { pin?: string; message?: string };

/** Issues a random 4-digit PIN for a player who forgot theirs; shown once to the office. */
export async function issueTempPin(_prev: TempPinState, formData: FormData): Promise<TempPinState> {
  const admin = await getAdmin();
  if (!admin) return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };
  const id = String(formData.get("id") ?? "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { message: "会員が見つかりません。" };

  const db = adminDb();
  const ref = db.collection("users").doc(id);
  if (!(await ref.get()).exists) return { message: "会員が見つかりません。" };
  const pin = String(randomInt(0, 10000)).padStart(4, "0");
  const now = new Date().toISOString();
  await ref.update({
    pinHash: await hashPin(pin),
    ...Object.fromEntries(LEGACY_PIN_FIELDS.map((f) => [f, FieldValue.delete()])),
    updatedAt: now,
    updatedBy: admin.email,
  });
  await clearFailures("login", id);
  await db.collection("admin_logs").add({
    action: "temp_pin",
    targetUserId: id,
    by: admin.email,
    at: now,
  });
  return { pin };
}
