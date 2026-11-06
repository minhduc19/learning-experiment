"""Authenticated, server-side DeepSeek exercise generation."""

import asyncio
import json
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI
from pydantic import Field, model_validator

from app.auth.dependencies import current_user
from app.corpus.routes import CorpusRoute
from app.lessons.routes import Lesson, Model, read_json, validate

MODEL = "deepseek-flash"
BASE_URL = "https://api.deepseek.com"
TIMEOUT_SECONDS = 110
slots = asyncio.Semaphore(2)


class Prompts(Model):
    system_prompt: str = Field(min_length=1, max_length=50000)
    user_prompt: str = Field(min_length=1, max_length=100000)

    @model_validator(mode="after")
    def nonblank(self):
        if not self.system_prompt.strip() or not self.user_prompt.strip():
            raise ValueError("Both prompts must contain text")
        return self


router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])


@router.post("/exercises")
async def generate_exercises(raw: Annotated[object, Depends(read_json)]):
    prompts = validate(Prompts, raw)
    key = os.getenv("DEEPSEEK", "").strip()
    if not key:
        raise HTTPException(
            503,
            "DeepSeek is not configured. Set the DEEPSEEK GitHub Actions secret and redeploy.",
        )
    if slots.locked():
        raise HTTPException(429, "AI generation is busy. Please try again shortly.")
    try:
        # No automatic retries: another paid generation is always explicit.
        async with (
            slots,
            asyncio.timeout(TIMEOUT_SECONDS),
            AsyncOpenAI(
                api_key=key, base_url=BASE_URL, timeout=TIMEOUT_SECONDS, max_retries=0
            ) as client,
        ):
            response = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": prompts.system_prompt},
                    {"role": "user", "content": prompts.user_prompt},
                ],
                response_format={"type": "json_object"},
            )
    except (APITimeoutError, TimeoutError):
        raise HTTPException(
            504, "DeepSeek took too long. Your prompts are preserved; try again."
        ) from None
    except APIConnectionError:
        raise HTTPException(
            502, "Could not reach DeepSeek. Your prompts are preserved; try again."
        ) from None
    except APIStatusError as error:
        if error.status_code in (401, 403):
            raise HTTPException(
                503,
                "DeepSeek rejected the credentials. Check the DEEPSEEK secret and redeploy.",
            ) from None
        if error.status_code == 429:
            raise HTTPException(
                429, "DeepSeek is rate limited. Please try again later."
            ) from None
        raise HTTPException(
            502,
            "DeepSeek rejected the generation request. Check deepseek-flash availability and prompt size.",
        ) from None
    if not response.choices or not response.choices[0].message.content:
        raise HTTPException(
            502, "DeepSeek returned no exercise text. Please try again."
        )
    content = response.choices[0].message.content
    if not isinstance(content, str):
        raise HTTPException(
            502, "DeepSeek returned an unsupported response. Please try again."
        )
    if len(content.encode("utf-8")) > 1048576:
        raise HTTPException(
            502,
            "DeepSeek returned more than the lesson editor's 1 MiB limit. Generate fewer vocabulary items.",
        )
    warning = None
    try:
        data = json.loads(content)
        Lesson.model_validate(data)
    except ValueError:
        warning = "The AI response needs editing before it can be saved. Fix the validation errors in the lesson editor."
    if response.choices[0].finish_reason == "length":
        warning = "DeepSeek truncated the response. Review or repair the JSON, or send fewer vocabulary items."
    # Preserve invalid/partial output for repair instead of discarding a paid response.
    return {"text": content, "warning": warning}
