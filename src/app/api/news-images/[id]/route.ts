import { NEWS_ID, newsImagePath } from "@/features/news/paths";
import { adminBucket } from "@/server/firebase-admin";

/** A NEWS article image, read from Storage (the bucket stays closed to browsers). */
export async function GET(req: Request, ctx: RouteContext<"/api/news-images/[id]">) {
  const { id } = await ctx.params;
  if (!NEWS_ID.test(id)) return new Response("Not found", { status: 404 });
  try {
    const [data] = await adminBucket().file(newsImagePath(id)).download();
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
