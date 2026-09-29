import { Button, Card, Space, Tag, Typography } from "antd";
import { ArrowRight, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ApplicationCardData } from "./types";
import { useDemoTenant } from "./DemoTenantContext";
import { trackEvent } from "./storage";

export default function ApplicationCard({
  data,
}: {
  data: ApplicationCardData;
}) {
  const navigate = useNavigate();
  const { tenant } = useDemoTenant();
  return (
    <Card
      size="small"
      style={{
        marginTop: 14,
        maxWidth: 660,
        borderColor: "var(--fn-color-brand, #1677ff)",
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space>
          <Network size={18} color="var(--fn-color-brand, #1677ff)" />
          <Typography.Text strong>{data.title}</Typography.Text>
          {data.live && <Tag color="green">实时联网</Tag>}
        </Space>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {data.subtitle}
          </Typography.Title>
          <Typography.Text type="secondary">
            上中下游结构、重点企业、风险与政策的一站式分析
          </Typography.Text>
        </div>
        <Space wrap>
          {data.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
        <Space size="large" wrap>
          {data.metrics.map((metric) => (
            <div key={metric.label}>
              <Typography.Text strong style={{ fontSize: 18 }}>
                {metric.value}
              </Typography.Text>
              <br />
              <Typography.Text type="secondary">{metric.label}</Typography.Text>
            </div>
          ))}
        </Space>
        {data.live && (
          <Typography.Text type="secondary">
            {data.model} · {data.sources?.length || 0} 个公开来源 ·
            点击来源可核验
          </Typography.Text>
        )}
        {data.sources?.slice(0, 3).map((source) => (
          <Typography.Link
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            [{source.index}] {source.title}
          </Typography.Link>
        ))}
        <Button
          type="primary"
          icon={<ArrowRight size={15} />}
          iconPosition="end"
          onClick={() => {
            trackEvent("application_card_click", {
              tenantId: tenant.id,
              userId: tenant.defaultUser.id,
              capabilityId: "industry_research",
              contextId: data.contextId,
            });
            navigate(`/applications/industry-research/${data.contextId}`);
          }}
        >
          {data.actionText}
        </Button>
      </Space>
    </Card>
  );
}
