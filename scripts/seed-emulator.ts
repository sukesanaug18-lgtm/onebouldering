// Fills the local Emulator with demo data (fictional players) and builds ranking_cache.
// Run with the emulators running:  npm run seed
// Refuses to run against anything except the Emulator + a demo-* project.
import { initializeApp } from "firebase-admin/app";
import { getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { GYMS } from "../src/content/gyms.ts";
import { aggregateRankingData } from "../src/domain/ranking.ts";
import { hashPin } from "../src/server/crypto.ts";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "demo-onebouldering";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
if (!PROJECT_ID.startsWith("demo-")) {
  console.error(`Refusing to seed project "${PROJECT_ID}". Only demo-* projects are allowed.`);
  process.exit(1);
}

const SEASON = "2027";
const REGION_BY_PREFIX: Record<string, string> = {
  "01": "北海道",
  "02": "東北",
  "03": "関東",
  "04": "東海",
  "05": "関西",
  "06": "九州",
};

// Deterministic random numbers so every seed gives the same data.
let seed = 20271121;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];

// Programs per venue: most run both; every 7th is Ranking only, every 11th Tryout only,
// so each /entry path can be tried locally.
const venues = GYMS.map((g, i) => {
  const file = g.logo.split("/").pop()!.replace(".png", "");
  const prefix = file.slice(0, 2);
  return {
    id: file.slice(3),
    name: g.name,
    region: REGION_BY_PREFIX[prefix] ?? "未定",
    programs: {
      hasTryout: i % 7 !== 6,
      tryoutPeriod: "2026/4/1〜2027/3/31",
      hasRanking: i % 11 !== 10,
      rankingPeriod: "2026/6/1〜2026/12/31",
    },
  };
});

const DIVISIONS = [
  ["Men‘s Division 1", 1500],
  ["Men‘s Division 2", 1300],
  ["Men‘s Division 3", 1100],
  ["Men‘s Division 4", 900],
  ["Men‘s Division 5", 700],
  ["Women‘s Division 1", 1300],
  ["Women‘s Division 2", 1100],
  ["Women‘s Division 3", 900],
  ["Women‘s Division 4", 700],
  ["U-15M", 900],
  ["U-12W", 700],
] as const;

const users: Record<string, unknown>[] = [];
const participantData: Record<string, unknown>[] = [];
const competitionResults: Record<string, unknown>[] = [];
const COMP_POINTS = [10000, 8000, 6000, 5000, 5000, 3000, 3000, 1000];

for (let i = 0; i < 160; i++) {
  const id = String(10001 + i);
  const [division, base] = pick(DIVISIONS);
  users.push({ id, name: `サンプル選手${String(i + 1).padStart(3, "0")}`, division });
  const home = pick(venues);
  const visits = 1 + Math.floor(rand() * 5);
  for (let v = 0; v < visits; v++) {
    const venue =
      v === 0
        ? home
        : rand() < 0.6
          ? pick(venues.filter((x) => x.region === home.region))
          : pick(venues);
    participantData.push({
      seasonId: SEASON,
      userId: id,
      venueId: venue.id,
      totalPoints: Math.round((base * (0.4 + rand() * 0.6)) / 10) * 10,
      status: rand() < 0.9 ? "Approved" : "Pending",
    });
  }
  if (rand() < 0.25) {
    competitionResults.push({
      seasonId: SEASON,
      userId: id,
      earnedPoints: pick(COMP_POINTS),
      status: "active",
    });
  }
}
users.push({ id: "19999", name: "サンプル選手（未確定）", division: "UNDECIDED" });
// Demo login for local testing only (Emulator). License No. 10000 / PIN 0000.
users.push({
  id: "10000",
  name: "デモ選手",
  furigana: "デモ センシュ",
  gender: "男性",
  division: "Men‘s Division 3",
  divisionStatus: "confirmed",
  email: "demo@example.test",
  birthDate: "1995-06-15",
  pinHash: await hashPin("0000"),
});

// Demo player's history, so every my page block has something to show.
const DEMO = "10000";
const [g1, g2, g3] = [venues[0], venues[1], venues[2]];
const now = new Date().toISOString();
const sheet = (nos: number[]) =>
  Object.fromEntries(
    Array.from({ length: 40 }, (_, i) => [String(i + 1), nos.includes(i + 1) ? "Y" : "N"]),
  );
