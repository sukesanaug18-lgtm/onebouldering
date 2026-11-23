// Copies the current app's Firestore data into the new project (CLAUDE.md 3: データはコピーする).
//
//   npm run copy-data -- --source one-bouldering-ranking --target one-bouldering          (dry run: counts only)
//   npm run copy-data -- --source one-bouldering-ranking --target one-bouldering --apply  (writes)
//
// Options: --only users,venues   copy just these collections
//          --source-key <file>   service-account JSON for the source (default: gcloud ADC)
//          --target-key <file>   service-account JSON for the target (default: gcloud ADC)
//          --season 2027         season used to rebuild ranking_cache afterwards
//          --emulator            both projects on the local Emulator (both must be demo-*)
//
// Safety:
// - The source is only read (get). Nothing in the source is written or deleted.
// - The target is written by the same document id, so running again updates the copy.
//   Nothing in the target is deleted; documents only the new site has stay as they are.
// - Plain PINs / gym passwords are stored as hashes; the GA4 settings (they hold a private key)
//   are not copied. ranking_cache is rebuilt from the copied data instead of copied.
import { cert, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import {
  DocumentReference,
  FieldPath,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  COPY_COLLECTIONS,
  isOldNewsDoc,
  oldNewsToArticle,
  plainSecret,
  SKIPPED_SETTINGS,
  USER_PIN_FIELDS,
  VENUE_PASSWORD_FIELDS,
  type CopyCollection,
} from "../src/domain/data-copy.ts";
import { aggregateRankingData } from "../src/domain/ranking.ts";
import { hashPin } from "../src/server/crypto.ts";

type Doc = Record<string, unknown>;

const { values: args } = parseArgs({
  options: {
    source: { type: "string" },
    target: { type: "string" },
    apply: { type: "boolean", default: false },
    only: { type: "string" },
    "source-key": { type: "string" },
    "target-key": { type: "string" },
    season: { type: "string", default: process.env.CURRENT_SEASON_ID ?? "2027" },
    emulator: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`中止しました: ${message}`);
  process.exit(1);
}

const SOURCE = args.source ?? fail("--source（コピー元のプロジェクト）を指定してください");
const TARGET = args.target ?? fail("--target（コピー先のプロジェクト）を指定してください");
if (SOURCE === TARGET) fail("コピー元とコピー先が同じです");
if (TARGET === "one-bouldering-ranking") fail("今のアプリのプロジェクトには書き込めません");
if (args.emulator) {
  if (!SOURCE.startsWith("demo-") || !TARGET.startsWith("demo-"))
    fail("--emulator では demo- で始まるプロジェクトだけ使えます");
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
} else if (process.env.FIRESTORE_EMULATOR_HOST) {
  fail(
    "FIRESTORE_EMULATOR_HOST が設定されています。Emulator で試すときは --emulator を付けてください",
  );
}

const only = args.only ? new Set(args.only.split(",").map((s) => s.trim())) : null;
for (const name of only ?? []) {
  if (!(COPY_COLLECTIONS as readonly string[]).includes(name))
    fail(`知らないコレクションです: ${name}`);
}
const collections = COPY_COLLECTIONS.filter((c) => !only || only.has(c));

function open(name: string, projectId: string, keyFile?: string): Firestore {
  const credential = args.emulator
    ? undefined
    : keyFile
      ? cert(JSON.parse(readFileSync(keyFile, "utf8")))
      : applicationDefault();
  const app: App = initializeApp({ projectId, ...(credential ? { credential } : {}) }, name);
  return getFirestore(app);
}
const src = open("source", SOURCE, args["source-key"]);
const dst = open("target", TARGET, args["target-key"]);

/** Reads a whole collection in pages (read only). */
async function readAll(name: string): Promise<{ id: string; data: Doc }[]> {
  const out: { id: string; data: Doc }[] = [];
  let last: string | null = null;
  for (;;) {
    let q = src.collection(name).orderBy(FieldPath.documentId()).limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    for (const d of snap.docs) out.push({ id: d.id, data: d.data() });
    if (snap.size < 500) return out;
    last = snap.docs[snap.docs.length - 1].id;
  }
}

/** References point into the source project; re-point them at the same path in the target. */
function retarget(v: unknown): unknown {
  if (v instanceof DocumentReference) return dst.doc(v.path);
  if (Array.isArray(v)) return v.map(retarget);
  if (v && typeof v === "object" && v.constructor === Object) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, retarget(x)]));
  }
  return v;
}

