"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { applyRollover, type RolloverState } from "../actions";

/** Applies the year-end reset after a confirm dialog. */
export function RolloverButton({
  nextSeasonId,
  count,
  confirmText,
  done = false,
  disabled = false,
}: {
  nextSeasonId: string;
  count: number;
  confirmText: string;
  done?: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<RolloverState, FormData>(applyRollover, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!window.confirm(confirmText)) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="nextSeasonId" value={nextSeasonId} />
      <Button type="submit" disabled={pending || disabled}>
        {pending ? "処理中…" : done ? "更新済み" : `${count}人のカテゴリーを更新する`}
      </Button>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
    </form>
  );
}
