import { divisionName } from "@/domain/division";
import { toCsv } from "@/domain/gym";
import { JUDGMENT_LABEL } from "@/domain/tryout";
import { getVenueTryouts } from "@/features/gym/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getGymStaff } from "@/server/gym-session";

/** CSV of the Tryouts taken at the signed-in gym this season (diagram B-3, tab 3). */
export async function GET() {
  const staff = await getGymStaff();
  if (!staff) return new Response("ログインしてください。", { status: 401 });

  const list = await getVenueTryouts(staff.venueId, CURRENT_SEASON_ID);
  const csv = toCsv(
    [
      "日時",
      "ライセンスNo.",
      "氏名",
      "カテゴリー",
      "Pre-Check",
      "挑戦Division",
      "完登課題",
      "完登数",
      "判定",
      "変更前",
      "変更後",
    ],
    list.map((t) => [
      new Date(t.at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      t.userId,
      t.name,
      t.category,
      t.precheck,
      divisionName(t.challenged),
      t.completed.join(" "),
      t.completedCount,
      JUDGMENT_LABEL[t.judgment] ?? t.judgment,
      divisionName(t.oldDivision),
      divisionName(t.newDivision),
    ]),
  );
  const file = `tryout_${staff.venueId}_${CURRENT_SEASON_ID}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
