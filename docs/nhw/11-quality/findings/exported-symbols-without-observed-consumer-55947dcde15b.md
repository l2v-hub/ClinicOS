---
id: 'finding.abstraction.exported-symbols-without-observed-consumers'
kind: 'architectural-finding'
title: 'Exported symbols without observed consumers'
status: 'inferred'
summary: '246 exported symbols have no observed cross-file consumers.'
bounded_contexts: []
sources:
  - path: 'agent-team/src/commands/status.mjs'
    symbol: 'run'
    line_start: '26'
    line_end: '53'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/appointments.ts'
    symbol: 'AppointmentHit'
    line_start: '200'
    line_end: '203'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/appointments.ts'
    symbol: 'AppointmentPlanContext'
    line_start: '104'
    line_end: '106'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/appointments.ts'
    symbol: 'buildAppointmentPreview'
    line_start: '340'
    line_end: '368'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/catalog.ts'
    symbol: 'AgnosCatalogEntry'
    line_start: '10'
    line_end: '16'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/consegne.ts'
    symbol: 'buildConsegnaPreview'
    line_start: '139'
    line_end: '154'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/consegne.ts'
    symbol: 'ConsegnaPlanContext'
    line_start: '37'
    line_end: '39'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'AgnosPlan'
    line_start: '63'
    line_end: '63'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'ExecuteCommandDeps'
    line_start: '228'
    line_end: '238'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'ExecuteCommandInput'
    line_start: '218'
    line_end: '225'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'PlanCommandDeps'
    line_start: '106'
    line_end: '118'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'PlanCommandInput'
    line_start: '90'
    line_end: '97'
    confidence: 'observed'
  - path: 'backend/src/ai/actions/orchestrate.ts'
    symbol: 'PlanCommandResult'
    line_start: '99'
    line_end: '103'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/agents.ts'
    symbol: 'AgentProfile'
    line_start: '40'
    line_end: '46'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/composer.ts'
    symbol: 'ComposeAnswerDeps'
    line_start: '14'
    line_end: '20'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/composer.ts'
    symbol: 'ComposeResult'
    line_start: '21'
    line_end: '25'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/llm-planner.ts'
    symbol: 'PlanQueryLLMDeps'
    line_start: '21'
    line_end: '25'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/llm-planner.ts'
    symbol: 'PlanResult'
    line_start: '27'
    line_end: '30'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/plan.ts'
    symbol: 'PlannedToolCall'
    line_start: '26'
    line_end: '29'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/plan.ts'
    symbol: 'QueryScope'
    line_start: '24'
    line_end: '24'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/read-tools.ts'
    symbol: 'ReadTool'
    line_start: '22'
    line_end: '22'
    confidence: 'observed'
  - path: 'backend/src/ai/assistant/service.ts'
    symbol: 'NavAction'
    line_start: '27'
    line_end: '35'
    confidence: 'observed'
  - path: 'backend/src/ai/audit-store.ts'
    symbol: 'AiAuditChannel'
    line_start: '14'
    line_end: '14'
    confidence: 'observed'
  - path: 'backend/src/ai/audit-store.ts'
    symbol: 'AiAuditOutcome'
    line_start: '15'
    line_end: '15'
    confidence: 'observed'
  - path: 'backend/src/ai/audit-store.ts'
    symbol: 'OperationalAuditInput'
    line_start: '95'
    line_end: '112'
    confidence: 'observed'
