// Fills the local Emulator with demo data (fictional players) and builds ranking_cache.
// Run with the emulators running:  npm run seed
// Refuses to run against anything except the Emulator + a demo-* project.
import { initializeApp } from "firebase-admin/app";
import { getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { GYMS } from "../src/content/gyms.ts";
import { aggregateRankingData } from "../src/domain/ranking.ts";

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

const venues = GYMS.map((g) => {
  const file = g.logo.split("/").pop()!.replace(".png", "");
  const prefix = file.slice(0, 2);
  return { id: file.slice(3), name: g.name, region: REGION_BY_PREFIX[prefix] ?? "未定" };
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

await writeAll("venues", venues, (d) => String(d.id));
await writeAll("users", users, (d) => String(d.id));
await writeAll("participant_data", participantData);
await writeAll("competition_results", competitionResults);
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
