export function classifyImageError(status: number, code = "") {
  if (code === "insufficient_quota" || code === "billing_hard_limit_reached") return { code: "quota_exhausted", message: "OpenAI API 额度不足或已达到支出上限，请检查 API 账单后再试。" };
  if (status === 401) return { code: "invalid_credentials", message: "OpenAI 密钥无效或已失效，请检查服务端配置。" };
  if (status === 403 || code === "model_not_found") return { code: "model_access_denied", message: "当前 OpenAI 项目没有图片编辑模型权限，请检查项目权限。" };
  if (/content_policy|moderation|safety/.test(code)) return { code: "content_rejected", message: "图片或优化要求未通过内容审核，请调整后再试。" };
  if (status === 429) return { code: "rate_limited", message: "图片优化请求受到频率限制，请等待后手动重试。" };
  if (status === 400) return { code: "invalid_image", message: "图片编辑请求未被接受，请检查原图格式与优化要求。" };
  return { code: "upstream_unavailable", message: "AI 图片服务暂不可用，请稍后重试。" };
}

export function retryDelay(value: string | null, now = Date.now()) {
  if (!value) return 60;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - now) / 1000)) : 60;
}
