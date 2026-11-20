import Link from "next/link";
import { CANONICAL_DIVISIONS, canonicalDivision, shortDivision } from "@/domain/division";
import { promotionCutoff, type RankingEntry } from "@/domain/ranking";
import { cn } from "@/lib/cn";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getRanking, getVenues } from "../queries";
import { GymSelect } from "./GymSelect";
import { RankingTable } from "./RankingTable";

export const REGIONS = ["北海道", "東北", "関東", "東海", "関西", "九州"] as const;
const VIEWS = [
  { key: "global", label: "総合" },
  { key: "region", label: "地域別" },
  { key: "gym", label: "店舗別" },
] as const;
type View = (typeof VIEWS)[number]["key"];
const SHOW_LIMIT = 100;

type Params = { view?: string; div?: string; region?: string; gym?: string };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function href(p: Params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/ranking?${s}` : "/ranking";
}

function orderDivisions(keys: string[]) {
  const known = CANONICAL_DIVISIONS.filter((d) => keys.includes(d));
  return [...known, ...keys.filter((k) => !(CANONICAL_DIVISIONS as readonly string[]).includes(k))];
}

/** Reads the URL filters and renders tabs, filters and the list. Wrapped in Suspense by the page. */
export async function RankingBoard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view: View = (VIEWS.find((v) => v.key === first(sp.view))?.key ?? "global") as View;
  const [data, venues] = await Promise.all([getRanking(CURRENT_SEASON_ID), getVenues()]);

  if (!data) {
    return (
      <EmptyState
        title="ランキングはまだ集計されていません"
        text="スコアが承認されると、ここに順位が表示されます。"
      />
    );
  }

  const region = REGIONS.find((r) => r === first(sp.region)) ?? REGIONS[2];
  const gymId = first(sp.gym);
  const gym = venues.find((v) => v.id === gymId);

  const byDivision: Record<string, RankingEntry[]> =
    view === "global"
      ? data.global
      : view === "region"
        ? (data.region[region] ?? {})
        : gym
          ? (data.gym[gym.id] ?? {})
          : {};
  const divisions = orderDivisions(Object.keys(byDivision));
  const requested = first(sp.div) ? canonicalDivision(first(sp.div)!) : undefined;
  const division = requested && divisions.includes(requested) ? requested : divisions[0];
  const entries = division ? byDivision[division] : [];
  const cutoff = view === "global" && division ? promotionCutoff(division, entries.length) : 0;
  const base: Params = { view, region: view === "region" ? region : undefined, gym: gym?.id };

  return (
    <div>
      {/* View tabs */}
      <nav aria-label="ランキングの種類">
        <ul className="inline-flex rounded-full border border-line bg-bg-subtle p-1">
          {VIEWS.map((v) => (
            <li key={v.key}>
              <Link
                href={href({ view: v.key, div: division ? shortDivision(division) : undefined })}
                aria-current={v.key === view ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full px-5 text-sm font-bold transition-colors duration-200",
                  v.key === view ? "bg-white text-text shadow-xs" : "text-text-2 hover:text-text",
                )}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-4 text-sm text-text-2">
        {view === "global" && "上位3会場のポイント＋公認大会のポイントで競います。"}
        {view === "region" &&
          "その地域のジムで獲得したポイントをすべて合計します（公認大会は含みません）。"}
        {view === "gym" && "その店舗でのいちばん高いスコアで競います。"}
      </p>

      {/* Region / gym filters */}
      {view === "region" && (
        <FilterRow label="地域">
          {REGIONS.map((r) => (
            <Chip
              key={r}
              href={href({
                ...base,
                region: r,
                div: division ? shortDivision(division) : undefined,
              })}
              active={r === region}
            >
              {r}
            </Chip>
          ))}
        </FilterRow>
      )}
      {view === "gym" && (
        <div className="mt-6">
          <GymSelect venues={venues} value={gym?.id} />
        </div>
      )}

      {/* Division filter */}
      {divisions.length > 0 && (
        <FilterRow label="Division">
          {divisions.map((d) => (
            <Chip key={d} href={href({ ...base, div: shortDivision(d) })} active={d === division}>
              {shortDivision(d)}
            </Chip>
          ))}
        </FilterRow>
      )}

      {/* List */}
      <div className="mt-8">
        {view === "gym" && !gym ? (
          <EmptyState
            title="店舗を選んでください"
            text="上のメニューから店舗を選ぶと、その店舗の順位が表示されます。"
          />
        ) : !division || entries.length === 0 ? (
          <EmptyState
            title="まだ順位がありません"
            text="この条件で承認されたスコアはまだありません。"
          />
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-bold">
                {shortDivision(division)}
                <span className="ml-2 text-sm font-medium text-text-3">
                  {view === "region" ? region : view === "gym" ? gym?.name : "全国"}
                </span>
              </h2>
              <p className="text-sm text-text-3 tabular-nums">{entries.length}名</p>
            </div>
            <RankingTable
              entries={entries.slice(0, SHOW_LIMIT)}
              cutoff={cutoff}
              caption={`${shortDivision(division)} のランキング${cutoff ? `（上位${cutoff}名が自動昇格圏内）` : ""}`}
            />
            {entries.length > SHOW_LIMIT && (
              <p className="mt-3 text-sm text-text-3">上位{SHOW_LIMIT}名を表示しています。</p>
            )}
          </>
        )}
      </div>

      {data.updatedAt && (
        <p className="mt-6 text-xs text-text-3">
          最終更新：
          <time dateTime={data.updatedAt}>
            {new Date(data.updatedAt).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </p>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-bold text-text-3">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(
          "inline-flex min-h-10 items-center rounded-full border px-4 font-display text-sm font-bold transition-colors duration-200",
          active
            ? "border-text bg-text text-white"
            : "border-line bg-white text-text-2 hover:border-gray-300 hover:text-text",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm text-text-2">{text}</p>
    </div>
  );
}

/** Placeholder shown while the board loads. */
export function RankingBoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="読み込み中">
      <div className="h-12 w-72 rounded-full bg-bg-subtle" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 w-16 rounded-full bg-bg-subtle" />
        ))}
      </div>
      <div className="mt-8 h-96 rounded-2xl bg-bg-subtle" />
    </div>
  );
}
