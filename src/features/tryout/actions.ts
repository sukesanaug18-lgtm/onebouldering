"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { tnfcControlCategory } from "@/domain/tnfc";
import {
  categoryForGender,
  CHALLENGEABLE,
  evaluateTryout,
  isUCategory,
  tryoutProblems,
  tryoutProblemsLabel,
} from "@/domain/tryout";
import { getVenue } from "@/features/entry/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getCurrentUser } from "@/server/auth";
import { adminDb } from "@/server/firebase-admin";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { TryoutSchema, type TryoutState } from "./schemas";

// Division Tryout submission (workflow diagrams B-2 and B-8). Confirmed on submit; no staff approval.
// One transaction updates the player, writes tryout_logs and a notification, resets this season's
// competition points on promotion, and moves this season's TNFC entries to the new Division.
// Field names follow the current app so the data stays compatible.

export async function submitTryout(_prev: TryoutState, formData: FormData): Promise<TryoutState> {
  const user = await getCurrentUser();
  if (!user) return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };

  const parsed = TryoutSchema.safeParse({
    venue: formData.get("venue"),
    category: formData.get("category"),
    precheck: formData.get("precheck"),
    challenged: formData.get("challenged"),
    problems: formData.getAll("problem"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }
  const { venue: venueId, category, precheck, challenged } = parsed.data;

  if (isUCategory(user.division)) {
    return { message: "U カテゴリーの方は、年齢でカテゴリーが決まるため Tryout はありません。" };
  }
  const fixed = categoryForGender(user.gender);
  if ((fixed && fixed !== category) || !CHALLENGEABLE[category].includes(challenged)) {
    return { message: "登録している性別と、挑戦するカテゴリーが合っていません。" };
  }
  const allowed = new Set(tryoutProblems(challenged));
  const completed = [...new Set(parsed.data.problems)].sort((a, b) => a - b);
  if (completed.some((n) => !allowed.has(n))) {
    return { message: "指定課題以外の課題が含まれています。" };
  }

  const venue = await getVenue(venueId);
  if (!venue?.programs.hasTryout) {
    return { message: "このジムでは、いま Division Tryout を開催していません。" };
  }

  const db = adminDb();
  const seasonId = CURRENT_SEASON_ID;
  const now = new Date().toISOString();
  const logId = `try_${Date.now()}_${user.id}`;
  const userRef = db.collection("users").doc(user.id);

  try {
    const outcome = await db.runTransaction(async (tx) => {
      // Reads first (Firestore transactions require all reads before writes).
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new UserError("選手データが見つかりません。");
      const u = userSnap.data()!;
      const result = evaluateTryout({
        challenged,
        completedCount: completed.length,
        currentDivision: canonicalDivision(String(u.division ?? UNDECIDED_DIVISION)),
      });

      const comps = result.resetCompetitionPoints
        ? await tx.get(db.collection("competition_results").where("userId", "==", user.id))
        : null;
      const legacyComps = result.resetCompetitionPoints
        ? await tx.get(
            db.collection("competition_results").where("One_Bouldering_ID", "==", user.id),
          )
        : null;
      const entries = await tx.get(db.collection("tnfc_entries").where("userId", "==", user.id));

      let resetPoints = 0;
      const seen = new Set<string>();
      for (const c of [...(comps?.docs ?? []), ...(legacyComps?.docs ?? [])]) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        const cd = c.data();
        if (String(cd.seasonId ?? seasonId) !== seasonId || cd.status === "reset_by_promotion") {
          continue;
        }
        resetPoints += Number(cd.earnedPoints ?? cd["獲得ポイント"] ?? cd.points ?? 0) || 0;
        tx.update(c.ref, { status: "reset_by_promotion", resetAt: now, resetByTryoutId: logId });
      }

      if (result.newDivision !== result.oldDivision) {
        const category = tnfcControlCategory(result.newDivision);
        for (const e of entries.docs) {
          const ed = e.data();
          if (String(ed.seasonId ?? seasonId) !== seasonId || ed.status === "cancelled") continue;
          if (String(ed.division ?? "") === result.newDivision) continue;
          tx.update(e.ref, {
            division: result.newDivision,
            tnfcControlCategory: category,
            autoSyncedFromTryoutAt: now,
            updatedAt: now,
          });
          tx.set(db.collection("tnfc_sync_logs").doc(), {
            seasonId,
            userId: user.id,
            entryId: e.id,
            roundId: ed.roundId ?? "",
            roundName: ed.roundName ?? "",
            oldDivision: String(ed.division ?? ""),
            newDivision: result.newDivision,
            tnfcControlCategory: category,
            syncedAt: now,
          });
        }
      }

      tx.update(userRef, { division: result.newDivision, divisionStatus: "confirmed", updatedAt: now });
      tx.set(db.collection("tryout_logs").doc(logId), {
        id: logId,
        seasonId,
        userId: user.id,
        userName: String(u.name ?? u["名前"] ?? ""),
        venueId: venue.id,
        venueName: venue.name,
        category,
        preCheckResult: precheck === "skip" ? "Skip" : `${precheck}本完登`,
        challengedDivision: canonicalDivision(challenged),
        challengedShortDivision: challenged,
        targetProblems: tryoutProblemsLabel(challenged),
        completedProblemNos: completed,
        completedCount: completed.length,
        judgment: result.judgment,
        oldDivision: result.oldDivision,
        newDivision: result.newDivision,
        compPointsReset: result.resetCompetitionPoints,
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
      });

      const first = result.oldDivision === UNDECIDED_DIVISION;
      tx.set(db.collection("notifications").doc(`notif_${randomUUID()}`), {
        seasonId,
        userId: user.id,
        title: first
          ? "Division 確定のお知らせ"
          : result.resetCompetitionPoints
            ? "Division 昇格と公認大会ポイントのリセット"
            : "Tryout 判定のお知らせ",
        message: first
          ? `${venue.name} での Tryout 結果（${completed.length}/6 完登）により、Divisionが「${result.newDivision}」に決まりました。`
          : `Tryout 結果（${completed.length}/6 完登）により、Divisionが「${result.oldDivision}」から「${result.newDivision}」になりました。` +
            (result.resetCompetitionPoints
              ? `昇格のため、公認大会ポイント ${resetPoints.toLocaleString()}pt はリセットされました。`
              : ""),
        createdAt: now,
        read: false,
        type: result.resetCompetitionPoints ? "competition_points_reset" : "division_change",
        oldDivision: result.oldDivision,
        newDivision: result.newDivision,
        resetPoints,
      });

      return {
        logId,
        venueId: venue.id,
        challenged,
        completedProblemNos: completed,
        judgment: result.judgment,
        oldDivision: result.oldDivision,
        newDivision: result.newDivision,
        resetPoints,
        hasRanking: venue.programs.hasRanking,
      };
    });

    // The ranking groups players by Division, so rebuild it when the Division changed.
    if (outcome.newDivision !== outcome.oldDivision || outcome.resetPoints > 0) {
      try {
        await rebuildRankingCache(seasonId);
        updateTag("ranking");
      } catch (err) {
        console.error("[tryout] ranking rebuild failed", err);
      }
    }
    return { result: outcome };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[tryout] submit failed", err);
    return { message: "送信できませんでした。時間をおいて、もう一度お試しください。" };
  }
}

class UserError extends Error {}
