import { isPosterEvent, posterPath } from "@/features/posters/config";
import { adminBucket } from "@/server/firebase-admin";

/**
 * An uploaded event poster, read from Storage (the bucket stays closed to browsers).
 * The URL carries ?v=<version>, so a new upload gets a new URL and old ones can be cached long.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/posters/[event]">) {
  const { event } = await ctx.params;
  if (!isPosterEvent(event)) return new Response("Not found", { status: 404 });
  try {
    const [data] = await adminBucket().file(posterPath(event)).download();
    const versioned = new URL(req.url).searchParams.has("v");
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
