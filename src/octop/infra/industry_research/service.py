"""Retrieve current public sources and ask Kimi for an industry analysis."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

import httpx

from octop.infra.errors import ErrorCode, OctopError

_SEARCH_TIMEOUT = 45.0
_MODEL_TIMEOUT = 120.0


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
    search_queries = [
        f"{year} 中国人形机器人产业链 核心零部件 市场进展 政策 官方",
        f"{year} 人形机器人重点企业 最新财报 订单 量产 宇树 优必选 埃斯顿 汇川",
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
            "你是集团产业战略研究员。只允许依据提供的实时检索材料作答；"
            "事实后必须用[序号]引用来源，不得虚构市场规模、订单、财务数据。"
            "如果材料不足，应明确写‘公开材料不足’。输出必须是合法 JSON。"
        )
        user_prompt = f"""研究问题：{query}

检索材料：
{source_text}

请输出以下 JSON 字段：
industry_name（字符串）、executive_summary（适合管理层阅读的 Markdown）、
chain（对象，含 upstream/midstream/downstream 三个字符串数组）、
key_companies（数组，每项含 name/stage/position/evidence）、
risks（字符串数组）、opportunities（字符串数组）、
data_as_of（字符串）、source_indexes_used（整数数组）。
executive_summary 必须覆盖产业链结构、5-8 家重点企业、风险和建议，并保留[序号]引用。"""
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
        "query": query,
        "model": _model_id(row),
        "generated_at": datetime.now(UTC).isoformat(),
        "sources": visible_sources,
    }
