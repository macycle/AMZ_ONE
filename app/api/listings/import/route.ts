import type { ListingAttributes } from "@/lib/types";

const AMAZON_HOST = /(^|\.)amazon\.(com|ca|com\.au|co\.uk|de|fr|it|es|co\.jp|in|com\.mx|com\.br|ae|sg|nl|se|pl|com\.tr)$/i;
const emptyAttributes: ListingAttributes = { brand: "", model: "", color: "", material: "", dimensions: "", weight: "", capacity: "", packageContents: "" };

function decode(value: string) { return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim(); }
function strip(value: string) { return decode(value.replace(/<[^>]+>/g, " ")); }
function meta(html: string, key: string) {
  const patterns = [new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"), new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i")];
  for (const pattern of patterns) { const match = html.match(pattern)?.[1]; if (match) return decode(match); }
  return "";
}
function section(html: string, id: string) { return html.match(new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/div>`, "i"))?.[1] ?? ""; }
function parseBullets(html: string) {
  const source = section(html, "feature-bullets") || section(html, "featurebullets_feature_div");
  return [...source.matchAll(/<span[^>]*class=["'][^"']*a-list-item[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)].map((match) => strip(match[1])).filter(Boolean).slice(0, 5);
}
function keyFor(label: string): keyof ListingAttributes | null {
  const value = label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (value === "brand" || value.includes("manufacturer")) return "brand";
  if (value.includes("model")) return "model";
  if (value === "color" || value.includes("colour")) return "color";
  if (value.includes("material")) return "material";
  if (value.includes("dimensions")) return "dimensions";
  if (value.includes("weight")) return "weight";
  if (value.includes("capacity") || value.includes("volume")) return "capacity";
  if (value.includes("included components") || value.includes("package contents") || value.includes("what s included")) return "packageContents";
  return null;
}
function parseAttributes(html: string) {
  const attributes = { ...emptyAttributes };
  for (const row of html.matchAll(/<tr[^>]*>[\s\S]*?<th[^>]*class=["'][^"']*prodDetSectionEntry[^"']*["'][^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*class=["'][^"']*prodDetAttrValue[^"']*["'][^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)) {
    const key = keyFor(strip(row[1])); const value = strip(row[2]);
    if (key && value && !attributes[key]) attributes[key] = value;
  }
  const byline = strip(html.match(/id=["']bylineInfo["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? "").replace(/^Visit the\s+/i, "").replace(/\s+Store$/i, "");
  if (!attributes.brand && byline) attributes.brand = byline;
  return attributes;
}
type ImageBlock = { hiRes?: string; large?: string; main?: Record<string, unknown> };
function parseImageData(html: string): { selectedVariant: string; images: string[] } {
  const candidates = [...html.matchAll(/jQuery\.parseJSON\('([\s\S]*?)'\)/g)].map((match) => match[1]).filter((value) => value.includes("colorImages"));
  let selectedVariant = "";
  let variantImages: string[] = [];
  for (const candidate of candidates) {
    try {
      const decoded = candidate.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      const data = JSON.parse(decoded) as { landingAsinColor?: string; defaultColor?: string; colorImages?: Record<string, ImageBlock[]> };
      selectedVariant = data.landingAsinColor || data.defaultColor || "";
      variantImages = (data.colorImages?.[selectedVariant] ?? []).map((image) => image.hiRes || image.large || Object.keys(image.main ?? {})[0] || "").filter(Boolean);
      break;
    } catch { /* Try the DOM fallback below. */ }
  }
  // Amazon may omit or reorganize the #altImages container in server responses.
  // data-old-hires is the stable high-resolution product-gallery field and is not a generic page-image scan.
  const galleryImages = [...html.matchAll(/data-old-hires=["'](https?:[^"']+)["']/gi)].map((match) => decode(match[1])).filter((url) => /m\.media-amazon\.com\/images\/I\//.test(url));
  const fallback = meta(html, "og:image");
  const images = [...new Set([...variantImages, ...galleryImages])].slice(0, 8);
  return { selectedVariant, images: images.length ? images : fallback ? [fallback] : [] };
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json() as { url?: unknown };
    if (typeof url !== "string" || url.length > 2000) return Response.json({ message: "请输入有效的亚马逊商品链接。" }, { status: 400 });
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !AMAZON_HOST.test(parsed.hostname)) return Response.json({ message: "仅支持 HTTPS 的 Amazon 商品链接。" }, { status: 400 });
    const response = await fetch(parsed.toString(), { headers: { "User-Agent": "Mozilla/5.0 (compatible; AmazonOpsCenter/1.0)", Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!response.ok) return Response.json({ message: "该页面暂时无法获取，请稍后重试或手动录入。" }, { status: 422 });
    const html = await response.text();
    const title = strip(html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? "") || meta(html, "og:title");
    const { selectedVariant, images } = parseImageData(html);
    const bullets = parseBullets(html); const attributes = parseAttributes(html); const description = meta(html, "description") || meta(html, "og:description");
    if (!title && !description && !images.length) return Response.json({ message: "没有从该页面识别到可用素材，可能被亚马逊限制访问。" }, { status: 422 });
    return Response.json({ sourceUrl: parsed.toString(), title, description, bullets, images, attributes, selectedVariant });
  } catch { return Response.json({ message: "导入失败。亚马逊页面可能限制了当前访问，请稍后重试或手动编辑。" }, { status: 422 }); }
}
