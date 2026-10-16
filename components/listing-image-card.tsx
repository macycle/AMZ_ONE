"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { ListingImageAsset } from "@/lib/types";
import { listingImageModelLabel } from "@/lib/image-config";

type Feedback = { state: "idle" | "generating" | "success" | "failed"; message: string; code?: string; requestId?: string; retryAt?: number };
type Props = {
  asset: ListingImageAsset;
  index: number;
  instruction: string;
  busy: boolean;
  onOptimize: (asset: ListingImageAsset, instruction: string) => Promise<{ optimizedKey: string }>;
  onSelect: (id: string, selected: ListingImageAsset["selected"]) => void;
  onRemove: (id: string) => void;
};

export class ImageRequestError extends Error {
  constructor(message: string, public code?: string, public retryAfterSeconds?: number, public requestId?: string) { super(message); }
}

export async function requestImageOptimization(originalKey: string, instruction: string) {
  try {
    const response = await fetch("/api/listings/optimize-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalKey, instruction }), signal: AbortSignal.timeout(200000) });
    const payload = await response.json().catch(() => null) as { message?: string; code?: string; retryAfterSeconds?: number; requestId?: string; optimizedKey?: string } | null;
    if (!payload || typeof payload !== "object") throw new ImageRequestError("服务器返回了无法读取的响应，请稍后重试。", "invalid_response");
    if (!response.ok) throw new ImageRequestError(payload.message || "图片优化失败，请稍后重试。", payload.code, payload.retryAfterSeconds, payload.requestId);
    if (typeof payload.optimizedKey !== "string" || !/^listing-media-[a-f0-9-]+\.png$/i.test(payload.optimizedKey)) throw new ImageRequestError("AI 未返回可用图片，请重试。", "empty_result");
    return { optimizedKey: payload.optimizedKey };
  } catch (error) {
    if (error instanceof ImageRequestError) throw error;
    if (error instanceof Error && /Timeout|Abort/.test(error.name)) throw new ImageRequestError("请求等待超时，原图仍保留；请稍后再试。", "timeout");
    throw new ImageRequestError("网络连接失败，请检查网络后重试。", "network_error");
  }
}

function ImagePreview({ imageKey, alt }: { imageKey: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) return <div role="alert" className="grid aspect-square place-items-center rounded-lg bg-red-50 p-3 text-center text-xs text-red-700"><div><p>{alt}加载失败。</p><button className="mt-2 rounded border border-red-200 px-3 py-2" onClick={() => { setAttempt((value) => value + 1); setFailed(false); }}>重新加载图片</button></div></div>;
  return <img src={`/api/listings/media/${imageKey}${attempt ? `?reload=${attempt}` : ""}`} alt={alt} className="aspect-square w-full rounded-lg object-cover" onError={() => setFailed(true)}/>;
}

export function ListingImageCard({ asset, index, instruction, busy, onOptimize, onSelect, onRemove }: Props) {
  const [feedback, setFeedback] = useState<Feedback>({ state: "idle", message: "" });
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false);
  useEffect(() => {
    if (!feedback.retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [feedback.retryAt]);
  const remaining = Math.max(0, Math.ceil(((feedback.retryAt || 0) - now) / 1000));
  const generating = feedback.state === "generating";
  const optimize = async () => {
    if (busy || inFlight.current || remaining) return;
    inFlight.current = true;
    setFeedback({ state: "generating", message: "正在生成优化图，请稍候；完成后会显示在这里。" });
    try {
      await onOptimize(asset, instruction);
      setFeedback({ state: "success", message: "优化图已生成，请选择原图或优化图用于上架，再保存草稿。" });
    } catch (error) {
      const value = error instanceof ImageRequestError ? error : new ImageRequestError("图片优化失败，请稍后重试。");
      const seconds = value.code === "rate_limited" ? (value.retryAfterSeconds || 60) : 0;
      setNow(Date.now());
      setFeedback({ state: "failed", message: value.message, code: value.code, requestId: value.requestId, retryAt: seconds ? Date.now() + seconds * 1000 : undefined });
    } finally { inFlight.current = false; }
  };
  return <div className="overflow-hidden rounded-xl border border-[#e1e9e4]">
    <p className="border-b border-[#e1e9e4] bg-[#fafcfb] px-3 py-2 text-xs text-[#5d6d65]">优化模型：{listingImageModelLabel} · 高质量 · 1024×1024 PNG</p>
    <div className="grid grid-cols-2 gap-px bg-[#e1e9e4]">
      <div className="bg-white p-2"><ImagePreview key={asset.originalKey} imageKey={asset.originalKey} alt={`原图 ${index + 1}`}/><button disabled={busy} onClick={() => onSelect(asset.id, "original")} className={`mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-medium ${asset.selected === "original" ? "bg-[#12342a] text-white" : "bg-[#effaf4] text-[#0f5d48]"}`}>用于上架：原图</button></div>
      <div className="bg-white p-2">{asset.optimizedKey ? <><ImagePreview key={asset.optimizedKey} imageKey={asset.optimizedKey} alt={`优化图 ${index + 1}`}/><button disabled={busy} onClick={() => onSelect(asset.id, "optimized")} className={`mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-medium ${asset.selected === "optimized" ? "bg-[#12342a] text-white" : "bg-[#effaf4] text-[#0f5d48]"}`}>用于上架：优化图</button></> : <div className="grid aspect-square place-items-center rounded-lg bg-[#effaf4] p-3 text-center text-xs text-[#0f5d48]">{generating ? <div><LoaderCircle className="mx-auto mb-2 size-5 animate-spin"/>正在生成优化图…</div> : "优化图将在这里显示"}</div>}
        <button disabled={busy || generating || remaining > 0} onClick={() => void optimize()} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#effaf4] px-2 py-2 text-xs font-medium text-[#0f5d48] disabled:opacity-50">{generating ? <LoaderCircle className="size-4 animate-spin"/> : <Sparkles size={14}/>} {generating ? "生成中…" : remaining ? `${remaining} 秒后可重试` : feedback.state === "failed" ? "重试优化" : asset.optimizedKey ? "重新优化" : "AI 优化图片"}</button>
      </div>
    </div>
    {feedback.message && <div role={feedback.state === "failed" ? "alert" : "status"} aria-live="polite" className={`mx-3 mt-2 rounded-lg p-3 text-xs leading-5 ${feedback.state === "failed" ? "bg-red-50 text-red-700" : "bg-[#effaf4] text-[#195843]"}`}><p>{feedback.message}</p>{feedback.code === "quota_exhausted" && <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noreferrer" className="underline">检查 OpenAI API 账单</a>}{feedback.requestId && <p className="mt-1 break-all text-[10px]">请求编号：{feedback.requestId}</p>}{feedback.state === "failed" && <button onClick={() => setFeedback((value) => ({ ...value, message: "" }))} className="mt-1 underline">关闭提示</button>}</div>}
    <div className="flex items-center justify-between px-3 py-2"><span className="truncate text-xs text-[#5d6d65]">{asset.fileName}</span><button disabled={busy || generating} onClick={() => onRemove(asset.id)} className="text-xs text-red-700 disabled:opacity-50">移除</button></div>
  </div>;
}
