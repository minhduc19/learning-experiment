"""Shared prompt fields for lesson questions and reading checkpoints."""
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, model_validator


class PromptFields(BaseModel):
    text_prompt: str = Field(alias="text-prompt", min_length=1, max_length=20000)
    text_prompt_available: bool = Field(default=True, alias="text-prompt-available", strict=True)
    audio_prompt: str | None = Field(default=None, alias="audio-prompt", max_length=4000)

    @model_validator(mode="before")
    @classmethod
    def legacy_prompt(cls, value):
        if not isinstance(value, dict):
            return value
        value = dict(value)
        for key in ("sentence", "prompt"):
            if key in value:
                if "text-prompt" in value and value["text-prompt"] != value[key]:
                    raise ValueError("Conflicting legacy and text-prompt fields")
                value["text-prompt"] = value.pop(key)
        return value

    @model_validator(mode="after")
    def valid_audio_prompt(self):
        if self.audio_prompt is not None:
            try:
                url = urlsplit(self.audio_prompt)
                valid = (
                    url.scheme in ("http", "https") and bool(url.hostname)
                    and not url.username and not url.password
                    and not any(c.isspace() for c in self.audio_prompt)
                )
            except ValueError:
                valid = False
            if not valid:
                raise ValueError("audio-prompt must be an HTTP(S) audio URL")
        return self
