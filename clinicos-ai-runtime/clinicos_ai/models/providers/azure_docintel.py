"""Azure AI Document Intelligence (prebuilt-layout) — adapter OCR con analisi di layout.

Sostituisce la capacita' persa con il ritiro di Mistral Document AI: un modello visivo
generalista ricostruisce il testo ma non ha un vero modello del layout, e su un elenco
di terapia allineato in colonne perde dose e posologia. Document Intelligence restituisce
il documento riga per riga, con le coordinate (`polygon`) di ogni riga, e sa emettere
direttamente markdown con le intestazioni inferite dagli stili visivi — cioe' esattamente
cio' su cui `parseNarrativeFromMarkdown` lato backend sa segmentare.

Vive sulla stessa risorsa Azure gia' configurata: nessun endpoint e nessuna chiave nuovi.
  AZURE_OPENAI_ENDPOINT   root della risorsa (senza suffissi)
  AZURE_OPENAI_API_KEY    chiave della risorsa
Opzionali: AZURE_DOCINTEL_ENDPOINT / AZURE_DOCINTEL_API_KEY se il servizio venisse spostato
su una risorsa dedicata.

model_id = nome del modello prebuilt, di norma `prebuilt-layout`.
Espone il solo `run(prompt, attachments)`: e' un OCR, non un modello di chat — il prompt
viene ignorato e il testo torna cosi' com'e'. Stdlib urllib, nessuna dipendenza nuova.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import time
import urllib.error
import urllib.request

from ..errors import ProviderUnavailableError, RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel

API_VERSION = "2024-11-30"
# Analisi in volo contemporaneamente. Oltre questa soglia il servizio inizia a rispondere 429
# e il parallelismo si trasforma in ritardo. Regolabile senza rilascio.
_MAX_PARALLEL_PAGES = max(1, int(os.environ.get("AZURE_DOCINTEL_MAX_PARALLEL") or 4))


def _endpoint_and_key() -> tuple[str, str]:
    endpoint = (
        os.environ.get("AZURE_DOCINTEL_ENDPOINT") or os.environ.get("AZURE_OPENAI_ENDPOINT") or ""
    ).strip().rstrip("/")
    key = (
        os.environ.get("AZURE_DOCINTEL_API_KEY") or os.environ.get("AZURE_OPENAI_API_KEY") or ""
    ).strip()
    if not endpoint or not key:
        raise ProviderUnavailableError(
            "Endpoint/chiave Document Intelligence non configurati "
            "(AZURE_DOCINTEL_* oppure AZURE_OPENAI_*)"
        )
    return endpoint, key


class _DocIntelRunner:
    def __init__(self, spec: ModelSpec, timeout_seconds: int) -> None:
        self._spec = spec
        self._timeout = timeout_seconds

    def _analyze_one(self, att: Attachment, endpoint: str, key: str) -> str:
        """Analizza UN documento e restituisce il markdown. Bloccante: girare in un thread."""
        url = (
            f"{endpoint}/documentintelligence/documentModels/{self._spec.model_id}:analyze"
            f"?api-version={API_VERSION}&outputContentFormat=markdown"
        )
        body = json.dumps({"base64Source": base64.b64encode(att.data).decode("ascii")}).encode()
        req = urllib.request.Request(
            url, data=body, method="POST",
            headers={"Content-Type": "application/json", "Ocp-Apim-Subscription-Key": key})
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            # L'analisi e' asincrona: 202 + Operation-Location da interrogare.
            operation = resp.headers.get("Operation-Location")
        if not operation:
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR,
                                "Document Intelligence: Operation-Location assente")

        deadline = time.monotonic() + self._timeout
        while time.monotonic() < deadline:
            poll = urllib.request.Request(operation, headers={"Ocp-Apim-Subscription-Key": key})
            with urllib.request.urlopen(poll, timeout=self._timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            status = (data.get("status") or "").lower()
            if status == "succeeded":
                return (data.get("analyzeResult") or {}).get("content") or ""
            if status in ("failed", "canceled"):
                detail = str(data.get("error") or "analisi non riuscita")[:200]
                raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"Document Intelligence: {detail}")
            time.sleep(1.0)
        raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s")

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:  # noqa: ARG002
        if not attachments:
            return ""
        endpoint, key = _endpoint_and_key()

        # Le pagine sono indipendenti: analizzarle in PARALLELO fa scendere il tempo totale da
        # "somma delle pagine" a "pagina piu' lenta". Il numero di analisi in volo e' limitato
        # per non farsi throttlare dal servizio (429) su import corposi.
        sem = asyncio.Semaphore(_MAX_PARALLEL_PAGES)

        async def _one(att: Attachment) -> str:
            async with sem:
                return await asyncio.to_thread(self._analyze_one, att, endpoint, key)

        try:
            # gather preserva l'ORDINE degli allegati, che e' quello deciso dall'operatore: la
            # continuita' fra le pagine (Anamnesi/Decorso/Terapia) dipende da quell'ordine.
            budget = self._timeout * 2 + 30
            parts = await asyncio.wait_for(
                asyncio.gather(*(_one(a) for a in attachments)), timeout=budget)
            return "\n\n".join(p for p in parts if p.strip())
        except RuntimeError_:
            raise
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except urllib.error.HTTPError as ex:
            detail = ""
            try:
                detail = ex.read().decode("utf-8", "replace")[:200]
            except Exception:  # pragma: no cover - corpo non leggibile
                pass
            kind = ErrorKind.RATE_LIMIT if ex.code == 429 else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Document Intelligence: HTTP {ex.code} {detail}") from ex
        except urllib.error.URLError as ex:
            if isinstance(getattr(ex, "reason", None), TimeoutError):
                raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR,
                                f"Document Intelligence: {str(ex.reason)[:200]}") from ex
        except Exception as ex:
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR,
                                f"Document Intelligence: {str(ex)[:200]}") from ex


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_DocIntelRunner(spec, timeout_seconds))
