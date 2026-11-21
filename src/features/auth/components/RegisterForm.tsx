"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { GENDERS, recommendUCategory } from "@/domain/member";
import { cn } from "@/lib/cn";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { register } from "../actions";
import type { FormState } from "../schemas";

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const [birthDate, setBirthDate] = useState(state.values?.birthDate ?? "");
  const [gender, setGender] = useState(state.values?.gender ?? "");
  const uCategory = birthDate ? recommendUCategory(birthDate, gender, CURRENT_SEASON_ID) : null;

  if (state.ok && state.licenseNo) {
    return <Registered licenseNo={state.licenseNo} redirectTo={redirectTo} />;
  }

  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-8" noValidate>
      {Object.keys(state.errors ?? {}).length > 0 && (
        <FormMessage tone="error">入力内容を確認してください。</FormMessage>
      )}

      <fieldset className="space-y-5">
        <legend className="mb-4 font-display text-xs font-bold tracking-[0.15em] text-text-3 uppercase">
          Profile
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="氏名"
            name="name"
            autoComplete="name"
            placeholder="山田 太郎"
            defaultValue={v.name}
            error={state.errors?.name}
            required
          />
          <Field
            label="フリガナ"
            name="furigana"
            placeholder="ヤマダ タロウ"
            defaultValue={v.furigana}
            error={state.errors?.furigana}
            required
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="生年月日"
            name="birthDate"
            type="date"
            autoComplete="bday"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            error={state.errors?.birthDate}
            hint="Uカテゴリーの判定に使います。"
            required
          />
          <Field label="性別" name="gender" error={state.errors?.gender} required>
            <div
              role="radiogroup"
              aria-labelledby="f-gender"
              className="mt-2 grid grid-cols-3 gap-2"
            >
              {GENDERS.map((g) => (
                <label
                  key={g}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-bold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text",
                    gender === g
                      ? "border-text bg-text text-white"
                      : "border-line bg-white hover:border-gray-300",
                  )}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    className="sr-only"
                  />
                  {g}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="rounded-xl bg-bg-subtle px-4 py-3 text-sm text-text-2" aria-live="polite">
          {uCategory ? (
            <>
              カテゴリー：<strong className="font-display text-text">{uCategory}</strong>
              （生年月日から自動で決まります）
            </>
          ) : (
            <>
              Divisionは「未確定」で登録されます。参加ジムで Division Tryout を受けると決まります。
            </>
          )}
        </div>
        <Field
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          defaultValue={v.email}
          error={state.errors?.email}
          hint="暗証番号を忘れたときの本人確認に使います。"
          required
        />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 font-display text-xs font-bold tracking-[0.15em] text-text-3 uppercase">
          PIN
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="暗証番号（4桁）"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            error={state.errors?.pin}
            required
          />
          <Field
            label="暗証番号（確認用）"
            name="pinConfirm"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            error={state.errors?.pinConfirm}
            required
          />
        </div>
        <p className="text-xs text-text-3">
          ログインに使います。誕生日など推測されやすい数字は避けてください。
        </p>
      </fieldset>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            name="agree"
            defaultChecked={v.agree === "on"}
            className="mt-1 size-5 shrink-0 accent-[#1d1d1f]"
          />
          <span>
            <Link href="/rules" target="_blank" className="font-bold underline underline-offset-4">
              参加規約
            </Link>
            に同意します
          </span>
        </label>
        {state.errors?.agree && (
          <p className="mt-1.5 text-sm text-status-rejected">{state.errors.agree[0]}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "登録中…" : "登録する（無料）"}
      </Button>
      <p className="text-center text-sm text-text-2">
        旧サイトでライセンスNo.をお持ちの方は、新しく登録せずに
        <Link href="/login" className="font-bold text-text underline underline-offset-4">
          ログイン
        </Link>
        してください。
      </p>
    </form>
  );
}

function Registered({ licenseNo, redirectTo }: { licenseNo: string; redirectTo?: string }) {
  // The form was long; bring the license number into view.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto size-12 text-status-approved" aria-hidden />
      <h2 className="mt-4 text-xl font-bold">登録が完了しました</h2>
      <p className="mt-6 text-sm text-text-2">あなたのライセンスNo.（ログインID）</p>
      <p className="mt-2 font-display text-5xl font-extrabold tracking-tight tabular-nums">
        {licenseNo}
      </p>
      <p className="mx-auto mt-4 max-w-[26em] text-sm text-text-2">
        ログインや THE NORTH FACE CUP
        のエントリーで使います。スクリーンショットなどで控えておいてください。
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button href={redirectTo ?? "/mypage"} size="lg">
          {redirectTo ? "続ける" : "マイページへ"}
        </Button>
        <Button href="/tryout/about" variant="secondary" size="lg">
          Division Tryout について
        </Button>
      </div>
    </div>
  );
}
