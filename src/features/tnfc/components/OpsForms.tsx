"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { CANCEL_TYPES, CONTACT_CHANNELS } from "@/domain/tnfc-finals";
import {
  applyFinalsPromotions,
  buildFinalsEntries,
  cancelEntry,
  createFinalsRound,
  declineFinalist,
  moveEntry,
  type FinalsFormState,
  type OpsState,
} from "../ops-actions";
import { CopyButton } from "./TnfcForms";

const selectClass =
  "mt-2 block min-h-11 w-full rounded-xl border border-line bg-white px-3 hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";
const labelClass = "text-sm font-bold";

/** Result message plus the reply to send back through the player's channel. */
function Outcome({ state }: { state: OpsState }) {
  if (!state.message) return null;
  return (
    <div className="space-y-3">
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      {state.reply && (
        <div className="rounded-xl border border-line bg-bg-subtle p-4">
          <p className="mb-2 text-xs font-bold text-text-3">
            返信文（受け付けた手段で送ってください）
          </p>
          <pre className="font-sans text-sm whitespace-pre-wrap">{state.reply}</pre>
          <div className="mt-3">
            <CopyButton text={state.reply} label="返信文をコピー" />
          </div>
        </div>
      )}
    </div>
  );
}

export type OpsEntry = { id: string; label: string; division: string };
export type OpsRound = { id: string; label: string };

