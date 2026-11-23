import { Button } from "@/components/ui/Button";
import { logout } from "@/features/auth/actions";
import type { CurrentUser } from "@/server/auth";
import { MySection } from "./MySection";

/** Registered details (read-only) and logout. Changes go through the office for now. */
export function ProfileSection({ user }: { user: CurrentUser }) {
  const rows: [string, string][] = [
    ["氏名", `${user.name}（${user.furigana}）`],
    ["生年月日", user.birthDate.replaceAll("-", "/")],
    ["性別", user.gender],
    ["メールアドレス", user.email],
  ];
  return (
    <MySection title="登録情報">
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7rem_1fr] gap-2 py-2.5 text-sm">
            <dt className="text-text-3">{k}</dt>
            <dd className="break-all">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-text-3">
        登録内容を変えたいときは、ライセンスNo.と氏名を添えて事務局へご連絡ください。
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/reset-pin" variant="secondary">
          暗証番号を変える
        </Button>
        <form action={logout}>
          <Button type="submit" variant="secondary">
            ログアウト
          </Button>
        </form>
      </div>
    </MySection>
  );
}
