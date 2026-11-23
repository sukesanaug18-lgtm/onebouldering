import { receptionCsv, tnfcControlCsv } from "@/domain/tnfc";
import { getRound, getRoundEntries } from "@/features/tnfc/queries";
import { getAdmin } from "@/server/admin-session";

/** Reception sheet (?type=reception) or TNFC Control upload CSV (?type=control). Office only. */
export async function GET(req: Request, ctx: RouteContext<"/api/admin/tnfc/[id]/csv">) {
  if (!(await getAdmin())) return new Response("ログインしてください。", { status: 401 });
  const { id } = await ctx.params;
  const round = await getRound(id);
  if (!round) return new Response("大会が見つかりません。", { status: 404 });
  const type = new URL(req.url).searchParams.get("type");
  if (type !== "control" && type !== "reception") {
    return new Response("type は control か reception です。", { status: 400 });
  }
  const entries = await getRoundEntries(round.id);
  const csv = type === "control" ? tnfcControlCsv(entries) : receptionCsv(entries);
  const file = `${round.id}_${type === "control" ? "tnfc_control" : "reception"}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
