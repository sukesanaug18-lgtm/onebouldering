// Fills the local Emulator with demo data (fictional players) and builds ranking_cache.
// Run with the emulators running:  npm run seed
// Refuses to run against anything except the Emulator + a demo-* project.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { GYMS } from "../src/content/gyms.ts";
import { aggregateRankingData } from "../src/domain/ranking.ts";
import { hashPin } from "../src/server/crypto.ts";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "demo-onebouldering";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
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

// Gym staff login for local testing only (Emulator): every venue uses the password in README.
const GYM_PASSWORD_HASH = await hashPin("gym-demo-2027");
for (const v of venues) Object.assign(v, { gymPasswordHash: GYM_PASSWORD_HASH });

// Check-in for Tryout / Ranking input (Emulator only): the QR key is "demo-<venue id>" and each
// gym gets a made-up position near its region's main city.
const REGION_CENTER: Record<string, [number, number]> = {
  北海道: [43.0621, 141.3544],
  東北: [38.2682, 140.8694],
  関東: [35.6812, 139.7671],
  東海: [35.1709, 136.8815],
  関西: [34.7025, 135.4959],
  九州: [33.5902, 130.4017],
};
venues.forEach((v, i) => {
  const [lat, lng] = REGION_CENTER[v.region] ?? [35.6812, 139.7671];
  Object.assign(v, {
    qrKey: `demo-${v.id}`,
    location: {
      lat: Math.round((lat + (i % 5) * 0.01) * 1e4) / 1e4,
      lng: Math.round((lng + Math.floor(i / 5) * 0.01) * 1e4) / 1e4,
    },
  });
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
const sheet = (nos: number[]) =>
  Object.fromEntries(
    Array.from({ length: 40 }, (_, i) => [String(i + 1), nos.includes(i + 1) ? "Y" : "N"]),
  );
const approvedMap = (nos: number[]) => Object.fromEntries(nos.map((n) => [String(n), true]));
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
    // Stronger Divisions send harder problems: P(sent No.n) falls around 40 × skill.
    const skill = (base / 1500) * (0.55 + rand() * 0.45);
    const nos = Array.from({ length: 40 }, (_, k) => k + 1).filter(
      (n) => rand() < 1 / (1 + Math.exp((n - 40 * skill) / 3)),
    );
    const status = rand() < 0.9 ? "Approved" : "Pending";
    participantData.push({
      seasonId: SEASON,
      userId: id,
      venueId: venue.id,
      problems: sheet(nos),
      ...(status === "Approved" ? { approvedProblems: approvedMap(nos) } : {}),
      totalPoints: nos.reduce((sum, n) => sum + n, 0),
      status,
      submittedAt: new Date(
        Date.UTC(
          2026,
          5 + Math.floor(rand() * 5),
          1 + Math.floor(rand() * 28),
          1 + Math.floor(rand() * 12),
        ),
      ).toISOString(),
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
    ...(status === "Approved" ? { approvedProblems: approvedMap(nos) } : {}),
    totalPoints: total,
    status,
    rejectReason,
    submittedAt: now,
  });
}
// Gym staff samples at the first gym: three Pending scores (one adds to an approved sheet)
// and a few Tryouts, so every /gym-admin tab has something to show.
const gymPending: [string, number[], number[]][] = [
  ["10001", [1, 2, 3, 4, 6, 7, 9, 12], []],
  ["10002", [2, 5, 8, 11, 13, 16, 19, 24, 27], []],
  ["10003", [1, 2, 3, 5, 7, 10, 21, 25], [1, 2, 3, 5, 7, 10]],
];
for (const [uid, nos, approved] of gymPending) {
  const at = participantData.findIndex((d) => d.userId === uid && d.venueId === g1.id);
  if (at >= 0) participantData.splice(at, 1);
  participantData.push({
    seasonId: SEASON,
    userId: uid,
    One_Bouldering_ID: uid,
    venueId: g1.id,
    problems: sheet(nos),
    approvedProblems: approvedMap(approved),
    approvedTotalPoints: approved.reduce((sum, n) => sum + n, 0),
    totalPoints: nos.reduce((sum, n) => sum + n, 0),
    status: "Pending",
    submittedAt: new Date(Date.UTC(2026, 10, 20 + gymPending.length, 2, 0)).toISOString(),
  });
}
const gymTryouts: [string, string, string, number, string, string, string][] = [
  ["10004", "MD4", "男性", 6, "PROMOTION", "Men‘s Division 4", "Men‘s Division 3"],
  ["10005", "WD3", "女性", 4, "KEEP", "Women‘s Division 3", "Women‘s Division 3"],
  ["19999", "MD5", "男性", 2, "INITIAL", "UNDECIDED", "Men‘s Division 5"],
];
const tryoutExtras = gymTryouts.map(([uid, ch, gender, done, judgment, from, to], i) => [
  "tryout_logs",
  `seed_try_${uid}`,
  {
    seasonId: SEASON,
    userId: uid,
    userName: String(users.find((u) => u.id === uid)?.name ?? ""),
    venueId: g1.id,
    venueName: g1.name,
    category: gender === "女性" ? "WD" : "MD",
    preCheckResult: "Skip",
    challengedShortDivision: ch,
    completedProblemNos: Array.from({ length: done }, (_, k) => k + 1),
    completedCount: done,
    judgment,
    oldDivision: from,
    newDivision: to,
    createdAt: new Date(Date.UTC(2026, 10, 10 + i, 5, 0)).toISOString(),
  },
]) as [string, string, Record<string, unknown>][];

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
      userName: "デモ選手",
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

// A qualifier round before its deadline, for the office TNFC screens (diagram B-4): 36 entries
// with a few unpaid, renamed, Division-changed, undecided and cancelled ones.
const ROUND2 = `tnfc${SEASON}_round2_${g3.id}`;
const round2Name = `THE NORTH FACE CUP ${SEASON} ROUND2`;
demoExtras.push([
  "tnfc_rounds",
  ROUND2,
  {
    seasonId: SEASON,
    roundNumber: 2,
    roundName: round2Name,
    venueId: g3.id,
    venueName: g3.name,
    eventDate: "2027-01-24",
    entryDeadline: "2027-01-10",
    areaCount: 4,
    capacity: 60,
    previousFinalBibNo: 120,
    judgePassword: "0000",
    status: "entry_open",
    categoryQuotas: {},
    createdAt: now,
    updatedAt: now,
  },
]);
for (const [i, u] of [...users.slice(0, 35), users.find((x) => x.id === "19999")!].entries()) {
  const division = String(u.division);
  const renamed = i % 11 === 3;
  const oldDivision = i % 13 === 5 ? "Men‘s Division 5" : division;
  demoExtras.push([
    "tnfc_entries",
    `${ROUND2}_${u.id}`,
    {
      seasonId: SEASON,
      roundId: ROUND2,
      roundName: round2Name,
      venueId: g3.id,
      venueName: g3.name,
      userId: u.id,
      registeredName: renamed ? `旧姓選手${i}` : u.name,
      currentUserName: renamed ? `旧姓選手${i}` : u.name,
      furigana: `さんぷる ${String(i).padStart(2, "0")}`,
      division: oldDivision,
      email: `player${u.id}@example.test`,
      zeusOrderNo: i % 6 === 2 ? "" : `ZE-${1000 + i}`,
      status: i === 7 ? "cancelled" : i % 6 === 2 ? "pending_payment" : "confirmed",
      source: "csv",
      createdAt: now,
    },
  ]);
}

// A qualifier already held, waiting for its results (diagram B-5): 34 numbered entries.
const ROUND1 = `tnfc${SEASON}_round1_${g2.id}`;
const round1Name = `THE NORTH FACE CUP ${SEASON} ROUND1`;
const round1Players = users.slice(40, 74);
demoExtras.push([
  "tnfc_rounds",
  ROUND1,
  {
    seasonId: SEASON,
    roundNumber: 1,
    roundName: round1Name,
    venueId: g2.id,
    venueName: g2.name,
    eventDate: "2026-11-21",
    entryDeadline: "2026-11-07",
    areaCount: 4,
    capacity: 60,
    previousFinalBibNo: 0,
    lastBibNo: round1Players.length,
    numberedAt: now,
    judgePassword: "0000",
    status: "entry_closed",
    categoryQuotas: {},
    createdAt: now,
    updatedAt: now,
  },
]);
for (const [i, u] of round1Players.entries()) {
  demoExtras.push([
    "tnfc_entries",
    `${ROUND1}_${u.id}`,
    {
      seasonId: SEASON,
      roundId: ROUND1,
      roundName: round1Name,
      venueId: g2.id,
      venueName: g2.name,
      userId: u.id,
      registeredName: u.name,
      currentUserName: u.name,
      furigana: `さんぷる ${String(i).padStart(2, "0")}`,
      division: String(u.division),
      email: `player${u.id}@example.test`,
      zeusOrderNo: `ZE-${2000 + i}`,
      status: "confirmed",
      bibNo: i + 1,
      sessionGroup: i < 17 ? "Group A" : "Group B",
      source: "csv",
      createdAt: now,
    },
  ]);
}

const ranking = aggregateRankingData({
  users,
  participantData,
  venues,
  competitionResults,
  seasonId: SEASON,
});

const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

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

// Office login for local testing only (Auth Emulator). Credentials are in README.
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
await fetch(`http://${authHost}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
const officeUser = await getAuth(app).createUser({
  email: "office@example.test",
  password: "office-demo-2027",
  displayName: "事務局（デモ）",
});
await getAuth(app).setCustomUserClaims(officeUser.uid, { admin: true });
// A signed-in account without the admin claim, to check that it is refused.
await getAuth(app).createUser({ email: "staff@example.test", password: "office-demo-2027" });

await writeAll("venues", venues, (d) => String(d.id));
await writeAll("users", users, (d) => String(d.id));
await writeAll("participant_data", participantData, (d) => `${SEASON}_${d.userId}_${d.venueId}`);
await writeAll("competition_results", competitionResults);
for (const [collection, id, data] of [...demoExtras, ...tryoutExtras]) {
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