relations:
  - type: 'documents'
    target: 'component.agent-team.agent-team.src.commands.status.run'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.appointments.appointmenthit'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.appointments.appointmentplancontext'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.appointments.buildappointmentpreview'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.catalog.agnoscatalogentry'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.consegne.buildconsegnapreview'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.consegne.consegnaplancontext'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.agnosplan'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.executecommanddeps'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.executecommandinput'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.plancommanddeps'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.plancommandinput'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.actions.orchestrate.plancommandresult'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.agents.agentprofile'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.composer.composeanswerdeps'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.composer.composeresult'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.llm-planner.planqueryllmdeps'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.llm-planner.planresult'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.plan.plannedtoolcall'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.plan.queryscope'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.read-tools.readtool'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.assistant.service.navaction'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.audit-store.aiauditchannel'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.audit-store.aiauditoutcome'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.audit-store.operationalauditinput'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.audit.auditaction'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.auth.operator'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.config.aiprovider'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.config.aipublicstatus'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.extraction-validate.resetvalidator'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.extraction-validate.schemavalidation'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.audit.gatewayauditentry'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.filters.allergyitem'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.filters.cartelladata'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.filters.therapyitem'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.engine.queryanswer'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.schema.authzclass'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.schema.entitydef'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.schema.fielddef'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.schema.relationdef'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.validate.max-relate'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.validate.max-rows'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.query.validate.max-steps'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.correlate'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientallergies'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientappointments'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientdemographics'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientdiary'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientdocumentsg'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientnarrativesectionsg'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatienttherapies'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatienttimeline'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.getpatientvitalsigns'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.resolvenarrativesource'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.searchacrosspatients'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.searchclinicalsections'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.searchdocuments'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.services.searchpatients'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.gateway.types.sourcetype'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.candidate'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.fieldstatus'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.merge-version'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.mergeditem'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.mergeoptions'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.mergereport'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.merge.provenance'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.header-filter.headerfilterconfig'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.header-filter.headerfilterresult'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.markdown-parse.parsedsection'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.narrative.narrativefromrawtext'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.narrative.narrativehassectiontext'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.narrative.narrativetag'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.narrative.resetnarrativevalidator'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.narrative.sourcereference'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.patient-narrative.narrativesectiondto'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.patient-narrative.narrativesectionrow'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.patient-narrative.persistnarrativefromdraft'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.profile.profilesection'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.profile.resetprofile'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.profile.section-keys'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.allergyblock'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.isconfirmblocked'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.medicationline'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.postprocesssections'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.resetsectionsvalidator'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.sectionsvalidation'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.sections.validate.validatesectionsschema'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.types.aierrorkind'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.types.extractionfile'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.types.extractionwarning'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.confirm-service.confirmpatient'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.confirm-service.confirmresult'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.confirm-service.duplicateinfo'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.job-service.fileoutcome'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.job-service.jobstatus'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.job-service.publicdocument'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.job-service.publicjob'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.job-service.rebuildnarrativedraftfromexistingextraction'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.backend.backend.src.ai.upload.storage.ensurejobdir'
    evidence: 'agent-team/src/commands/status.mjs,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/catalog.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/composer.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/llm-planner.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/plan.ts,backend/src/ai/assistant/read-tools.ts,backend/src/ai/assistant/service.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts,backend/src/ai/audit-store.ts'
    confidence: 'inferred'
tags:
  - 'dead-abstraction-candidate'
  - 'consumer-analysis'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
inference_rule: 'The TypeScript compiler extraction found exported production symbols with no cross-file import consumers.'
---

## Question Answered

What does `finding.abstraction.exported-symbols-without-observed-consumers` represent in ClinicOS?

## Canonical Definition

finding.abstraction.exported-symbols-without-observed-consumers is the canonical architectural-finding named Exported symbols without observed consumers.

## Inputs

246 exported production symbols.

## Outputs

Candidate dead abstractions; exports used dynamically or externally require runtime confirmation.

## Dependencies

Static TypeScript consumer graph.

## Side Effects

None observed

## Consumers

Future refactoring and extension-point analysis.

## Invariants

This is a static consumer finding, not a deletion recommendation.

## Failure Modes

Dynamic loading, CLI invocation, tests outside the inventory, or framework discovery can be invisible to static imports.

## Evidence

- `agent-team/src/commands/status.mjs:26-53` — run
- `backend/src/ai/actions/appointments.ts:200-203` — AppointmentHit
- `backend/src/ai/actions/appointments.ts:104-106` — AppointmentPlanContext
- `backend/src/ai/actions/appointments.ts:340-368` — buildAppointmentPreview
- `backend/src/ai/actions/catalog.ts:10-16` — AgnosCatalogEntry
- `backend/src/ai/actions/consegne.ts:139-154` — buildConsegnaPreview
- `backend/src/ai/actions/consegne.ts:37-39` — ConsegnaPlanContext
- `backend/src/ai/actions/orchestrate.ts:63-63` — AgnosPlan
- `backend/src/ai/actions/orchestrate.ts:228-238` — ExecuteCommandDeps
- `backend/src/ai/actions/orchestrate.ts:218-225` — ExecuteCommandInput
- `backend/src/ai/actions/orchestrate.ts:106-118` — PlanCommandDeps
- `backend/src/ai/actions/orchestrate.ts:90-97` — PlanCommandInput
- `backend/src/ai/actions/orchestrate.ts:99-103` — PlanCommandResult
- `backend/src/ai/assistant/agents.ts:40-46` — AgentProfile
- `backend/src/ai/assistant/composer.ts:14-20` — ComposeAnswerDeps
- `backend/src/ai/assistant/composer.ts:21-25` — ComposeResult
- `backend/src/ai/assistant/llm-planner.ts:21-25` — PlanQueryLLMDeps
- `backend/src/ai/assistant/llm-planner.ts:27-30` — PlanResult
- `backend/src/ai/assistant/plan.ts:26-29` — PlannedToolCall
- `backend/src/ai/assistant/plan.ts:24-24` — QueryScope
- `backend/src/ai/assistant/read-tools.ts:22-22` — ReadTool
- `backend/src/ai/assistant/service.ts:27-35` — NavAction
- `backend/src/ai/audit-store.ts:14-14` — AiAuditChannel
- `backend/src/ai/audit-store.ts:15-15` — AiAuditOutcome
- `backend/src/ai/audit-store.ts:95-112` — OperationalAuditInput

