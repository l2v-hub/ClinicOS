# Agno Orchestration — Phase 3

## Division of labour

| step (Prompt 3 §10)             | where          | how                                                                                                         |
| ------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1. know the identity            | backend        | `requireOperator` + policy role; Agno never receives an identity it could impersonate                       |
| 2. get the available skills     | backend → Agno | `evaluateTools()` → only AVAILABLE skills are sent to Agno (policy-filtered)                                |
| 3. interpret the intent         | **Agno**       | `POST /v1/assistant/skill-route` (clinicos-ai-runtime, role `agent` = Agno `Agent` on Azure `gpt-6.1-sol`)  |
| 4. choose the skill             | **Agno**       | `skillId` ∈ offered list or null; slots `patientQuery`, `currentPatient`, `values`, `text`, `date`, `query` |
| 5. prerequisites & context      | backend        | workflow engine: patient resolution through tools, value validation                                         |
| 6. ask for clarification        | backend        | NEEDS_CLARIFICATION + `pending`; Agno reads the answer with the pending question                            |
| 7. ask for confirmation         | backend        | preview + explicit user act (never the LLM)                                                                 |
| 8. invoke only authorized tools | backend        | `ToolRegistry.invoke` → policy hook per call                                                                |
| 9. handle errors                | backend        | FAILED/DENIED with the backend's message; idempotent retry                                                  |
| 10. verified result             | backend        | reply built from the tool result, write read back                                                           |

Agno never gets tools it could call: it proposes a route; the backend decides and executes. This
satisfies "NON fornire ad Agno tool che la policy corrente vieta" and "NON consentire ad Agno di
bypassare il Tool Layer". No business rule is in the Agno prompt (only extraction rules).

## Entry points

- Runtime: `clinicos-ai-runtime/clinicos_ai/agents/skill_router.py` (`run_skill_route`,
  `sanitize_route`), endpoint in `clinicos_ai/api/app.py`, contract `SkillRouteRequest/Response`.
- Backend client: `backend/src/skills/interpreter.ts` (`createAgnoInterpreter`, timeout 20 s,
  `sanitizeAgnoRoute`), fallback `deterministicInterpreter`.
- Config: `AI_RUNTIME_URL` + `AI_RUNTIME_SERVICE_TOKEN` (already set for imports/assistant);
  `SKILLS_INTERPRETER=deterministic` forces the fallback.

## Request to Agno

```json
{
  "message": "al signor Mario Rossi ho misurato la pressione 128 su 82",
  "today": "2026-09-30",
  "pending": null,
  "skills": [
    { "id": "vitals.record", "name": "…", "description": "…", "slots": ["patient", "values"] }
  ],
  "valueKeys": ["pa", "spo2", "fc", "temperatura", "fr", "o2", "coscienza", "dtx", "evacuazione"]
}
```

Response `{"route": {"skillId": "vitals.record", "patientQuery": "Mario Rossi", "values": {"pa": "128/82"}}, "model": "azure:gpt-6.1-sol"}`.
The backend validates again (skill offered, value keys allowed, bounded strings) and then
`parseParameterReading` validates the values exactly like the service.

## Fallback & safety

- Runtime missing, HTTP error, timeout, unparseable/empty route → deterministic interpreter
  (`interpreter: "deterministic"` in the response and in the audit `request` event).
- Agno returns no skill → deterministic pass over the FULL catalog, so a skill the user may not
  use is answered DENIED explicitly (backend decision) instead of "not understood".
- Cancellation phrases never go to the LLM. Confirmation is never taken from the LLM.
- PRIVACY: the message goes to the runtime only in the request body; runtime logs contain skill id
  and slot NAMES only; backend audit contains field names only.
