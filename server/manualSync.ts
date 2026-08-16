function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function runManualSync(runKey: string) {
  const { getAiModel, getTrackedAssets, createSyncRun, finishSyncRun, getEmailDelivery, insertAssetAnalysis, insertNewsItem, insertPriceSnapshot, recordEmailDelivery } = await import("./db");
  const { fetchVietnamNews, fetchVietnamQuote } = await import("./vietnamProviders");
  const { sendPushNotification } = await import("./push");
  const { analyzeAssetWithOpenAI, getConfiguredAiModel } = await import("./openai");

  const startedAt = Date.now();
  const claimed = await createSyncRun(runKey, startedAt);
  if (!claimed?.claimed) return { skipped: true, status: claimed?.run?.status ?? "running", runKey };
  const assets = await getTrackedAssets("owner");
  const aiModel = getConfiguredAiModel(await getAiModel("owner"));
  let succeeded = 0;
  const digestLines: string[] = [];
  const errors: string[] = [];

  for (const asset of assets) {
    try {
      const quote = await fetchVietnamQuote(asset);
      await insertPriceSnapshot({ assetId: asset.id, runKey, price: quote.price?.toString(), bid: quote.bid?.toString(), ask: quote.ask?.toString(), changePercent: quote.changePercent?.toString(), asOf: quote.asOf, sourceName: quote.sourceName, sourceUrl: quote.sourceUrl, freshness: quote.freshness, warning: quote.warning });
      const news = await fetchVietnamNews(asset);
      for (const item of news) await insertNewsItem({ assetId: asset.id, fingerprint: item.fingerprint, title: item.title, sourceName: item.sourceName, sourceUrl: item.sourceUrl, snippet: item.snippet, publishedAt: item.publishedAt, fetchedAt: Date.now() });
      const analysis = quote.price === undefined ? null : await analyzeAssetWithOpenAI(aiModel, { asset, quote, news });
      if (analysis) await insertAssetAnalysis({ assetId: asset.id, runKey, signal: analysis.signal, summary: analysis.summary, referencePrice: analysis.referencePrice.toString(), targetPrice: analysis.targetPrice.toString(), risk: analysis.risk, confidence: analysis.confidence.toString(), asOf: Date.now() });
      digestLines.push(`<section><b>${escapeHtml(asset.ticker)} · ${escapeHtml(asset.displayName)}</b><p>Giá/NAV: ${quote.price ?? "—"} · Biến động: ${quote.changePercent ?? "—"}% · ${escapeHtml(quote.sourceName)}</p>${analysis ? `<p><b>${analysis.signal}</b> · Giá tham chiếu ${analysis.referencePrice} · Mục tiêu ${analysis.targetPrice}<br/>${escapeHtml(analysis.summary)}<br/><small>Rủi ro: ${escapeHtml(analysis.risk)}</small></p>` : "<p>Chưa đủ dữ liệu để phân tích AI.</p>"}</section>`);
      succeeded += 1;
    } catch (error) {
      errors.push(`${asset.ticker}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const existingDelivery = await getEmailDelivery(runKey);
    if (!existingDelivery || !["sent", "skipped"].includes(existingDelivery.status)) {
      const recipient = process.env.ALERT_EMAIL;
      const apiKey = process.env.RESEND_API_KEY;
      if (!recipient || !apiKey) await recordEmailDelivery({ runKey, recipient: recipient ?? "not-configured", status: "skipped", errorMessage: "Missing ALERT_EMAIL or RESEND_API_KEY" });
      else {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from: process.env.ALERT_FROM_EMAIL ?? "Lumen <onboarding@resend.dev>", to: [recipient], subject: `Lumen market digest · ${new Date().toLocaleString("vi-VN")}`, html: `<div>${digestLines.join("")}</div>` }) });
        if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
        const payload = await response.json() as { id?: string };
        await recordEmailDelivery({ runKey, recipient, status: "sent", providerMessageId: payload.id, sentAt: Date.now() });
      }
    }
  } catch (error) {
    errors.push(`email: ${error instanceof Error ? error.message : String(error)}`);
  }

  const status = errors.length === 0 ? "success" : succeeded > 0 ? "partial" : "failed";
  await finishSyncRun(runKey, { status, finishedAt: Date.now(), assetsProcessed: assets.length, assetsSucceeded: succeeded, errorMessage: errors.length ? errors.join("\n").slice(0, 4000) : undefined });
  await sendPushNotification("Lumen · Cập nhật thị trường", `Đồng bộ ${status}: ${succeeded}/${assets.length} tài sản có dữ liệu.`, "/").catch(() => undefined);
  return { runKey, status, assetsProcessed: assets.length, assetsSucceeded: succeeded, errors };
}

export default runManualSync;

