import { env } from "cloudflare:workers";

const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
const extension = (type: string) => type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

export async function POST(request: Request) {
  const bucket = env.BUCKET;
  if (!bucket) return Response.json({ message: "图片存储尚未配置。" }, { status: 503 });
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return Response.json({ message: "请选择图片文件。" }, { status: 400 });
    if (!supported.has(file.type)) return Response.json({ message: "仅支持 JPEG、PNG、WebP 图片。" }, { status: 400 });
    if (!file.size || file.size > 10 * 1024 * 1024) return Response.json({ message: "单张图片不能超过 10MB。" }, { status: 400 });
    const originalKey = `listing-media-${crypto.randomUUID()}.${extension(file.type)}`;
    await bucket.put(originalKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "private, max-age=31536000, immutable" } });
    return Response.json({ id: crypto.randomUUID(), originalKey, optimizedKey: null, selected: "original", fileName: file.name.slice(0, 255), contentType: file.type, imageUrl: `/api/listings/media/${originalKey}` }, { status: 201 });
  } catch { return Response.json({ message: "上传图片失败，请稍后重试。" }, { status: 502 }); }
}
