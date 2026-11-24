"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { resetPin } from "../actions";
import type { FormState } from "../schemas";

export function ResetPinForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPin, {});

  if (state.ok) {
    return (
      <div className="space-y-6">
        <FormMessage tone="success">
          暗証番号を変更しました。新しい暗証番号でログインしてください。
        </FormMessage>
        <Button href="/login" size="lg" className="w-full">
          ログインへ
        </Button>
      </div>
    );
  }

  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="ライセンスNo."
        name="licenseNo"
        inputMode="numeric"
        autoComplete="username"
        placeholder="例：20001"
        defaultValue={v.licenseNo}
        error={state.errors?.licenseNo}
        required
      />
      <Field
        label="登録したメールアドレス"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={v.email}
        error={state.errors?.email}
        required
      />
      <Field
        label="生年月日"
        name="birthDate"
        type="date"
        autoComplete="bday"
        defaultValue={v.birthDate}
        error={state.errors?.birthDate}
        hint="会員登録のときに入れた生年月日です。"
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="新しい暗証番号（4桁）"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          error={state.errors?.pin}
          required
        />
        <Field
          label="新しい暗証番号（確認用）"
          name="pinConfirm"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          error={state.errors?.pinConfirm}
          required
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "確認中…" : "暗証番号を変更する"}
      </Button>
    </form>
  );
}
