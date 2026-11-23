"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createAdminSession, deleteAdminSession, signInWithPassword } from "@/server/admin-session";
import { clearFailures, lockedMinutes, recordFailure } from "@/server/rate-limit";

export type AdminLoginState = { message?: string; email?: string };

const LoginSchema = z.object({
  email: z.email().trim().toLowerCase().max(120),
  password: z.string().min(1).max(200),
});

export async function adminLogin(_prev: AdminLoginState, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { message: "メールアドレスとパスワードを入力してください。", email };

  const locked = await lockedMinutes("admin", parsed.data.email);
  if (locked) {
    return { message: `入力を何度か間違えたため、${locked}分ほどロックしています。`, email };
  }

  const res = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (!res.ok) {
    if (res.reason === "error") {
      return { message: "ログインできませんでした。時間をおいてお試しください。", email };
    }
    await recordFailure("admin", parsed.data.email);
    return { message: "メールアドレスまたはパスワードが違います。", email };
  }
  if (!(await createAdminSession(res.idToken))) {
    return { message: "このアカウントには事務局画面の権限がありません。", email };
  }
  await clearFailures("admin", parsed.data.email);
  redirect("/admin");
}

export async function adminLogout() {
  await deleteAdminSession();
  redirect("/admin/login");
}
