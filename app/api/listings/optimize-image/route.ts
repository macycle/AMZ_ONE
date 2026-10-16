import { env } from "cloudflare:workers";
import { classifyImageError, retryDelay } from "@/lib/image-errors";
import { listingImageModel } from "@/lib/image-config";

const keyPattern = /^listing-media-[a-f0-9-]+\.(?:png|jpe?g|webp)$/i;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const fail = (status: number, code: string, message: string, retryAfterSeconds?: number, upstreamRequestId?: string | null) => {
    console.error(JSON.stringify({ event: "image_optimization_failed", model: listingImageModel, code, requestId, upstreamRequestId: upstreamRequestId || undefined, status }));
    return Response.json({ code, message, requestId, retryAfterSeconds }, { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });
  };
  const key = env.OPENAI_API_KEY;
  const bucket = env.BUCKET;
  if (!key) return fail(503, "missing_credentials", "AI 图片优化尚未配置。");
  if (!bucket) return fail(503, "storage_unavailable", "图片存储尚未配置。");
  try {
    const { originalKey, instruction } = await request.json() as { originalKey?: unknown; instruction?: unknown };
    if (typeof originalKey !== "string" || !keyPattern.test(originalKey)) return fail(400, "invalid_image", "无效的上传图片。");
    const source = await bucket.get(originalKey);
    if (!source) return fail(404, "source_missing", "原图不存在或已被删除，请重新上传。");
    const form = new FormData();
    form.append("model", listingImageModel);
    form.append("quality", "high");
    form.append("n", "1");
    form.append("prompt", `优化这张亚马逊商品图片的展示质感与清晰度。必须保持产品主体、颜色、结构、数量和已知事实不变；不得添加文字、商标、夸大功效或未验证卖点。${typeof instruction === "string" && instruction.trim() ? ` 补充要求：${instruction.trim().slice(0, 500)}` : ""}`);
    form.append("size", "1024x1024");
    form.append("output_format", "png");
    const contentType = source.httpMetadata?.contentType || "image/jpeg";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    form.append("image", new Blob([await source.arrayBuffer()], { type: contentType }), `source-image.${extension}`);
    const response = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(180000) });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      const error = classifyImageError(response.status, payload?.error?.code);
      const delay = error.code === "rate_limited" ? retryDelay(response.headers.get("retry-after")) : undefined;
      return fail(response.status === 429 ? 429 : 502, error.code, error.message, delay, response.headers.get("x-request-id"));
    }
    const result = await response.json() as { data?: Array<{ b64_json?: string }> };
    const image = result.data?.[0]?.b64_json;
    if (!image) return fail(502, "empty_result", "AI 未返回可用图片，请重试。");
    const optimizedKey = `listing-media-${crypto.randomUUID()}.png`;
    const binary = Uint8Array.from(atob(image), (char) => char.charCodeAt(0));
    await bucket.put(optimizedKey, binary, { httpMetadata: { contentType: "image/png", cacheControl: "private, max-age=31536000, immutable" } });
    return Response.json({ optimizedKey, imageUrl: `/api/listings/media/${optimizedKey}` });
  } catch (error) {
    const timeout = error instanceof Error && /Timeout|Abort/.test(error.name);
    return fail(timeout ? 504 : 502, timeout ? "timeout" : "optimization_failed", timeout ? "图片生成等待超时，请稍后检查或重试。" : "图片优化失败，请稍后重试。");
  }
}
