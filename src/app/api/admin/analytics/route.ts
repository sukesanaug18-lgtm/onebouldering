import { analyticsCsv } from "@/domain/analytics";
import { getSeasonAnalytics } from "@/features/analytics/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";

const TYPES = ["venues", "divisions", "problems"] as const;

/** Analytics tables as CSV (?type=venues|divisions|problems). Office only. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("ログインしてください。", { status: 401 });
  const type = TYPES.find((t) => t === new URL(req.url).searchParams.get("type"));
  if (!type) return new Response("Not found", { status: 404 });
  const csv = analyticsCsv(await getSeasonAnalytics(CURRENT_SEASON_ID), type);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics${CURRENT_SEASON_ID}_${type}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
