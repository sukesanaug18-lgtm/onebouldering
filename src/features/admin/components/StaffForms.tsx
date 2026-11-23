"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import {
  addStaff,
  removeStaff,
  requestPasswordEmail,
  resendStaffEmail,
  type PasswordEmailState,
  type StaffState,
} from "../actions";

/** /admin/staff: add an office member by email. */
export function AddStaffForm() {
  const [state, action, pending] = useActionState<StaffState, FormData>(addStaff, {});
  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <Field
        label="追加するメールアドレス"
        name="email"
        type="email"
        autoComplete="off"
        required
        hint="追加すると、そのアドレスにパスワード設定のメールが届きます。"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "追加中…" : "事務局に追加"}
      </Button>
    </form>
  );
}

/** Per-member buttons: resend the setup email, remove office access. */
export function StaffRowActions({
  uid,
  email,
  isSelf,
}: {
  uid: string;
  email: string;
  isSelf: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={resendStaffEmail}
        onSubmit={(e) => {
          if (!window.confirm(`${email} にパスワード設定のメールをもう一度送ります。`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="secondary">
          設定メールを再送
        </Button>
      </form>
      {!isSelf && (
        <form
          action={removeStaff}
          onSubmit={(e) => {
            if (!window.confirm(`${email} の事務局権限を外します。よろしいですか？`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="uid" value={uid} />
          <Button type="submit" variant="secondary">
            権限を外す
          </Button>
        </form>
      )}
    </div>
  );
}

/** /admin/login/password: request a password set / reset email. */
export function PasswordEmailForm() {
  const [state, action, pending] = useActionState<PasswordEmailState, FormData>(
    requestPasswordEmail,
    {},
  );
  if (state.sent) {
    return (
      <FormMessage tone="success">
        事務局に登録されているアドレスなら、{state.email}{" "}
        にパスワード設定のメールを送りました。メールのリンクからパスワードを決めて、ログイン画面に戻ってください。届かないときは迷惑メールフォルダも確認してください。
      </FormMessage>
    );
  }
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
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "送信中…" : "パスワード設定のメールを送る"}
      </Button>
    </form>
  );
}
