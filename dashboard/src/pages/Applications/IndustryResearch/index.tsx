import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Empty, Tag } from "antd";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Network,
  ShieldAlert,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  IndustryResearchFocus,
  LiveIndustryResearch,
} from "../../../api/modules/industryResearch";
import { useServerTimezone } from "../../../hooks/useServerTimezone";
import { formatServerIsoDateTime } from "../../../utils/formatMessageTime";
import { useDemoTenant } from "../../../demo/DemoTenantContext";
import { getResearchContext, trackEvent } from "../../../demo/storage";
import styles from "./index.module.less";

interface FocusConfig {
  key: IndustryResearchFocus;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}

const FOCUS_ITEMS: FocusConfig[] = [
  {
    key: "chain",
    title: "产业链全景",
    description: "梳理关键环节、核心玩家与价值分布",
    icon: Network,
    tone: "rose",
  },
  {
    key: "companies",
    title: "重点企业竞争",
    description: "对比技术路线、量产进展与竞争位置",
    icon: Building2,
    tone: "amber",
  },
  {
    key: "risks",
    title: "风险冲击推演",
    description: "识别供应链、技术与市场传导风险",
    icon: ShieldAlert,
    tone: "violet",
  },
  {
    key: "policy",
    title: "政策与区域机会",
    description: "研判支持方向、产业集群与项目机会",
    icon: Landmark,
    tone: "green",
  },
];

const CHAIN_GROUPS = [
  { key: "upstream" as const, title: "上游 · 核心零部件", tone: "rose" },
  { key: "midstream" as const, title: "中游 · 整机与系统", tone: "amber" },
  { key: "downstream" as const, title: "下游 · 应用场景", tone: "green" },
];

function plainSummary(markdown: string): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^[-*>]\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  const firstSentences = plain
    .split(/(?<=[。！？])/)
    .filter(Boolean)
    .slice(0, 3)
    .join("");
  const concise = firstSentences || plain;
  return concise.length > 200 ? `${concise.slice(0, 200)}…` : concise;
}

function focusFromResult(result: LiveIndustryResearch): IndustryResearchFocus {
  return FOCUS_ITEMS.some((item) => item.key === result.research_focus)
    ? result.research_focus
    : "chain";
}

