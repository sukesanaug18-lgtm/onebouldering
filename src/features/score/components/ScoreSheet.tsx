"use client";

import { startTransition, useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { FormMessage } from "@/components/ui/Field";
import { PROBLEM_NOS, totalPoints, type PointMap } from "@/domain/score";
import { submitScore, type ScoreState } from "../actions";

type Props = {
  venueId: string;
  points: PointMap;
  /** Already sent (saved) problems, including approved ones. */
  initial: number[];
  /** Approved by the gym: always checked, cannot be removed. */
  locked: number[];
  /** Problem numbers carried over from the Tryout result. */
  prefill: number[];
};

/** Each "keep entering" remounts the sheet so it starts from the saved state. */
export function ScoreSheet(props: Props) {
  const [round, setRound] = useState(0);
  return <Sheet key={round} {...props} onAgain={() => setRound((n) => n + 1)} />;
}

function Sheet({
  venueId,
  points,
  initial,
  locked,
  prefill,
  onAgain,
}: Props & { onAgain: () => void }) {
  const [state, action, pending] = useActionState<ScoreState, FormData>(submitScore, {});
  const [selected, setSelected] = useState<number[]>(() => [
    ...new Set([...initial, ...locked, ...prefill]),
  ]);
  const lockedSet = new Set(locked);

  if (state.ok) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-white p-8 text-center" role="status">
          <p className="text-sm text-text-3">送信しました（店舗の承認待ち）</p>
          <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">
            {state.totalPoints?.toLocaleString()}
            <span className="ml-1 text-lg">pt</span>
          </p>
          <p className="mt-4 text-[15px] text-text-2">
            帰る前に、店舗スタッフに声をかけてください。承認されると正式なスコアになり、参加賞のステッカーを受け取れます。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button href="/mypage" size="lg">
            マイページへ
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={onAgain}>
            入力を続ける
          </Button>
        </div>
      </div>
    );
  }

  const total = totalPoints(selected, points);
  const added = selected.filter((n) => !initial.includes(n)).length;

  return (
    <form
      action={action}
      // Submit by hand so React does not reset the checkboxes after an error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="venue" value={venueId} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <fieldset>
        <legend className="text-lg font-bold">完登した課題</legend>
        <p className="mt-1 text-sm text-text-2">
          番号を押して選びます。番号の下はその課題のポイントです。
          {locked.length > 0 && (
            <>
              <Lock className="mx-1 inline size-3.5" aria-hidden />
              は承認済みで、外せません。
            </>
          )}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PROBLEM_NOS.map((no) => {
            const isLocked = lockedSet.has(no);
            return (
              <ChoiceChip
                key={no}
                type="checkbox"
                name="problem"
                value={String(no)}
                checked={selected.includes(no)}
                disabled={isLocked}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  setSelected((list) => (on ? [...list, no] : list.filter((n) => n !== no)));
                }}
                sub={`${points[no] ?? 0}pt`}
                className={isLocked ? "has-disabled:opacity-100" : undefined}
              >
                {isLocked && <Lock className="mr-0.5 inline size-3" aria-label="承認済み" />}
                {no}
              </ChoiceChip>
            );
          })}
        </div>
      </fieldset>

      <div className="sticky bottom-20 z-10 rounded-2xl border border-line bg-white/95 p-5 backdrop-blur-md lg:bottom-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-text-3">
              {selected.length}課題{added > 0 && initial.length > 0 ? `（追加 ${added}）` : ""}
            </p>
            <p className="font-display text-3xl font-extrabold tabular-nums" aria-live="polite">
              {total.toLocaleString()}
              <span className="ml-1 text-base">pt</span>
            </p>
          </div>
          <Button type="submit" size="lg" disabled={pending || selected.length === 0}>
            {pending ? "送信中…" : "スコアを提出する"}
          </Button>
        </div>
      </div>
    </form>
  );
}
