"use client";

import { useActionState } from "react";
import { issueTempPin, type TempPinState } from "../actions";

/** Issues a temporary PIN. The number is shown here once and never stored in plain text. */
export function TempPinCard({ id }: { id: string }) {
  const [state, action, pending] = useActionState<TempPinState, FormData>(issueTempPin, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("今の暗証番号は使えなくなります。仮の暗証番号を発行しますか？")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-text-2">
        選手が自分で再設定できない（メールアドレス未登録など）ときに使います。発行した番号は、本人確認のうえ選手に伝え、ログイン後に変更してもらってください。
      </p>
      {state.pin ? (
        <p className="mt-4 rounded-xl border border-line bg-bg-subtle p-4" role="status">
          <span className="block text-xs text-text-3">
            仮の暗証番号（この画面を閉じると再表示できません）
          </span>
          <span className="font-display text-3xl font-extrabold tracking-[0.3em] tabular-nums">
            {state.pin}
          </span>
        </p>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300 disabled:opacity-40"
        >
          {pending ? "発行中…" : "仮の暗証番号を発行"}
        </button>
      )}
      {state.message && <p className="mt-2 text-sm font-bold text-[#b91c1c]">{state.message}</p>}
    </form>
  );
}
