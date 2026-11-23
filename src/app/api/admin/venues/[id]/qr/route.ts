import QRCode from "qrcode";
import { entryUrl, getAdminVenue } from "@/features/venue/queries";
import { getAdmin } from "@/server/admin-session";

/**
 * The gym's own QR code (/checkin?venue=…&k=…) as SVG (print) or PNG (?format=png, 1200px).
 * Office only. Error correction "M" leaves room for a logo-free POP at A4 size.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/admin/venues/[id]/qr">) {
  if (!(await getAdmin())) return new Response("ログインしてください。", { status: 401 });
  const { id } = await ctx.params;
  const venue = await getAdminVenue(id);
  if (!venue) return new Response("会場が見つかりません。", { status: 404 });
  if (!venue.qrKey) return new Response("先に QR コードを発行してください。", { status: 409 });

  const url = entryUrl(venue.id, venue.qrKey);
  const png = new URL(req.url).searchParams.get("format") === "png";
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="qr_${venue.id}.${png ? "png" : "svg"}"`,
  };
  if (png) {
    const buf = await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 2, width: 1200 });
    return new Response(new Uint8Array(buf), {
      headers: { ...headers, "Content-Type": "image/png" },
    });
  }
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
  return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
