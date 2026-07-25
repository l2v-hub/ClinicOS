"""Azure OpenAI provider adapter (REQ-023). Azure/Agno SDK imported ONLY here.
Credentials/endpoint via AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT (env).

Espone due modalita', come faceva l'adapter Mistral Document AI:
  - run(prompt, attachments)             -> str  (chat multimodale via Agno)
  - run_structured(prompt, schema, atts) -> str  (JSON conforme allo schema)
`extraction.run_extraction()` preferisce run_structured quando presente: lo schema
viaggia in `response_format`, quindi il modello e' vincolato a compilare i campi
(farmaci/terapie inclusi) invece di riceverli come suggerimento nel prompt.
La chiamata strutturata usa l'API v1 via stdlib urllib (nessuna dipendenza nuova),
sullo stesso endpoint ROOT e con la stessa chiave gia' usati da Agno.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import urllib.error
import urllib.request

from ..errors import ProviderUnavailableError, RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel


class _AzureRunner:
    """Runner multimodale: gli allegati dell'import (foto/PDF) vengono passati ad Agno
    come Image/File — il runner generico di _common li scarterebbe (solo testo)."""

    def __init__(self, spec: ModelSpec, temperature: float, timeout_seconds: int) -> None:
        self._spec = spec
        self._temperature = temperature
        self._timeout = timeout_seconds

    def _build_agent(self):
        try:
            from agno.agent import Agent
            from agno.models.azure import AzureOpenAI
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno/Azure SDK non installato: {ex}") from ex
        return Agent(model=AzureOpenAI(id=self._spec.model_id, temperature=self._temperature),
                     markdown=False, telemetry=False)

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        agent = self._build_agent()
        try:
            from agno.media import Image, File
        except ImportError:
            Image = File = None  # type: ignore

        images, files = [], []
        for a in attachments:
            if a.mime_type.startswith("image/") and Image is not None:
                images.append(Image(content=a.data))
            elif File is not None:
                files.append(File(content=a.data, mime_type=a.mime_type))

        def _call():
            kwargs = {}
            if images:
                kwargs["images"] = images
            if files:
                kwargs["files"] = files
            return agent.run(prompt, **kwargs)

        try:
            resp = await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:
            msg = str(ex)
            kind = ErrorKind.RATE_LIMIT if "429" in msg or "quota" in msg.lower() else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Azure: {msg[:200]}") from ex

        # Agno può catturare l'errore provider e restituirlo come RunOutput status=ERROR:
        # deve emergere come errore reale, non essere restituito come completion (issue #239).
        status = getattr(resp, "status", None)
        if status is not None and str(getattr(status, "value", status)).upper() == "ERROR":
            detail = str(getattr(resp, "content", None) or "provider error")[:200]
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"Azure: {detail}")
        return getattr(resp, "content", None) or str(resp)


    # --- estrazione vincolata dallo schema -------------------------------------
    # Le immagini viaggiano come content-part `image_url`, gli altri allegati (PDF)
    # come content-part `file`: entrambe le forme sono state verificate sul
    # deployment reale. `strict` resta False perche' lo schema ClinicOS e' draft-07
    # e non soddisfa il sottoinsieme strict (che pretende ogni proprieta' in required).
    def _structured_body(self, prompt: str, schema: object, attachments: list[Attachment]) -> dict:
        content: list[dict] = [{"type": "text", "text": prompt}]
        for a in attachments:
            b64 = base64.b64encode(a.data).decode("ascii")
            if a.mime_type.startswith("image/"):
                content.append({"type": "image_url",
                                "image_url": {"url": f"data:{a.mime_type};base64,{b64}"}})
            else:
                content.append({"type": "file",
                                "file": {"filename": a.filename,
                                         "file_data": f"data:{a.mime_type};base64,{b64}"}})
        return {
            "model": self._spec.model_id,
            "messages": [{"role": "user", "content": content}],
            "response_format": {"type": "json_schema",
                                "json_schema": {"name": "clinicos_extraction",
                                                "strict": False,
                                                "schema": schema}},
        }

    async def run_structured(self, prompt: str, schema: object, attachments: list[Attachment]) -> str:
        endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").strip().rstrip("/")
        key = (os.environ.get("AZURE_OPENAI_API_KEY") or "").strip()
        if not endpoint or not key:
            raise ProviderUnavailableError(
                "AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY non configurati")
        url = f"{endpoint}/openai/v1/chat/completions"

        def _call() -> str:
            # base64 + serializzazione stanno DENTRO il thread: su un import multi-foto
            # l'encoding degli allegati non deve bloccare l'event loop.
            payload = json.dumps(self._structured_body(prompt, schema, attachments)).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload, method="POST",
                headers={"Content-Type": "application/json", "api-key": key})
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return (data.get("choices") or [{}])[0].get("message", {}).get("content") or ""

        try:
            return await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout + 30)
        except urllib.error.HTTPError as ex:
            # HTTPError deriva da URLError: va intercettato per primo.
            # Il corpo puo' contenere il messaggio del provider ma mai la chiave: e' negli header.
            detail = ""
            try:
                detail = ex.read().decode("utf-8", "replace")[:200]
            except Exception:  # pragma: no cover - corpo non leggibile
                pass
            kind = ErrorKind.RATE_LIMIT if ex.code == 429 else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Azure structured: HTTP {ex.code} {detail}") from ex
        except (asyncio.TimeoutError, TimeoutError) as ex:
            # Il timeout del socket (self._timeout) scatta sempre prima di quello esterno
            # (+30s): urllib NON incapsula il timeout in attesa di risposta, quindi arriva qui
            # come TimeoutError grezzo. Va classificato TIMEOUT, non PROVIDER_ERROR, altrimenti
            # "Azure e' lento" e "Azure ha rifiutato" diventano indistinguibili nei log.
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except urllib.error.URLError as ex:
            # In fase di connessione urllib incapsula l'OSError: recupera il timeout dal reason.
            if isinstance(getattr(ex, "reason", None), TimeoutError):
                raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR,
                                f"Azure structured: {str(ex.reason)[:200]}") from ex
        except Exception as ex:
            msg = str(ex)
            kind = ErrorKind.RATE_LIMIT if "429" in msg or "quota" in msg.lower() else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Azure structured: {msg[:200]}") from ex


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_AzureRunner(spec, temperature, timeout_seconds))
