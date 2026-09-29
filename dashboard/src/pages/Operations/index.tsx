import { useEffect, useMemo, useState } from "react";
import {
  Card,
  List,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TenantSwitcher from "../../demo/TenantSwitcher";
import { operationsMock } from "../../demo/data";
import { getEvents } from "../../demo/storage";
import styles from "./index.module.less";

export default function OperationsDashboardPage() {
  const [eventCount, setEventCount] = useState(() => getEvents().length);
  useEffect(() => {
    const update = () => setEventCount(getEvents().length);
    window.addEventListener("octop:demo-telemetry", update);
    return () => window.removeEventListener("octop:demo-telemetry", update);
  }, []);
  const overview = useMemo(
    () => ({
      ...operationsMock.overview,
      aiCalls: operationsMock.overview.aiCalls + eventCount,
      researchTasks:
        operationsMock.overview.researchTasks +
        getEvents().filter((item) => item.eventName === "workspace_open")
          .length,
      reports:
        operationsMock.overview.reports +
        getEvents().filter((item) => item.eventName === "report_generate")
          .length,
    }),
    [eventCount],
  );
  const kpis = [
    ["活跃用户数", overview.activeUsers.toLocaleString()],
    ["活跃租户数", overview.activeTenants],
    ["AI 调用次数", overview.aiCalls.toLocaleString()],
    ["专业分析任务", overview.researchTasks.toLocaleString()],
    ["报告生成次数", overview.reports.toLocaleString()],
    ["平均响应时长", `${overview.avgResponseSeconds}s`],
  ];
  const pie = operationsMock.tenantUsage.map((item, index) => ({
    ...item,
    color: ["#1677ff", "#52c41a", "#faad14", "#722ed1"][index],
  }));
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            AI 产品运营中心
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            统一观察各子公司 AI 能力使用情况，为产品优化和能力建设提供依据。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <TenantSwitcher compact />
          <Select value="all" options={[{ value: "all", label: "全部租户" }]} />
          <Select value="30" options={[{ value: "30", label: "最近30天" }]} />
        </Space>
      </div>
      <div className={styles.kpis}>
        {kpis.map(([label, value]) => (
          <div className={styles.kpi} key={label}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <div className={styles.value}>{value}</div>
          </div>
        ))}
      </div>
      <div className={styles.grid}>
        <Card title="活跃用户与 AI 调用趋势">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={operationsMock.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area
                dataKey="users"
                name="活跃用户"
                stroke="#1677ff"
                fill="#dbeafe"
              />
              <Area
                dataKey="calls"
                name="AI调用"
                stroke="#52c41a"
                fill="#dcfce7"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="租户使用占比">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                label
              >
                {pie.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="各租户使用情况">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={operationsMock.tenantUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="value"
                name="使用占比"
                fill="#1677ff"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="用户使用漏斗">
          <div className={styles.funnel}>
            {[
              ["访问统一入口", "100%", "100%"],
              ["选择业务能力", "72%", "82%"],
              ["提交专业问题", "54%", "65%"],
              ["进入专业工作台", "38%", "50%"],
              ["生成研究成果", "16%", "36%"],
            ].map(([label, value, width]) => (
              <div key={label} style={{ width }}>
                {label} · {value}
              </div>
            ))}
          </div>
        </Card>
        <Card title="热门业务主题">
          <List
            dataSource={[
              "机器人产业链",
              "锂资源价格",
              "半导体国产替代",
              "企业竞争力",
              "政策影响分析",
            ]}
            renderItem={(item, index) => (
              <List.Item>
                <Space>
                  <Tag color="blue">TOP {index + 1}</Tag>
                  {item}
                </Space>
                <Progress
                  percent={[92, 78, 66, 54, 42][index]}
                  showInfo={false}
                  style={{ width: 160 }}
                />
              </List.Item>
            )}
          />
        </Card>
        <Card title="用户使用排行">
          <Table
            pagination={false}
            size="small"
            rowKey="user"
            dataSource={[
              {
                user: "张**",
                tenant: "浦银金租",
                calls: 386,
                role: "客户经理型",
              },
              {
                user: "李**",
                tenant: "浦银理财",
                calls: 352,
                role: "研究员型",
              },
              {
                user: "王**",
                tenant: "上海信托",
                calls: 298,
                role: "项目经理型",
              },
              {
                user: "陈**",
                tenant: "浦银国际",
                calls: 261,
                role: "投行用户型",
              },
            ]}
            columns={[
              { title: "用户", dataIndex: "user" },
              { title: "租户", dataIndex: "tenant" },
              { title: "调用", dataIndex: "calls" },
              {
                title: "典型画像",
                dataIndex: "role",
                render: (value) => <Tag>{value}</Tag>,
              },
            ]}
          />
        </Card>
        <Card title="典型用户画像">
          <Typography.Title level={5}>研究员型用户</Typography.Title>
          <Typography.Paragraph>
            主要使用产业智能研究和企业分析，偏好深度下钻、高频企业比较与研究成果生成。
          </Typography.Paragraph>
          <Space wrap>
            <Tag color="blue">深度分析</Tag>
            <Tag color="green">高频下钻</Tag>
            <Tag color="purple">成果导向</Tag>
          </Space>
        </Card>
        <Card title="用户反馈与满意度">
          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <div>
              <Typography.Text>整体满意度</Typography.Text>
              <Progress percent={92} strokeColor="#52c41a" />
            </div>
            <div>
              <Typography.Text>回答专业性</Typography.Text>
              <Progress percent={88} />
            </div>
            <div>
              <Typography.Text>工作台易用性</Typography.Text>
              <Progress percent={90} />
            </div>
          </Space>
        </Card>
      </div>
      <Typography.Paragraph
        type="secondary"
        style={{ marginTop: 18, textAlign: "center" }}
      >
        用户行为数据仅用于产品运营分析，本页面数据均为模拟演示数据。本浏览器已记录{" "}
        {eventCount} 条 Demo 事件。
      </Typography.Paragraph>
    </div>
  );
}
