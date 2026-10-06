import {
  BriefingLlmPayloadSchema,
  COMMENTARY_TEAM_COPY,
  INSIGHT_TEAM_COPY,
} from "@analytics/shared";
import type { AnalyticsBrief } from "./analytics-brief";

export function mockBriefing(
  brief: AnalyticsBrief,
): ReturnType<typeof BriefingLlmPayloadSchema.parse> {
  const topModel = brief.products.models[0]?.label ?? "the lead model";
  const tailModel =
    brief.products.models[brief.products.models.length - 1]?.label;
  const topSource = brief.sources[0];
  const topCity = brief.audience.city?.[0]?.label;
  const topRegion = brief.audience.region?.[0]?.label;
  const ops = brief.ops;
  const sessions = brief.kpis.sessions.toLocaleString();
  const users = brief.kpis.users.toLocaleString();
  const sourceLine = topSource
    ? `${topSource.source ?? topSource.label} delivered ${topSource.value.toLocaleString()} sessions (${topSource.sharePct}% of sessions)`
    : "Source/medium is not breaking out in this extract";

  return BriefingLlmPayloadSchema.parse({
    commentary: {
      headline: `${brief.tenantName} recorded ${sessions} sessions (${ops.pagesPerSession} pages/session); configurator start rate ${pctLabel(ops.funnel.configuratorStartRate)} and test-drive lead rate ${ops.conversionRatePct}%. ${topModel} is ${pctLabel(ops.concentration.topModelShare)} of configurator mix.`,
      teams: [
        marketingCommentary(brief, ops, sessions, users, sourceLine, topSource, topCity, topRegion),
        salesCommentary(brief, ops, sessions, topModel),
        manufacturingCommentary(ops, topModel, tailModel, brief.products.models.length),
        inventoryCommentary(ops, topModel, tailModel, topCity, topRegion, brief),
      ],
    },
    insights: {
      headline: `Treat ${topModel} as the high-runner for mix, allocation, and sales coverage; instrument the conversion path (GA4 CR ${ops.conversionRatePct}%) and stop averaging the media mix past the lead source.`,
      teams: [
        marketingInsights(brief, ops, sourceLine, topSource, topCity),
        salesInsights(ops, topModel),
        manufacturingInsights(ops, topModel, tailModel),
        inventoryInsights(ops, topModel, tailModel, topCity, topRegion, brief.products.models.length),
      ],
    },
  });
}

function marketingCommentary(
  brief: AnalyticsBrief,
  ops: AnalyticsBrief["ops"],
  sessions: string,
  users: string,
  sourceLine: string,
  topSource: AnalyticsBrief["sources"][0] | undefined,
  topCity: string | undefined,
  topRegion: string | undefined,
) {
  return {
    id: "marketing" as const,
    title: COMMENTARY_TEAM_COPY.marketing.title,
    summary: `Acquisition is concentrated (top source ${pctLabel(ops.concentration.topSourceShare)}, top-3 ${pctLabel(ops.concentration.top3SourceShare)}). Device leader holds ${pctLabel(ops.concentration.topDeviceShareOfListed)} of the listed split.`,
    cards: [
      {
        id: "m1",
        category: "win" as const,
        title: "Session volume and depth",
        body: `${sessions} sessions from ${users} users (${ops.sessionsPerUser} sessions/user) ran ${brief.trend.days} days. Daily sessions averaged ${brief.trend.sessions.mean.toLocaleString()}, peaking at ${brief.trend.sessions.peak.value.toLocaleString()} on ${brief.trend.sessions.peak.date}. Pages/session is ${ops.pagesPerSession} and mean engagement time is ${brief.trend.avgSessionSeconds?.label ?? "n/a"}. First-to-last session change is ${brief.trend.sessions.changeFirstToLast.toLocaleString()} (${brief.trend.sessions.changePct ?? "n/a"}).`,
      },
      {
        id: "m2",
        category: topSource ? ("win" as const) : ("gap" as const),
        title: "Channel concentration",
        body: `${sourceLine}. Top-3 listed pairings hold ${pctLabel(ops.concentration.top3SourceShare)} of sessions, so media mix reporting that averages across channels will hide the lead pairing. Residual versus the ranked extract is ${pctLabel(Math.max(0, 1 - ops.concentration.top3SourceShare))} of sessions.`,
      },
      {
        id: "m3",
        category: "gap" as const,
        title: "Geo concentration",
        body: topCity
          ? `${topCity} is ${brief.audience.city?.[0]?.sharePct}% of listed city rows; ${topRegion ?? "the lead region"} is ${brief.audience.region?.[0]?.sharePct ?? "n/a"}% of listed regional rows. That is a concentrated catchment pattern, not a national even spread.`
          : "City-level traffic is not breaking out in this extract.",
      },
      {
        id: "m4",
        category: "win" as const,
        title: "New vs engaged users",
        body: `New-user share is ${ops.newUserSharePct}% of users and engaged-user share is ${ops.engagedUserSharePct}%. Chatbot opens are ${ops.funnel.chatbotOpens.toLocaleString()} (${pctLabel(ops.funnel.chatbotPerSession)} of sessions), an on-site engagement event rather than a media KPI.`,
      },
    ],
  };
}

