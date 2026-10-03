"""OpenAI API Direct adapter (Phase 9 primary provider). The ONLY module importing the OpenAI SDK
for LLM calls.

- Responses API (`client.responses.create`) for text, multimodal input and structured output.
- AsyncOpenAI with max_retries=0: no hidden SDK retries (retry policy lives in the application:
  interactive calls fall back to deterministic paths instead of retrying).
- Real cancellation: the coroutine is awaited, so a cancelled request aborts the HTTP call.
- Every vendor outcome is normalized: errors → ErrorKind via errors.classify_exception,
  incomplete/refusal → OUTPUT_TRUNCATED / CONTENT_REJECTED, usage → contract.Usage fields.
- Credentials: OPENAI_API_KEY (+ optional OPENAI_BASE_URL / OPENAI_ORG_ID), read here only.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import Any

from ..errors import ErrorKind, ProviderUnavailableError, RuntimeError_, classify_exception
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel
from .completion import CompletionText

_TRUNCATED = {"max_output_tokens", "max_tokens", "length"}


def _looks_like_json_schema(schema: object) -> bool:
    return isinstance(schema, dict) and ("type" in schema or "properties" in schema or "$schema" in schema)


def _get(obj: Any, key: str) -> Any:
    return obj.get(key) if isinstance(obj, dict) else getattr(obj, key, None)


def completion_from_response(resp: Any) -> CompletionText:
    """Responses API object (or dict) → CompletionText with finish reason + usage. Public for tests."""
    from ..contract import usage_from_metrics

    status = str(_get(resp, "status") or "completed").lower()
    if status == "failed":
        error = _get(resp, "error") or {}
        raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"OpenAI: {str(_get(error, 'code') or 'failed')[:80]}")
    if status in ("cancelled", "canceled"):
        raise RuntimeError_(ErrorKind.CANCELLED, "OpenAI: risposta annullata")
    texts: list[str] = []
    for item in _get(resp, "output") or []:
        for part in _get(item, "content") or []:
            kind = _get(part, "type")
            if kind == "refusal":
                raise RuntimeError_(ErrorKind.CONTENT_REJECTED, "Il provider ha rifiutato la richiesta.",
                                    finish_reason="refusal")
            if kind == "output_text":
                texts.append(str(_get(part, "text") or ""))
    text = "".join(texts) if texts else str(_get(resp, "output_text") or "")
    if status == "incomplete":
        reason = str(_get(_get(resp, "incomplete_details") or {}, "reason") or "incomplete").lower()
        if reason in _TRUNCATED:
            raise RuntimeError_(ErrorKind.OUTPUT_TRUNCATED, "Il provider ha troncato l'output.",
                                finish_reason=reason, truncated=True)
        if reason == "content_filter":
            raise RuntimeError_(ErrorKind.CONTENT_REJECTED, "Il provider ha filtrato il contenuto.",
                                finish_reason="content_filter")
        raise RuntimeError_(ErrorKind.OUTPUT_INCOMPLETE, "Il provider non ha completato l'output.",
                            finish_reason=reason)
    return CompletionText(text, "completed", usage_from_metrics(_get(resp, "usage")) or None)


class _OpenAIRunner:
    def __init__(self, spec: ModelSpec, temperature: float | None, timeout_seconds: int) -> None:
        self._spec = spec
        self._temperature = temperature
        self._timeout = timeout_seconds

    def _client(self):
        try:
            from openai import AsyncOpenAI
        except ImportError as ex:  # pragma: no cover - dependency missing
            raise ProviderUnavailableError(f"SDK OpenAI non installato: {ex}") from ex
        key = (os.environ.get("OPENAI_API_KEY") or "").strip()
        if not key:
            raise RuntimeError_(ErrorKind.CREDENTIALS, "OPENAI_API_KEY non configurata")
        return AsyncOpenAI(api_key=key, base_url=(os.environ.get("OPENAI_BASE_URL") or None),
                           organization=(os.environ.get("OPENAI_ORG_ID") or None),
                           timeout=self._timeout, max_retries=0)

    @staticmethod
    def _content(prompt: str, attachments: list[Attachment]) -> list[dict]:
        content: list[dict] = [{"type": "input_text", "text": prompt}]
        for a in attachments:
            data_url = f"data:{a.mime_type};base64,{base64.b64encode(a.data).decode('ascii')}"
            if a.mime_type.startswith("image/"):
                content.append({"type": "input_image", "image_url": data_url})
            else:
                content.append({"type": "input_file", "filename": a.filename or "document", "file_data": data_url})
        return content

    def _base_args(self, prompt: str, attachments: list[Attachment]) -> dict:
        args: dict = {"model": self._spec.model_id,
                      "input": [{"role": "user", "content": self._content(prompt, attachments)}],
                      "store": False}
        if self._temperature is not None:
            args["temperature"] = self._temperature
        max_out = (os.environ.get("AI_MAX_OUTPUT_TOKENS") or "").strip()
        if max_out.isdigit() and int(max_out) > 0:
            args["max_output_tokens"] = int(max_out)
        return args

    async def _create(self, args: dict) -> CompletionText:
        client = self._client()
        try:
            resp = await asyncio.wait_for(client.responses.create(**args), timeout=self._timeout + 5)
            return completion_from_response(resp)
        except RuntimeError_:
            raise
        except asyncio.CancelledError:
            raise
        except (asyncio.TimeoutError, TimeoutError) as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:  # SDK/transport → normalized kind; message trimmed, never the key
            kind = classify_exception(ex)
            status = getattr(ex, "status_code", None)
            raise RuntimeError_(kind, f"OpenAI {type(ex).__name__}{f' HTTP {status}' if status else ''}") from ex
        finally:
            await client.close()

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        return await self._create(self._base_args(prompt, attachments))

    async def run_structured(self, prompt: str, schema: object, attachments: list[Attachment]) -> str:
        if _looks_like_json_schema(schema):
            args = self._base_args(prompt, attachments)
            args["text"] = {"format": {"type": "json_schema", "name": "clinicos_output",
                                       "schema": schema, "strict": False}}
        else:
            # An example object instead of a schema: show it and require JSON (json_object mode
            # needs the word JSON in the input).
            args = self._base_args(f"{prompt}\n\nRispondi in JSON. FORMATO (esempio):\n{json.dumps(schema)}",
                                   attachments)
            args["text"] = {"format": {"type": "json_object"}}
        return await self._create(args)


def build(spec: ModelSpec, role: str, temperature: float | None, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_OpenAIRunner(spec, temperature, timeout_seconds))
