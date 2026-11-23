"""Milo, «skill creator»: propone nuove ISTRUZIONI per uno specialista a partire dai giudizi delle
persone sulle risposte (domanda, 👍/👎, correzione scritta).

La proposta è solo testo e non ha alcun effetto finché un amministratore non la approva nel
backend. Strumenti, permessi e regole fisse della skill non sono modificabili: stanno nel file
rilasciato. I giudizi sono testo scritto da persone → trattati come dati non attendibili.
Il provider di prova non inventa: restituisce una proposta vuota.
"""
from __future__ import annotations

import json
from typing import Any

from ..models.contract import ModelRole
from ..models.registry import ModelRegistry
from ..skills import MAX_OVERRIDE_CHARS, MAX_OVERRIDE_INSTRUCTIONS, clean_override, resolve_skill
from .assistant import _ask, _first_json_object, _strip_fences
from .untrusted import UNTRUSTED_RULE, fence

PROPOSAL_MARKER = "MILO_SKILL_PROPOSAL_V1"
MAX_FEEDBACK = 20
MAX_RATIONALE = 600

_SYSTEM = (
    f"{PROPOSAL_MARKER}\n"
    "Sei il revisore delle competenze di Milo, l'assistente di una struttura sanitaria. "
    "Ricevi le istruzioni attuali di UNO specialista, le sue regole fisse, gli strumenti che può "
    "usare e i giudizi delle persone su alcune sue risposte (domanda, giudizio, correzione). "
    "Proponi un nuovo elenco COMPLETO di istruzioni che corregga i problemi segnalati. "
    "Regole: mantieni ciò che funziona; cambia il minimo necessario; scrivi istruzioni operative "
    "e verificabili (quale strumento usare, quali campi riportare, in che forma); non ripetere le "
    "regole fisse; non citare strumenti che non sono nell'elenco; non chiedere mai diagnosi, "
    "prognosi, indicazioni di terapia né azioni di scrittura; non inserire dati di pazienti o "
    "nomi di persone nelle istruzioni. "
    f"Al massimo {MAX_OVERRIDE_INSTRUCTIONS} istruzioni, ciascuna di al massimo {MAX_OVERRIDE_CHARS} caratteri. "
    'Rispondi SOLO con JSON: {"instructions": ["..."], "rationale": "perché, in due frasi"}. '
    "Se i giudizi non indicano un problema delle istruzioni, restituisci instructions vuoto e "
    "spiegalo in rationale."
)


def _feedback_lines(feedback: list[dict[str, Any]]) -> str:
    rows = []
    for item in feedback[:MAX_FEEDBACK]:
        rows.append({
            "domanda": str(item.get("question") or "")[:500],
            "giudizio": "negativo" if item.get("rating") == "down" else "positivo",
            "correzione": str(item.get("correction") or "")[:1000],
        })
    return json.dumps(rows, ensure_ascii=False)


async def run_skill_proposal(registry: ModelRegistry, skill_id: str, feedback: list[dict[str, Any]],
                             overrides: object = None, correlation_id: str | None = None) -> dict[str, Any]:
    skill = resolve_skill(skill_id, overrides)  # ValueError per una skill sconosciuta
    prompt = (
        f"{_SYSTEM}\n\n{UNTRUSTED_RULE}\n\n"
        f"SPECIALISTA: {skill.name} — {skill.role}\n"
        f"STRUMENTI: {', '.join(skill.tools) or 'nessuno'}\n"
        f"REGOLE FISSE (non modificabili):\n{json.dumps(list(skill.locked), ensure_ascii=False)}\n"
        f"ISTRUZIONI ATTUALI:\n{json.dumps(list(skill.instructions), ensure_ascii=False)}\n\n"
        f"GIUDIZI:\n{fence('giudizi', _feedback_lines(feedback))}\n"
    )
    resp = await _ask(registry, ModelRole.REASONING, prompt, "skill_proposal", correlation_id)
    meta = {"model": f"{resp.provider}:{resp.model}", "ai": resp.metadata()}
    raw = _first_json_object(_strip_fences(resp.text)) or ""
    try:
        out = json.loads(raw)
    except json.JSONDecodeError:
        out = {}
    if not isinstance(out, dict):
        out = {}
    instructions = clean_override({"instructions": out.get("instructions")}) or ()
    rationale = str(out.get("rationale") or "").strip()[:MAX_RATIONALE]
    return {"skillId": skill.id, "baseVersion": skill.version, "instructions": list(instructions),
            "rationale": rationale, **meta}
