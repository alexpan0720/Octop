"""Live industry-research HTTP adapter."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from octop.api.deps import current_user, get_server
from octop.infra.industry_research import run_industry_research

router = APIRouter(prefix="/industry-research", tags=["industry-research"])


class IndustryResearchRequest(BaseModel):
    query: str = Field(min_length=4, max_length=500, description="产业研究问题")


class IndustryResearchSource(BaseModel):
    index: int
    title: str
    url: str
    site: str = ""
    date: str = ""


class IndustryResearchResponse(BaseModel):
    industry_name: str
    executive_summary: str
    key_findings: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    chain: dict[str, list[str]]
    key_companies: list[dict[str, Any]]
    risks: list[str]
    opportunities: list[str]
    data_as_of: str
    source_indexes_used: list[int] = Field(default_factory=list)
    research_focus: str = "chain"
    focus_title: str = "产业链全景"
    query: str
    model: str
    generated_at: str
    sources: list[IndustryResearchSource]


@router.post(
    "/analyze",
    response_model=IndustryResearchResponse,
    summary="Run live Kimi industry research",
    description="Search current public web sources with Kimi Search Pro, then synthesize a cited industry report with the configured Kimi model.",
)
async def analyze_industry(
    body: IndustryResearchRequest,
    _: Any = Depends(current_user),
    server: Any = Depends(get_server),
) -> IndustryResearchResponse:
    result = await run_industry_research(server.services, body.query.strip())
    return IndustryResearchResponse(**result)
