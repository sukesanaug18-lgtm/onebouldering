import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { adminDb } from "@/server/firebase-admin";

// Member lookup for the office (workflow diagram B-8, 1.6.3). Firestore has no text search,
// so a light index of every member (5 fields) is cached for a few minutes and searched in
// memory. Edits call updateTag("members").

const text = (v: unknown) => String(v ?? "").trim();

export type MemberRow = {
  id: string;
  name: string;
  furigana: string;
  email: string;
  division: string;
};

async function loadMemberIndex(): Promise<MemberRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("members");
  const snap = await adminDb()
    .collection("users")
    .select(
      "name",
      "名前",
      "furigana",
      "kana",
      "フリガナ",
      "email",
      "メールアドレス",
      "division",
      "Division",
    )
    .get();
  return snap.docs.map((d) => {
    const u = d.data();
    return {
      id: d.id,
      name: text(u.name ?? u["名前"]),
      furigana: text(u.furigana ?? u.kana ?? u["フリガナ"]),
      email: text(u.email ?? u["メールアドレス"]),
      division: canonicalDivision(text(u.division ?? u["Division"]) || UNDECIDED_DIVISION),
    };
  });
}

export const PAGE_SIZE = 50;

/** Members matching `q` (license No., name, furigana or email), newest license first. */
export async function searchMembers(opts: { q: string; undecided: boolean; page: number }) {
  let list: MemberRow[];
  try {
    list = await loadMemberIndex();
  } catch (err) {
    console.error("[member] failed to read users", err);
    return { total: 0, rows: [] as MemberRow[], failed: true };
  }
  const q = opts.q.trim().toLowerCase().replace(/\s+/g, "");
  const hits = list
    .filter((m) => !opts.undecided || m.division === UNDECIDED_DIVISION)
    .filter(
      (m) =>
        !q ||
        m.id.includes(q) ||
        m.name.toLowerCase().replace(/\s+/g, "").includes(q) ||
        m.furigana.replace(/\s+/g, "").includes(q) ||
        m.email.toLowerCase().includes(q),
    )
    .sort((a, b) => Number(b.id) - Number(a.id) || b.id.localeCompare(a.id));
  const start = (opts.page - 1) * PAGE_SIZE;
  return { total: hits.length, rows: hits.slice(start, start + PAGE_SIZE), failed: false };
}

export type MemberDetail = {
  id: string;
  name: string;
  furigana: string;
  gender: string;
  birthDate: string;
  email: string;
  division: string;
  divisionStatus: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

/** One member's profile (never the PIN or its hash). */
export async function getMember(id: string): Promise<MemberDetail | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const snap = await adminDb().collection("users").doc(id).get();
  if (!snap.exists) return null;
  const u = snap.data()!;
  const division = canonicalDivision(text(u.division ?? u["Division"]) || UNDECIDED_DIVISION);
  return {
    id: snap.id,
    name: text(u.name ?? u["名前"]),
    furigana: text(u.furigana ?? u.kana ?? u["フリガナ"]),
    gender: text(u.gender ?? u["性別"]),
    birthDate: text(u.birthDate ?? u["生年月日"]),
    email: text(u.email ?? u["メールアドレス"]),
    division,
    divisionStatus:
      division === UNDECIDED_DIVISION ? "undecided" : text(u.divisionStatus) || "confirmed",
    createdAt: text(u.createdAt ?? u.registeredAt ?? u["登録日"]),
    updatedAt: text(u.updatedAt),
    updatedBy: text(u.updatedBy),
  };
}
