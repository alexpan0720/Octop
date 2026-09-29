import { Select, Space, Tag, Typography } from "antd";
import { Building2 } from "lucide-react";
import { demoTenants } from "./data";
import { useDemoTenant } from "./DemoTenantContext";

export default function TenantSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { tenant, setTenantId } = useDemoTenant();
  return (
    <Space size={8} wrap={false}>
      <Building2 size={15} />
      {!compact && <Typography.Text type="secondary">当前租户</Typography.Text>}
      <Select
        size="small"
        value={tenant.id}
        onChange={setTenantId}
        style={{ minWidth: compact ? 112 : 132 }}
        options={demoTenants.map((item) => ({
          value: item.id,
          label: item.shortName,
        }))}
      />
      {!compact && (
        <Tag color="blue">
          {tenant.defaultUser.name} · {tenant.defaultUser.role}
        </Tag>
      )}
    </Space>
  );
}