function ChannelSelect({ id }: { id: string }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        受け付けた手段
      </label>
      <select id={id} name="channel" defaultValue="mail" className={selectClass}>
        {Object.entries(CONTACT_CHANNELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 1.6.1 / 1.6.2 Pick a player, then cancel (with the ledger) or move to another round. */
export function EntryOpsPanel({ entries, rounds }: { entries: OpsEntry[]; rounds: OpsRound[] }) {
  const [entryId, setEntryId] = useState("");
  const [cancelState, cancel, cancelling] = useActionState<OpsState, FormData>(cancelEntry, {});
  const [moveState, move, moving] = useActionState<OpsState, FormData>(moveEntry, {});
  const picked = entries.find((e) => e.id === entryId);

  const submit =
    (action: (fd: FormData) => void, confirmText: string) =>
    (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      if (!window.confirm(confirmText)) return;
      const fd = new FormData(ev.currentTarget);
      fd.set("entryId", entryId);
      startTransition(() => action(fd));
    };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="ops-entry" className={labelClass}>
          選手
        </label>
        <select
          id="ops-entry"
          value={entryId}
          onChange={(e) => setEntryId(e.target.value)}
          className={selectClass}
        >
          <option value="">選んでください</option>
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={submit(
          cancel,
          `${picked?.label ?? ""} をキャンセルにして台帳に記録します。よろしいですか？`,
        )}
        className="space-y-4 rounded-xl border border-line p-4"
      >
        <h3 className="font-bold">キャンセル（1.6.1・1.2.3）</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ops-type" className={labelClass}>
              区分
            </label>
            <select
              id="ops-type"
              name="cancelType"
              defaultValue="convenience_refund"
              className={selectClass}
            >
              {Object.entries(CANCEL_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Field label="金額（円）" name="amount" inputMode="numeric" placeholder="0" />
          <ChannelSelect id="ops-channel-c" />
        </div>
        <Field label="メモ（任意）" name="note" placeholder="例：体調不良のため" />
        <Button type="submit" variant="secondary" disabled={!entryId || cancelling}>
          {cancelling ? "処理中…" : "キャンセルにして台帳に記録"}
        </Button>
        <Outcome state={cancelState} />
      </form>

      <form
        onSubmit={submit(move, `${picked?.label ?? ""} を選んだ予選に移します。よろしいですか？`)}
        className="space-y-4 rounded-xl border border-line p-4"
      >
        <h3 className="font-bold">会場変更（1.6.2）</h3>
        {rounds.length === 0 ? (
          <p className="text-sm text-text-3">移せるほかの予選がありません。</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ops-target" className={labelClass}>
                移動先の予選
              </label>
              <select id="ops-target" name="targetRoundId" className={selectClass} defaultValue="">
                <option value="" disabled>
                  選んでください
                </option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <ChannelSelect id="ops-channel-m" />
          </div>
        )}
        <p className="text-xs text-text-3">
          ゼッケンとグループは外れます。旧サイトを使っている間は、旧サイト側の申込の会場・会場の定員・カテゴリー定員の3か所も直してください。
        </p>
        <Button
          type="submit"
          variant="secondary"
          disabled={!entryId || moving || rounds.length === 0}
        >
          {moving ? "処理中…" : "会場を移す"}
        </Button>
        <Outcome state={moveState} />
      </form>
    </div>
  );
}

export type DeclineTarget = {
  id: string;
  label: string;
  next: { id: string; label: string } | null;
};

/** 1.3 A finalist declines; the next player of the same round and category can move up. */
export function DeclinePanel({ finalists }: { finalists: DeclineTarget[] }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(declineFinalist, {});
  const [resultId, setResultId] = useState("");
  const [promote, setPromote] = useState(true);
  const picked = finalists.find((f) => f.id === resultId);
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!picked) return;
        const msg = `${picked.label} の本戦辞退を記録します。${
          promote && picked.next
            ? `
次点の ${picked.next.label} を繰り上げて通知します。`
            : ""
        }`;
        if (!window.confirm(msg)) return;
        const fd = new FormData(ev.currentTarget);
        fd.set("resultId", picked.id);
        if (promote && picked.next) fd.set("promoteId", picked.next.id);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dec-who" className={labelClass}>
            辞退する選手
          </label>
          <select
            id="dec-who"
            value={resultId}
            onChange={(e) => setResultId(e.target.value)}
            className={selectClass}
          >
            <option value="">選んでください</option>
            {finalists.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <ChannelSelect id="dec-channel" />
      </div>
      {picked && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={promote && Boolean(picked.next)}
            disabled={!picked.next}
            onChange={(e) => setPromote(e.target.checked)}
            className="size-5 accent-text"
          />
          {picked.next
            ? `次点を繰り上げる：${picked.next.label}`
            : "同じ予選・カテゴリーに繰り上げられる人はいません"}
        </label>
      )}
      <Button type="submit" variant="secondary" disabled={!picked || pending}>
        {pending ? "処理中…" : "辞退を記録"}
      </Button>
      <Outcome state={state} />
    </form>
  );
}

/** One-button finals actions (build entries / apply promotions). */
export function FinalsActionButton({
  kind,
  roundId,
  label,
  confirmText,
  cutoff,
  disabled = false,
}: {
  kind: "entries" | "promotions";
  roundId: string;
  label: string;
  confirmText: string;
  cutoff?: number;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<OpsState, FormData>(
    kind === "entries" ? buildFinalsEntries : applyFinalsPromotions,
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!window.confirm(confirmText)) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="roundId" value={roundId} />
      {cutoff != null && <input type="hidden" name="cutoff" value={cutoff} />}
      <Button type="submit" disabled={pending || disabled}>
        {pending ? "処理中…" : label}
      </Button>
      <Outcome state={state} />
    </form>
  );
}

/** 1.3 Creates the season's finals round. */
export function CreateFinalsForm({
  venues,
  previousFinalBibNo,
}: {
  venues: { id: string; name: string }[];
  previousFinalBibNo: number;
}) {
  const [state, action, pending] = useActionState<FinalsFormState, FormData>(createFinalsRound, {});
  const e = state.errors ?? {};
  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fin-venue" className={labelClass}>
            会場
          </label>
          <select id="fin-venue" name="venueId" defaultValue="" className={selectClass}>
            <option value="" disabled>
              選んでください
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {e.venueId && <p className="mt-1 text-sm text-[#b91c1c]">{e.venueId[0]}</p>}
        </div>
        <Field label="開催日" name="eventDate" type="date" error={e.eventDate} />
        <Field
          label="エリア数"
          name="areaCount"
          inputMode="numeric"
          defaultValue="6"
          error={e.areaCount}
        />
        <Field
          label="前の大会の最終ゼッケン"
          name="previousFinalBibNo"
          inputMode="numeric"
          defaultValue={String(previousFinalBibNo)}
          hint="本戦のゼッケンは、この次の番号から付けます。"
          error={e.previousFinalBibNo}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "作成中…" : "本戦を作る"}
      </Button>
    </form>
  );
}
