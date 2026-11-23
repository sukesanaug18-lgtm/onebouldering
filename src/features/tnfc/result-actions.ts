"use server";

import { revalidatePath, updateTag } from "next/cache";
import { parseResultCsv, scoreResults, type ResultRow } from "@/domain/tnfc-results";
import { getAdmin } from "@/server/admin-session";
import { adminDb } from "@/server/firebase-admin";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { getMembers, getRound } from "./queries";

// Office work after a TNFC qualifier (workflow diagram B-5, 1.2.1): read the result list,
// decide the finalists and give the Ranking points in one step. Running it again for the same
// round replaces that round's results and points.

export type ResultImportState = {
  ok?: boolean;
  message?: string;
  /** Parsed rows for the office to check before applying (not saved yet). */
  preview?: {
    rows: ResultRow[];
    skippedLines: number[];
    unknownIds: string[];
    duplicateIds: string[];
  };
  applied?: boolean;
};

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const MAX_CSV = 2 * 1024 * 1024;
const BATCH = 200; // two writes per player

function readCutoffs(raw: FormDataEntryValue | null): Record<string, number> {
  try {
    const obj = JSON.parse(String(raw ?? "{}")) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(obj)
        .map(([k, v]) => [k, Math.floor(Number(v))] as const)
        .filter(([k, v]) => k.length <= 40 && Number.isFinite(v) && v >= 0 && v <= 999),
    );
  } catch {
    return {};
  }
}

