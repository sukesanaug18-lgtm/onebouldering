"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { divisionName, shortDivision } from "@/domain/division";
import {
  CHALLENGEABLE,
  evaluateTryout,
  JUDGMENT_LABEL,
  PRECHECK_MAX,
  recommendedChallenge,
  tryoutProblems,
  tryoutProblemsLabel,
  type ChallengeDivision,
  type TryoutCategory,
} from "@/domain/tryout";
import { submitTryout } from "../actions";
import type { TryoutState } from "../schemas";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { TryoutResultPanel } from "./TryoutResult";

type Props = {
  venueId: string;
  /** Fixed by the registered gender; null lets the player choose. */
  fixedCategory: TryoutCategory | null;
  currentDivision: string;
};

/** Each retake remounts the form, starting from the Division the last attempt gave. */
export function TryoutForm(props: Props) {
  const [attempt, setAttempt] = useState({ n: 0, division: props.currentDivision });
  return (
    <TryoutAttempt
      key={attempt.n}
      {...props}
      currentDivision={attempt.division}
      onRetry={(division) => setAttempt((a) => ({ n: a.n + 1, division }))}
    />
  );
}

function TryoutAttempt({
  venueId,
  fixedCategory,
  currentDivision,
  onRetry,
}: Props & { onRetry: (division: string) => void }) {
  const [state, action, pending] = useActionState<TryoutState, FormData>(submitTryout, {});
  const [category, setCategory] = useState<TryoutCategory>(fixedCategory ?? "MD");
  const [precheck, setPrecheck] = useState<string>("");
  const [challenged, setChallenged] = useState<ChallengeDivision | "">(() =>
    ownChallenge(currentDivision, fixedCategory ?? "MD"),
  );
  const [problems, setProblems] = useState<number[]>([]);

  if (state.result) {
    const { newDivision } = state.result;
    return <TryoutResultPanel result={state.result} onRetry={() => onRetry(newDivision)} />;
  }

  const recommended =
    precheck && precheck !== "skip" ? recommendedChallenge(category, Number(precheck)) : null;
  const preview = challenged
    ? evaluateTryout({ challenged, completedCount: problems.length, currentDivision })
    : null;

  function changeCategory(next: TryoutCategory) {
    setCategory(next);
    setPrecheck("");
    setChallenged(ownChallenge(currentDivision, next));
    setProblems([]);
  }
  function changePrecheck(value: string) {
    setPrecheck(value);
    if (value !== "skip") {
      setChallenged(recommendedChallenge(category, Number(value)));
      setProblems([]);
    }
  }
  function toggleProblem(no: number, on: boolean) {
    setProblems((list) => (on ? [...list, no] : list.filter((n) => n !== no)));
  }

  return (
    <form
      action={action}
      // Submit by hand so React does not reset the form after an error (choices are kept).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-10"
    >
      <input type="hidden" name="venue" value={venueId} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <Step no={1} title="カテゴリー">
        {fixedCategory ? (
          <>
            <input type="hidden" name="category" value={fixedCategory} />
            <p className="text-[15px] font-bold">
              {fixedCategory === "MD" ? "Men's Division（MD）" : "Women's Division（WD）"}
            </p>
            <p className="mt-1 text-sm text-text-3">登録している性別から決まります。</p>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(["MD", "WD"] as const).map((c) => (
              <ChoiceChip
                key={c}
                type="radio"
                name="category"
                value={c}
                checked={category === c}
                onChange={() => changeCategory(c)}
              >
                {c === "MD" ? "Men's（MD）" : "Women's（WD）"}
              </ChoiceChip>
            ))}
          </div>
        )}
      </Step>

      <Step
        no={2}
        title="事前チェック"
        lead="ジムに用意されている事前チェック課題で、何本完登できましたか？おすすめの挑戦Divisionを選びます。"
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {Array.from({ length: PRECHECK_MAX[category] + 1 }, (_, n) => (
            <ChoiceChip
              key={n}
              type="radio"
              name="precheck"
              value={String(n)}
              checked={precheck === String(n)}
              onChange={() => changePrecheck(String(n))}
              required
            >
              {n}本
            </ChoiceChip>
          ))}
          <ChoiceChip
            type="radio"
            name="precheck"
            value="skip"
            checked={precheck === "skip"}
            onChange={() => changePrecheck("skip")}
            className="col-span-2 sm:col-span-1"
          >
            Skip
          </ChoiceChip>
        </div>
        {precheck === "skip" && (
          <p className="mt-2 text-sm text-text-3">挑戦するDivisionを自分で選んでください。</p>
        )}
      </Step>

      <Step no={3} title="挑戦するDivision">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHALLENGEABLE[category].map((d) => (
            <ChoiceChip
              key={d}
              type="radio"
              name="challenged"
              value={d}
              checked={challenged === d}
              onChange={() => {
                setChallenged(d);
                setProblems([]);
              }}
              sub={d === recommended ? "おすすめ" : tryoutProblemsLabel(d)}
              required
            >
              {divisionName(d)}
            </ChoiceChip>
          ))}
        </div>
      </Step>

      <Step
        no={4}
        title="完登した課題"
        lead={
          challenged
            ? `${divisionName(challenged)} の指定課題は ${tryoutProblemsLabel(challenged)} です。完登した課題を選んでください。`
            : "先に挑戦するDivisionを選んでください。"
        }
      >
        {challenged && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {tryoutProblems(challenged).map((no) => (
              <ChoiceChip
                key={no}
                type="checkbox"
                name="problem"
                value={String(no)}
                checked={problems.includes(no)}
                onChange={(e) => toggleProblem(no, e.currentTarget.checked)}
                className="min-h-16"
              >
                No.{no}
              </ChoiceChip>
            ))}
          </div>
        )}
      </Step>

      <div className="rounded-2xl border border-line bg-white p-6" aria-live="polite">
        {preview ? (
          <>
            <p className="text-sm text-text-3">このまま送信すると</p>
            <p className="mt-1 text-xl font-bold">
              {problems.length}/6 完登 ・ {JUDGMENT_LABEL[preview.judgment]}
              <span className="ml-2 font-display">→ {divisionName(preview.newDivision)}</span>
            </p>
            {preview.resetCompetitionPoints && (
              <p className="mt-2 text-sm text-text-2">
                昇格すると、今年度の公認大会ポイントはリセットされます。
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-text-3">挑戦するDivisionを選ぶと、判定が表示されます。</p>
        )}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !challenged}>
          {pending ? "送信中…" : "結果を送信する"}
        </Button>
        <p className="mt-3 text-center text-xs text-text-3">
          送信した時点でDivisionが決まります。何度でも挑戦できます。
        </p>
      </div>
    </form>
  );
}

function Step({
  no,
  title,
  lead,
  children,
}: {
  no: number;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="flex items-center gap-3 text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-text font-display text-sm text-white">
          {no}
        </span>
        {title}
      </legend>
      {lead && <p className="mt-2 text-sm text-text-2">{lead}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

/** Preselects the player's own Division when it can be challenged (re-takes). */
function ownChallenge(division: string, category: TryoutCategory): ChallengeDivision | "" {
  const short = shortDivision(division);
  return (CHALLENGEABLE[category] as string[]).includes(short) ? (short as ChallengeDivision) : "";
}
