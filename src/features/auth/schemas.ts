import * as z from "zod";
import { GENDERS } from "@/domain/member";

// Form rules shared by the forms (client hints) and the Server Actions (the real check).

const licenseNo = z
  .string()
  .trim()
  .regex(/^\d{3,7}$/, { error: "ライセンスNo.は半角数字で入力してください。" });

const pin = z.string().regex(/^\d{4}$/, { error: "暗証番号は4桁の半角数字で入力してください。" });

export const LoginSchema = z.object({
  licenseNo,
  pin,
});

export const RegisterSchema = z
  .object({
    name: z.string().trim().min(1, { error: "氏名を入力してください。" }).max(40),
    furigana: z
      .string()
      .trim()
      .min(1, { error: "フリガナを入力してください。" })
      .max(60)
      .regex(/^[ァ-ヶー\s　]+$/, { error: "フリガナは全角カタカナで入力してください。" }),
    birthDate: z.iso.date({ error: "生年月日を入力してください。" }),
    gender: z.enum(GENDERS, { error: "性別を選んでください。" }),
    email: z.email({ error: "メールアドレスを正しく入力してください。" }).trim().max(120),
    pin,
    pinConfirm: z.string(),
    agree: z.literal("on", { error: "参加規約への同意が必要です。" }),
  })
  .refine((v) => v.pin === v.pinConfirm, {
    error: "確認用の暗証番号が一致しません。",
    path: ["pinConfirm"],
  });

export const ResetPinSchema = z
  .object({
    licenseNo,
    email: z.email({ error: "メールアドレスを正しく入力してください。" }).trim(),
    pin,
    pinConfirm: z.string(),
  })
  .refine((v) => v.pin === v.pinConfirm, {
    error: "確認用の暗証番号が一致しません。",
    path: ["pinConfirm"],
  });

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Values to put back into the form after an error (never the PIN). */
  values?: Record<string, string>;
  licenseNo?: string;
};