function ChainPanel({ result }: { result: LiveIndustryResearch }) {
  return (
    <div className={styles.chainGrid}>
      {CHAIN_GROUPS.map((group, groupIndex) => (
        <div className={styles.chainColumn} key={group.key}>
          <div className={`${styles.chainHeading} ${styles[group.tone]}`}>
            <span>{group.title}</span>
            <small>{result.chain[group.key]?.length ?? 0} 个关键环节</small>
          </div>
          <div className={styles.chainItems}>
            {(result.chain[group.key] ?? []).map((item) => (
              <div className={styles.chainItem} key={item}>
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          {groupIndex < CHAIN_GROUPS.length - 1 && (
            <ArrowRight
              className={styles.chainArrow}
              size={20}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CompanyPanel({ result }: { result: LiveIndustryResearch }) {
  return (
    <div className={styles.companyTable} role="table" aria-label="重点企业观察">
      <div className={styles.companyHeader} role="row">
        <span>企业</span>
        <span>所在环节</span>
        <span>竞争位置</span>
        <span>公开证据摘要</span>
      </div>
      {result.key_companies.map((company, index) => (
        <div
          className={styles.companyRow}
          role="row"
          key={`${company.name}-${index}`}
        >
          <strong>{company.name}</strong>
          <span>{company.stage}</span>
          <span>{company.position}</span>
          <span>{company.evidence}</span>
        </div>
      ))}
    </div>
  );
}

function ListPanel({
  items,
  kind,
}: {
  items: string[];
  kind: "risk" | "opportunity";
}) {
  return (
    <div className={styles.decisionList}>
      {items.map((item, index) => (
        <div className={styles.decisionItem} key={`${kind}-${index}`}>
          <span className={`${styles.decisionIndex} ${styles[kind]}`}>
            {index + 1}
          </span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  );
}

function ResearchDetail({
  focus,
  result,
}: {
  focus: IndustryResearchFocus;
  result: LiveIndustryResearch;
}) {
  if (focus === "companies") return <CompanyPanel result={result} />;
  if (focus === "risks") return <ListPanel items={result.risks} kind="risk" />;
  if (focus === "policy")
    return <ListPanel items={result.opportunities} kind="opportunity" />;
  return <ChainPanel result={result} />;
}

export default function IndustryResearchPage() {
  const { contextId = "" } = useParams();
  const navigate = useNavigate();
  const { tenant } = useDemoTenant();
  const timeZone = useServerTimezone();
  const context = getResearchContext(contextId);
  const result = context?.liveResult;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [activeFocus, setActiveFocus] = useState<IndustryResearchFocus>(() =>
    result ? focusFromResult(result) : "chain",
  );

  useEffect(() => {
    if (result) setActiveFocus(focusFromResult(result));
  }, [result]);

  useEffect(() => {
    trackEvent("workspace_open", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      contextId,
    });
  }, [contextId, tenant]);

  const findings = useMemo(() => {
    if (!result) return [];
    if (result.key_findings?.length) return result.key_findings.slice(0, 3);
    return [...result.opportunities, ...result.risks].slice(0, 3);
  }, [result]);

  const actions = useMemo(() => {
    if (!result) return [];
    if (result.recommended_actions?.length)
      return result.recommended_actions.slice(0, 2);
    return result.opportunities.slice(0, 2);
  }, [result]);

  const activeConfig =
    FOCUS_ITEMS.find((item) => item.key === activeFocus) ?? FOCUS_ITEMS[0];

  if (!context || !result) {
    return (
      <div className={styles.emptyPage}>
        <Empty description="没有找到可展示的实时产业研究结果" />
        <Button type="primary" onClick={() => navigate("/chat/main")}>
          返回对话发起研究
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Button
            type="text"
            className={styles.backButton}
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate("/chat/main")}
            aria-label="返回对话"
          />
          <div>
            <h1>集团产业智能研究</h1>
            <p>基于公开数据的产业研究与决策支持</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.metaItem}>
            <CalendarDays size={16} aria-hidden="true" />
            {result.data_as_of || "实时更新"}
          </span>
          <span className={styles.liveStatus}>
            <i /> 数据最新
          </span>
          <Button
            icon={<FileText size={16} />}
            onClick={() => setSourcesOpen(true)}
          >
            {result.sources.length} 个证据来源
          </Button>
          <Button type="primary" onClick={() => navigate("/chat/main")}>
            在对话中继续
          </Button>
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.researchHeading}>
          <div>
            <div className={styles.eyebrow}>当前研究专题</div>
            <h2>{result.industry_name}</h2>
            <p>
              <strong>研究问题：</strong>
              {result.query}
            </p>
          </div>
          <Tag className={styles.modelTag}>{result.model} · 实时联网</Tag>
        </section>

        <section className={styles.executiveBrief}>
          <div className={styles.sectionTitle}>
            <span className={styles.titleIcon}>
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>管理层摘要</h3>
              <p>
                基于 {result.sources.length} 个公开来源 · 生成于{" "}
                {formatServerIsoDateTime(result.generated_at, timeZone)}
              </p>
            </div>
          </div>
          <div className={styles.briefGrid}>
            <article className={styles.coreConclusion}>
              <span className={styles.briefLabel}>核心结论</span>
              <p>{plainSummary(result.executive_summary)}</p>
            </article>
            <article className={styles.keyFindings}>
              <span className={styles.briefLabel}>关键发现</span>
              <ol>
                {findings.map((finding, index) => (
                  <li key={`finding-${index}`}>
                    <span>{index + 1}</span>
                    <p>{finding}</p>
                  </li>
                ))}
              </ol>
            </article>
            <article className={styles.actionPanel}>
              <span className={styles.briefLabel}>建议行动</span>
              <Target size={22} aria-hidden="true" />
              {actions.map((action, index) => (
                <p key={`action-${index}`}>{action}</p>
              ))}
              <button type="button" onClick={() => setSourcesOpen(true)}>
                查看证据来源 <ArrowRight size={15} />
              </button>
            </article>
          </div>
        </section>

        <section className={styles.focusGrid} aria-label="研究方向">
          {FOCUS_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeFocus === item.key;
            return (
              <button
                type="button"
                key={item.key}
                className={`${styles.focusCard} ${
                  selected ? styles.focusCardActive : ""
                }`}
                onClick={() => setActiveFocus(item.key)}
                aria-pressed={selected}
              >
                <span className={`${styles.focusIcon} ${styles[item.tone]}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            );
          })}
        </section>

        <section className={styles.workspaceGrid}>
          <article className={styles.workspacePanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>{activeConfig.title}</h3>
                <p>{activeConfig.description}</p>
              </div>
              <Tag>{result.focus_title || "综合研究"}</Tag>
            </div>
            <ResearchDetail focus={activeFocus} result={result} />
          </article>
          <aside className={styles.watchPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>重点企业观察</h3>
                <p>由本次公开材料识别</p>
              </div>
              <span>{result.key_companies.length} 家</span>
            </div>
            <div className={styles.companyWatchlist}>
              {result.key_companies.slice(0, 5).map((company, index) => (
                <div key={`${company.name}-${index}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{company.name}</strong>
                    <small>
                      {company.stage} · {company.position}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setActiveFocus("companies")}>
              查看全部重点企业 <ArrowRight size={15} />
            </button>
          </aside>
        </section>
      </main>

      <Drawer
        title="公开证据来源"
        width={480}
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
      >
        <div className={styles.sourceIntro}>
          <CheckCircle2 size={17} aria-hidden="true" />
          以下来源由 Kimi Search Pro 实时检索，可点击核验原文。
        </div>
        <div className={styles.sourceList}>
          {result.sources.map((source) => (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={source.url}
            >
              <span>{source.index}</span>
              <div>
                <strong>{source.title}</strong>
                <small>
                  {[source.site, source.date].filter(Boolean).join(" · ")}
                </small>
              </div>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
