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

export const industryResearchApi = {
  analyze: (query: string) =>
    request<LiveIndustryResearch>("/industry-research/analyze", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};
