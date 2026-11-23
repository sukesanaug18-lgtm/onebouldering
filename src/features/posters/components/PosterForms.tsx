"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { resetPoster, uploadPoster, type PosterState } from "../actions";

/** Upload a new poster for one event, or go back to the built-in one. */
export function PosterForms({
  event,
  label,
  custom,
  hasDefault,
}: {
  event: string;
  label: string;
  custom: boolean;
  hasDefault: boolean;
}) {
  const [up, upAction, upPending] = useActionState<PosterState, FormData>(uploadPoster, {});
  const [reset, resetAction, resetPending] = useActionState<PosterState, FormData>(resetPoster, {});
  const state = reset.message && !up.message ? reset : up;
  return (
    <div className="space-y-4">
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <form action={upAction} className="space-y-3">
        <input type="hidden" name="event" value={event} />
        <label htmlFor={`poster-${event}`} className="block text-sm font-bold">
          新しいポスター画像
        </label>
        <input
          id={`poster-${event}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-white file:px-4 file:font-bold"
        />
        <p className="text-xs text-text-3">
          縦長の JPEG・PNG・WebP（15MBまで）。横幅1600pxまでに縮めて保存します。
        </p>
        <Button type="submit" disabled={upPending}>
          {upPending ? "アップロード中…" : "差し替える"}
        </Button>
      </form>
      {custom && (
        <form
          action={resetAction}
          onSubmit={(e) => {
            const to = hasDefault ? "最初のポスター" : "ポスターなし";
            if (!window.confirm(`${label} のポスターを${to}に戻しますか？`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="event" value={event} />
          <button
            type="submit"
            disabled={resetPending}
            className="min-h-11 text-sm font-bold text-text-2 underline underline-offset-4 hover:text-text disabled:opacity-40"
          >
            {hasDefault ? "最初のポスターに戻す" : "ポスターを外す"}
          </button>
        </form>
      )}
    </div>
  );
}
