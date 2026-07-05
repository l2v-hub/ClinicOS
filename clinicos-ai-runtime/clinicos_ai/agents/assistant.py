"""016 F1: assistant planner agent. Turns a natural-language QUESTION into a typed read
plan over the ClinicOS Data Gateway tools. Provider-neutral: uses the 'agent' role model
(no new mandatory role → the existing extraction runtime is unaffected). The runtime only
ever sees the QUESTION text (no clinical data); the backend validates the plan and executes
it. The mock provider returns an EMPTY plan (never invents a tool call), like EMPTY_EXTRACTION.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from ..models.registry import ModelRegistry

_log = logging.getLogger("clinicos_ai.assistant")

# Marker the mock provider recognizes to return a deterministic empty plan (CI/tests).
PLAN_MARKER = "ASSISTANT_PLAN_V1"

# 016 F1: enum degli intent AMMESSI dal validatore backend (llm-planner.ts INTENTS).
# DEVE restare allineato: un intent fuori da questa lista fa scartare l'intero piano LLM
# (→ fallback deterministico). Il modello va quindi vincolato a sceglierne ESATTAMENTE uno.
_INTENTS = (
    "allergies, therapies, vitals_range, vitals_recent, narrative_search, document_search, "
    "timeline, appointments, correlate, patient_search, refuse_clinical, data_query, unknown"
)

_SYSTEM = (
    f"{PLAN_MARKER}\n"
    "Sei il pianificatore di SOLE LETTURE dell'assistente clinico ClinicOS. "
    "Converti la domanda dell'operatore in un piano di chiamate ai TOOL elencati. "
    "Regole: usa SOLO i tool elencati; non inventare tool; se citi un paziente per nome "
    "pianifica prima search_patients; non fornire diagnosi/terapie. "
    f"Il campo intent DEVE essere ESATTAMENTE uno di questi valori, senza altro testo: {_INTENTS}. "
    "Scegli l'intent che meglio descrive la richiesta (allergie→allergies; terapie→therapies; "
    "parametri per intervallo→vitals_range; ultimi parametri→vitals_recent; ricerca testo in "
    "cartella→narrative_search; documenti→document_search; cronologia→timeline; appuntamenti→"
    "appointments; correlazione o ricerca tra più pazienti→correlate; ricerca paziente→patient_search); "
    "se nessuno è applicabile usa unknown. "
    "Per domande su NUMERI/ELENCHI/CORRELAZIONI di struttura o dati strutturati (camere, letti, "
    "occupazione, appuntamenti della struttura, conteggi, andamenti, condizioni tra dati) usa intent "
    "'data_query' e il tool 'query_data' con un piano in args.plan: {\"steps\":[{\"id\",\"from\","
    "\"filter\":[{\"field\",\"op\",\"value\"}],\"relate\":[],\"aggregate\":{\"op\",\"field\",\"groupBy\"},"
    "\"select\":[],\"runIf\":{\"step\",\"predicate\"},\"bindFrom\":{\"step\",\"field\",\"into\"}}],"
    "\"answer\":{\"primaryStep\"}}. "
    "Entita disponibili: roomAssignment(patientId,roomId,bedId,startDate,endDate; rel patient,bed), "
    "room(numero,tipo,piano,reparto,stato), bed(label,stato,roomId; rel room), "
    "appointment(patientId,scheduledAt,status,reason; rel patient), "
    "patient(firstName,lastName,medicalRecordNumber,dateOfBirth,sex), "
    "therapy(patientId,farmacoNome,stato,dataInizio,dataFine), "
    "vitalSign(patientId,etichetta,valore,systolic,rilevato). "
    "op: eq,in,lt,lte,gt,gte,isNull,contains,between,dateWindow (value {lastDays:N}|{day:'today'|'yesterday'}|{from,to}). "
    "aggregate.op: count,countDistinct,min,max,avg,sum. Camera occupata = roomAssignment con endDate isNull. "
    "Il paziente si indica col filtro field='patient' value=<nome> oppure 'current' (lo risolve il server, mai un id). "
    "Per 'camera X occupata e da chi': step1 room filter numero=X select id; step2 roomAssignment filter endDate isNull, "
    "bindFrom step1 field=id into=roomId, relate patient,bed, select patient.lastName,bed.label. "
    "Rispondi SOLO con JSON: {\"intent\": <uno dei valori sopra>, \"scope\": \"current_patient\"|\"cross_patient\", "
    "\"tools\": [{\"tool\": string, \"args\": object}], \"requiresCrossPatientAccess\": boolean}."
)


def _strip_fences(s: str) -> str:
    t = s.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        if t.endswith("```"):
            t = t[: -3]
    return t.strip()


def _first_json_object(s: str) -> str | None:
    """Estrae il primo oggetto JSON bilanciato {...} da un testo (il modello a volte
    antepone/postpone prosa). Ritorna la sottostringa o None."""
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(s)):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return s[start:i + 1]
    return None


def parse_plan_json(raw: str) -> dict[str, Any] | None:
    """Parsa il piano dall'output del modello in modo robusto: JSON puro, con fence, o
    incapsulato in prosa. Ritorna il dict o None se non estraibile."""
    candidates = []
    stripped = _strip_fences(raw or "")
    if stripped:
        candidates.append(stripped)
    block = _first_json_object(raw or "")
    if block:
        candidates.append(block)
    for c in candidates:
        try:
            obj = json.loads(c)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            continue
    return None


async def run_assistant_plan(registry: ModelRegistry, question: str, tool_schema: list[dict]) -> dict[str, Any]:
    built = registry.build("agent")  # riusa il ruolo 'agent' già configurato
    prompt = (
        f"{_SYSTEM}\n\nTOOL DISPONIBILI:\n{json.dumps(tool_schema, ensure_ascii=False)}\n\n"
        f"DOMANDA:\n{question}\n"
    )
    raw = await built.runner.run(prompt, [])
    plan = parse_plan_json(raw)
    if plan is None:
        # output non parsabile → piano vuoto sicuro (il backend ricade sul deterministico)
        plan = {"intent": "unknown", "scope": "current_patient", "tools": [], "requiresCrossPatientAccess": False}
    # log sanitizzato (nomi tool + intent, mai la domanda o dati clinici)
    tool_names = [t.get("tool") for t in plan.get("tools", []) if isinstance(t, dict)]
    _log.info("assistant plan: intent=%s tools=%s parsed=%s", plan.get("intent"), tool_names, plan.get("intent") != "unknown" or bool(tool_names))
    return {"plan": plan, "model": str(built.spec)}


COMPOSE_MARKER = "ASSISTANT_COMPOSE_V1"

_COMPOSE_SYSTEM = (
    f"{COMPOSE_MARKER}\n"
    "Sei il compositore di risposte dell'assistente clinico ClinicOS. Rispondi in ITALIANO usando "
    "SOLO i dati forniti; cita la fonte (recordId) di ogni informazione; se i dati sono vuoti dillo; "
    "non fornire diagnosi/terapie/valutazioni. Rispondi SOLO con JSON: "
    "{\"answerText\": string, \"citedSources\": [string]}."
)


async def run_assistant_compose(registry: ModelRegistry, question: str, results: list, sources: list) -> dict[str, Any]:
    built = registry.build("agent")  # riusa il ruolo 'agent'; i dati clinici vanno solo qui (host EU)
    prompt = (
        f"{_COMPOSE_SYSTEM}\n\nDOMANDA:\n{question}\n\n"
        f"RISULTATI:\n{json.dumps(results, ensure_ascii=False)[:8000]}\n\n"
        f"FONTI (recordId):\n{json.dumps(sources, ensure_ascii=False)[:4000]}\n"
    )
    raw = await built.runner.run(prompt, [])
    try:
        out = json.loads(_strip_fences(raw))
        return {"answerText": out.get("answerText", ""), "citedSources": out.get("citedSources", []), "model": str(built.spec)}
    except json.JSONDecodeError:
        return {"answerText": "", "citedSources": [], "model": str(built.spec)}  # non fondato → il backend userà la vista strutturata
