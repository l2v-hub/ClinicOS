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
from ._common import classify_provider_exception, sdk_retry_kwargs
from .completion import CompletionMetadataMixin, agent_completion, completion_text, response_reason


# Sforzo di ragionamento dell'estrazione dai documenti (ruolo vision). Facoltativo: senza la
# variabile la richiesta resta identica a prima. Compilare campi da un testo gia' trascritto non
# richiede il ragionamento pieno di un modello di fascia alta, che e' la parte lenta della chiamata.
_REASONING_EFFORTS = ("minimal", "low", "medium", "high")
_EXTRACTION_ROLES = ("vision", "extraction")


def extraction_reasoning_effort(role: str, env=os.environ) -> str | None:
    if role not in _EXTRACTION_ROLES:
        return None
    value = (env.get("AI_EXTRACTION_REASONING_EFFORT") or "").strip().lower()
    return value if value in _REASONING_EFFORTS else None


def strict_compatible(schema: object) -> bool:
    """True quando lo schema rispetta il sottoinsieme «strict» degli output strutturati: ogni
    oggetto dichiara `additionalProperties: false` ed elenca in `required` tutte le sue proprieta'.
    In quel caso il modello e' VINCOLATO allo schema (niente JSON malformato, niente campi omessi)."""
    if not isinstance(schema, dict):
        return False
    kind = schema.get("type")
    if kind == "object":
        props = schema.get("properties")
        if not isinstance(props, dict) or schema.get("additionalProperties") is not False:
            return False
        if sorted(schema.get("required") or []) != sorted(props):
            return False
        return all(strict_compatible(child) for child in props.values())
    if kind == "array":
        return strict_compatible(schema.get("items"))
    return kind in ("string", "number", "integer", "boolean")


class _AzureRunner:
    """Runner multimodale: gli allegati dell'import (foto/PDF) vengono passati ad Agno
    come Image/File — il runner generico di _common li scarterebbe (solo testo)."""

    def __init__(self, spec: ModelSpec, temperature: float, timeout_seconds: int,
                 role: str = "") -> None:
        self._spec = spec
        self._temperature = temperature
        self._timeout = timeout_seconds
        self._role = role

    def _build_agent(self):
        try:
            from agno.agent import Agent
            from agno.models.azure import AzureOpenAI
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno/Azure SDK non installato: {ex}") from ex
        class CompletionAzure(CompletionMetadataMixin, AzureOpenAI):
            pass

        return Agent(model=CompletionAzure(id=self._spec.model_id, temperature=self._temperature,
                                           **sdk_retry_kwargs(AzureOpenAI)),
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
            kind = classify_provider_exception(ex)
            raise RuntimeError_(kind, f"Azure: {msg[:200]}") from ex

        return agent_completion(resp, "Azure")


    # --- estrazione vincolata dallo schema -------------------------------------
    # Le immagini viaggiano come content-part `image_url`, gli altri allegati (PDF)
    # come content-part `file`: entrambe le forme sono state verificate sul
    # deployment reale. `strict` resta False perche' lo schema ClinicOS e' draft-07
    # e non soddisfa il sottoinsieme strict (che pretende ogni proprieta' in required).
    @staticmethod
    def _looks_like_json_schema(schema: object) -> bool:
        """Un chiamante puo' passare un ESEMPIO di output invece di uno schema (e' successo con
        la trascrizione: `{"rawText": ""}`). Azure risponderebbe 400 e, siccome quei passaggi sono
        best-effort e incapsulati in try/except, il guasto sparirebbe in silenzio. Meglio
        riconoscerlo e degradare al percorso prompt, che con un esempio funziona comunque."""
        return isinstance(schema, dict) and (
            "type" in schema or "properties" in schema or "$schema" in schema
        )

    def _structured_body(self, prompt: str, schema: object, attachments: list[Attachment],
                         strict: bool | None = None) -> dict:
        text = prompt
        if self._looks_like_json_schema(schema):
            # Lo schema storico ClinicOS (draft-07, proprieta' facoltative) resta non vincolato;
            # uno schema che rispetta il sottoinsieme strict viene chiesto in modalita' vincolata.
            response_format: dict = {"type": "json_schema",
                                     "json_schema": {"name": "clinicos_extraction",
                                                     "strict": strict_compatible(schema) if strict is None else strict,
                                                     "schema": schema}}
        else:
            # Esempio di output invece di uno schema: niente json_schema (sarebbe un 400),
            # si mostra l'esempio nel prompt e si impone comunque un JSON valido.
            text = f"{prompt}\n\nFORMATO DI OUTPUT (esempio):\n{json.dumps(schema)}"
            response_format = {"type": "json_object"}
        content: list[dict] = [{"type": "text", "text": text}]
        for a in attachments:
            b64 = base64.b64encode(a.data).decode("ascii")
            if a.mime_type.startswith("image/"):
                content.append({"type": "image_url",
                                "image_url": {"url": f"data:{a.mime_type};base64,{b64}"}})
            else:
                content.append({"type": "file",
                                "file": {"filename": a.filename,
                                         "file_data": f"data:{a.mime_type};base64,{b64}"}})
        body = {
            "model": self._spec.model_id,
            "messages": [{"role": "user", "content": content}],
            "response_format": response_format,
        }
        effort = extraction_reasoning_effort(self._role)
        if effort:
            body["reasoning_effort"] = effort
        return body

    async def run_structured(self, prompt: str, schema: object, attachments: list[Attachment]) -> str:
        endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").strip().rstrip("/")
        key = (os.environ.get("AZURE_OPENAI_API_KEY") or "").strip()
        if not endpoint or not key:
            raise ProviderUnavailableError(
                "AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY non configurati")
        url = f"{endpoint}/openai/v1/chat/completions"

        def _post(body: dict) -> dict:
            payload = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload, method="POST",
                headers={"Content-Type": "application/json", "api-key": key})
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))

        def _call() -> str:
            # base64 + serializzazione stanno DENTRO il thread: su un import multi-foto
            # l'encoding degli allegati non deve bloccare l'event loop.
            body = self._structured_body(prompt, schema, attachments)
            optional = body["response_format"].get("json_schema", {}).get("strict") or "reasoning_effort" in body
            try:
                data = _post(body)
            except urllib.error.HTTPError as ex:
                # La modalita' vincolata e lo sforzo di ragionamento dipendono dal modello
                # distribuito: se il fornitore rifiuta la richiesta (400) si ripete UNA volta
                # nella forma di sempre, invece di far fallire l'importazione.
                if ex.code != 400 or not optional:
                    raise
                ex.close()
                plain = self._structured_body(prompt, schema, attachments, strict=False)
                plain.pop("reasoning_effort", None)
                data = _post(plain)
            choice = (data.get("choices") or [{}])[0]
            message = choice.get("message") or {}
            if message.get("refusal"):
                raise RuntimeError_(ErrorKind.OUTPUT_INCOMPLETE, "Il provider ha rifiutato l'estrazione.",
                                    finish_reason="refusal")
            return completion_text(message.get("content") or "", response_reason(choice))

        try:
            return await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout + 30)
        except RuntimeError_:
            raise
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
            kind = classify_provider_exception(ex)
            raise RuntimeError_(kind, f"Azure structured: {msg[:200]}") from ex


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_AzureRunner(spec, temperature, timeout_seconds, role))
