import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  List,
  Menu,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeft,
  Bot,
  Building2,
  FileText,
  Network,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import TenantSwitcher from "../../../demo/TenantSwitcher";
import { industries } from "../../../demo/data";
import { getResearchContext, trackEvent } from "../../../demo/storage";
import { useDemoTenant } from "../../../demo/DemoTenantContext";
import styles from "./index.module.less";

const navItems = [
  { key: "overview", label: "产业总览" },
  { key: "chain", label: "产业链图谱" },
  { key: "companies", label: "重点企业" },
  { key: "risks", label: "风险传导" },
  { key: "policies", label: "政策信息" },
];

export default function IndustryResearchPage() {
  const { contextId = "", companyId } = useParams();
  const navigate = useNavigate();
  const { tenant } = useDemoTenant();
  const context = getResearchContext(contextId);
  const industry = industries[context?.industryId || "robotics"];
  const company = companyId
    ? industry.companies.find((item) => item.id === companyId)
    : undefined;
  const [section, setSection] = useState("overview");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<string[]>([
    company
      ? `你好，我可以继续分析${company.name}的竞争力、风险和上下游关系。`
      : `你好，我可以基于当前${industry.name}研究上下文继续回答。`,
  ]);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    trackEvent("workspace_open", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      industryId: industry.id,
      companyId,
      contextId,
    });
  }, [companyId, contextId, industry.id, tenant]);

  const ask = () => {
    if (!question.trim()) return;
    trackEvent("copilot_ask", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      industryId: industry.id,
      companyId,
      contextId,
      metadata: { question },
    });
    const answer = company
      ? `${company.name}在${
          company.field
        }环节的优势主要来自技术积累、客户覆盖与产品协同；当前需关注${industry.risks
          .slice(0, 2)
          .join("、")}。`
      : `当前${industry.name}产业最大的风险是${industry.risks[0]}，并可能沿“上游成本—中游毛利—下游订单”路径传导。`;
    setMessages((old) => [...old, `你：${question}`, answer]);
    setQuestion("");
  };

  const openCompany = (id: string) => {
    trackEvent("company_click", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      industryId: industry.id,
      companyId: id,
      contextId,
    });
    navigate(`/applications/industry-research/${contextId}/company/${id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Network size={22} />
          <strong>
            {company
              ? `${company.name} · 企业深度分析`
              : `${industry.name}产业智能研究`}
          </strong>
          <Tag color="blue">演示数据</Tag>
        </div>
        <TenantSwitcher />
      </header>
      <div className={styles.shell}>
        <aside className={styles.nav}>
          <Button
            type="text"
            icon={<ArrowLeft size={15} />}
            onClick={() =>
              company
                ? navigate(`/applications/industry-research/${contextId}`)
                : navigate("/chat")
            }
            style={{ marginBottom: 12 }}
          >
            {company ? "返回产业研究" : "返回对话"}
          </Button>
          {!company && (
            <Menu
              mode="inline"
              selectedKeys={[section]}
              items={navItems}
              onClick={({ key }) => setSection(key)}
            />
          )}
          {company && (
            <Space direction="vertical" size={12} style={{ padding: 12 }}>
              <Tag color="geekblue">{company.stage}</Tag>
              <Typography.Text type="secondary">
                {company.field}
              </Typography.Text>
              <Typography.Text>{company.products}</Typography.Text>
            </Space>
          )}
        </aside>
        <main className={styles.main}>
          {company ? (
            <CompanyView
              company={company}
              industryName={industry.name}
              risks={industry.risks}
            />
          ) : (
            <>
              <Space
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
                align="start"
              >
                <div>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {industry.name}产业研究
                  </Typography.Title>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ maxWidth: 760 }}
                  >
                    {industry.description}
                  </Typography.Paragraph>
                </div>
                <Button
                  icon={<FileText size={15} />}
                  onClick={() => {
                    setReportOpen(true);
                    trackEvent("report_generate", {
                      tenantId: tenant.id,
                      userId: tenant.defaultUser.id,
                      industryId: industry.id,
                      contextId,
                    });
                  }}
                >
                  生成研究摘要
                </Button>
              </Space>
              {section === "overview" && <Overview industry={industry} />}
              {section === "chain" && (
                <Chain
                  industry={industry}
                  onNode={(node) =>
                    trackEvent("industry_node_click", {
                      tenantId: tenant.id,
                      userId: tenant.defaultUser.id,
                      industryId: industry.id,
                      contextId,
                      metadata: { node },
                    })
                  }
                />
              )}
              {section === "companies" && (
                <Table
                  rowKey="id"
                  dataSource={industry.companies}
                  pagination={false}
                  onRow={(record) => ({
                    onClick: () => openCompany(record.id),
                    style: { cursor: "pointer" },
                  })}
                  columns={[
                    { title: "企业", dataIndex: "name" },
                    { title: "环节", dataIndex: "stage" },
                    { title: "细分领域", dataIndex: "field" },
                    {
                      title: "竞争力",
                      dataIndex: "competitiveness",
                      render: (v) => <Tag color="blue">{v}</Tag>,
                    },
                    { title: "景气度", dataIndex: "prosperity" },
                    {
                      title: "风险",
                      dataIndex: "risk",
                      render: (v) => <Tag color="orange">{v}</Tag>,
                    },
                  ]}
                />
              )}
              {section === "risks" && (
                <Card title="风险传导路径" extra="演示数据">
                  <div className={styles.riskFlow}>
                    {industry.risks.map((risk, index) => (
                      <div className={styles.riskStep} key={risk}>
                        <Typography.Text type="secondary">
                          环节 {index + 1}
                        </Typography.Text>
                        <br />
                        <Typography.Text strong>{risk}</Typography.Text>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {section === "policies" && (
                <Card title={`政策信息 · ${industry.overview.policyCount} 项`}>
                  <List
                    dataSource={industry.policies}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              {item.title}
                              <Tag color="green">{item.level}</Tag>
                            </Space>
                          }
                          description={
                            <>
                              <div>
                                {item.date} · {item.tags.join(" / ")}
                              </div>
                              <div>{item.summary}</div>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </>
          )}
        </main>
        <aside className={styles.copilot}>
          <Space>
            <Bot size={19} color="#1677ff" />
            <Typography.Text strong>AI Copilot</Typography.Text>
          </Space>
          <Typography.Text type="secondary" style={{ marginTop: 8 }}>
            当前研究：{company?.name || `${industry.name}产业`}
          </Typography.Text>
          <div className={styles.copilotMessages}>
            {messages.map((message, index) => (
              <div key={`${index}-${message}`} className={styles.copilotBubble}>
                {message}
              </div>
            ))}
          </div>
          <Input.TextArea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="继续提问，例如：当前最大的风险是什么？"
            autoSize={{ minRows: 3, maxRows: 6 }}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
          />
          <Button type="primary" onClick={ask} style={{ marginTop: 10 }}>
            发送
          </Button>
        </aside>
      </div>
      <Modal
        title={`${industry.name}产业研究摘要`}
        open={reportOpen}
        footer={
          <Button type="primary" onClick={() => setReportOpen(false)}>
            完成
          </Button>
        }
        onCancel={() => setReportOpen(false)}
      >
        <Typography.Title level={5}>核心判断</Typography.Title>
        <Typography.Paragraph>{industry.description}</Typography.Paragraph>
        <Typography.Title level={5}>重点风险</Typography.Title>
        <ul>
          {industry.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
        <Typography.Text type="secondary">
          本报告全部数据均为模拟演示数据。
        </Typography.Text>
      </Modal>
    </div>
  );
}

function Overview({ industry }: { industry: (typeof industries)[string] }) {
  const metrics = [
    ["市场规模", industry.overview.marketSize],
    ["产业景气度", `${industry.overview.prosperityIndex} / 100`],
    ["重点企业", industry.overview.companyCount],
    ["重点政策", industry.overview.policyCount],
  ];
  return (
    <>
      <div className={styles.metricGrid}>
        {metrics.map(([label, value]) => (
          <div className={styles.metric} key={label}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <div className={styles.metricValue}>{value}</div>
          </div>
        ))}
      </div>
      <div className={styles.chartGrid}>
        <Card title="产业景气趋势">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={industry.trend}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1677ff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[50, 90]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1677ff"
                fill="url(#colorTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="综合研判">
          <Progress
            type="dashboard"
            percent={industry.overview.prosperityIndex}
            strokeColor="#1677ff"
          />
          <Typography.Paragraph style={{ marginTop: 16 }}>
            {industry.description}
          </Typography.Paragraph>
        </Card>
      </div>
    </>
  );
}

function Chain({
  industry,
  onNode,
}: {
  industry: (typeof industries)[string];
  onNode: (node: string) => void;
}) {
  const stages = [
    ["upstream", "上游"],
    ["midstream", "中游"],
    ["downstream", "下游"],
  ] as const;
  return (
    <div className={styles.chain}>
      {stages.map(([key, label]) => (
        <div className={styles.chainColumn} key={key}>
          <Typography.Title level={5}>{label}</Typography.Title>
          {industry.chain[key].map((node) => (
            <div
              className={styles.node}
              key={node}
              onClick={() => onNode(node)}
            >
              {node}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CompanyView({
  company,
  industryName,
  risks,
}: {
  company: (typeof industries)[string]["companies"][number];
  industryName: string;
  risks: string[];
}) {
  const radar = [
    { subject: "技术", value: 90 },
    { subject: "市场", value: 82 },
    { subject: "客户", value: 86 },
    { subject: "规模", value: 78 },
    { subject: "成长性", value: 88 },
  ];
  return (
    <>
      <div className={styles.companyHero}>
        <div>
          <Space>
            <Building2 size={22} />
            <Typography.Title level={3} style={{ margin: 0 }}>
              {company.name}
            </Typography.Title>
          </Space>
          <Typography.Paragraph type="secondary">
            {industryName} · {company.stage} · {company.field}
          </Typography.Paragraph>
          <Space wrap>
            <Tag color="blue">核心企业</Tag>
            <Tag>国产替代</Tag>
            <Tag>研发驱动</Tag>
          </Space>
        </div>
        <Tag color="green">景气度 {company.prosperity}</Tag>
      </div>
      <div className={styles.metricGrid}>
        {[
          ["主营产品", company.products],
          ["毛利率", company.grossMargin],
          ["研发投入占比", company.researchRatio],
          ["风险指数", company.riskIndex],
        ].map(([label, value]) => (
          <div className={styles.metric} key={String(label)}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <div
              className={styles.metricValue}
              style={{ fontSize: String(value).length > 10 ? 16 : 25 }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.chartGrid}>
        <Card title="收入趋势（演示）">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={company.revenue.map((value, index) => ({
                year: `${2023 + index}`,
                value,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Area dataKey="value" stroke="#1677ff" fill="#dbeafe" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="竞争力">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar
                dataKey="value"
                stroke="#1677ff"
                fill="#1677ff"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card
        title={
          <Space>
            <ShieldAlert size={17} />
            主要风险
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <List
          dataSource={risks.slice(0, 4)}
          renderItem={(risk) => (
            <List.Item>
              <Tag color="orange">关注</Tag>
              {risk}
            </List.Item>
          )}
        />
      </Card>
      <Card title="上下游关系（演示）" style={{ marginTop: 16 }}>
        <div className={styles.relation}>
          <div className={styles.relationBox}>
            核心供应商
            <br />
            <Typography.Text type="secondary">零部件 / 材料</Typography.Text>
          </div>
          <strong>→</strong>
          <div className={styles.relationBox}>
            {company.name}
            <br />
            <Typography.Text type="secondary">{company.field}</Typography.Text>
          </div>
          <strong>→</strong>
          <div className={styles.relationBox}>
            重点客户
            <br />
            <Typography.Text type="secondary">汽车 / 电子制造</Typography.Text>
          </div>
        </div>
      </Card>
    </>
  );
}
