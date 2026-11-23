"""Skill degli specialisti di Milo: competenze VERSIONATE, una per file (`<id>.md`).

Ogni file ha un'intestazione (id, name, version, role, tools) e un elenco di istruzioni («- …»).
Gli STRUMENTI di uno specialista stanno solo qui, nel codice rilasciato: una proposta di
miglioramento approvata dall'amministratore può sostituire le ISTRUZIONI (testo), mai gli strumenti.
Modulo neutro: nessun SDK di modello.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).parent
SPECIALIST_IDS = ("clinico", "sorveglianza", "struttura")
COORDINATOR_ID = "coordinatore"
MAX_OVERRIDE_INSTRUCTIONS = 20
MAX_OVERRIDE_CHARS = 700


@dataclass(frozen=True)
class Skill:
    id: str
    name: str
    version: str
    role: str
    tools: tuple[str, ...] = ()
    instructions: tuple[str, ...] = field(default_factory=tuple)


def parse_skill(text: str) -> Skill:
    """Intestazione fra due righe «---», poi le istruzioni come elenco «- …»."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("skill senza intestazione")
    try:
        end = lines.index("---", 1)
    except ValueError as ex:
        raise ValueError("intestazione della skill non chiusa") from ex
    meta: dict[str, str] = {}
    for line in lines[1:end]:
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
    instructions = tuple(line.strip()[2:].strip() for line in lines[end + 1:] if line.strip().startswith("- "))
    for key in ("id", "name", "version", "role"):
        if not meta.get(key):
            raise ValueError(f"skill senza «{key}»")
    if not instructions:
        raise ValueError("skill senza istruzioni")
    tools = tuple(t.strip() for t in meta.get("tools", "").split(",") if t.strip())
    return Skill(id=meta["id"], name=meta["name"], version=meta["version"], role=meta["role"],
                 tools=tools, instructions=instructions)


@lru_cache(maxsize=None)
def load_skill(skill_id: str) -> Skill:
    if skill_id not in (*SPECIALIST_IDS, COORDINATOR_ID):
        raise ValueError(f"skill sconosciuta: {skill_id}")
    skill = parse_skill((_DIR / f"{skill_id}.md").read_text(encoding="utf-8"))
    if skill.id != skill_id:
        raise ValueError(f"id della skill diverso dal file: {skill.id}")
    return skill


def clean_override(value: object) -> tuple[str, ...] | None:
    """Istruzioni approvate che sostituiscono quelle del file: solo testo, limitate. None = nessuna."""
    if not isinstance(value, dict):
        return None
    raw = value.get("instructions")
    if not isinstance(raw, list):
        return None
    out = tuple(str(x).strip()[:MAX_OVERRIDE_CHARS] for x in raw if isinstance(x, str) and x.strip())
    return out[:MAX_OVERRIDE_INSTRUCTIONS] or None


def resolve_skill(skill_id: str, overrides: object = None) -> Skill:
    """La skill da usare: quella del file, con le istruzioni approvate se fornite (stessi strumenti)."""
    base = load_skill(skill_id)
    override = overrides.get(skill_id) if isinstance(overrides, dict) else None
    instructions = clean_override(override)
    if not instructions:
        return base
    version = str(override.get("version") or f"{base.version}+approvata")[:40]
    return Skill(id=base.id, name=base.name, version=version, role=base.role, tools=base.tools,
                 instructions=instructions)
