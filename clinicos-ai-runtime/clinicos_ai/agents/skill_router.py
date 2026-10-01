"""Phase 3: Agno skill router. Turns ONE user message into {skill, slots} over the skills the
backend says the CURRENT user may use (already filtered by the ClinicOS policy).

The runtime never executes anything and never confirms anything: the backend validates the route
(skill must be in the offered list, known value keys only), runs the workflow, asks for explicit
confirmation and invokes the Tool Layer, which re-authorizes every call. Provider-neutral: uses the
'agent' role model (an Agno Agent). The mock provider returns an EMPTY route (never invents).
Logs are sanitized: skill id and slot NAMES only, never the message or clinical values.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from ..models.registry import ModelRegistry
from .assistant import _run_with_provider_log, parse_plan_json
from .untrusted import UNTRUSTED_RULE, fence

_log = logging.getLogger("clinicos_ai.skill_router")

SKILL_ROUTE_MARKER = "SKILL_ROUTE_V1"

EMPTY_ROUTE: dict[str, Any] = {"skillId": None}

_SYSTEM = (
    f"{SKILL_ROUTE_MARKER}\n"
    "Sei l'interprete delle richieste dell'assistente operativo ClinicOS (RSA/struttura sanitaria). "
    "Dato il MESSAGGIO dell'operatore, scegli AL MASSIMO UNA skill tra quelle ELENCATE (sono le sole "
    "che l'operatore può usare) ed estrai i dati presenti nel messaggio. Regole:\n"
    "- usa SOLO gli id di skill elencati; se nessuna è adatta usa skillId null;\n"
    "- se invece la richiesta corrisponde a una SKILL NON CONSENTITA restituisci il SUO id (il sistema "
    "risponderà che non è autorizzata): non ripiegare su una skill consentita diversa;\n"
    "- non inventare: estrai solo ciò che è scritto; non dedurre valori clinici;\n"
    "- patientQuery: nome e/o cognome dell'ospite come scritto (es. \"Mario Rossi\"); se il messaggio "
    "dice 'questo ospite/paziente', 'lui', 'lei' usa currentPatient true;\n"
    "- values: parametri vitali con le sole chiavi ammesse (VALUE_KEYS), numeri come scritti (pa SEMPRE come sistolica/diastolica, es. \"128 su 82\" → \"128/82\"): pa "
    "\"120/80\", spo2 \"97\", fc \"72\", temperatura \"36.8\", fr \"18\", dtx \"110\", o2 \"si\"|\"no\", "
    "coscienza A|C|V|P|U;\n"
    "- text: il testo da scrivere (osservazione/consegna) ESATTAMENTE come dettato, senza riscriverlo;\n"
    "- date: YYYY-MM-DD solo se il messaggio indica un giorno (oggi/domani/ieri/data), usando OGGI;\n"
    "- query: il termine da cercare (farmaco, ospite) o la domanda sulla cartella;\n"
    "- se c'è una DOMANDA IN SOSPESO, il messaggio è la risposta a quella domanda: riempi quello slot.\n"
    "Non confermare mai operazioni e non aggiungere spiegazioni. Rispondi SOLO con JSON: "
    "{\"skillId\": string|null, \"patientQuery\": string|null, \"currentPatient\": boolean, "
    "\"values\": object, \"text\": string|null, \"date\": string|null, \"query\": string|null}."
)


def sanitize_route(raw: dict[str, Any] | None, allowed: set[str]) -> dict[str, Any]:
    """Defence in depth (the backend validates again): unknown skills become null."""
    if not isinstance(raw, dict):
        return dict(EMPTY_ROUTE)
    out: dict[str, Any] = {}
    skill = raw.get("skillId")
    out["skillId"] = skill if isinstance(skill, str) and skill in allowed else None
    for key in ("patientQuery", "text", "date", "query"):
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            out[key] = value.strip()
    if raw.get("currentPatient") is True:
        out["currentPatient"] = True
    values = raw.get("values")
    if isinstance(values, dict):
        clean = {k: str(v) for k, v in values.items() if isinstance(v, (str, int, float)) and str(v).strip()}
        if clean:
            out["values"] = clean
    return out


async def run_skill_route(registry: ModelRegistry, message: str, skills: list[dict], pending: dict | None,
                          today: str, value_keys: list[str],
                          correlation_id: str | None = None,
                          forbidden: list[dict] | None = None) -> dict[str, Any]:
    built = registry.build("agent")
    forbidden = forbidden or []
    allowed = {s.get("id") for s in [*skills, *forbidden]
               if isinstance(s, dict) and isinstance(s.get("id"), str)}
    prompt = (
        f"{_SYSTEM}\n\n{UNTRUSTED_RULE}\n\nOGGI: {today}\nVALUE_KEYS: {json.dumps(value_keys)}\n"
        f"SKILL DISPONIBILI:\n{json.dumps(skills, ensure_ascii=False)}\n"
        f"SKILL NON CONSENTITE (solo per riconoscerle, id e nome):\n"
        f"{json.dumps(forbidden, ensure_ascii=False)}\n"
        f"DOMANDA IN SOSPESO: {json.dumps(pending, ensure_ascii=False) if pending else 'nessuna'}\n\n"
        f"MESSAGGIO (scegli solo tra le SKILL DISPONIBILI; non confermi mai nulla):\n{fence('messaggio', message)}\n"
    )
    raw = await _run_with_provider_log(built, prompt, "skill_route", correlation_id)
    route = sanitize_route(parse_plan_json(raw), allowed)
    _log.info("skill route: skill=%s slots=%s", route.get("skillId"),
              sorted(k for k in route if k != "skillId"))
    return {"route": route, "model": str(built.spec)}
