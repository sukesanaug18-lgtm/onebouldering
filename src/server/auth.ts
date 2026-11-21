import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { adminDb } from "./firebase-admin";
import { readSession } from "./session";

// Data Access Layer for the signed-in athlete (Next.js auth guide: DAL + DTO).
// Returns only the fields screens need; never the PIN or its hash.

export type CurrentUser = {
  id: string;
  name: string;
  furigana: string;
  gender: string;
  division: string;
  divisionStatus: "confirmed" | "undecided";
  birthDate: string;
  email: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const snap = await adminDb().collection("users").doc(session.uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const division = canonicalDivision(String(d.division ?? d["Division"] ?? UNDECIDED_DIVISION));
  return {
    id: session.uid,
    name: String(d.name ?? d["名前"] ?? ""),
    furigana: String(d.furigana ?? d.kana ?? d["フリガナ"] ?? ""),
    gender: String(d.gender ?? d["性別"] ?? ""),
    division,
    divisionStatus:
      d.divisionStatus === "undecided" || division === UNDECIDED_DIVISION
        ? "undecided"
        : "confirmed",
    birthDate: String(d.birthDate ?? d["生年月日"] ?? ""),
    email: String(d.email ?? d["メールアドレス"] ?? ""),
  };
});

/** For pages that need a signed-in athlete: sends others to /login and back afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  return user;
}