function salesCommentary(
  brief: AnalyticsBrief,
  ops: AnalyticsBrief["ops"],
  sessions: string,
  topModel: string,
) {
  return {
    id: "sales" as const,
    title: COMMENTARY_TEAM_COPY.sales.title,
    summary: `Build-and-price consideration is ${pctLabel(ops.funnel.configuratorStartRate)} of sessions; test-drive lead rate is ${ops.conversionRatePct}%.`,
    cards: [
      {
        id: "s1",
        category: "win" as const,
        title: "Configurator start rate",
        body: `configurator_started fired ${ops.funnel.configuratorStarted.toLocaleString()} times against ${sessions} sessions (start rate ${pctLabel(ops.funnel.configuratorStartRate)}). configurator_loaded is ${ops.funnel.configuratorLoaded.toLocaleString()} (load rate ${pctLabel(ops.funnel.configuratorLoadRate)}; load-to-start ${roundRatio(ops.funnel.loadToStartRatio)}). That is MOFU digital-showroom volume, not close rate.`,
      },
      {
        id: "s2",
        category: ops.conversionRate === 0 ? ("gap" as const) : ("win" as const),
        title: "Test-drive lead rate",
        body: `book_test_drive_clicked fired ${brief.kpis.conversions.toLocaleString()} times (${ops.conversionRatePct}% of sessions; ${pctLabel(ops.funnel.conversionPerConfiguratorStart)} of configurator starts). That count is the conversion: a test-drive lead, not a purchase or generate_lead.`,
      },
      {
        id: "s3",
        category: "win" as const,
        title: `${topModel} consideration lead`,
        body: `${topModel} is ${pctLabel(ops.concentration.topModelShare)} of configurator mix; top-3 models are ${pctLabel(ops.concentration.top3ModelShare)}. Variant selections ${ops.funnel.variantSelected.toLocaleString()} (${ops.funnel.variantPerLoad} per load) and colour previews ${ops.funnel.colourPreviewed.toLocaleString()} (${ops.funnel.colourPerLoad} per load) show option-level intent behind the model rank.`,
      },
      {
        id: "s4",
        category: "win" as const,
        title: "Chatbot as MQL proxy volume",
        body: `ai_chatbot_open_clicked is ${ops.funnel.chatbotOpens.toLocaleString()} events (${pctLabel(ops.funnel.chatbotPerSession)} of sessions). That is an identifiable warm-intent stream alongside configurator starts.`,
      },
    ],
  };
}

function manufacturingCommentary(
  ops: AnalyticsBrief["ops"],
  topModel: string,
  tailModel: string | undefined,
  modelCount: number,
) {
  return {
    id: "manufacturing" as const,
    title: COMMENTARY_TEAM_COPY.manufacturing.title,
    summary: `Digital mix is concentrated on ${topModel} (${pctLabel(ops.concentration.topModelShare)}); option take-rate signals exist at trim and paint.`,
    cards: [
      {
        id: "f1",
        category: "win" as const,
        title: "High-runner model mix",
        body: `${topModel} leads configurator_loaded mix at ${pctLabel(ops.concentration.topModelShare)}. Top-3 share ${pctLabel(ops.concentration.top3ModelShare)} implies a peaked production-mix signal for MPS, not an even nameplate split.`,
      },
      {
        id: "f2",
        category: modelCount > 1 ? ("gap" as const) : ("win" as const),
        title: "Long-tail nameplates",
        body:
          tailModel && modelCount > 1
            ? `${tailModel} is the lowest listed configurator nameplate in this range. Relative opens are a demand-sensing input, not units scheduled.`
            : "Only one nameplate is listed in configurator mix.",
      },
      {
        id: "f3",
        category: "win" as const,
        title: "Trim take-rate signal",
        body: `variant_selected totals ${ops.funnel.variantSelected.toLocaleString()} (${ops.funnel.variantPerLoad} per configurator load). Grouped top-variant rows in products.breakdowns are the option-penetration ranking per model.`,
      },
      {
        id: "f4",
        category: "win" as const,
        title: "Paint take-rate signal",
        body: `colour preview events total ${ops.funnel.colourPreviewed.toLocaleString()} (${ops.funnel.colourPerLoad} per load). That is a paint-mix / changeover input, not a confirmed build colour.`,
      },
    ],
  };
}

