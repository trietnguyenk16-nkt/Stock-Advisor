import { invokeLLM } from "./_core/llm";
import { getTrackedAssets, createSyncRun, finishSyncRun, getEmailDelivery, insertAssetAnalysis, insertNewsItem, insertPriceSnapshot, recordEmailDelivery } from "./db";
import { fetchVietnamNews, fetchVietnamQuote } from "./vietnamProviders";
import { sendPushNotification } from "./push";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

async function createAnalysis(asset: { ticker: string; displayName: string; assetType: string }, quote: { price?: number; changePercent?: number }, news: { title: string; sourceName: string }[]) {
  if (quote.price === undefined) return null;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Bạn là trợ lý phân tích tài sản Việt Nam. Hãy thận trọng, không khẳng định chắc chắn, và chỉ dùng dữ liệu được cung cấp. Trả JSON đúng schema." },
      { role: "user", content: JSON.stringify({ asset, quote, news, instruction: "Chọn BUY, SELL hoặc HOLD. Phải nêu referencePrice và targetPrice là số cụ thể. Nếu thiếu cơ sở, chọn HOLD và nêu rõ rủi ro." }) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "scheduled_asset_analysis", strict: true, schema: { type: "object", properties: { signal: { type: "string", enum: ["BUY", "SELL", "HOLD"] }, summary: { type: "string" }, referencePrice: { type: "number" }, targetPrice: { type: "number" }, risk: { type: "string" }, confidence: { type: "number" } }, required: ["signal", "summary", "referencePrice", "targetPrice", "risk", "confidence"], additionalProperties: false } } },
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  return JSON.parse(content) as { signal: "BUY" | "SELL" | "HOLD"; summary: string; referencePrice: number; targetPrice: number; risk: string; confidence: number };
}

export async function sendDigest(runKey: string, lines: string[]) {
  const existingDelivery = await getEmailDelivery(runKey);
  if (existingDelivery?.status === "sent" || existingDelivery?.status === "skipped") return { status: "deduplicated" as const };
  const recipient = process.env.ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!recipient || !apiKey) {
    await recordEmailDelivery({ runKey, recipient: recipient ?? "not-configured", status: "skipped", errorMessage: "Missing ALERT_EMAIL or RESEND_API_KEY" });
    return { status: "skipped" as const, reason: "email-not-configured" };
  }
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from: process.env.ALERT_FROM_EMAIL ?? "Lumen <onboarding@resend.dev>", to: [recipient], subject: `Lumen market digest · ${new Date().toLocaleString("vi-VN")}`, html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h2>Lumen · Vietnam market digest</h2><p style="color:#667">Dữ liệu được cập nhật theo scheduled run <b>${escapeHtml(runKey)}</b>.</p>${lines.join("")}<hr/><p style="font-size:12px;color:#888">Phân tích AI chỉ mang tính tham khảo, không phải tư vấn tài chính được cấp phép.</p></div>` }) });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await recordEmailDelivery({ runKey, recipient, status: "failed", errorMessage: detail.slice(0, 1000) });
    throw new Error(`Resend failed: ${response.status}`);
  }
  const payload = await response.json() as { id?: string };
  await recordEmailDelivery({ runKey, recipient, status: "sent", providerMessageId: payload.id, sentAt: Date.now() });
  return { status: "sent" as const };
}

export async function syncMarket(runKey: string) {
  const startedAt = Date.now();
  const claimed = await createSyncRun(runKey, startedAt);
  if (!claimed?.claimed) return { skipped: true, status: claimed?.run?.status ?? "running", runKey };
  const assets = await getTrackedAssets("owner");
  let succeeded = 0;
  const digestLines: string[] = [];
  const errors: string[] = [];
  for (const asset of assets) {
    try {
      const quote = await fetchVietnamQuote(asset);
      await insertPriceSnapshot({ assetId: asset.id, runKey, price: quote.price?.toString(), bid: quote.bid?.toString(), ask: quote.ask?.toString(), changePercent: quote.changePercent?.toString(), asOf: quote.asOf, sourceName: quote.sourceName, sourceUrl: quote.sourceUrl, freshness: quote.freshness, warning: quote.warning });
      const news = await fetchVietnamNews(asset);
      for (const item of news) await insertNewsItem({ assetId: asset.id, fingerprint: item.fingerprint, title: item.title, sourceName: item.sourceName, sourceUrl: item.sourceUrl, snippet: item.snippet, publishedAt: item.publishedAt, fetchedAt: Date.now() });
      const analysis = await createAnalysis(asset, quote, news);
      if (analysis) await insertAssetAnalysis({ assetId: asset.id, runKey, signal: analysis.signal, summary: analysis.summary, referencePrice: analysis.referencePrice.toString(), targetPrice: analysis.targetPrice.toString(), risk: analysis.risk, confidence: analysis.confidence.toString(), asOf: Date.now() });
      digestLines.push(`<section style="border:1px solid #e5ece7;padding:14px;margin:12px 0;border-radius:10px"><b>${escapeHtml(asset.ticker)} · ${escapeHtml(asset.displayName)}</b><p>Giá/NAV: ${quote.price ?? "—"} · Biến động: ${quote.changePercent ?? "—"}% · ${escapeHtml(quote.sourceName)}</p>${analysis ? `<p><b>${analysis.signal}</b> · Giá tham chiếu ${analysis.referencePrice} · Mục tiêu ${analysis.targetPrice}<br/>${escapeHtml(analysis.summary)}<br/><small>Rủi ro: ${escapeHtml(analysis.risk)}</small></p>` : "<p>Chưa đủ dữ liệu để phân tích AI.</p>"}</section>`);
      succeeded += 1;
    } catch (error) {
      errors.push(`${asset.ticker}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try { await sendDigest(runKey, digestLines); } catch (error) { errors.push(`email: ${error instanceof Error ? error.message : String(error)}`); }
  const status = errors.length === 0 ? "success" : succeeded > 0 ? "partial" : "failed";
  await finishSyncRun(runKey, { status, finishedAt: Date.now(), assetsProcessed: assets.length, assetsSucceeded: succeeded, errorMessage: errors.length ? errors.join("\n").slice(0, 4000) : undefined });
  await sendPushNotification("Lumen · Cập nhật thị trường", `Đồng bộ ${status}: ${succeeded}/${assets.length} tài sản có dữ liệu.`, "/").catch(() => undefined);
  return { runKey, status, assetsProcessed: assets.length, assetsSucceeded: succeeded, errors };
}
