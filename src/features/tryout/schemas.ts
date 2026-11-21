import * as z from "zod";
import type { ChallengeDivision, TryoutJudgment } from "@/domain/tryout";

// The form sends: venue, category, precheck ("skip" or 0–5), challenged ("MD3"…), problem (repeated).

export const TryoutSchema = z.object({
  venue: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, { error: "ジムを選んでください。" }),
  category: z.enum(["MD", "WD"], { error: "カテゴリーを選んでください。" }),
  precheck: z.union([z.literal("skip"), z.coerce.number().int().min(0).max(5)], {
    error: "事前チェックを選んでください。",
  }),
  challenged: z.enum(["MD2", "MD3", "MD4", "MD5", "WD2", "WD3", "WD4"], {
    error: "挑戦するDivisionを選んでください。",
  }),
  problems: z.array(z.coerce.number().int().min(1).max(40)).max(6),
});

export type TryoutOutcome = {
  logId: string;
  venueId: string;
  challenged: ChallengeDivision;
  completedProblemNos: number[];
  judgment: TryoutJudgment;
  oldDivision: string;
  newDivision: string;
  resetPoints: number;
  hasRanking: boolean;
};

export type TryoutState = { message?: string; result?: TryoutOutcome };
