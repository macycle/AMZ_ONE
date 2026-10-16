import { getOrders } from "@/lib/demo-provider";
import { isMarketplace } from "@/lib/marketplace";

export async function GET(request: Request) {
  const site = new URL(request.url).searchParams.get("site");
  return Response.json(getOrders(isMarketplace(site) ? site : undefined));
}
