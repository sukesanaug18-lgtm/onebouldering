import { receptionCsv, tnfcControlCsv } from "@/domain/tnfc";
import { hpResultCsv, membersSyncCsv } from "@/domain/tnfc-results";
import {
  getRound,
  getRoundEntries,
  getRoundResults,
  getSyncMembers,
} from "@/features/tnfc/queries";
import { getAdmin } from "@/server/admin-session";

const TYPES = {
  control: "tnfc_control",
  reception: "reception",
  results: "results_hp",
  members: "members",
} as const;
type CsvType = keyof typeof TYPES;

/**
 * Office-only CSV files for a round: reception sheet, TNFC Control upload (before the qualifier),
 * the result list for the old site and the member list for the finals sheet (after it).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/admin/tnfc/[id]/csv">) {
  if (!(await getAdmin())) return new Response("ログインしてください。", { status: 401 });
  const { id } = await ctx.params;
  const round = await getRound(id);
  if (!round) return new Response("大会が見つかりません。", { status: 404 });
  const type = new URL(req.url).searchParams.get("type") ?? "";
  if (!(type in TYPES)) {
    return new Response("type は control / reception / results / members のどれかです。", {
      status: 400,
    });
  }
  let csv: string;
  switch (type as CsvType) {
    case "control":
      csv = tnfcControlCsv(await getRoundEntries(round.id));
      break;
    case "reception":
      csv = receptionCsv(await getRoundEntries(round.id));
      break;
    case "results":
      csv = hpResultCsv(round, await getRoundResults(round.id));
      break;
    case "members":
      csv = membersSyncCsv(await getSyncMembers());
      break;
  }
  const file = `${round.id}_${TYPES[type as CsvType]}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