function inventoryCommentary(
  ops: AnalyticsBrief["ops"],
  topModel: string,
  tailModel: string | undefined,
  topCity: string | undefined,
  topRegion: string | undefined,
  brief: AnalyticsBrief,
) {
  return {
    id: "inventory" as const,
    title: COMMENTARY_TEAM_COPY.inventory.title,
    summary: `Demand sensing ranks ${topModel} as the A-mover; ${topRegion ?? "listed regions"} leads catchment.`,
    cards: [
      {
        id: "i1",
        category: "win" as const,
        title: "A-mover demand sensing",
        body: `${topModel} at ${pctLabel(ops.concentration.topModelShare)} of configurator mix is the primary allocation candidate. This is digital demand sensing, not on-hand days of supply.`,
      },
      {
        id: "i2",
        category: "gap" as const,
        title: "Slow-mover tail",
        body:
          tailModel && brief.products.models.length > 1
            ? `${tailModel} sits at the bottom of opens. Treating it as a replenishment equal to ${topModel} would ignore the ABC split in the mix.`
            : "A long-tail nameplate is not listed in this extract.",
      },
      {
        id: "i3",
        category: "win" as const,
        title: "Trim and paint stocking mix",
        body: `Per-model top variant and colour rows are the default pipeline mix signal (${ops.funnel.variantSelected.toLocaleString()} trim events, ${ops.funnel.colourPreviewed.toLocaleString()} paint previews).`,
      },
      {
        id: "i4",
        category: topRegion ? ("win" as const) : ("gap" as const),
        title: "Regional allocation signal",
        body: topRegion
          ? `${topRegion} is ${brief.audience.region?.[0]?.sharePct}% of listed regional rows; ${topCity ?? "the lead city"} is ${brief.audience.city?.[0]?.sharePct ?? "n/a"}% of listed cities.`
          : "Regional demand is not breaking out in this extract.",
      },
    ],
  };
}

function marketingInsights(
  brief: AnalyticsBrief,
  ops: AnalyticsBrief["ops"],
  sourceLine: string,
  topSource: AnalyticsBrief["sources"][0] | undefined,
  topCity: string | undefined,
) {
  return {
    id: "marketing" as const,
    title: INSIGHT_TEAM_COPY.marketing.title,
    summary:
      "Protect the lead source/medium and treat geo as a control-vs-expansion problem.",
    cards: [
      {
        id: "mc1",
        category: "conclusion" as const,
        title: "Media mix is not even",
        body: `Top source share ${pctLabel(ops.concentration.topSourceShare)} means blended channel ROAS (not in this dataset) would be dominated by one pairing. ${sourceLine}.`,
      },
      {
        id: "ms1",
        category: "suggestion" as const,
        title: "Hold budget on the lead pairing",
        body: topSource
          ? `Keep ${topSource.source}/${topSource.medium} as the control cell. Run landing-page CRO on the top page titles in this extract before adding weaker source/medium pairs.`
          : "Finish UTM/source hygiene so paid vs organic can be compared next period.",
      },
      {
        id: "ms2",
        category: "suggestion" as const,
        title: "Geo test beyond the control market",
        body: topCity
          ? `Hold ${topCity} as control. Trial creative in the next two listed cities only after the lead pairing's session quality (pages/session ${ops.pagesPerSession}, engagement ${brief.trend.avgSessionSeconds?.label ?? "n/a"}) holds.`
          : "Restore city dimension coverage before a national media increase.",
      },
      {
        id: "ms3",
        category: "suggestion" as const,
        title: "Device-weighted landing experience",
        body: `Listed device concentration is ${pctLabel(ops.concentration.topDeviceShareOfListed)}. Weight QA and landing templates to that device before desktop-only creative.`,
      },
    ],
  };
}

