// Gym staff screens (workflow diagram B-3, "/gym-admin"): approval, single-problem removal,
// per-problem send rates and the Tryout CSV. Pure functions; Firestore writes live in
// features/gym/actions.ts.

import {
  approvedProblems,
  mergeSubmission,
  PROBLEM_NOS,
  recordStatus,
  sentProblems,
  totalPoints,
  type PointMap,
} from "./score.ts";

type Doc = Record<string, unknown>;

/** Fields written when the gym approves a record: every sent problem becomes approved. */
export function approvalFields(record: Doc, points: PointMap) {
  const sent = sentProblems(record);
  const sum = totalPoints(sent, points);
  return {
    approvedProblems: Object.fromEntries(sent.map((n) => [String(n), true])),
    approvedTotalPoints: sum,
    totalPoints: sum,
    合計ポイント: String(sum),
    status: "Approved" as const,
    承認ステータス: "Approved" as const,
    rejectReason: "",
  };
}

/**
 * Fields written when the gym rejects a record.
 * - From the Pending list: the part approved earlier stays in the ranking; only the new
 *   additions are sent back.
 * - "Send everything back" from the Approved list (`all`): nothing stays approved.
 */
export function rejectionFields(record: Doc, points: PointMap, reason: string, all: boolean) {
  const kept = all ? [] : approvedProblems(record);
  return {
    approvedProblems: Object.fromEntries(kept.map((n) => [String(n), true])),
    approvedTotalPoints: totalPoints(kept, points),
    status: "Rejected" as const,
    承認ステータス: "Rejected" as const,
    rejectReason: reason,
  };
}

/** Fields written when the gym removes one problem from an approved record (stays Approved). */
export function removalFields(record: Doc, no: number, points: PointMap) {
  const sent = sentProblems(record).filter((n) => n !== no);
  const approved = approvedProblems(record).filter((n) => n !== no);
  const map = mergeSubmission(sent, []);
  const sum = totalPoints(sent, points);
  return {
    problems: map,
    ...map,
    approvedProblems: Object.fromEntries(approved.map((n) => [String(n), true])),
    approvedTotalPoints: totalPoints(approved, points),
    totalPoints: sum,
    合計ポイント: String(sum),
  };
}

/** Problems in a Pending record that the gym has not approved yet (the new additions). */
export function newProblems(record: Doc): number[] {
  const approved = new Set(approvedProblems(record));
  return sentProblems(record).filter((n) => !approved.has(n));
}

export type SendRate = { no: number; sent: number; rate: number };

/** Share of records that sent each problem (Rejected records are left out). */
export function problemSendRates(records: Doc[]): { total: number; rates: SendRate[] } {
  const counted = records.filter((r) => recordStatus(r) !== "Rejected");
  const counts = new Map<number, number>();
  for (const r of counted) for (const n of sentProblems(r)) counts.set(n, (counts.get(n) ?? 0) + 1);
  const total = counted.length;
  return {
    total,
    rates: PROBLEM_NOS.map((no) => {
      const sent = counts.get(no) ?? 0;
      return { no, sent, rate: total ? sent / total : 0 };
    }),
  };
}

/** CSV with a UTF-8 BOM (so Excel opens Japanese text correctly) and CRLF line ends. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    // Keep spreadsheet apps from running cell text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
