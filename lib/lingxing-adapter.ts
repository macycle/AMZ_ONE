import type { ListingDraft } from "@/lib/types";
import { env } from "cloudflare:workers";

/**
 * 领星适配边界：页面与数据库只使用 ListingDraft（含 attributes、selectedVariant）；接入时在这里完成
 * 领星字段转换、签名与请求。所有凭证仅来自服务端环境变量。
 */
export type LingxingPublishResult = { externalId: string; status: "queued" | "synced" };

export interface LingxingListingAdapter {
  isConfigured(): boolean;
  publish(draft: ListingDraft): Promise<LingxingPublishResult>;
}

export const lingxingListingAdapter: LingxingListingAdapter = {
  isConfigured() {
    return Boolean(env.LINGXING_API_BASE_URL && env.LINGXING_APP_KEY && env.LINGXING_APP_SECRET);
  },
  async publish() {
    throw new Error("领星上架接口尚未配置。请设置服务端凭证并在 lingxing-adapter.ts 中完成字段映射。");
  },
};
