import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { listingDrafts } from "@/db/schema";
import { draftValues, parseDraft } from "@/lib/listing-drafts";

function idFrom(params: Promise<{ id: string }>) { return params.then(({ id }) => Number(id)); }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const id = await idFrom(params); const [row] = await getDb().select().from(listingDrafts).where(eq(listingDrafts.id, id)); return row ? Response.json(parseDraft(row)) : Response.json({ message: "未找到草稿。" }, { status: 404 }); } catch { return Response.json({ message: "读取草稿失败，请稍后重试。" }, { status: 503 }); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const id = await idFrom(params); if (!Number.isInteger(id)) return Response.json({ message: "无效草稿。" }, { status: 400 }); const values = draftValues(await request.json()); if ("error" in values) return Response.json(values, { status: 400 }); const [draft] = await getDb().update(listingDrafts).set({ ...values, status: "draft", confirmedAt: null, lingxingExternalId: null, syncMessage: "修改后需要再次确认。", updatedAt: new Date().toISOString() }).where(eq(listingDrafts.id, id)).returning(); return draft ? Response.json(parseDraft(draft)) : Response.json({ message: "未找到草稿。" }, { status: 404 }); } catch { return Response.json({ message: "更新草稿失败，请稍后重试。" }, { status: 503 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const id = await idFrom(params); if (!Number.isInteger(id)) return Response.json({ message: "无效草稿。" }, { status: 400 }); await getDb().delete(listingDrafts).where(eq(listingDrafts.id, id)); return new Response(null, { status: 204 }); } catch { return Response.json({ message: "删除草稿失败，请稍后重试。" }, { status: 503 }); }
}
