import { marketplaces } from "./marketplace";
import type { DashboardMetrics, DashboardResponse, Marketplace, Order } from "./types";

function chinaDay(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  const date = new Date(`${pick("year")}-${pick("month")}-${pick("day")}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
}

const seed: Record<Marketplace, DashboardMetrics> = {
  US: { units: 86, revenue: 3128, adSpend: 511, adRate: 0 },
  CA: { units: 39, revenue: 1440, adSpend: 229, adRate: 0 },
  AU: { units: 51, revenue: 2040, adSpend: 318, adRate: 0 },
};

export function getDashboard(marketplace: Marketplace): DashboardResponse {
  const today = seed[marketplace];
  const makePeriod = (multiplier: number): DashboardMetrics => {
    const revenue = today.revenue * multiplier;
    const adSpend = Math.round(today.adSpend * multiplier * (multiplier > 1 ? 0.96 : 1));
    return { units: Math.round(today.units * multiplier * 0.98), revenue, adSpend, adRate: revenue ? adSpend / revenue : null };
  };
  return { marketplace, currency: marketplaces[marketplace].currency, updatedAt: new Date().toISOString(), periods: { today: makePeriod(1), threeDays: makePeriod(3), thirtyDays: makePeriod(30) } };
}

const itemCatalog = [
  { sku: "HOME-ORG-01", name: "厨房收纳盒（4件套）", price: 28 },
  { sku: "PET-GROOM-02", name: "宠物梳毛手套", price: 18 },
  { sku: "TRAVEL-CUBE-03", name: "旅行收纳袋（6件套）", price: 36 },
  { sku: "DESK-LAMP-04", name: "USB 阅读灯", price: 22 },
];

export function getOrders(marketplace?: Marketplace): Order[] {
  const sites: Marketplace[] = marketplace ? [marketplace] : ["US", "CA", "AU"];
  return sites.flatMap((site, siteIndex) => Array.from({ length: 7 }, (_, index) => {
    const item = itemCatalog[(index + siteIndex) % itemCatalog.length];
    return {
      id: `${site === "US" ? "114" : site === "CA" ? "701" : "503"}-${String(845000000000 + siteIndex * 100 + index).slice(-12)}-${String(100 + index).padStart(3, "0")}`,
      marketplace: site,
      orderedAt: chinaDay(-index),
      status: index % 3 === 0 ? "待发货" : index % 3 === 1 ? "配送中" : "已送达",
      customer: "A*** L***",
      destination: site === "US" ? "Seattle, WA 98101" : site === "CA" ? "Toronto, ON M5V" : "Sydney, NSW 2000",
      items: [{ sku: item.sku, name: item.name, quantity: index % 3 + 1, unitPrice: item.price }],
      shipping: index % 2 ? 0 : 4.99,
      tax: Number((item.price * (index % 3 + 1) * 0.08).toFixed(2)),
    };
  })).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
}

export function getOrder(id: string) { return getOrders().find((order) => order.id === id) ?? null; }
