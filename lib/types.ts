export type Marketplace = "US" | "CA" | "AU";

export type DashboardMetrics = {
  units: number;
  revenue: number;
  adSpend: number;
  adRate: number | null;
};

export type DashboardResponse = {
  marketplace: Marketplace;
  currency: string;
  updatedAt: string;
  periods: Record<"today" | "threeDays" | "thirtyDays", DashboardMetrics>;
};

export type OrderItem = { sku: string; name: string; quantity: number; unitPrice: number };

export type Order = {
  id: string;
  marketplace: Marketplace;
  orderedAt: string;
  status: "待发货" | "配送中" | "已送达";
  customer: string;
  destination: string;
  items: OrderItem[];
  shipping: number;
  tax: number;
};

export type Todo = {
  id: number;
  title: string;
  priority: "高" | "中" | "低";
  note: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListingDraft = {
  id: number;
  sourceUrl: string;
  marketplace: Marketplace;
  title: string;
  bullets: string[];
  description: string;
  images: string[];
  imageAssets: ListingImageAsset[];
  attributes: ListingAttributes;
  selectedVariant: string;
  status: "draft" | "ready" | "synced";
  confirmedAt: string | null;
  lingxingExternalId: string | null;
  syncMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type ListingImageAsset = {
  id: string;
  originalKey: string;
  optimizedKey: string | null;
  selected: "original" | "optimized";
  fileName: string;
  contentType: string;
};

export type ListingAttributes = {
  brand: string;
  model: string;
  color: string;
  material: string;
  dimensions: string;
  weight: string;
  capacity: string;
  packageContents: string;
};