type Plan = { collection: string; id: string; data: Doc };
const plans: Plan[] = [];
const notes: string[] = [];
const hashes = new Map<string, string>();
const hashOf = async (s: string) => hashes.get(s) ?? hashes.set(s, await hashPin(s)).get(s)!;

async function prepare(name: CopyCollection) {
  const docs = await readAll(name);
  let hashed = 0;
  let skipped = 0;
  for (const { id, data } of docs) {
    let d: Doc = retarget(data) as Doc;
    let collection: string = name;
    let docId = id;

    if (name === "users") {
      const pin = plainSecret(d, USER_PIN_FIELDS);
      for (const f of USER_PIN_FIELDS) delete d[f];
      if (pin && !d.pinHash) {
        d.pinHash = await hashOf(pin);
        hashed++;
      }
    } else if (name === "venues") {
      const pw = plainSecret(d, VENUE_PASSWORD_FIELDS);
      for (const f of VENUE_PASSWORD_FIELDS) delete d[f];
      if (pw && !d.gymPasswordHash) {
        d.gymPasswordHash = await hashOf(pw);
        hashed++;
      }
    } else if (name === "site_settings") {
      if (SKIPPED_SETTINGS.has(id)) {
        skipped++;
        continue;
      }
      if (isOldNewsDoc(id, d)) {
        const a = oldNewsToArticle(id, d);
        if (!a) {
          skipped++;
          continue;
        }
        collection = "news_articles";
        docId = a.id;
        d = a.data;
      }
    } else if (name === "news_articles" && typeof d.content === "string" && d.body === undefined) {
      const a = oldNewsToArticle(`news_${id}`, d);
      if (!a) {
        skipped++;
        continue;
      }
      docId = id.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      d = a.data;
    }
    plans.push({ collection, id: docId, data: d });
  }
  const extra = [hashed && `ハッシュ化 ${hashed}`, skipped && `コピーしない ${skipped}`]
    .filter(Boolean)
    .join("・");
  notes.push(
    `${name.padEnd(22)} ${String(docs.length).padStart(6)} 件${extra ? `（${extra}）` : ""}`,
  );
}

console.log(
  `コピー元: ${SOURCE}（読むだけ）→ コピー先: ${TARGET}${args.emulator ? "（Emulator）" : ""}`,
);
for (const c of collections) await prepare(c);
console.log(notes.join("\n"));
const news = plans.filter((p) => p.collection === "news_articles").length;
console.log(`→ 書き込む文書 ${plans.length} 件（うち NEWS ${news} 件）`);

if (!args.apply) {
  console.log(
    "\nお試し実行です（何も書き込んでいません）。書き込むときは --apply を付けてください。",
  );
  process.exit(0);
}

for (let i = 0; i < plans.length; i += 400) {
  const batch = dst.batch();
  for (const p of plans.slice(i, i + 400))
    batch.set(dst.collection(p.collection).doc(p.id), p.data);
  await batch.commit();
}

// ranking_cache from the target's data after the copy (the same calculation the site uses).
const readTarget = async (name: string) =>
  (await dst.collection(name).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const [users, participantData, venues, competitionResults] = await Promise.all(
  ["users", "participant_data", "venues", "competition_results"].map(readTarget),
);
const ranking = aggregateRankingData({
  users,
  participantData,
  venues,
  competitionResults,
  seasonId: args.season,
});
const cacheDoc = {
  seasonId: args.season,
  cache_data: JSON.stringify(ranking),
  updatedAt: ranking.updatedAt,
  timestamp: Date.now(),
};
await dst.collection("ranking_cache").doc(args.season!).set(cacheDoc);
await dst.collection("ranking_cache").doc("current").set(cacheDoc);

await dst.collection("site_settings").doc("data_copy").set({
  source: SOURCE,
  copiedAt: new Date().toISOString(),
  collections,
  documents: plans.length,
});
console.log(
  `\n書き込みました（${plans.length} 件）。ranking_cache/${args.season} を作り直しました。`,
);
