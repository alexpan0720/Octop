import { request } from "../request";

export interface IndustryResearchSource {
  index: number;
  title: string;
  url: string;
  site: string;
  date: string;
}

export interface LiveIndustryResearch {
  industry_name: string;
  executive_summary: string;
  key_findings: string[];
  recommended_actions: string[];
  chain: Record<"upstream" | "midstream" | "downstream", string[]>;
  key_companies: Array<{
    name: string;
    stage: string;
    position: string;
    evidence: string;
  }>;
  risks: string[];
  opportunities: string[];
  data_as_of: string;
  query: string;
  model: string;
  generated_at: string;
  research_focus: IndustryResearchFocus;
  focus_title: string;
  sources: IndustryResearchSource[];
}

export type IndustryResearchFocus = "chain" | "companies" | "risks" | "policy";

function readableIndustryResearchError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error("产业研究请求失败");
  const envelopeStart = error.message.indexOf(" - {");
  if (envelopeStart < 0) return error;
  try {
    const envelope = JSON.parse(error.message.slice(envelopeStart + 3)) as {
      error?: { message?: string };
    };
    if (envelope.error?.message) return new Error(envelope.error.message);
  } catch {
    // Keep the original transport error when the response is not an API envelope.
  }
  return error;
}

export const industryResearchApi = {
  analyze: async (query: string) => {
    try {
      return await request<LiveIndustryResearch>("/industry-research/analyze", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
    } catch (error) {
      throw readableIndustryResearchError(error);
    }
  },
};
