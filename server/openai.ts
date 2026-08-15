export const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
export type AiModel = (typeof AI_MODELS)[number];
export const DEFAULT_AI_MODEL: AiModel = "gpt-4o-mini";

export function isAiModel(value: string): value is AiModel {
  return (AI_MODELS as readonly string[]).includes(value);
}

export function getConfiguredAiModel(value?: string | null): AiModel {
  return value && isAiModel(value) ? value : DEFAULT_AI_MODEL;
}

type AnalysisResult = {
  signal: "BUY" | "SELL" | "HOLD";
  summary: string;
  referencePrice: number;
  targetPrice: number;
  risk: string;
  confidence: number;
};

export async function analyzeAssetWithOpenAI(
  model: AiModel,
  input: { asset: unknown; quote: unknown; news: unknown[] }
): Promise<AnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      ...(model === "gpt-5-mini" ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: "Bạn là trợ lý phân tích tài sản Việt Nam. Hãy thận trọng, không khẳng định chắc chắn, chỉ dùng dữ liệu được cung cấp và trả JSON đúng schema." },
        { role: "user", content: JSON.stringify({ ...input, instruction: "Chọn BUY, SELL hoặc HOLD. Phải nêu referencePrice và targetPrice là số cụ thể. Nếu thiếu cơ sở, chọn HOLD và nêu rõ rủi ro." }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scheduled_asset_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              signal: { type: "string", enum: ["BUY", "SELL", "HOLD"] },
              summary: { type: "string" },
              referencePrice: { type: "number" },
              targetPrice: { type: "number" },
              risk: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["signal", "summary", "referencePrice", "targetPrice", "risk", "confidence"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`OpenAI failed: ${response.status} ${body.slice(0, 500)}`);
  const payload = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as AnalysisResult;
}
