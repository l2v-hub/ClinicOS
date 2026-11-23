"""Skill degli specialisti di Milo: competenze VERSIONATE, una per file (`<id>.md`).

Ogni file ha un'intestazione (id, name, version, role, tools), un elenco di istruzioni («- …») e
le regole FISSE («! …»): fonti, nessuna diagnosi o terapia, sola lettura.
Gli STRUMENTI e le regole fisse stanno solo qui, nel codice rilasciato: una proposta di
miglioramento approvata dall'amministratore può sostituire le ISTRUZIONI («- …»), mai il resto.
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
    # Regole fisse: sempre presenti, mai sostituite da una versione approvata.
    locked: tuple[str, ...] = field(default_factory=tuple)

    @property
    def prompt_lines(self) -> list[str]:
        """Istruzioni date al modello: quelle (eventualmente approvate) più le regole fisse."""
        return [*self.instructions, *self.locked]

    def public(self) -> dict[str, object]:
        return {"id": self.id, "name": self.name, "version": self.version, "role": self.role,
                "tools": list(self.tools), "instructions": list(self.instructions),
                "locked": list(self.locked)}


def parse_skill(text: str) -> Skill:
    """Intestazione fra due righe «---», poi istruzioni («- …») e regole fisse («! …»)."""
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
    body = [line.strip() for line in lines[end + 1:]]
    instructions = tuple(line[2:].strip() for line in body if line.startswith("- "))
    locked = tuple(line[2:].strip() for line in body if line.startswith("! "))
    for key in ("id", "name", "version", "role"):
        if not meta.get(key):
            raise ValueError(f"skill senza «{key}»")
    if not instructions:
        raise ValueError("skill senza istruzioni")
    tools = tuple(t.strip() for t in meta.get("tools", "").split(",") if t.strip())
    return Skill(id=meta["id"], name=meta["name"], version=meta["version"], role=meta["role"],
                 tools=tools, instructions=instructions, locked=locked)


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
                 instructions=instructions, locked=base.locked)


def all_skills() -> list[Skill]:
    """Le skill rilasciate (file), coordinatore per ultimo."""
    return [load_skill(key) for key in (*SPECIALIST_IDS, COORDINATOR_ID)]
