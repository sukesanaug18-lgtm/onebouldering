// Puts a few documents shaped like the current app's data (fictional) into the Emulator project
// demo-old-ranking, to try scripts/copy-data.ts locally:
//   npm run seed:old
//   npm run copy-data -- --emulator --source demo-old-ranking --target demo-onebouldering [--apply]
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "demo-old-ranking";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const db = getFirestore(initializeApp({ projectId: PROJECT_ID }));
const host = process.env.FIRESTORE_EMULATOR_HOST;
await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
  method: "DELETE",
});

const sheet = (n: number) =>
  Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i + 1), i < n ? "Y" : "N"]));
const approved = (n: number) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), true]));

const docs: [string, string, Record<string, unknown>][] = [
  // Old-style plain PINs, under two of the field names the current app used.
  ["users", "20001", { name: "旧データ選手A", division: "Men‘s Division 2", pin: "1234" }],
  ["users", "20002", { name: "旧データ選手B", division: "Women‘s Division 1", 暗証番号: 5678 }],
  ["users", "20003", { name: "旧データ選手C", division: "Men‘s Division 2" }],
  [
    "venues",
    "old-gym",
    {
      name: "旧データジム",
      region: "関東",
      パスワード: "old-gym-pass",
      programs: { hasRanking: true },
    },
  ],
  [
    "participant_data",
    "2027_20001_old-gym",
    {
      seasonId: "2027",
      userId: "20001",
      venueId: "old-gym",
      problems: sheet(30),
      approvedProblems: approved(30),
      totalPoints: 465,
      status: "Approved",
      submittedAt: "2026-07-01T03:00:00.000Z",
    },
  ],
  [
    "participant_data",
    "2027_20003_old-gym",
    {
      seasonId: "2027",
      userId: "20003",
      venueId: "old-gym",
      problems: sheet(20),
      approvedProblems: approved(20),
      totalPoints: 210,
      status: "Approved",
      submittedAt: "2026-07-02T03:00:00.000Z",
    },
  ],
  [
    "competition_results",
    "old-comp-1",
    { seasonId: "2027", userId: "20001", earnedPoints: 5000, status: "active" },
  ],
  ["tnfc_entries", "old-entry-1", { userId: "20001", roundId: "old-round", status: "confirmed" }],
  ["site_settings", "top", { heroTitle: "旧トップの見出し" }],
  ["site_settings", "ga4_api_config", { privateKey: "-----BEGIN PRIVATE KEY-----(dummy)" }],
  [
    "site_settings",
    "news_20261017_launch",
    {
      docType: "news_article",
      title: "（旧データ）公式NEWSページを新設しました",
      category: "お知らせ",
      status: "published",
      publishedAt: "2026-10-17",
      isPinned: true,
      createdAt: "2026-10-17T03:00:00.000Z",
      content:
        '<h2>NEWS ページを新設</h2><p>日頃より <strong>ONE bouldering</strong> にご参加いただきありがとうございます。</p><ul style="margin:0"><li>会場追加</li><li>大会情報</li></ul><p><a href="/competition" style="color:#fff">スケジュールを見る</a></p>',
    },
  ],
  [
    "site_settings",
    "news_20261101_draft",
    {
      title: "（旧データ）下書き",
      category: "謎の分類",
      status: "draft",
      publishedAt: "2026-11-01",
      content: "<p>下書き本文</p>",
    },
  ],
  // The same article also in news_articles (old format): must merge into one article.
  // The thumbnail host does not exist, so the copy reports it instead of stopping.
  [
    "news_articles",
    "20261017_launch",
    {
      title: "（旧データ）公式NEWSページを新設しました",
      category: "お知らせ",
      status: "published",
      publishedAt: "2026-10-17",
      content: "<p>NEWS ページを新設</p>",
      thumbnailUrl: "https://old-images.invalid/launch.png",
    },
  ],
];
for (const [c, id, d] of docs) await db.collection(c).doc(id).set(d);
// A reference field, to check it is re-pointed at the target project.
await db
  .collection("tnfc_entries")
  .doc("old-entry-1")
  .update({ userRef: db.doc("users/20001") });

console.log(`Seeded ${docs.length} old-format documents into ${PROJECT_ID}.`);
