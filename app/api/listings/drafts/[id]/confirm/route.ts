import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { listingDrafts } from "@/db/schema";
import { parseDraft } from "@/lib/listing-drafts";
import { lingxingListingAdapter } from "@/lib/lingxing-adapter";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id); if (!Number.isInteger(id)) return Response.json({ message: "无效草稿。" }, { status: 400 });
    const [row] = await getDb().select().from(listingDrafts).where(eq(listingDrafts.id, id));
    if (!row) return Response.json({ message: "未找到草稿。" }, { status: 404 });
    const draft = parseDraft(row); if (!draft.title.trim() || !draft.images.length) return Response.json({ message: "请补全商品标题和至少一张商品图片后再确认。" }, { status: 400 });
    const now = new Date().toISOString();
    if (!lingxingListingAdapter.isConfigured()) { const [updated] = await getDb().update(listingDrafts).set({ status: "ready", confirmedAt: now, syncMessage: "已确认，等待配置领星接口后同步。", updatedAt: now }).where(eq(listingDrafts.id, id)).returning(); return Response.json(parseDraft(updated)); }
    const result = await lingxingListingAdapter.publish(draft); const [updated] = await getDb().update(listingDrafts).set({ status: result.status === "synced" ? "synced" : "ready", confirmedAt: now, lingxingExternalId: result.externalId, syncMessage: result.status === "synced" ? "已同步至领星。" : "领星已接收，等待处理。", updatedAt: now }).where(eq(listingDrafts.id, id)).returning(); return Response.json(parseDraft(updated));
  } catch { return Response.json({ message: "确认失败，请稍后重试。" }, { status: 503 }); }
}