## Related Knowledge

- `documents` → `component.agent-team.agent-team.src.commands.status.run`
- `documents` → `component.backend.backend.src.ai.actions.appointments.appointmenthit`
- `documents` → `component.backend.backend.src.ai.actions.appointments.appointmentplancontext`
- `documents` → `component.backend.backend.src.ai.actions.appointments.buildappointmentpreview`
- `documents` → `component.backend.backend.src.ai.actions.catalog.agnoscatalogentry`
- `documents` → `component.backend.backend.src.ai.actions.consegne.buildconsegnapreview`
- `documents` → `component.backend.backend.src.ai.actions.consegne.consegnaplancontext`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.agnosplan`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.executecommanddeps`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.executecommandinput`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.plancommanddeps`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.plancommandinput`
- `documents` → `component.backend.backend.src.ai.actions.orchestrate.plancommandresult`
- `documents` → `component.backend.backend.src.ai.assistant.agents.agentprofile`
- `documents` → `component.backend.backend.src.ai.assistant.composer.composeanswerdeps`
- `documents` → `component.backend.backend.src.ai.assistant.composer.composeresult`
- `documents` → `component.backend.backend.src.ai.assistant.llm-planner.planqueryllmdeps`
- `documents` → `component.backend.backend.src.ai.assistant.llm-planner.planresult`
- `documents` → `component.backend.backend.src.ai.assistant.plan.plannedtoolcall`
- `documents` → `component.backend.backend.src.ai.assistant.plan.queryscope`
- `documents` → `component.backend.backend.src.ai.assistant.read-tools.readtool`
- `documents` → `component.backend.backend.src.ai.assistant.service.navaction`
- `documents` → `component.backend.backend.src.ai.audit-store.aiauditchannel`
- `documents` → `component.backend.backend.src.ai.audit-store.aiauditoutcome`
- `documents` → `component.backend.backend.src.ai.audit-store.operationalauditinput`
- `documents` → `component.backend.backend.src.ai.audit.auditaction`
- `documents` → `component.backend.backend.src.ai.auth.operator`
- `documents` → `component.backend.backend.src.ai.config.aiprovider`
- `documents` → `component.backend.backend.src.ai.config.aipublicstatus`
- `documents` → `component.backend.backend.src.ai.extraction-validate.resetvalidator`
- `documents` → `component.backend.backend.src.ai.extraction-validate.schemavalidation`
- `documents` → `component.backend.backend.src.ai.gateway.audit.gatewayauditentry`
- `documents` → `component.backend.backend.src.ai.gateway.filters.allergyitem`
- `documents` → `component.backend.backend.src.ai.gateway.filters.cartelladata`
- `documents` → `component.backend.backend.src.ai.gateway.filters.therapyitem`
- `documents` → `component.backend.backend.src.ai.gateway.query.engine.queryanswer`
- `documents` → `component.backend.backend.src.ai.gateway.query.schema.authzclass`
- `documents` → `component.backend.backend.src.ai.gateway.query.schema.entitydef`
- `documents` → `component.backend.backend.src.ai.gateway.query.schema.fielddef`
- `documents` → `component.backend.backend.src.ai.gateway.query.schema.relationdef`
- `documents` → `component.backend.backend.src.ai.gateway.query.validate.max-relate`
- `documents` → `component.backend.backend.src.ai.gateway.query.validate.max-rows`
- `documents` → `component.backend.backend.src.ai.gateway.query.validate.max-steps`
- `documents` → `component.backend.backend.src.ai.gateway.services.correlate`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientallergies`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientappointments`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientdemographics`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientdiary`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientdocumentsg`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientnarrativesectionsg`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatienttherapies`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatienttimeline`
- `documents` → `component.backend.backend.src.ai.gateway.services.getpatientvitalsigns`
- `documents` → `component.backend.backend.src.ai.gateway.services.resolvenarrativesource`
- `documents` → `component.backend.backend.src.ai.gateway.services.searchacrosspatients`
- `documents` → `component.backend.backend.src.ai.gateway.services.searchclinicalsections`
- `documents` → `component.backend.backend.src.ai.gateway.services.searchdocuments`
- `documents` → `component.backend.backend.src.ai.gateway.services.searchpatients`
- `documents` → `component.backend.backend.src.ai.gateway.types.sourcetype`
- `documents` → `component.backend.backend.src.ai.merge.candidate`
- `documents` → `component.backend.backend.src.ai.merge.fieldstatus`
- `documents` → `component.backend.backend.src.ai.merge.merge-version`
- `documents` → `component.backend.backend.src.ai.merge.mergeditem`
- `documents` → `component.backend.backend.src.ai.merge.mergeoptions`
- `documents` → `component.backend.backend.src.ai.merge.mergereport`
- `documents` → `component.backend.backend.src.ai.merge.provenance`
- `documents` → `component.backend.backend.src.ai.sections.header-filter.headerfilterconfig`
- `documents` → `component.backend.backend.src.ai.sections.header-filter.headerfilterresult`
- `documents` → `component.backend.backend.src.ai.sections.markdown-parse.parsedsection`
- `documents` → `component.backend.backend.src.ai.sections.narrative.narrativefromrawtext`
- `documents` → `component.backend.backend.src.ai.sections.narrative.narrativehassectiontext`
- `documents` → `component.backend.backend.src.ai.sections.narrative.narrativetag`
- `documents` → `component.backend.backend.src.ai.sections.narrative.resetnarrativevalidator`
- `documents` → `component.backend.backend.src.ai.sections.narrative.sourcereference`
- `documents` → `component.backend.backend.src.ai.sections.patient-narrative.narrativesectiondto`
- `documents` → `component.backend.backend.src.ai.sections.patient-narrative.narrativesectionrow`
- `documents` → `component.backend.backend.src.ai.sections.patient-narrative.persistnarrativefromdraft`
- `documents` → `component.backend.backend.src.ai.sections.profile.profilesection`
- `documents` → `component.backend.backend.src.ai.sections.profile.resetprofile`
- `documents` → `component.backend.backend.src.ai.sections.profile.section-keys`
- `documents` → `component.backend.backend.src.ai.sections.validate.allergyblock`
- `documents` → `component.backend.backend.src.ai.sections.validate.isconfirmblocked`
- `documents` → `component.backend.backend.src.ai.sections.validate.medicationline`
- `documents` → `component.backend.backend.src.ai.sections.validate.postprocesssections`
- `documents` → `component.backend.backend.src.ai.sections.validate.resetsectionsvalidator`
- `documents` → `component.backend.backend.src.ai.sections.validate.sectionsvalidation`
- `documents` → `component.backend.backend.src.ai.sections.validate.validatesectionsschema`
- `documents` → `component.backend.backend.src.ai.types.aierrorkind`
- `documents` → `component.backend.backend.src.ai.types.extractionfile`
- `documents` → `component.backend.backend.src.ai.types.extractionwarning`
- `documents` → `component.backend.backend.src.ai.upload.confirm-service.confirmpatient`
- `documents` → `component.backend.backend.src.ai.upload.confirm-service.confirmresult`
- `documents` → `component.backend.backend.src.ai.upload.confirm-service.duplicateinfo`
- `documents` → `component.backend.backend.src.ai.upload.job-service.fileoutcome`
- `documents` → `component.backend.backend.src.ai.upload.job-service.jobstatus`
- `documents` → `component.backend.backend.src.ai.upload.job-service.publicdocument`
- `documents` → `component.backend.backend.src.ai.upload.job-service.publicjob`
- `documents` → `component.backend.backend.src.ai.upload.job-service.rebuildnarrativedraftfromexistingextraction`
- `documents` → `component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument`
- `documents` → `component.backend.backend.src.ai.upload.storage.ensurejobdir`
