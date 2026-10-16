import type { Marketplace } from "./types";

export const marketplaces: Record<Marketplace, { name: string; currency: string; locale: string }> = {
  US: { name: "美国站", currency: "USD", locale: "en-US" },
  CA: { name: "加拿大站", currency: "CAD", locale: "en-CA" },
  AU: { name: "澳大利亚站", currency: "AUD", locale: "en-AU" },
};

export function isMarketplace(value: string | null): value is Marketplace {
  return value === "US" || value === "CA" || value === "AU";
}

export function money(value: number, marketplace: Marketplace) {
  const config = marketplaces[marketplace];
  return new Intl.NumberFormat(config.locale, { style: "currency", currency: config.currency, maximumFractionDigits: 0 }).format(value);
}
