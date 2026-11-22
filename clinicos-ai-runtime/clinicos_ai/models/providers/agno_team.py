"""Milo fase 2: costruzione degli oggetti Agno (strumenti, agenti, team).

Lo SDK di Agno resta confinato in models/providers/* (regola di isolamento del servizio AI):
agents/team.py descrive il team in modo neutro e chiama solo queste funzioni.
"""
from __future__ import annotations

from typing import Any, Callable


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
