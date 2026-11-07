import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import current_user
from app.ai import diagnostics


def test_diagnostics_error_details_and_key_redaction(monkeypatch):
    real = httpx.Client
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(422, json={'detail': 'bad request secret-value'}, headers={'request-id':'trace', 'set-cookie':'private'})
    monkeypatch.setenv('ELEVEN', 'secret-value')
    monkeypatch.setattr(diagnostics.httpx, 'Client', lambda **kwargs: real(transport=httpx.MockTransport(handler), **kwargs))
    app.dependency_overrides[current_user] = lambda: {'id':'test'}
    try:
        with TestClient(app) as client:
            response = client.post('/api/ai/diagnostics/elevenlabs', json={'text':'Hello'})
            assert response.status_code == 200
            data = response.json()
            assert data['response']['status'] == 422
            assert data['request']['body'] == {'text':'Hello'}
            assert data['response']['headers']['request-id'] == 'trace'
            assert 'set-cookie' not in data['response']['headers']
            assert 'secret-value' not in response.text
            assert len(calls) == 1
            monkeypatch.delenv('ELEVEN')
            assert client.post('/api/ai/diagnostics/elevenlabs', json={}).json()['configured'] is False
    finally:
        app.dependency_overrides.pop(current_user, None)
    with TestClient(app) as client:
        assert client.post('/api/ai/diagnostics/deepseek', json={}).status_code == 401


def test_deepseek_backend_connection_failure_details(monkeypatch):
    real = httpx.Client
    def handler(request):
        assert str(request.url) == 'https://api.deepseek.com/chat/completions'
        assert request.headers['authorization'] == 'Bearer test-key'
        raise httpx.ConnectError('Provider connection failed', request=request)
    monkeypatch.setenv('DEEPSEEK', 'test-key')
    monkeypatch.setattr(diagnostics.httpx, 'Client', lambda **kwargs: real(transport=httpx.MockTransport(handler), **kwargs))
    app.dependency_overrides[current_user] = lambda: {'id':'test'}
    try:
        with TestClient(app) as client:
            response = client.post('/api/ai/diagnostics/deepseek', json={'model':'deepseek-flash','messages':[]})
            data = response.json()
            assert data['backend_endpoint'] == '/api/ai/diagnostics/deepseek'
            assert data['error']['type'] == 'ConnectError'
            assert data['request']['headers']['Content-Type'] == 'application/json'
            assert 'elapsed_ms' in data
            assert 'test-key' not in response.text
    finally:
        app.dependency_overrides.pop(current_user, None)
