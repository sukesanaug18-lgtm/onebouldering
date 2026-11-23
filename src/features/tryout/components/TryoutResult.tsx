"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { divisionName, UNDECIDED_DIVISION } from "@/domain/division";
import { JUDGMENT_LABEL } from "@/domain/tryout";
import type { TryoutOutcome } from "../schemas";

/** Shown after a Tryout is saved: judgment, old → new Division, and what to do next. */
export function TryoutResultPanel({
  result,
  onRetry,
}: {
  result: TryoutOutcome;
  onRetry: () => void;
}) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const venue = encodeURIComponent(result.venueId);
  const prefill = result.completedProblemNos.join(",");
  const first = result.oldDivision === UNDECIDED_DIVISION;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-8 text-center" role="status">
        <p className="text-sm text-text-3">
          {divisionName(result.challenged)} に挑戦 ・ {result.completedProblemNos.length}/6 完登
        </p>
        <p className="mt-2 text-2xl font-bold">{JUDGMENT_LABEL[result.judgment]}</p>
        <p className="mt-6 flex items-center justify-center gap-4 font-display text-4xl font-extrabold">
          {first ? (
            <span className="text-base font-bold text-text-3">未確定</span>
          ) : (
            <span className="text-text-3">{divisionName(result.oldDivision)}</span>
          )}
          <ArrowRight className="size-6 text-text-3" aria-label="から" />
          <span>{divisionName(result.newDivision)}</span>
        </p>
        <p className="mt-6 text-[15px] text-text-2">
          新しいDivisionは、マイページ・Ranking・THE NORTH FACE CUP のエントリーに反映されました。
        </p>
        {result.resetPoints > 0 && (
          <p className="mt-2 text-sm text-text-2">
            昇格のため、今年度の公認大会ポイント {result.resetPoints.toLocaleString()}pt
            はリセットされました。
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {result.hasRanking && (
          <Button
            href={`/score?venue=${venue}${prefill ? `&prefill=${prefill}` : ""}`}
            size="lg"
            className="sm:col-span-2"
          >
            完登した課題を Ranking に入力する
          </Button>
        )}
        <Button href="/mypage" size="lg" variant={result.hasRanking ? "secondary" : "primary"}>
          マイページへ
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={onRetry}>
          もう一度挑戦する
        </Button>
      </div>
    </div>
  );
}
