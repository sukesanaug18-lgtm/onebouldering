"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { CANONICAL_DIVISIONS, UNDECIDED_DIVISION } from "@/domain/division";
import { GENDERS } from "@/domain/member";
import type { MemberDetail } from "../queries";
import { updateMember, type MemberFormState } from "../actions";

const selectClass =
  "mt-2 block min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";

/** Office edit form for one member. Keeps the typed values when the server returns an error. */
export function MemberForm({ member }: { member: MemberDetail }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(updateMember, {});
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
      <input type="hidden" name="id" value={member.id} />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="氏名" name="name" defaultValue={member.name} error={e.name} required />
        <Field label="フリガナ" name="furigana" defaultValue={member.furigana} error={e.furigana} />
        <Field
          label="メールアドレス"
          name="email"
          type="email"
          defaultValue={member.email}
          error={e.email}
          className="sm:col-span-2"
        />
        <Field
          label="生年月日"
          name="birthDate"
          type="date"
          defaultValue={member.birthDate}
          error={e.birthDate}
        />
        <div>
          <label htmlFor="f-gender" className="text-sm font-bold">
            性別
          </label>
          <select id="f-gender" name="gender" defaultValue={member.gender} className={selectClass}>
            {!GENDERS.includes(member.gender as (typeof GENDERS)[number]) && (
              <option value="">未登録</option>
            )}
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          {e.gender && <p className="mt-1.5 text-sm text-status-rejected">{e.gender[0]}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="f-division" className="text-sm font-bold">
            Division
          </label>
          <select
            id="f-division"
            name="division"
            defaultValue={member.division}
            className={selectClass}
          >
            <option value={UNDECIDED_DIVISION}>未確定（UNDECIDED）</option>
            {CANONICAL_DIVISIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-text-3">
            変更すると、選手にお知らせが届き、今シーズンの TNFC エントリーも同じ Division
            に変わります。公認大会ポイントはリセットされません（リセットは Tryout
            で昇格したときだけ）。
          </p>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存する"}
      </Button>
    </form>
  );
}
