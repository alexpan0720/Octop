import { industries } from "./data";
import type {
  ApplicationCardData,
  ResearchContext,
  TelemetryEvent,
} from "./types";

const CONTEXT_KEY = "octop_demo_research_contexts";
const TELEMETRY_KEY = "octop_demo_telemetry";

function readArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveResearchContext(context: ResearchContext) {
  const contexts = readArray<ResearchContext>(CONTEXT_KEY).filter(
    (item) => item.id !== context.id,
  );
  localStorage.setItem(CONTEXT_KEY, JSON.stringify([...contexts, context]));
}

export function getResearchContext(id: string): ResearchContext | undefined {
  return readArray<ResearchContext>(CONTEXT_KEY).find((item) => item.id === id);
}

export function getEvents(): TelemetryEvent[] {
  return readArray<TelemetryEvent>(TELEMETRY_KEY);
}

export function trackEvent(
  eventName: string,
  payload: Omit<TelemetryEvent, "id" | "eventName" | "timestamp">,
) {
  const event: TelemetryEvent = {
    id: crypto.randomUUID(),
    eventName,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify([...getEvents(), event]));
  window.dispatchEvent(new CustomEvent("octop:demo-telemetry"));
}

export function detectIndustry(message: string) {
  if (
    message.includes("锂") ||
    message.includes("电池") ||
    message.includes("宁德时代")
  )
    return "lithium";
  if (message.includes("半导体") || message.includes("芯片"))
    return "semiconductor";
  return "robotics";
}

export function runDemoAgent(input: {
  tenantId: string;
  userId: string;
  message: string;
}): {
  answer: string;
  context: ResearchContext;
  applicationCard: ApplicationCardData;
} {
  const industry = industries[detectIndustry(input.message)];
  const context: ResearchContext = {
    id: `ctx_${industry.id}_${Date.now()}`,
    tenantId: input.tenantId,
    userId: input.userId,
    capabilityId: "industry_research",
    industryId: industry.id,
    industryName: industry.name,
    analysisType: "industry_overview",
    query: input.message,
    createdAt: new Date().toISOString(),
  };
  saveResearchContext(context);
  const answer = `${industry.name}产业当前${
    industry.description
  }\n\n从产业链看，上游重点包括${industry.chain.upstream.join(
    "、",
  )}；中游包括${industry.chain.midstream.join(
    "、",
  )}；下游需求主要来自${industry.chain.downstream.join(
    "、",
  )}。\n\n需要重点关注：\n${industry.risks
    .map((risk, index) => `${index + 1}. ${risk}；`)
    .join("\n")}`;
  return {
    answer,
    context,
    applicationCard: {
      applicationId: "industry_research",
      title: "产业智能研究",
      subtitle: `${industry.name}产业链智能研究`,
      industryName: industry.name,
      tags: [industry.name, "产业链", "风险"],
      metrics: [
        { label: "重点企业", value: industry.overview.companyCount },
        { label: "风险事项", value: industry.risks.length },
        { label: "政策", value: industry.overview.policyCount },
      ],
      contextId: context.id,
      actionText: "进入深度研究",
    },
  };
}
