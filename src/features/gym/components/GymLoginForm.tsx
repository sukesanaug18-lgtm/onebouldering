"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { gymLogin, type GymActionState } from "../actions";

export function GymLoginForm({ venues }: { venues: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<GymActionState, FormData>(gymLogin, {});
  return (
    <form action={action} className="space-y-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <div>
        <label htmlFor="gym-venue" className="text-sm font-bold">
          会場
        </label>
        <select
          id="gym-venue"
          name="venue"
          required
          key={state.venue}
          defaultValue={state.venue ?? ""}
          autoComplete="username"
          className="mt-2 block min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          <option value="" disabled>
            会場を選んでください
          </option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="店舗パスワード"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "確認中…" : "ログイン"}
      </Button>
    </form>
  );
}
