"use client";

import { Check, Copy } from "lucide-react";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { VENUE_CHECKLIST } from "@/domain/tnfc";
import { cn } from "@/lib/cn";
import {
  createRound,
  importEntries,
  numberRound,
  syncRoundEntries,
  updateRound,
  type SimpleState,
  type TnfcFormState,
} from "../actions";
import type { AdminRound } from "../queries";
import { ROUND_STATUS } from "../status";

type Errors = Partial<Record<string, string[]>>;

/** Submits with startTransition so typed values stay after a server error (React 19). */
function useKeepValues(action: (data: FormData) => void) {
  return (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    startTransition(() => action(data));
  };
}

const selectClass =
  "mt-2 block min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";

function SelectField({
  label,
  name,
  defaultValue,
  error,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="text-sm font-bold">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue} className={selectClass}>
        {children}
      </select>
      {error?.length ? <p className="mt-1.5 text-sm text-status-rejected">{error[0]}</p> : null}
    </div>
  );
}

/** Fields shared by "new round" and "edit round". */
function RoundFields({ e, round }: { e: Errors; round?: Partial<AdminRound> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="ラウンド番号"
        name="roundNumber"
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={round?.roundNumber}
        error={e.roundNumber}
        required
      />
      <Field
        label="開催日"
        name="eventDate"
        type="date"
        defaultValue={round?.eventDate}
        error={e.eventDate}
      />
      <Field
        label="エントリー締切"
        name="entryDeadline"
        type="date"
        defaultValue={round?.entryDeadline}
        error={e.entryDeadline}
      />
      <Field
        label="エリア数"
        name="areaCount"
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={round?.areaCount ?? 4}
        hint="グループ分けに使います（1エリア約5人）。"
        error={e.areaCount}
        required
      />
      <Field
        label="定員"
        name="capacity"
        type="number"
        inputMode="numeric"
        min={0}
        defaultValue={round?.capacity ?? 0}
        error={e.capacity}
      />
      <Field
        label="前の会場の最終ゼッケン"
        name="previousFinalBibNo"
        type="number"
        inputMode="numeric"
        min={0}
        defaultValue={round?.previousFinalBibNo ?? 0}
        hint="この次の番号から付けます。"
        error={e.previousFinalBibNo}
        required
      />
      <Field
        label="ジャッジパスワード（TNFC Control）"
        name="judgePassword"
        defaultValue={round?.judgePassword ?? "0000"}
        autoComplete="off"
        error={e.judgePassword}
        required
      />
    </div>
  );
}

/** New qualifier round. */
export function CreateRoundForm({
  venues,
  defaults,
}: {
  venues: { id: string; name: string; region: string }[];
  defaults: { roundNumber: number; previousFinalBibNo: number };
}) {
  const [state, action, pending] = useActionState<TnfcFormState, FormData>(createRound, {});
  const e = state.errors ?? {};
  return (
    <form noValidate className="space-y-5" onSubmit={useKeepValues(action)}>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <SelectField label="会場" name="venueId" defaultValue="" error={e.venueId}>
        <option value="" disabled>
          選んでください
        </option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}（{v.region || "地域未設定"}）
          </option>
        ))}
      </SelectField>
      <RoundFields e={e} round={defaults} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "登録中…" : "大会を追加"}
      </Button>
    </form>
  );
}

/** Edit the round, its status, the TNFC Control link and the 8 venue items. */
export function RoundForm({ round }: { round: AdminRound }) {
  const [state, action, pending] = useActionState<TnfcFormState, FormData>(updateRound, {});
  const e = state.errors ?? {};
  return (
    <form noValidate className="space-y-6" onSubmit={useKeepValues(action)}>
      <input type="hidden" name="id" value={round.id} />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="状況" name="status" defaultValue={round.status} error={e.status}>
          {Object.entries(ROUND_STATUS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          label="TNFC Control の大会 URL"
          name="tnfcControlEventUrl"
          type="url"
          defaultValue={round.tnfcControlEventUrl}
          placeholder="https://"
          error={e.tnfcControlEventUrl}
        />
      </div>
      <RoundFields e={e} round={round} />
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-bold text-text-2">会場に確認する8項目</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {VENUE_CHECKLIST.map((c) => (
            <Field
              key={c.key}
              label={c.label}
              name={c.key}
              defaultValue={round.checklist[c.key]}
              error={e[c.key]}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存する"}
      </Button>
    </form>
  );
}

/** Entry CSV import: a file (UTF-8 or Shift_JIS) or pasted text. */
export function ImportEntriesForm({ roundId }: { roundId: string }) {
  const [state, action, pending] = useActionState<TnfcFormState, FormData>(importEntries, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="roundId" value={roundId} />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <div>
        <label htmlFor="f-file" className="text-sm font-bold">
          CSV ファイル
        </label>
        <input
          id="f-file"
          name="file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-white file:px-4 file:font-bold"
        />
      </div>
      <div>
        <label htmlFor="f-csv" className="text-sm font-bold">
          または CSV を貼り付け
        </label>
        <textarea
          id="f-csv"
          name="csv"
          rows={5}
          placeholder={
            "ID,氏名,ふりがな,カテゴリー,ZEUSオーダーNo,メールアドレス,ステータス\n10001,山田 太郎,やまだ たろう,Men's Division 3,ZE-123,…"
          }
          className="mt-2 block w-full rounded-xl border border-line bg-white p-3 font-mono text-sm hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "取り込み中…" : "取り込む"}
      </Button>
    </form>
  );
}

/** One-button action (sync / number) with an optional confirm and its result message. */
export function RoundActionButton({
  kind,
  roundId,
  label,
  confirmText,
  variant = "primary",
}: {
  kind: "sync" | "number";
  roundId: string;
  label: string;
  confirmText?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(
    kind === "sync" ? syncRoundEntries : numberRound,
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (confirmText && !window.confirm(confirmText)) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="roundId" value={roundId} />
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "処理中…" : label}
      </Button>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
    </form>
  );
}

/** Copies text (BCC addresses, guideline outline) to the clipboard. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("コピーしてください", text);
        }
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-bold hover:border-gray-300 disabled:opacity-40",
      )}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "コピーしました" : label}
    </button>
  );
}
