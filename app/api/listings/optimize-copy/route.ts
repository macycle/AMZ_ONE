import { env } from "cloudflare:workers";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().max(500).default(""),
  bullets: z.array(z.string().max(500)).max(5).default([]),
  description: z.string().max(4000).default(""),
  marketplace: z.enum(["US", "CA", "AU"]).default("US"),
}).strict();

const responseSchema = z.object({
  title: z.string().max(500),
  bullets: z.array(z.string().max(500)).max(5),
  description: z.string().max(5000),
}).strict();

function outputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output.flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string).join("");
}

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return Response.json({ message: "请求必须包含有效 JSON。" }, { status: 400 }); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ message: "文案字段格式或长度不符合要求。" }, { status: 400 });
  const key = env.OPENAI_API_KEY;
  if (!key) return Response.json({ message: "AI 优化尚未配置。请在服务端设置 OPENAI_API_KEY 后重试。" }, { status: 503 });
  const body = parsed.data;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5-mini",
        store: false,
        instructions: "你是亚马逊商品文案编辑。只优化输入中已经出现且可验证的事实；不得添加未经验证的材质、认证、功效、尺寸或竞争性主张。返回严格 JSON。",
        input: `请为 ${body.marketplace} 站点优化以下商品文案，使用该站点的常用语言：${JSON.stringify(body)}`,
        text: { format: { type: "json_schema", name: "listing_copy", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, description: { type: "string" } },
          required: ["title", "bullets", "description"],
        } } },
      }),
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
      return Response.json({ message: status === 429 ? "AI 请求过于频繁，请稍后重试。" : "AI 文案优化暂不可用，请稍后重试。" }, { status });
    }
    const text = outputText(await response.json());
    let data: unknown;
    try { data = JSON.parse(text); } catch { return Response.json({ message: "AI 返回了无法解析的文案。" }, { status: 502 }); }
    const validated = responseSchema.safeParse(data);
    if (!validated.success) return Response.json({ message: "AI 返回的文案格式不符合要求。" }, { status: 502 });
    return Response.json(validated.data);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ message: timedOut ? "AI 文案优化超时，请稍后重试。" : "AI 文案优化失败，请稍后重试。" }, { status: timedOut ? 504 : 502 });
  }
}
