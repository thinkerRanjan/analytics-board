import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  BriefingReport,
  CommentaryReport,
  InsightReport,
  TenantConfig,
} from "@analytics/shared";
import {
  BriefingLlmPayloadSchema,
  BriefingReportSchema,
  collectDashboardDataNeeds,
} from "@analytics/shared";
import { useMockData } from "./bigquery";
import { buildAnalyticsBrief, type AnalyticsBrief } from "./analytics-brief";
import { mockBriefing } from "./mock-briefing";

const CACHE_VERSION = "v4";
const inflight = new Map<string, Promise<BriefingReport>>();

export async function fetchCommentary(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<CommentaryReport> {
  const briefing = await fetchBriefing(tenant, start, end);
  return sliceReport(briefing, "commentary");
}

export async function fetchInsights(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<InsightReport> {
  const briefing = await fetchBriefing(tenant, start, end);
  return sliceReport(briefing, "insights");
}

async function fetchBriefing(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<BriefingReport> {
  const key = cacheKey(tenant, start, end);
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const cached = await readCache(key);
    if (cached) return { ...cached, cached: true };

    if (!useMockData()) {
      const geminiKey =
        process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!geminiKey && !openaiKey) {
        throw new Error(
          "Commentary AI is not configured. Add GEMINI_API_KEY (Google AI Studio) or OPENAI_API_KEY to apps/web/.env.local and restart the dev server.",
        );
      }
    }

    const brief = await buildAnalyticsBrief(tenant, start, end);
    const payload = useMockData()
      ? mockBriefing(brief)
      : await generateBriefing(brief);

    const report = BriefingReportSchema.parse({
      ...payload,
      generatedAt: new Date().toISOString(),
      range: { start, end },
      cached: false,
      mock: brief.mock,
    });

    await writeCache(key, report);
    return report;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

function sliceReport(
  briefing: BriefingReport,
  part: "commentary",
): CommentaryReport;
function sliceReport(briefing: BriefingReport, part: "insights"): InsightReport;
function sliceReport(
  briefing: BriefingReport,
  part: "commentary" | "insights",
): CommentaryReport | InsightReport {
  return {
    ...briefing[part],
    generatedAt: briefing.generatedAt,
    range: briefing.range,
    cached: briefing.cached,
    mock: briefing.mock,
  };
}

function cacheKey(tenant: TenantConfig, start: string, end: string): string {
  const needs = collectDashboardDataNeeds(tenant);
  const fingerprint = JSON.stringify({
    events: needs.eventNames,
    dimensions: needs.dimensions,
    specs: needs.eventSpecs,
    engagement: needs.needsEngagement,
    product: needs.productIndex
      ? [needs.productIndex.sourceEvent, needs.productIndex.sourceParam]
      : [],
  });
  return createHash("sha256")
    .update(`${CACHE_VERSION}:${tenant.id}:${start}:${end}:${fingerprint}`)
    .digest("hex");
}

function cacheDir(): string {
  return (
    process.env.COMMENTARY_CACHE_DIR ??
    join(tmpdir(), "analytics-board-commentary")
  );
}

async function readCache(key: string): Promise<BriefingReport | null> {
  try {
    const raw = await readFile(join(cacheDir(), `${key}.json`), "utf8");
    return BriefingReportSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeCache(key: string, report: BriefingReport): Promise<void> {
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${key}.json`),
    JSON.stringify({ ...report, cached: false }, null, 2),
    "utf8",
  );
}

async function generateBriefing(
  brief: AnalyticsBrief,
): Promise<ReturnType<typeof BriefingLlmPayloadSchema.parse>> {
  const geminiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    return generateWithOpenAI(brief, openaiKey);
  }
  if (geminiKey) {
    return generateWithGemini(brief, geminiKey);
  }

  throw new Error(
    "Commentary AI is not configured. Add GEMINI_API_KEY (Google AI Studio) or OPENAI_API_KEY to apps/web/.env.local and restart the dev server.",
  );
}

function buildPrompt(brief: AnalyticsBrief): string {
  return `You are a senior automotive retail analyst writing two operator briefings for ${brief.tenantName}: (1) observational commentary and (2) inferences & suggestions.

Audience: marketing managers, sales managers, manufacturing/production planners, and inventory/parts-and-vehicle allocation teams. They will act on this. Be specific, quantitative, and technical. Do not write generic advice.

Date range: ${brief.range.start} to ${brief.range.end}.
Use ONLY the metrics JSON. Do not invent numbers, models, trims, colours, cities, sources, spend, on-hand stock, plant capacity, or conversion events that are not present. Cite named SKUs, source/medium pairs, cities/regions, devices, and the precomputed ops.* rates. If a figure is missing, say the signal is not in this extract.

Metrics JSON:
${JSON.stringify(brief)}

Return JSON with this exact shape:
{
  "commentary": {
    "headline": "2 clauses naming the standout volume, mix, and conversion facts",
    "teams": [
      {
        "id": "marketing",
        "title": "Marketing",
        "summary": "2 sentences of observed acquisition and engagement facts",
        "cards": [
          { "id": "m1", "category": "win"|"gap", "title": "short heading", "body": "4–7 sentences of observed facts with figures" }
        ]
      },
      { "id": "sales", "title": "Sales", "summary": "...", "cards": [...] },
      { "id": "manufacturing", "title": "Manufacturing", "summary": "...", "cards": [...] },
      { "id": "inventory", "title": "Inventory", "summary": "...", "cards": [...] }
    ]
  },
  "insights": {
    "headline": "2 clauses on what the period implies for demand, conversion, mix, and allocation",
    "teams": [
      {
        "id": "marketing",
        "title": "Marketing",
        "summary": "...",
        "cards": [
          { "id": "m1", "category": "conclusion"|"suggestion", "title": "short heading", "body": "4–7 sentences of inference or a concrete play" }
        ]
      },
      { "id": "sales", "title": "Sales", "summary": "...", "cards": [...] },
      { "id": "manufacturing", "title": "Manufacturing", "summary": "...", "cards": [...] },
      { "id": "inventory", "title": "Inventory", "summary": "...", "cards": [...] }
    ]
  }
}

COMMENTARY (observations only — no recommendations, no should/consider/test/shift budget):
- category "win" = going well as a fact; "gap" = a shortcoming as a fact.
- Each card: 4–7 sentences, at least two concrete figures, named entities.
- Marketing: acquisition mix (source/medium, paid vs organic vs referral vs unassigned), channel concentration (top source share, top-3 share), landing-page mix, device split, new vs returning, session depth (pages/session, avg engagement time), geo concentration, chatbot as an on-site engagement event. Use terms: media mix, channel mix, SOV of listed channels, session quality, engaged users, bounce is NOT in the data so do not mention bounce.
- Sales: digital showroom / build-and-price funnel (sessions → configurator_started → configurator_loaded → variant_selected / colour preview → book_test_drive_clicked). conversions and conversion rate ARE test drive leads (that event only), not purchases, generate_lead, or dealer invoices. Compare conversion rate with configurator start rate, name drop-off between funnel steps, and model-level consideration. Use terms: TOFU/MOFU consideration, lead leakage, test-drive lead rate. If conversions are 0, say no test-drive clicks were recorded in the period.
- Manufacturing: model mix as a production-mix / MPS demand signal, variant as option/trim take-rate, colour as paint take-rate, SKU proliferation vs commonality, run-rate implied by relative opens (not units built). Use terms: take-rate, mix vs volume, option penetration, commonality, changeover implication, build-to-order vs build-to-stock signal. Never state plant output.
- Inventory: SKU-level demand sensing from configurator mix, ABC-style ranking of models (A-mover vs long-tail), colour/trim as stocking mix, regional allocation signal from audience.region/city. Use terms: demand sensing, allocation, replenishment priority, slow-mover risk, safety-stock candidate, display-stock vs pipeline. Never state days of supply or on-hand qty.

INSIGHTS (all conclusions and actions — never put these in commentary):
- category "conclusion" = what the pattern means for that function; "suggestion" = a concrete next step with an owner-style action (campaign, CRM, MPS, allocation).
- Each team: mix of conclusions and suggestions (at least 2 of each when data supports it).
- Marketing suggestions: media mix reallocation among named source/medium pairs, geo expansion vs control market, landing-page/CRO on named pages, device experience, UTM hygiene if unassigned traffic is large, creative tests tied to the lead model. Do not invent CAC, ROAS, or spend.
- Sales suggestions: lead scoring using configurator + chatbot as MQL proxies and book_test_drive_clicked as the booked lead, follow-up SLA on those test-drive leads, demo-car alignment to the lead model, script and offer for the lead trim/colour. If conversions are 0, the gap is no test-drive bookings in the period, not a missing GA4 conversion event.
- Manufacturing suggestions: freeze-horizon mix input, which model/trim/paint to treat as the high-runner, which low take-rate options to keep configure-to-order, colour commonality to reduce paint changeovers. Frame as planning input from digital intent, not a shop-floor order.
- Inventory suggestions: allocate A-movers (named models) first, light-stock C-movers, regional replenishment toward the lead state/city, default dealer pipeline to #1 trim and paint per model, flag slow-movers for transshipment not replenishment.

Shared rules:
- Include all four teams in both commentary and insights.
- Each team gets 5–6 cards (minimum 4).
- Card titles under 8 words; prefer domain terms (e.g. "Configurator start rate", "Paint take-rate", "Channel concentration") over slogans.
- Prefer ops.funnel and ops.concentration over restating a single raw count.
- If conversions are 0, that means no book_test_drive_clicked events in the period. Treat it as a funnel fact, not as "sales are fine" and not as a missing purchase or generate_lead event.`;
}

async function generateWithGemini(
  brief: AnalyticsBrief,
  apiKey: string,
): Promise<ReturnType<typeof BriefingLlmPayloadSchema.parse>> {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(brief) }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
    90_000,
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 280)}`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("") ?? "";
  return parseLlmJson(text);
}

async function generateWithOpenAI(
  brief: AnalyticsBrief,
  apiKey: string,
): Promise<ReturnType<typeof BriefingLlmPayloadSchema.parse>> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 12000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write two JSON briefings from automotive digital analytics: (1) deep observational commentary with no recommendations, (2) technical inferences and suggestions for marketing, sales, manufacturing, and inventory. Use domain terms. Reply with JSON only.",
          },
          { role: "user", content: buildPrompt(brief) },
        ],
      }),
    },
    120_000,
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 280)}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseLlmJson(json.choices?.[0]?.message?.content ?? "");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseLlmJson(
  text: string,
): ReturnType<typeof BriefingLlmPayloadSchema.parse> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Commentary model did not return JSON.");
  }
  return BriefingLlmPayloadSchema.parse(JSON.parse(raw.slice(start, end + 1)));
}
