from __future__ import annotations

from unittest.mock import AsyncMock

import httpx
import pytest

from octop.infra.errors import ErrorCode, OctopError
from octop.infra.industry_research import service


@pytest.mark.asyncio
async def test_post_with_retry_recovers_from_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(429, headers={"Retry-After": "0"}, request=request)
        return httpx.Response(200, json={"ok": True}, request=request)

    sleep = AsyncMock()
    monkeypatch.setattr(service.asyncio, "sleep", sleep)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        response = await service._post_with_retry(
            client,
            "https://example.test/chat/completions",
            {},
            timeout=1,
        )

    assert response.json() == {"ok": True}
    assert attempts == 3
    assert sleep.await_count == 2


@pytest.mark.asyncio
async def test_post_with_retry_maps_persistent_rate_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, request=request)

    monkeypatch.setattr(service.asyncio, "sleep", AsyncMock())
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(OctopError) as raised:
            await service._post_with_retry(
                client,
                "https://example.test/chat/completions",
                {},
                timeout=1,
            )

    assert raised.value.code is ErrorCode.INDUSTRY_RESEARCH_RATE_LIMITED
    assert raised.value.status == 429


@pytest.mark.asyncio
async def test_post_with_retry_maps_exhausted_quota_without_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(
            429,
            json={
                "error": {
                    "message": "account suspended due to insufficient balance",
                    "type": "exceeded_current_quota_error",
                }
            },
            request=request,
        )

    sleep = AsyncMock()
    monkeypatch.setattr(service.asyncio, "sleep", sleep)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(OctopError) as raised:
            await service._post_with_retry(
                client,
                "https://example.test/chat/completions",
                {},
                timeout=1,
            )

    assert raised.value.code is ErrorCode.INDUSTRY_RESEARCH_QUOTA_EXCEEDED
    assert raised.value.status == 402
    assert attempts == 1
    sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_post_with_retry_maps_forbidden_search_to_quota(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, request=request)

    sleep = AsyncMock()
    monkeypatch.setattr(service.asyncio, "sleep", sleep)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(OctopError) as raised:
            await service._post_with_retry(
                client,
                "https://example.test/tools/search_pro",
                {},
                timeout=1,
            )

    assert raised.value.code is ErrorCode.INDUSTRY_RESEARCH_QUOTA_EXCEEDED
    assert raised.value.status == 402
    sleep.assert_not_awaited()
