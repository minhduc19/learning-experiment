from fastapi.testclient import TestClient

from app.main import app


def test_openapi_is_available_under_api_prefix():
    client = TestClient(app)
    response = client.get('/api/openapi.json')
    assert response.status_code == 200
    schema = response.json()
    assert schema['openapi'].startswith('3.')
    assert '/api/readings' in schema['paths']
    assert 'post' in schema['paths']['/api/readings']
    assert 'get' in schema['paths']['/api/readings/{reading_id}']
    assert '/api/health/db' in schema['paths']
    assert 'ReadingCreate' in schema['components']['schemas']
    assert '/api/docs' not in schema['paths']
    assert '/api/openapi.json' not in schema['paths']
    assert client.get('/openapi.json').json() == schema


def test_swagger_docs_use_the_proxied_schema_and_keep_original_docs():
    client = TestClient(app)
    response = client.get('/api/docs')
    assert response.status_code == 200
    assert 'text/html' in response.headers['content-type']
    assert '/api/openapi.json' in response.text
    assert 'SwaggerUIBundle' in response.text
    assert client.get('/docs').status_code == 200
    assert client.get('/redoc').status_code == 200
