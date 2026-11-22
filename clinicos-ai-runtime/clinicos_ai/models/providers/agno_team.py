"""Milo fase 2: costruzione degli oggetti Agno (strumenti, agenti, team).

Lo SDK di Agno resta confinato in models/providers/* (regola di isolamento del servizio AI):
agents/team.py descrive il team in modo neutro e chiama solo queste funzioni.
"""
from __future__ import annotations

import os
from typing import Any, Callable

_TEAM_EFFORTS = ("none", "minimal", "low", "medium", "high")


def team_model(model: Any, env=os.environ) -> Any:
    """Modello per il team. I modelli di ragionamento su chat/completions (es. Azure gpt-6.1-sol)
    rifiutano gli strumenti se il ragionamento è attivo: il team chiede `reasoning_effort` esplicito
    (AI_TEAM_REASONING_EFFORT, default «none»). I modelli senza il campo restano invariati."""
    if hasattr(model, "reasoning_effort") and getattr(model, "reasoning_effort", None) is None:
        value = (env.get("AI_TEAM_REASONING_EFFORT") or "none").strip().lower()
        model.reasoning_effort = value if value in _TEAM_EFFORTS else "none"
    return model


def team_tool(name: str, description: str, parameters: dict, entrypoint: Callable[..., str]):
    """Strumento Agno con lo schema dato e l'entrypoint già pronto (nessuna elaborazione di Agno)."""
    from agno.tools.function import Function

    return Function(name=name, description=description, parameters=parameters,
                    entrypoint=entrypoint, skip_entrypoint_processing=True)


def team_member(*, key: str, name: str, role: str, model: Any, instructions: list[str], tools: list,
                tool_call_limit: int):
    from agno.agent import Agent

    return Agent(name=name, id=key, role=role, model=model, instructions=instructions, tools=tools,
                 tool_call_limit=tool_call_limit, markdown=False, telemetry=False)


def team_object(*, name: str, members: list, model: Any, instructions: list[str], max_iterations: int):
    from agno.team import Team

    return Team(name=name, members=members, model=model, mode="coordinate", instructions=instructions,
                markdown=False, telemetry=False, max_iterations=max_iterations)
