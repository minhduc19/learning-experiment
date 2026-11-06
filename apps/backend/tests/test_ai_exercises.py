import asyncio
import json

import httpx
import pytest
from app.ai import routes
from app.auth.dependencies import current_user
from app.main import app
from fastapi.testclient import TestClient
from openai import AsyncOpenAI as RealClient
from test_lessons import document


@pytest.fixture
def ai_client(monkeypatch):
    monkeypatch.setenv("DEEPSEEK", "test-deepseek-key")
    app.dependency_overrides[current_user] = lambda: {"id": "test-user"}
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(current_user, None)


def mock_provider(monkeypatch, handler):
    def client(**options):
        return RealClient(
            **options,
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        )

    monkeypatch.setattr(routes, "AsyncOpenAI", client)


def completion(content, reason="stop"):
    return httpx.Response(
        200,
        json={
            "id": "chat-test",
            "object": "chat.completion",
            "created": 0,
            "model": "deepseek-flash",
            "choices": [
                {
                    "index": 0,
                    "finish_reason": reason,
                    "message": {"role": "assistant", "content": content},
                }
            ],
        },
    )


def test_exact_roles_prompts_model_and_server_key(ai_client, monkeypatch):
    received = []
    text = json.dumps(document(), ensure_ascii=False)

    def upstream(request):
        received.append(request)
        assert str(request.url) == "https://api.deepseek.com/chat/completions"
        assert request.headers["authorization"] == "Bearer test-deepseek-key"
        body = json.loads(request.content)
        assert body["model"] == "deepseek-flash"
        assert body["response_format"] == {"type": "json_object"}
        assert body["messages"] == [
            {"role": "system", "content": " Edited system\n"},
            {
                "role": "user",
                "content": "Character|segment|sentence|sentence-id\n心|心|謂道心開發也|15",
            },
        ]
        return completion(text)

    mock_provider(monkeypatch, upstream)
    response = ai_client.post(
        "/api/ai/exercises",
        json={
            "system_prompt": " Edited system\n",
            "user_prompt": "Character|segment|sentence|sentence-id\n心|心|謂道心開發也|15",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"text": text, "warning": None}
    assert response.headers["cache-control"] == "private, no-store"
    assert len(received) == 1
    assert "test-deepseek-key" not in response.text


@pytest.mark.parametrize(
    "status,expected", [(401, 503), (429, 429), (400, 502), (500, 502)]
)
def test_provider_errors_are_safe_and_not_retried(
    ai_client, monkeypatch, status, expected
):
    calls = []

    def upstream(request):
        calls.append(1)
        return httpx.Response(
            status,
            json={"error": {"message": "test-deepseek-key private provider body"}},
        )

    mock_provider(monkeypatch, upstream)
    response = ai_client.post(
        "/api/ai/exercises",
        json={"system_prompt": "System", "user_prompt": "Vocabulary"},
    )
    assert response.status_code == expected
    assert (
        "test-deepseek-key" not in response.text
        and "private provider body" not in response.text
    )
    assert len(calls) == 1


def test_timeout_and_partial_json_preserve_editable_output(ai_client, monkeypatch):
    def timeout(request):
        raise httpx.ReadTimeout("provider details", request=request)

    mock_provider(monkeypatch, timeout)
    assert (
        ai_client.post(
            "/api/ai/exercises",
            json={"system_prompt": "System", "user_prompt": "Vocabulary"},
        ).status_code
        == 504
    )
    mock_provider(monkeypatch, lambda _: completion('{"items":[', "length"))
    response = ai_client.post(
        "/api/ai/exercises",
        json={"system_prompt": "System", "user_prompt": "Vocabulary"},
    )
    assert response.status_code == 200
    assert response.json()["text"] == '{"items":['
    assert "truncated" in response.json()["warning"]


def test_missing_key_invalid_prompts_busy_and_auth(ai_client, monkeypatch):
    monkeypatch.delenv("DEEPSEEK")
    assert (
        ai_client.post(
            "/api/ai/exercises",
            json={"system_prompt": "System", "user_prompt": "Vocabulary"},
        ).status_code
        == 503
    )
    for payload in (
        {"system_prompt": "", "user_prompt": "V"},
        {"system_prompt": "S", "user_prompt": " "},
        {"system_prompt": "S", "user_prompt": "V", "api_key": "client-key"},
    ):
        assert ai_client.post("/api/ai/exercises", json=payload).status_code == 422
    monkeypatch.setenv("DEEPSEEK", "test-key")
    monkeypatch.setattr(routes, "slots", asyncio.Semaphore(0))
    assert (
        ai_client.post(
            "/api/ai/exercises", json={"system_prompt": "System", "user_prompt": "V"}
        ).status_code
        == 429
    )
    app.dependency_overrides.pop(current_user)
    assert (
        ai_client.post(
            "/api/ai/exercises", json={"system_prompt": "System", "user_prompt": "V"}
        ).status_code
        == 401
    )


def test_generation_has_an_overall_deadline(ai_client, monkeypatch):
    monkeypatch.setattr(routes, "TIMEOUT_SECONDS", 0.01)

    async def slow(request):
        await asyncio.sleep(0.1)
        return completion("{}")

    mock_provider(monkeypatch, slow)
    response = ai_client.post(
        "/api/ai/exercises", json={"system_prompt": "S", "user_prompt": "V"}
    )
    assert response.status_code == 504