const demoScores: [typeof g1, string, number[], string][] = [
  [g1, "Approved", [1, 2, 3, 5, 8, 10, 12, 15, 18, 20, 22], ""],
  [g2, "Pending", [1, 2, 4, 6, 9, 11, 14], ""],
  [g3, "Rejected", [1, 3, 30], "No.30 の完登を確認できませんでした"],
];
for (const [v, status, nos, rejectReason] of demoScores) {
  const total = nos.reduce((s, n) => s + n, 0);
  participantData.push({
    seasonId: SEASON,
    userId: DEMO,
    One_Bouldering_ID: DEMO,
    venueId: v.id,
    problems: sheet(nos),
    ...(status === "Approved"
      ? { approvedProblems: Object.fromEntries(nos.map((n) => [String(n), true])) }
      : {}),
    totalPoints: total,
    status,
    rejectReason,
    submittedAt: now,
  });
}
competitionResults.push({
  seasonId: SEASON,
  userId: DEMO,
  competitionName: "サンプル公認大会（デモ）",
  rank: "4",
  earnedPoints: 2500,
  status: "active",
});
const demoExtras: [string, string, Record<string, unknown>][] = [
  [
    "tryout_logs",
    "seed_try_demo",
    {
      seasonId: SEASON,
      userId: DEMO,
      venueId: g1.id,
      venueName: g1.name,
      challengedShortDivision: "MD3",
      completedCount: 5,
      judgment: "INITIAL",
      oldDivision: "UNDECIDED",
      newDivision: "Men‘s Division 3",
      createdAt: "2026-05-10T03:00:00.000Z",
    },
  ],
  [
    "tnfc_entries",
    "seed_round1_10000",
    {
      seasonId: SEASON,
      roundId: "seed_round1",
      roundName: "予選 第1ラウンド（デモ）",
      venueName: g2.name,
      userId: DEMO,
      division: "Men‘s Division 3",
      bibNo: 312,
      sessionGroup: "Group B（11:00〜12:30）",
      zeusOrderNo: "DEMO-0001",
      status: "entered",
      createdAt: now,
    },
  ],
  [
    "tnfc_results",
    "seed_round1_10000",
    {
      seasonId: SEASON,
      roundId: "seed_round1",
      userId: DEMO,
      rank: 8,
      qualifiedForFinals: true,
      rankingPointsAwarded: 3000,
      status: "active",
    },
  ],
  [
    "notifications",
    "seed_notif_demo",
    {
      seasonId: SEASON,
      userId: DEMO,
      title: "申請スコアの差し戻し",
      message: `${g3.name} のスコアが差し戻されました。理由: No.30 の完登を確認できませんでした`,
      createdAt: now,
      read: false,
      type: "score_rejected",
    },
  ],
];

const ranking = aggregateRankingData({
  users,
  participantData,
  venues,
  competitionResults,
  seasonId: SEASON,
});

const db = getFirestore(initializeApp({ projectId: PROJECT_ID }));

async function writeAll(
  collection: string,
  docs: Record<string, unknown>[],
  idOf?: (d: Record<string, unknown>) => string,
) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch: WriteBatch = db.batch();
    for (const d of docs.slice(i, i + 400)) {
      const ref = idOf ? db.collection(collection).doc(idOf(d)) : db.collection(collection).doc();
      batch.set(ref, d);
    }
    await batch.commit();
  }
}

// Start from an empty Emulator database so running the seed again gives the same data.
const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
  method: "DELETE",
});

await writeAll("venues", venues, (d) => String(d.id));
await writeAll("users", users, (d) => String(d.id));
await writeAll("participant_data", participantData);
await writeAll("competition_results", competitionResults);
for (const [collection, id, data] of demoExtras) {
  await db.collection(collection).doc(id).set(data);
}
const cacheDoc = {
  seasonId: SEASON,
  cache_data: JSON.stringify(ranking),
  updatedAt: ranking.updatedAt,
  timestamp: Date.now(),
};
await db.collection("ranking_cache").doc(SEASON).set(cacheDoc);
await db.collection("ranking_cache").doc("current").set(cacheDoc);

console.log(
  `Seeded ${venues.length} venues, ${users.length} users, ${participantData.length} scores, ${competitionResults.length} competition results, ranking_cache/${SEASON}.`,
);
