import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports, require: (name) => dependencies[name] || {}, fetch: globalThis.fetch, Error, TypeError, AbortSignal, Response, Request, Blob, FormData, Uint8Array, atob, crypto: globalThis.crypto, console: { error() {} }, ...globals };
  vm.runInNewContext(source, context);
  return { exports, context };
}
const errors = load("lib/image-errors.ts").exports;
assert.equal(errors.classifyImageError(429, "insufficient_quota").code, "quota_exhausted");
assert.equal(errors.classifyImageError(429, "rate_limit_exceeded").code, "rate_limited");
assert.equal(errors.classifyImageError(400, "content_policy_violation").code, "content_rejected");
assert.equal(errors.classifyImageError(401).code, "invalid_credentials");
assert.equal(errors.classifyImageError(403).code, "model_access_denied");
assert.equal(errors.retryDelay("12"), 12);
assert.equal(errors.retryDelay(new Date(30000).toUTCString(), 10000), 20);
assert.equal(errors.retryDelay(null), 60);

const imageConfig = load("lib/image-config.ts").exports;
assert.equal(imageConfig.listingImageModel, "gpt-image-2.5-sunburst");
const writes = [];
const env = { OPENAI_API_KEY: "test-placeholder", BUCKET: { get: async () => ({ arrayBuffer: async () => new ArrayBuffer(1), httpMetadata: { contentType: "image/png" } }), put: async (...args) => { writes.push(args); } } };
const route = load("app/api/listings/optimize-image/route.ts", { "cloudflare:workers": { env }, "@/lib/image-errors": errors, "@/lib/image-config": imageConfig });
const req = () => new Request("https://example.test/api/listings/optimize-image", { method: "POST", body: JSON.stringify({ originalKey: "listing-media-123.png" }) });
route.context.fetch = async () => Response.json({ error: { code: "insufficient_quota" } }, { status: 429 });
let result = await route.exports.POST(req());
let payload = await result.json();
assert.equal(payload.code, "quota_exhausted");
assert.equal(payload.retryAfterSeconds, undefined);
assert.ok(payload.requestId);
route.context.fetch = async () => Response.json({ error: { code: "rate_limit_exceeded" } }, { status: 429, headers: { "retry-after": "9" } });
result = await route.exports.POST(req());
payload = await result.json();
assert.equal(payload.retryAfterSeconds, 9);
assert.equal(result.headers.get("retry-after"), "9");
for (const [status, code, expected] of [[403, "model_not_found", "model_access_denied"], [401, "invalid_api_key", "invalid_credentials"], [400, "content_policy_violation", "content_rejected"]]) {
  let calls = 0;
  route.context.fetch = async () => { calls++; return Response.json({ error: { code } }, { status }); };
  result = await route.exports.POST(req());
  assert.equal((await result.json()).code, expected);
  assert.equal(calls, 1, "Errors must not trigger model fallback or automatic retries");
}
route.context.fetch = async () => { const error = new Error(); error.name = "TimeoutError"; throw error; };
result = await route.exports.POST(req());
assert.equal(result.status, 504);
assert.equal((await result.json()).code, "timeout");
assert.equal(writes.length, 0, "Failed optimizations must not overwrite any image");
route.context.fetch = async (url, options) => {
  assert.equal(url, "https://api.openai.com/v1/images/edits");
  const form = options.body;
  assert.equal(form.get("model"), "gpt-image-2.5-sunburst");
  assert.equal(form.get("quality"), "high");
  assert.equal(form.get("n"), "1");
  assert.equal(form.get("size"), "1024x1024");
  assert.equal(form.get("output_format"), "png");
  assert.equal(form.get("image").name, "source-image.png");
  assert.equal(form.get("image").type, "image/png");
  assert.match(form.get("prompt"), /保持产品主体、颜色、结构/);
  return Response.json({ data: [{ b64_json: "YQ==" }] });
};
result = await route.exports.POST(req());
payload = await result.json();
assert.match(payload.optimizedKey, /^listing-media-.*\.png$/);
assert.notEqual(payload.optimizedKey, "listing-media-123.png");
assert.equal(writes.length, 1);
assert.equal(writes[0][0], payload.optimizedKey);
assert.equal(writes[0][2].httpMetadata.contentType, "image/png");

// The persisted draft contract stays unchanged when the generating model changes.
const drafts = load("lib/listing-drafts.ts").exports;
const originalAsset = { id: "slot-1", originalKey: "listing-media-123.png", optimizedKey: payload.optimizedKey, selected: "original", fileName: "product.png", contentType: "image/png" };
for (const selected of ["original", "optimized"]) {
  const values = drafts.draftValues({ sourceUrl: "https://www.amazon.com/dp/B0FR4NZN55", imageAssets: [{ ...originalAsset, selected }] });
  const restored = drafts.parseDraft(values);
  assert.equal(restored.imageAssets[0].selected, selected);
  assert.equal(restored.imageAssets[0].originalKey, originalAsset.originalKey);
  assert.equal(restored.imageAssets[0].optimizedKey, payload.optimizedKey);
  assert.equal(restored.images[0], `/api/listings/media/${selected === "optimized" ? payload.optimizedKey : originalAsset.originalKey}`);
}

const client = load("components/listing-image-card.tsx", { "@/lib/image-config": imageConfig });
client.context.fetch = async () => new Response("<html>proxy failed</html>", { status: 502 });
await assert.rejects(client.exports.requestImageOptimization("key", ""), (e) => e.code === "invalid_response");
client.context.fetch = async () => { throw new TypeError("Failed to fetch"); };
await assert.rejects(client.exports.requestImageOptimization("key", ""), (e) => e.code === "network_error");
client.context.fetch = async () => { const error = new Error(); error.name = "TimeoutError"; throw error; };
await assert.rejects(client.exports.requestImageOptimization("key", ""), (e) => e.code === "timeout");
client.context.fetch = async () => Response.json({ code: "rate_limited", message: "wait", retryAfterSeconds: 9, requestId: "test" }, { status: 429 });
await assert.rejects(client.exports.requestImageOptimization("key", ""), (e) => e.code === "rate_limited" && e.retryAfterSeconds === 9);
client.context.fetch = async () => Response.json({ optimizedKey: "listing-media-123.png" });
assert.equal((await client.exports.requestImageOptimization("key", "")).optimizedKey, "listing-media-123.png");
console.log("Image feedback checks passed: error classification, retry headers, success persistence, invalid responses, network failures and timeouts.");
