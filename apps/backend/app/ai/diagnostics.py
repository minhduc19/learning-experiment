"""Explicit diagnostic requests to the two configured AI providers."""
import os
from time import monotonic
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends
from app.auth.dependencies import current_user
from app.corpus.routes import CorpusRoute
from app.lessons.routes import read_json

router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])
MAX_RESPONSE = 65536


@router.post('/{provider}')
def diagnose(provider: Literal['deepseek', 'elevenlabs'], body: Annotated[object, Depends(read_json)]):
    if provider == 'deepseek':
        url = 'https://api.deepseek.com/chat/completions'
        secret = os.getenv('DEEPSEEK', '').strip()
        auth = {'Authorization': 'Bearer ' + secret}
    else:
        url = 'https://api.elevenlabs.io/v1/text-to-speech/MI36FIkp9wRP7cpWKPTl?output_format=mp3_44100_128'
        secret = os.getenv('ELEVEN', '').strip()
        auth = {'xi-api-key': secret}
    result = {'request': {'method': 'POST', 'url': url, 'headers': {**{key: '[REDACTED]' for key in auth}, 'Content-Type': 'application/json'}, 'body': body}, 'configured': bool(secret), 'backend_endpoint': '/api/ai/diagnostics/' + provider}
    if not secret:
        return {**result, 'error': 'Provider key is not configured. Set the DEEPSEEK or ELEVEN Actions secret and redeploy.'}
    started = monotonic()
    try:
        with httpx.Client(timeout=45) as client:
            with client.stream('POST', url, headers={**auth, 'Content-Type': 'application/json'}, json=body) as response:
                content = bytearray()
                truncated = False
                for chunk in response.iter_bytes():
                    if len(content) + len(chunk) > MAX_RESPONSE:
                        content.extend(chunk[:MAX_RESPONSE-len(content)])
                        truncated = True
                        break
                    content.extend(chunk)
                    if monotonic()-started > 60:
                        raise TimeoutError('Response exceeded the diagnostic deadline')
                binary = response.headers.get('content-type', '').startswith('audio/')
                headers = {key: value for key, value in response.headers.items() if key.lower() not in ('set-cookie', 'authorization', 'xi-api-key')}
                result['response'] = {'status': response.status_code, 'headers': headers, 'body': '[Audio bytes; use Generate option audio to save and play recordings]' if binary else content.decode('utf-8', errors='replace'), 'captured_bytes': len(content), 'truncated': truncated}
    except (httpx.HTTPError, TimeoutError) as failure:
        result['error'] = {'type': type(failure).__name__, 'message': str(failure)}
    result['elapsed_ms'] = round((monotonic()-started)*1000)
    # A provider may reflect a credential in its error body. Never return it.
    def redact(value):
        if isinstance(value, str):
            return value.replace(secret, '[REDACTED]')
        if isinstance(value, dict):
            return {redact(key): redact(item) for key, item in value.items()}
        if isinstance(value, list):
            return [redact(item) for item in value]
        return value
    return redact(result)
