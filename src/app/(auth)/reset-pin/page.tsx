import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPinForm } from "@/features/auth/components/ResetPinForm";

export const metadata: Metadata = { title: "暗証番号の再設定" };

export default function ResetPinPage() {
  return (
    <AuthShell
      eyebrow="Reset PIN"
      title="暗証番号の再設定"
      lead="登録したライセンスNo.とメールアドレスを確認して、新しい暗証番号を設定します。"
      footer={
        <>
          メールアドレスがわからない方は
          <a
            href="https://www.onebouldering.jp/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-text underline underline-offset-4"
          >
            お問い合わせ
          </a>
          ／
          <Link href="/login" className="font-bold text-text underline underline-offset-4">
            ログインに戻る
          </Link>
        </>
      }
    >
      <ResetPinForm />
    </AuthShell>
  );
}
