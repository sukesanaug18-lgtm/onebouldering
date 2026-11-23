"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { adminLogin, type AdminLoginState } from "../actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLogin, {});
  return (
    <form action={action} className="space-y-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="メールアドレス"
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={state.email}
        required
      />
      <Field
        label="パスワード"
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
