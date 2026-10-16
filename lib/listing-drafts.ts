import type { ListingAttributes, ListingImageAsset } from "@/lib/types";
import { listingDrafts } from "@/db/schema";

export const emptyAttributes: ListingAttributes = { brand: "", model: "", color: "", material: "", dimensions: "", weight: "", capacity: "", packageContents: "" };
type DraftBody = { sourceUrl?: unknown; marketplace?: unknown; title?: unknown; bullets?: unknown; description?: unknown; images?: unknown; imageAssets?: unknown; attributes?: unknown; selectedVariant?: unknown };

const assetKey = /^listing-media-[a-f0-9-]+\.(?:png|jpe?g|webp)$/i;
function imageAssets(value: unknown): ListingImageAsset[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const asset = item as Record<string, unknown>;
    if (typeof asset.id !== "string" || typeof asset.originalKey !== "string" || !assetKey.test(asset.originalKey)) return [];
    const optimizedKey = typeof asset.optimizedKey === "string" && assetKey.test(asset.optimizedKey) ? asset.optimizedKey : null;
    return [{ id: asset.id.slice(0, 100), originalKey: asset.originalKey, optimizedKey, selected: asset.selected === "optimized" && optimizedKey ? "optimized" : "original", fileName: typeof asset.fileName === "string" ? asset.fileName.slice(0, 255) : "image", contentType: typeof asset.contentType === "string" ? asset.contentType.slice(0, 100) : "image/jpeg" }];
  });
}

export function parseDraft(row: typeof listingDrafts.$inferSelect) {
  return { ...row, bullets: JSON.parse(row.bullets) as string[], images: JSON.parse(row.images) as string[], imageAssets: imageAssets(JSON.parse(row.imageAssets)), attributes: { ...emptyAttributes, ...JSON.parse(row.attributes) as Partial<ListingAttributes> } };
}

export function draftValues(body: DraftBody) {
  if (body.sourceUrl !== undefined && typeof body.sourceUrl !== "string") return { error: "来源链接格式无效。" } as const;
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  if (sourceUrl && (!/^https:\/\//i.test(sourceUrl) || sourceUrl.length > 2000)) return { error: "来源链接必须是有效的 HTTPS 地址，且不超过 2000 字符。" } as const;
  const attributes = typeof body.attributes === "object" && body.attributes ? Object.fromEntries(Object.entries(body.attributes as Record<string, unknown>).filter(([key]) => key in emptyAttributes).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 500) : ""])) : emptyAttributes;
  const assets = imageAssets(body.imageAssets);
  const selectedAssets = assets.map((asset) => `/api/listings/media/${asset.selected === "optimized" && asset.optimizedKey ? asset.optimizedKey : asset.originalKey}`);
  const remoteImages = Array.isArray(body.images) ? body.images.filter((value): value is string => typeof value === "string" && /^https:\/\//.test(value)).slice(0, Math.max(0, 12 - selectedAssets.length)) : [];
  return { sourceUrl, marketplace: body.marketplace === "CA" || body.marketplace === "AU" ? body.marketplace : "US", title: typeof body.title === "string" ? body.title.slice(0, 500) : "", bullets: JSON.stringify(Array.isArray(body.bullets) ? body.bullets.map(String).slice(0, 5) : []), description: typeof body.description === "string" ? body.description.slice(0, 5000) : "", images: JSON.stringify([...remoteImages, ...selectedAssets].slice(0, 12)), imageAssets: JSON.stringify(assets), attributes: JSON.stringify({ ...emptyAttributes, ...attributes }), selectedVariant: typeof body.selectedVariant === "string" ? body.selectedVariant.slice(0, 120) : "" } as const;
}
