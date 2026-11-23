import { cancellationsCsv } from "@/domain/tnfc-finals";
import { getCancellations } from "@/features/tnfc/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";

/** The season's refund / cancellation-fee ledger as CSV. Office only. */
export async function GET() {
  if (!(await getAdmin())) return new Response("ログインしてください。", { status: 401 });
  const csv = cancellationsCsv(await getCancellations(CURRENT_SEASON_ID));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tnfc${CURRENT_SEASON_ID}_cancellations.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
