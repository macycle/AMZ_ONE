import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { todos } from "@/db/schema";

const priorities = ["高", "中", "低"] as const;
type Priority = (typeof priorities)[number];

function taskInput(body: unknown) {
  const value = body as { title?: unknown; priority?: unknown; note?: unknown; completed?: unknown };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title || title.length > 120) return { error: "任务名称不能为空且不能超过 120 个字符" } as const;
  return { title, priority: priorities.includes(value.priority as Priority) ? value.priority as Priority : "中", note: typeof value.note === "string" ? value.note.trim().slice(0, 500) : "", completed: Boolean(value.completed) } as const;
}

export async function GET() {
  try {
    const rows = await getDb().select().from(todos).orderBy(desc(todos.completed), desc(todos.updatedAt));
    return Response.json(rows);
  } catch {
    return Response.json({ message: "待办服务暂不可用，请稍后重试。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const input = taskInput(await request.json());
    if ("error" in input) return Response.json(input, { status: 400 });
    const now = new Date().toISOString();
    const [created] = await getDb().insert(todos).values({ ...input, createdAt: now, updatedAt: now }).returning();
    return Response.json(created, { status: 201 });
  } catch {
    return Response.json({ message: "保存失败，请稍后重试。" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isInteger(id)) return Response.json({ message: "无效的待办事项" }, { status: 400 });
    const input = taskInput(body);
    if ("error" in input) return Response.json(input, { status: 400 });
    const [updated] = await getDb().update(todos).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(todos.id, id)).returning();
    return updated ? Response.json(updated) : Response.json({ message: "未找到待办事项" }, { status: 404 });
  } catch {
    return Response.json({ message: "更新失败，请稍后重试。" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ message: "无效的待办事项" }, { status: 400 });
    await getDb().delete(todos).where(eq(todos.id, id));
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ message: "删除失败，请稍后重试。" }, { status: 503 });
  }
}
