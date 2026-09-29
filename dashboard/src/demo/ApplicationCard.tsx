import {
  ArrowRight,
  Building2,
  Landmark,
  Network,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IndustryResearchFocus } from "../api/modules/industryResearch";
import type { ApplicationCardData } from "./types";
import { useDemoTenant } from "./DemoTenantContext";
import { trackEvent } from "./storage";
import styles from "./ApplicationCard.module.less";

const FOCUS_ICONS: Record<IndustryResearchFocus, LucideIcon> = {
  chain: Network,
  companies: Building2,
  risks: ShieldAlert,
  policy: Landmark,
};

export default function ApplicationCard({
  data,
}: {
  data: ApplicationCardData;
}) {
  const navigate = useNavigate();
  const { tenant } = useDemoTenant();
  const Icon = FOCUS_ICONS[data.focus ?? "chain"];

  const openDashboard = () => {
    trackEvent("application_card_click", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      contextId: data.contextId,
      metadata: { focus: data.focus ?? "chain" },
    });
    navigate(`/applications/industry-research/${data.contextId}`);
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <strong>{data.title}</strong>
          <span>{data.live ? "实时联网" : "研究专题"}</span>
        </div>
      </div>
      <h3>{data.subtitle}</h3>
      <p>已形成管理层结论、关键发现与可核验公开证据，可进入驾驶舱继续查看。</p>
      <div className={styles.metrics}>
        {data.metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <span>
          {data.model} · {data.sources?.length ?? 0} 个公开来源
        </span>
        <button type="button" onClick={openDashboard}>
          {data.actionText}
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