function salesInsights(ops: AnalyticsBrief["ops"], topModel: string) {
  return {
    id: "sales" as const,
    title: INSIGHT_TEAM_COPY.sales.title,
    summary:
      "Score configurator and chatbot as early intent, and book_test_drive_clicked as the booked test-drive lead.",
    cards: [
      {
        id: "sc1",
        category: "conclusion" as const,
        title: "Consideration is not close rate",
        body: `Start rate ${pctLabel(ops.funnel.configuratorStartRate)} vs conversion rate ${ops.conversionRatePct}% is a MOFU-to-BOFU break. ${topModel} concentration ${pctLabel(ops.concentration.topModelShare)} says coverage should follow that nameplate.`,
      },
      {
        id: "ss1",
        category: "suggestion" as const,
        title:
          ops.conversionRate === 0
            ? "No test-drive leads recorded"
            : "Tighten start-to-booking path",
        body:
          ops.conversionRate === 0
            ? "No book_test_drive_clicked events were recorded, so configurator starts did not become test-drive leads. Follow up the consideration volume; do not treat the zero as a missing purchase event."
            : `Assign drop-off owners between configurator_started (${ops.funnel.configuratorStarted.toLocaleString()}) and book_test_drive_clicked (${ops.funnel.conversions.toLocaleString()} test-drive leads).`,
      },
      {
        id: "ss2",
        category: "suggestion" as const,
        title: "Route chatbot opens as warm leads",
        body: `Push ${ops.funnel.chatbotOpens.toLocaleString()} chatbot opens into a follow-up queue with an SLA, scored above anonymous sessions and below a completed enquiry.`,
      },
      {
        id: "ss3",
        category: "suggestion" as const,
        title: "Align demo coverage to mix",
        body: `Prioritise demo/test-drive availability and scripts for ${topModel} (and its top trim/paint in breakdowns) rather than equalising across the long tail.`,
      },
    ],
  };
}

function manufacturingInsights(
  ops: AnalyticsBrief["ops"],
  topModel: string,
  tailModel: string | undefined,
) {
  return {
    id: "manufacturing" as const,
    title: INSIGHT_TEAM_COPY.manufacturing.title,
    summary: "Use configurator mix as an MPS demand-sensing input, not a firm order.",
    cards: [
      {
        id: "fc1",
        category: "conclusion" as const,
        title: "Peaked mix for MPS",
        body: `Top-3 mix ${pctLabel(ops.concentration.top3ModelShare)} with ${topModel} at ${pctLabel(ops.concentration.topModelShare)} is a high-runner plus long-tail shape. Planning an even nameplate split would fight the take-rate signal.`,
      },
      {
        id: "fs1",
        category: "suggestion" as const,
        title: "Set high-runner in the freeze horizon",
        body: `Feed ${topModel} as the high-runner into the next freeze horizon. Keep low-open nameplates ${tailModel ?? "(none listed)"} configure-to-order rather than a volume slot.`,
      },
      {
        id: "fs2",
        category: "suggestion" as const,
        title: "Lock common paint/trim",
        body: "Treat the #1 variant_selected and colour_change_clicked per model as the common option set to reduce paint changeovers and BOM proliferation. Confirm against products.breakdowns rows, not national catalogue defaults.",
      },
      {
        id: "fs3",
        category: "conclusion" as const,
        title: "Intent is not schedule",
        body: `Opens and take-rates are demand-sensing. Do not translate ${ops.funnel.configuratorLoaded.toLocaleString()} loads into units without a booking conversion.`,
      },
    ],
  };
}

function inventoryInsights(
  ops: AnalyticsBrief["ops"],
  topModel: string,
  tailModel: string | undefined,
  topCity: string | undefined,
  topRegion: string | undefined,
  modelCount: number,
) {
  return {
    id: "inventory" as const,
    title: INSIGHT_TEAM_COPY.inventory.title,
    summary: "Allocate to A-movers and the lead region; light-stock the tail.",
    cards: [
      {
        id: "ic1",
        category: "conclusion" as const,
        title: "ABC split from digital intent",
        body: `${topModel} is the A-mover at ${pctLabel(ops.concentration.topModelShare)}. Equal replenishment across nameplates would overstock the tail (${tailModel ?? "n/a"}).`,
      },
      {
        id: "is1",
        category: "suggestion" as const,
        title: "Default pipeline to #1 trim/paint",
        body: "Set dealer allocation defaults to each model's top variant and colour from this range. That is the stocking mix implied by take-rate, not the full option list.",
      },
      {
        id: "is2",
        category: "suggestion" as const,
        title: "Regional replenishment first",
        body: topRegion
          ? `Prioritise replenishment and transshipment into ${topRegion} / ${topCity ?? "its lead city"} before spreading scarce trims nationally.`
          : "Wait for regional split before a national push of scarce trims.",
      },
      {
        id: "is3",
        category: "suggestion" as const,
        title: "Do not replenish C-movers evenly",
        body:
          tailModel && modelCount > 1
            ? `Hold ${tailModel} at display-stock / transshipment only until configurator opens recover. Do not use the ${topModel} rate as its reorder point.`
            : "Confirm other nameplates are tagged before setting C-mover policy.",
      },
    ],
  };
}

function pctLabel(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}

function roundRatio(value: number): string {
  return String(Math.round(value * 100) / 100);
}