/** mode=preview parses only; mode=apply saves results, finalists and Ranking points. */
export async function importResults(
  _prev: ResultImportState,
  formData: FormData,
): Promise<ResultImportState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const round = await getRound(String(formData.get("roundId") ?? ""));
  if (!round) return { message: "大会が見つかりません。" };

  const csv = String(formData.get("csv") ?? "");
  if (!csv.trim()) return { message: "リザルトの CSV を貼り付けるか、ファイルを選んでください。" };
  if (csv.length > MAX_CSV) return { message: "CSV が大きすぎます（2MBまで）。" };

  // First pass finds the license numbers; the second fills names and categories from members.
  const members = await getMembers(parseResultCsv(csv, new Map()).rows.map((r) => r.userId));
  const parsed = parseResultCsv(csv, members);
  if (parsed.rows.length === 0) {
    return {
      message:
        "取り込める行がありませんでした。1行目に「順位」「ID」（またはライセンスNo）「氏名」「カテゴリー」の見出しがあるか確認してください。",
    };
  }
  if (formData.get("mode") !== "apply") return { preview: parsed };

  const cutoff = Math.floor(Number(formData.get("cutoff")));
  if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > 999) {
    return { preview: parsed, message: "本戦通過ラインを数字で入力してください。" };
  }
  const cutoffs = readCutoffs(formData.get("cutoffs"));
  const results = scoreResults(parsed.rows, cutoff, cutoffs);

  const db = adminDb();
  const now = new Date().toISOString();
  const compName = `${round.roundName}（${round.venueName}）`;
  try {
    const [oldResults, oldComps] = await Promise.all([
      db.collection("tnfc_results").where("roundId", "==", round.id).get(),
      db.collection("competition_results").where("roundId", "==", round.id).get(),
    ]);
    const keep = new Set(results.map((r) => `${round.id}_${r.userId}`));
    const oldResultById = new Map(oldResults.docs.map((d) => [d.id, d.data()]));
    // Old competition docs may lack roundId; their ids follow the same pattern.
    const oldCompIds = new Set([...oldComps.docs.map((d) => d.id), ...oldResultById.keys()]);
    const oldCompSnaps = oldCompIds.size
      ? await db.getAll(
          ...[...oldCompIds].map((id) => db.collection("competition_results").doc(id)),
        )
      : [];
    const oldCompById = new Map(oldCompSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()!]));

    const stale = [...new Set([...oldResultById.keys(), ...oldCompById.keys()])].filter(
      (id) => !keep.has(id),
    );
    for (let i = 0; i < stale.length; i += BATCH) {
      const batch = db.batch();
      for (const id of stale.slice(i, i + BATCH)) {
        batch.delete(db.collection("tnfc_results").doc(id));
        batch.delete(db.collection("competition_results").doc(id));
      }
      await batch.commit();
    }

    for (let i = 0; i < results.length; i += BATCH) {
      const batch = db.batch();
      for (const r of results.slice(i, i + BATCH)) {
        const id = `${round.id}_${r.userId}`;
        const before = oldResultById.get(id);
        const comp = oldCompById.get(id);
        batch.set(db.collection("tnfc_results").doc(id), {
          id,
          seasonId: round.seasonId,
          roundId: round.id,
          roundName: round.roundName,
          venueId: round.venueId,
          venueName: round.venueName,
          eventDate: round.eventDate,
          userId: r.userId,
          userName: r.name,
          division: r.division,
          categoryParticipants: r.categoryCount,
          rank: r.rank,
          scoreSummary: r.score,
          // A player moved up after a finalist declined stays a finalist.
          qualifiedForFinals:
            before?.status !== "cancelled_finals" &&
            (r.qualified || before?.promotedToFinals === true),
          ...(before?.promotedToFinals ? { promotedToFinals: true } : {}),
          rankingPointsAwarded: r.points,
          // A finalist who declined stays declined when the list is imported again.
          status: before?.status === "cancelled_finals" ? "cancelled_finals" : "active",
          createdAt: before?.createdAt ?? now,
          updatedAt: now,
        });
        batch.set(db.collection("competition_results").doc(id), {
          seasonId: round.seasonId,
          roundId: round.id,
          userId: r.userId,
          One_Bouldering_ID: r.userId,
          compName,
          tournamentName: compName,
          大会名: compName,
          rank: String(r.rank),
          順位: String(r.rank),
          earnedPoints: r.points,
          points: r.points,
          獲得ポイント: r.points,
          division: r.division,
          // Points already cancelled by a Tryout promotion stay cancelled.
          status: comp?.status === "reset_by_promotion" ? "reset_by_promotion" : "active",
          ...(comp?.status === "reset_by_promotion"
            ? { resetAt: comp.resetAt ?? null, resetByTryoutId: comp.resetByTryoutId ?? null }
            : {}),
          source: "tnfc_auto_import",
          createdAt: comp?.createdAt ?? now,
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    const finalists = results.filter((r) => r.qualified).length;
    await db.collection("tnfc_rounds").doc(round.id).update({
      status: "completed",
      finalsCutoff: cutoff,
      finalsCutoffByCategory: cutoffs,
      resultCount: results.length,
      finalistCount: finalists,
      resultsImportedAt: now,
      updatedAt: now,
      updatedBy: admin.email,
    });
    await db.collection("admin_logs").add({
      action: "tnfc_results_import",
      roundId: round.id,
      by: admin.email,
      at: now,
      count: results.length,
      finalists,
      removed: stale.length,
      cutoff,
      cutoffs,
    });
    await rebuildRankingCache(round.seasonId);
    updateTag("ranking");
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    const notes = [
      round.roundNumber >= 90
        ? `${results.length}人の本戦リザルトを確定し、Ranking ポイントを付与しました。Division 昇格は「本戦」のページで行います。`
        : `${results.length}人のリザルトを確定し、本戦出場者${finalists}人を決めて、Ranking ポイントを付与しました。`,
      stale.length > 0 ? `前回の取り込みにいて今回いない${stale.length}人の結果は消しました。` : "",
      parsed.unknownIds.length > 0
        ? `会員にいないライセンスNoが${parsed.unknownIds.length}件ありました（結果は保存しましたが、ランキングには出ません）。`
        : "",
    ];
    return { ok: true, applied: true, message: notes.filter(Boolean).join(" ") };
  } catch (err) {
    console.error("[tnfc] result import failed", err);
    return {
      preview: parsed,
      message: "保存できませんでした。時間をおいて、もう一度お試しください。",
    };
  }
}
