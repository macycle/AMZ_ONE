import { env } from "cloudflare:workers";

const keyPattern = /^listing-media-[a-f0-9-]+\.(?:png|jpe?g|webp)$/i;

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const bucket = env.BUCKET;
  if (!bucket) return Response.json({ message: "图片存储尚未配置。" }, { status: 503 });
  const key = decodeURIComponent((await params).key);
  if (!keyPattern.test(key)) return Response.json({ message: "无效图片。" }, { status: 400 });
  const image = await bucket.get(key);
  if (!image) return Response.json({ message: "图片不存在。" }, { status: 404 });
  return new Response(image.body, { headers: { "Content-Type": image.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
