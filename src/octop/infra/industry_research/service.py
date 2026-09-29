"""Retrieve current public sources and ask Kimi for an industry analysis."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

import httpx

from octop.infra.errors import ErrorCode, OctopError

_SEARCH_TIMEOUT = 45.0
_MODEL_TIMEOUT = 120.0

_FOCUS_CONFIG = {
    "chain": {
        "title": "产业链全景",
        "keywords": ("产业链", "上游", "中游", "下游", "关键环节", "卡点"),
        "search_hint": "产业链 上游 中游 下游 核心零部件 供需格局",
    },
    "companies": {
        "title": "重点企业竞争",
        "keywords": ("企业", "竞争", "龙头", "公司", "量产", "订单"),
        "search_hint": "重点企业 竞争格局 最新财报 订单 量产 市场份额",
    },
    "risks": {
        "title": "风险冲击推演",
        "keywords": ("风险", "冲击", "传导", "供应链", "制裁", "短缺"),
        "search_hint": "供应链风险 技术迭代 市场风险 成本传导 风险事件",
    },
    "policy": {
        "title": "政策与区域机会",
        "keywords": ("政策", "区域", "机会", "补贴", "产业集群", "招商"),
        "search_hint": "产业政策 地方支持 区域集群 招商 项目落地 投资机会",
    },
}


def _research_focus(query: str) -> tuple[str, str, str]:
    """Resolve the requested decision lens without changing the user's query."""
    best_key = "chain"
    best_score = 0
    for key, config in _FOCUS_CONFIG.items():
        score = sum(query.count(keyword) for keyword in config["keywords"])
        if score > best_score:
            best_key = key
            best_score = score
    config = _FOCUS_CONFIG[best_key]
    return best_key, str(config["title"]), str(config["search_hint"])


def _kimi_provider(services: Any) -> Any:
    for row in services.provider_repo.list_all():
        if row.enabled and row.api_key and (
            "kimi" in row.name.lower() or "moonshot" in (row.base_url or "").lower()
        ):
            return row
    raise OctopError(
        ErrorCode.NOT_FOUND,
        "未找到已启用且配置 API Key 的 Kimi 提供商",
    )


def _model_id(row: Any) -> str:
    enabled = [
        str(item.get("id"))
        for item in row.get_models()
        if item.get("enabled", True) and item.get("id")
    ]
    for candidate in ("kimi-k2.6", "kimi-k3"):
        if candidate in enabled:
            return candidate
    if enabled:
        return enabled[0]
    return "kimi-k2.6"


def _json_content(content: str) -> dict[str, Any]:
    value = content.strip()
    if value.startswith("```"):
        value = value.split("\n", 1)[-1]
        value = value.rsplit("```", 1)[0]
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("Kimi response is not a JSON object")
    return parsed


async def run_industry_research(
    services: Any,
    query: str,
) -> dict[str, Any]:
    """Search current public sources, then synthesize a cited report with Kimi."""
    row = _kimi_provider(services)
    base_url = (row.base_url or "https://api.moonshot.cn/v1").rstrip("/")
    headers = {"Authorization": f"Bearer {row.api_key}"}
    year = datetime.now(UTC).year
    focus_key, focus_title, search_hint = _research_focus(query)
    search_queries = [
        f"{year} {query} 最新进展 官方 行业研究",
        f"{year} {query} {search_hint}",
    ]

    async with httpx.AsyncClient(headers=headers) as client:
        sources: list[dict[str, str]] = []
        seen_urls: set[str] = set()
        for search_query in search_queries:
            response = await client.post(
                f"{base_url}/tools/search_pro",
                json={
                    "text_query": search_query,
                    "limit": 6,
                    "timeout_seconds": 30,
                },
                timeout=_SEARCH_TIMEOUT,
            )
            response.raise_for_status()
            for item in response.json().get("search_results", []):
                url = str(item.get("url") or "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                chunks = item.get("chunks") or []
                excerpt = "\n".join(
                    str(chunk.get("text") or "") for chunk in chunks[:2]
                ).strip()
                sources.append(
                    {
                        "title": str(item.get("title") or "未命名来源"),
                        "url": url,
                        "site": str(item.get("site_name") or ""),
                        "date": str(item.get("date") or ""),
                        "excerpt": excerpt or str(item.get("snippet") or ""),
                    }
                )

        if not sources:
            raise OctopError(ErrorCode.NOT_FOUND, "未检索到可用于分析的公开资料")

        source_text = "\n\n".join(
            f"[{index}] {item['title']}\n来源：{item['site']} {item['date']} {item['url']}\n{item['excerpt'][:900]}"
            for index, item in enumerate(sources, 1)
        )
        system_prompt = (
            "你是服务集团管理层的产业战略研究员。只允许依据提供的实时检索材料作答；"
            "事实后必须用[序号]引用来源，不得虚构市场规模、订单、财务数据。"
            "需要优先回答决策问题而不是堆砌行业知识。"
            "如果材料不足，应明确写‘公开材料不足’。输出必须是合法 JSON。"
        )
        user_prompt = f"""研究问题：{query}
研究焦点：{focus_title}

检索材料：
{source_text}

请输出以下 JSON 字段：
industry_name（字符串）、executive_summary（适合管理层阅读的 Markdown）、
key_findings（3 条字符串数组，每条必须带[序号]引用）、
recommended_actions（1-3 条可执行建议的字符串数组，每条说明动作对象）、
chain（对象，含 upstream/midstream/downstream 三个字符串数组）、
key_companies（数组，每项含 name/stage/position/evidence）、
risks（字符串数组）、opportunities（字符串数组）、
data_as_of（字符串）、source_indexes_used（整数数组）。
executive_summary 用 180-260 字先给结论，再给依据，并保留[序号]引用。
围绕“{focus_title}”展开，但仍需提供完整产业链、重点企业、风险和机会数据，便于同一驾驶舱切换专题。"""
        completion = await client.post(
            f"{base_url}/chat/completions",
            json={
                "model": _model_id(row),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "thinking": {"type": "disabled"},
                "max_tokens": 4000,
            },
            timeout=_MODEL_TIMEOUT,
        )
        completion.raise_for_status()
        payload = completion.json()
        content = payload["choices"][0]["message"]["content"]
        analysis = _json_content(content)

    cited = {
        index
        for index in analysis.get("source_indexes_used", [])
        if isinstance(index, int) and 1 <= index <= len(sources)
    }
    visible_sources = [
        {
            "index": index,
            **{key: value for key, value in source.items() if key != "excerpt"},
        }
        for index, source in enumerate(sources, 1)
        if not cited or index in cited
    ]
    return {
        **analysis,
        "research_focus": focus_key,
        "focus_title": focus_title,
        "query": query,
        "model": _model_id(row),
        "generated_at": datetime.now(UTC).isoformat(),
        "sources": visible_sources,
    }
