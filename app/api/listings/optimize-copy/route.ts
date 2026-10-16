import { env } from "cloudflare:workers";

function outputText(payload: { output?: Array<{ content?: Array<{ text?: string }> }> }) { return payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? ""; }

export async function POST(request: Request) {
  const key = env.OPENAI_API_KEY;
  if (!key) return Response.json({ message: "AI 优化尚未配置。请在服务端设置 OPENAI_API_KEY 后重试。" }, { status: 503 });
  try {
    const body = await request.json() as { title?: string; bullets?: string[]; description?: string; marketplace?: string };
    const input = JSON.stringify({ title: body.title?.slice(0, 500) ?? "", bullets: (body.bullets ?? []).slice(0, 5).map((item) => String(item).slice(0, 500)), description: body.description?.slice(0, 4000) ?? "", marketplace: body.marketplace ?? "US" });
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5-mini", store: false, instructions: "你是亚马逊商品文案编辑。只优化输入中已经出现且可验证的事实；不得添加未经验证的材质、认证、功效、尺寸或竞争性主张。返回严格 JSON。", input: `请为 ${body.marketplace ?? "US"} 站点优化以下商品文案，使用该站点的常用语言：${input}`, text: { format: { type: "json_schema", name: "listing_copy", strict: true, schema: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, description: { type: "string" } }, required: ["title", "bullets", "description"] } } } }) });
    if (!response.ok) return Response.json({ message: "AI 文案优化暂不可用，请稍后重试。" }, { status: 502 });
    return Response.json(JSON.parse(outputText(await response.json())));
  } catch { return Response.json({ message: "AI 文案优化失败，请稍后重试。" }, { status: 502 }); }
}
