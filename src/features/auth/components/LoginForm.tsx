"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { login } from "../actions";
import type { FormState } from "../schemas";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="ライセンスNo."
        name="licenseNo"
        inputMode="numeric"
        autoComplete="username"
        placeholder="例：20001"
        defaultValue={state.values?.licenseNo}
        error={state.errors?.licenseNo}
        required
      />
      <Field
        label="暗証番号（4桁）"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={4}
        error={state.errors?.pin}
        required
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "確認中…" : "ログイン"}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/reset-pin"
          className="text-text-2 underline underline-offset-4 hover:text-text"
        >
          暗証番号を忘れた方
        </Link>
      </p>
    </form>
  );
}
