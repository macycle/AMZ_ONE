import { getOrder } from "@/lib/demo-provider";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(decodeURIComponent(id));
  return order ? Response.json(order) : Response.json({ message: "未找到该订单" }, { status: 404 });
}
