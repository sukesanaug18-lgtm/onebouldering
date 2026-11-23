"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import {
  createVenue,
  issueQrKey,
  setGymPassword,
  type QrKeyState,
  updateVenue,
  type PasswordState,
  type VenueFormState,
} from "../actions";
import type { AdminVenue } from "../queries";

function Toggle({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-5 accent-text"
      />
      {children}
    </label>
  );
}

/** Edit name, region, visibility and programs. Keeps the typed values on a server error. */
export function VenueForm({ venue, regions }: { venue: AdminVenue; regions: string[] }) {
  const [state, action, pending] = useActionState<VenueFormState, FormData>(updateVenue, {});
  const e = state.errors ?? {};
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="id" value={venue.id} />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="会場名" name="name" defaultValue={venue.name} error={e.name} required />
        <Field
          label="地域"
          name="region"
          defaultValue={venue.region}
          list="venue-regions"
          error={e.region}
          required
        />
        <datalist id="venue-regions">
          {regions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      <Field
        label="ジムの位置（緯度, 経度）"
        name="location"
        defaultValue={venue.location ? `${venue.location.lat}, ${venue.location.lng}` : ""}
        placeholder="例：35.6812, 139.7671"
        hint="Google マップでジムを右クリックすると出る数字をそのまま貼れます。位置情報での確認（ジムから約300m以内）に使います。空欄のときは QR だけで確認します。"
        error={e.location}
        inputMode="decimal"
      />
      {venue.location && (
        <a
          href={`https://www.google.com/maps?q=${venue.location.lat},${venue.location.lng}`}
          target="_blank"
          rel="noreferrer"
          className="-mt-3 inline-block text-sm font-bold underline"
        >
          地図で場所を確かめる
        </a>
      )}
      <Toggle name="visible" defaultChecked={venue.visible}>
        サイトに表示する（オフにすると QR コードを読んでも「会場が見つかりません」になります）
      </Toggle>

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-bold text-text-2">Division Tryout</legend>
        <Toggle name="hasTryout" defaultChecked={venue.programs.hasTryout}>
          この会場で Tryout を行う
        </Toggle>
        <Field
          label="期間"
          name="tryoutPeriod"
          defaultValue={
            venue.programs.tryoutPeriod === "日付未定" ? "" : venue.programs.tryoutPeriod
          }
          placeholder="例：2026/4/1〜2027/3/31"
          hint="空欄のときは「日付未定」と表示します。"
          error={e.tryoutPeriod}
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-bold text-text-2">ONE bouldering Ranking</legend>
        <Toggle name="hasRanking" defaultChecked={venue.programs.hasRanking}>
          この会場で Ranking（40課題）を行う
        </Toggle>
        <Field
          label="期間"
          name="rankingPeriod"
          defaultValue={
            venue.programs.rankingPeriod === "日付未定" ? "" : venue.programs.rankingPeriod
          }
          placeholder="例：2026/6/1〜2026/12/31"
          hint="空欄のときは「日付未定」と表示します。"
          error={e.rankingPeriod}
        />
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存する"}
      </Button>
    </form>
  );
}

/** Add a venue. New venues start hidden with no programs. */
export function CreateVenueForm({ regions }: { regions: string[] }) {
  const [state, action, pending] = useActionState<VenueFormState, FormData>(createVenue, {});
  const e = state.errors ?? {};
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="会場ID"
          name="id"
          placeholder="例：base-camp-iruma"
          hint="QR コードの URL に入ります。あとから変えられません。"
          error={e.id}
          required
        />
        <Field label="会場名" name="name" error={e.name} required />
        <Field label="地域" name="region" list="new-venue-regions" error={e.region} required />
        <datalist id="new-venue-regions">
          {regions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "登録中…" : "会場を追加"}
      </Button>
    </form>
  );
}

/** Set or generate the gym staff password; shown once. */
export function GymPasswordCard({ id, hasPassword }: { id: string; hasPassword: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setGymPassword, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          hasPassword &&
          !window.confirm("今のパスワードは使えなくなります。新しいパスワードにしますか？")
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-text-2">
        {hasPassword
          ? "パスワードは設定済みです（ハッシュで保存しているため、事務局でも確認できません）。"
          : "まだパスワードがありません。"}
        忘れたときは、ここで新しいパスワードにしてお店に伝えてください。
      </p>
      {state.password ? (
        <p className="rounded-xl border border-line bg-bg-subtle p-4" role="status">
          <span className="block text-xs text-text-3">
            新しいパスワード（この画面を閉じると再表示できません）
          </span>
          <span className="font-display text-2xl font-extrabold tracking-wider break-all">
            {state.password}
          </span>
        </p>
      ) : (
        <>
          <Field
            label="新しいパスワード（任意）"
            name="password"
            type="text"
            autoComplete="off"
            hint="空欄のまま進めると、10文字のパスワードを自動で作ります。自分で決めるときは8文字以上。"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300 disabled:opacity-40"
          >
            {pending ? "設定中…" : hasPassword ? "パスワードを変更" : "パスワードを設定"}
          </button>
        </>
      )}
      {state.message && <p className="text-sm font-bold text-[#b91c1c]">{state.message}</p>}
    </form>
  );
}

/** Issue the gym's own QR code, or replace it so old printed copies stop working. */
export function QrKeyButton({ id, hasKey }: { id: string; hasKey: boolean }) {
  const [state, action, pending] = useActionState<QrKeyState, FormData>(issueQrKey, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          hasKey &&
          !window.confirm(
            "今貼ってある QR コードは使えなくなります（読んでも入力できなくなります）。作り直しますか？",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      {hasKey ? (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300 disabled:opacity-40"
        >
          {pending ? "作り直し中…" : "QR コードを作り直す"}
        </button>
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? "発行中…" : "QR コードを発行する"}
        </Button>
      )}
    </form>
  );
}
