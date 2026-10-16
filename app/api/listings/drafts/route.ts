import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { listingDrafts } from "@/db/schema";
import { draftValues, parseDraft } from "@/lib/listing-drafts";

export async function GET() { try { return Response.json((await getDb().select().from(listingDrafts).orderBy(desc(listingDrafts.updatedAt))).map(parseDraft)); } catch { return Response.json({ message: "草稿服务暂不可用。" }, { status: 503 }); } }
export async function POST(request: Request) {
  try {
    const values = draftValues(await request.json());
    if ("error" in values) return Response.json(values, { status: 400 });
    const now = new Date().toISOString();
    const [draft] = await getDb().insert(listingDrafts).values({ ...values, createdAt: now, updatedAt: now }).returning();
    return Response.json(parseDraft(draft), { status: 201 });
  } catch { return Response.json({ message: "保存草稿失败，请稍后重试。" }, { status: 503 }); }
}
