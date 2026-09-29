export type CapabilityStatus = "enabled" | "coming_soon";

export interface DemoCapability {
  id: string;
  name: string;
  description: string;
  status: CapabilityStatus;
}

export interface DemoTenant {
  id: string;
  name: string;
  shortName: string;
  defaultUser: { id: string; name: string; role: string };
  enabledCapabilities: string[];
  plannedCapabilities: string[];
}

export interface CompanySummary {
  id: string;
  name: string;
  stage: string;
  field: string;
  competitiveness: string;
  prosperity: string;
  risk: string;
  products: string;
  revenue: number[];
  grossMargin: string;
  researchRatio: string;
  riskIndex: number;
}

export interface IndustryData {
  id: string;
  name: string;
  description: string;
  overview: {
    marketSize: string;
    prosperityIndex: number;
    companyCount: number;
    policyCount: number;
  };
  trend: Array<{ month: string; value: number }>;
  chain: Record<"upstream" | "midstream" | "downstream", string[]>;
  companies: CompanySummary[];
  risks: string[];
  policies: Array<{
    id: string;
    title: string;
    level: string;
    date: string;
    tags: string[];
    summary: string;
  }>;
}

export interface ResearchContext {
  id: string;
  tenantId: string;
  userId: string;
  capabilityId: "industry_research";
  industryId: string;
  industryName: string;
  analysisType: string;
  query: string;
  createdAt: string;
  liveResult?: import("../api/modules/industryResearch").LiveIndustryResearch;
}

export interface ApplicationCardData {
  applicationId: string;
  title: string;
  subtitle: string;
  industryName: string;
  tags: string[];
  metrics: Array<{ label: string; value: string | number }>;
  contextId: string;
  actionText: string;
  live?: boolean;
  model?: string;
  sources?: Array<{
    index: number;
    title: string;
    url: string;
    site: string;
    date: string;
  }>;
}

export interface TelemetryEvent {
  id: string;
  eventName: string;
  tenantId: string;
  userId: string;
  capabilityId?: string;
  industryId?: string;
  companyId?: string;
  contextId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
