"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import {
  createAdminSession,
  deleteAdminSession,
  getAdmin,
  requireAdmin,
  sendPasswordSetupEmail,
  signInWithPassword,
} from "@/server/admin-session";
import { adminAuth, adminDb } from "@/server/firebase-admin";
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

// ---- Password setup / reset email (office login page) ----

export type PasswordEmailState = { sent?: boolean; message?: string; email?: string };

const EmailSchema = z.email().trim().toLowerCase().max(120);

/**
 * Sends the password email only to office accounts, and answers the same way either way so the
 * page does not tell whether an address is registered. Limited to a few requests per address.
 */
export async function requestPasswordEmail(
  _prev: PasswordEmailState,
  formData: FormData,
): Promise<PasswordEmailState> {
  const raw = String(formData.get("email") ?? "");
  const parsed = EmailSchema.safeParse(raw);
  if (!parsed.success) return { message: "メールアドレスを入力してください。", email: raw };
  const email = parsed.data;
  if (await lockedMinutes("admin-mail", email)) return { sent: true, email };
  await recordFailure("admin-mail", email);
  try {
    const user = await adminAuth().getUserByEmail(email);
    if (user.customClaims?.admin === true) await sendPasswordSetupEmail(email);
  } catch {
    // Not registered: same answer as success.
  }
  return { sent: true, email };
}

// ---- Office staff (/admin/staff) ----

export type StaffState = { ok?: boolean; message?: string };

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";

async function log(action: string, target: string, by: string) {
  await adminDb()
    .collection("admin_logs")
    .add({ action, target, by, at: new Date().toISOString() });
}

/** Adds office access to an address (creates the account without a password if needed). */
export async function addStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = EmailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return { message: "メールアドレスを正しく入力してください。" };
  const email = parsed.data;
  const auth = adminAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email });
  }
  if (user.customClaims?.admin === true) {
    return { message: `${email} はすでに事務局のメンバーです。` };
  }
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
  const mailed = await sendPasswordSetupEmail(email);
  await log("staff_add", email, admin.email);
  revalidatePath("/admin/staff");
  return {
    ok: true,
    message: mailed
      ? `${email} を追加し、パスワード設定のメールを送りました。`
      : `${email} を追加しました。メールを送れなかったので、ログイン画面の「パスワードを設定する」から送ってください。`,
  };
}

/** Sends the password setup email again. */
export async function resendStaffEmail(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = EmailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return;
  await sendPasswordSetupEmail(parsed.data);
  await log("staff_mail", parsed.data, admin.email);
}

/** Removes office access (the account itself stays) and signs the person out. */
export async function removeStaff(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const uid = String(formData.get("uid") ?? "");
  if (!uid || uid === admin.uid) return;
  const auth = adminAuth();
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims ?? {}) };
  delete claims.admin;
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);
  await log("staff_remove", user.email ?? uid, admin.email);
  revalidatePath("/admin/staff");
}
