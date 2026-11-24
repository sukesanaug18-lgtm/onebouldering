import "server-only";
import { buildRankingTop, buildUpcoming, type TopGroup, type UpcomingItem } from "@/domain/home";
import { todayJst } from "@/domain/news";
import { getRanking, getVenues } from "@/features/ranking/queries";
import { getSchedule, type RegionGroup } from "@/features/schedule/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";

const flat = (groups: RegionGroup[]) =>
  groups.flatMap((g) => g.venues.map((v) => ({ ...v, region: g.region })));

/** Top page "開催中・もうすぐ開催" from tnfc_rounds and the venues' periods. */
export async function getHomeUpcoming(): Promise<UpcomingItem[]> {
  const s = await getSchedule(CURRENT_SEASON_ID);
  return buildUpcoming(
    { rounds: s.rounds, tryout: flat(s.tryout), ranking: flat(s.ranking) },
    todayJst(),
  );
}

/** Top page national top 3 from ranking_cache. */
export async function getHomeRankingTop(): Promise<TopGroup[]> {
  const [data, venues] = await Promise.all([getRanking(CURRENT_SEASON_ID), getVenues()]);
  const names = new Map(venues.map((v) => [v.id, v.name]));
  return buildRankingTop(data, (id) => names.get(id) ?? "");
}
