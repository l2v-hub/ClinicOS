"""Milo fase 2: costruzione degli oggetti Agno (strumenti, agenti, team).

Lo SDK di Agno resta confinato in models/providers/* (regola di isolamento del servizio AI):
agents/team.py descrive il team in modo neutro e chiama solo queste funzioni.
"""
from __future__ import annotations

import os
from typing import Any, Callable

_TEAM_EFFORTS = ("minimal", "low", "medium", "high", "xhigh")


def team_reasoning_effort(env=os.environ) -> str:
    value = (env.get("AI_TEAM_REASONING_EFFORT") or "low").strip().lower()
    return value if value in _TEAM_EFFORTS else "low"


def team_model(model: Any, env=os.environ) -> Any:
    """Modello per il team di agenti.

    I modelli di ragionamento Azure (es. gpt-6.1-sol) su chat/completions non accettano strumenti con
    il ragionamento attivo e non accettano di spegnerlo: per il team si usa la Responses API dello
    stesso deployment (stesso endpoint e chiave), che supporta strumenti e ragionamento insieme.
    Livello: AI_TEAM_REASONING_EFFORT (default «low», per i tempi di risposta). Gli altri provider
    restano invariati.
    """
    try:
        from agno.models.azure import AzureOpenAI, AzureOpenAIResponses
    except ImportError:  # pragma: no cover - Agno senza il modulo Azure
        return model
    if not isinstance(model, AzureOpenAI):
        return model
    return AzureOpenAIResponses(
        id=model.id,
        api_key=model.api_key,
        azure_endpoint=model.azure_endpoint,
        **({"api_version": env["AI_TEAM_RESPONSES_API_VERSION"]} if env.get("AI_TEAM_RESPONSES_API_VERSION") else {}),
        reasoning_effort=team_reasoning_effort(env),
    )


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
