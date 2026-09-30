# Policy Contract — stable interface for GUI, API, Tool Layer, Agno and future Skills

## Server-side (TypeScript, `backend/src/authz`)

| Need                   | Contract                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current identity       | `authzOf(req).identity` → `{ operatorId, name, roleId, roleSource: 'assignment'\|'legacy', legacyRole, identitySource }` (after `ensureAuthorization(req)`)                                                                       |
| current role           | `identity.roleId` + `roleDefinition(policy.document, roleId)`                                                                                                                                                                     |
| effective capabilities | `effectiveCapabilities(document, roleId)` → `[{ id, effect, allowed, requiresConfirmation }]`                                                                                                                                     |
| can / cannot           | `authzOf(req).can(capabilityId)` or `decide(document, roleId, capabilityId)` → `{ effect, allowed, requiresConfirmation, code? }` — derived ids (e.g. `agnos.action.create_consegna`) resolve through their functional capability |
| available tools        | Tool Layer hook `policyToolAuthorization`; HTTP `GET /tools`                                                                                                                                                                      |
| active policy          | `loadActivePolicyCached()` → `{ version, document, source, appliedAt }`                                                                                                                                                           |
| guard a router         | `requireOperator, requireAuthorizationContext, requireCapability('<id>')`                                                                                                                                                         |

## HTTP (for GUI, Agno runtime, future skills)

| Endpoint                                                               | Returns                                                                                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/status`                                                     | `{ mode, simulator, … }`                                                                                                                                          |
| `GET /auth/simulator/identities`                                       | simulated identities + assigned role (simulator only)                                                                                                             |
| `POST /auth/simulator/session {identityId}`                            | `{ token, expiresAt, identity }`                                                                                                                                  |
| `GET /auth/me`                                                         | `{ id, name, role(compat), appRole, roleLabel, roleSource, identitySource, uiShell, policyVersion, capabilities: {id: {effect, allowed, requiresConfirmation}} }` |
| `GET /tools`                                                           | tools available to the caller now (`requiresConfirmation` flag)                                                                                                   |
| `POST /tools/:name/invoke {input, requestId?, confirmed?}`             | ToolResult envelope; 403 `capability_denied`, 428 `confirmation_required`                                                                                         |
| `GET /ai/actions/catalog`                                              | Agnos actions with `enabled` for this caller                                                                                                                      |
| `GET /authz/policy`                                                    | active document + governed capabilities + derived + identities (`authz.view_policy`)                                                                              |
| `GET /authz/policy/versions[/:v]`                                      | history / one version                                                                                                                                             |
| `POST /authz/policy/impact {document}`                                 | per-role gained/lost, tools gained/lost, identities, warnings                                                                                                     |
| `POST /authz/policy/versions {document, basedOnVersion, note?, apply}` | Save (draft) / Save+Apply; 409 on stale base                                                                                                                      |
| `POST /authz/policy/versions/:v/apply`                                 | Apply a draft; 409 `stale_draft`                                                                                                                                  |

## Policy document (`clinicos.authz-policy/v1`)

```json
{
  "schema": "clinicos.authz-policy/v1",
  "defaultEffect": "DENIED",
  "roles": [
    {
      "id": "nurse",
      "label": "Nurse",
      "description": "…",
      "legacyRole": "operatore",
      "uiShell": "operator"
    }
  ],
  "grants": { "nurse": { "administration.confirm": "ALLOWED", "therapy.create": "DENIED" } },
  "assignments": { "SIM-NURSE-1": "nurse" },
  "review": { "nurse:clinical_record.save": "doubt note shown in the UI" }
}
```

Validation (`parsePolicyDocument`): role ids `^[a-z][a-z0-9_]{1,31}$`, known governed capability ids
only (derived ids rejected with a hint), valid effects, assignments to existing roles, legacy
fallback roles `operator` and `legacy_admin` present, at least one role able to manage the policy.

## Semantics

- Deny-by-default (`defaultEffect`), explicit grants override.
- `READ_ONLY` = allowed only for `type: read` capabilities.
- `ALLOWED_WITH_CONFIRMATION`: Tool Layer/Agno require `confirmed: true`; GUI must confirm in UI.
- Public reference capabilities (drug search, health) and the service-token AI gateway are outside
  end-user role policy by design (listed in ROLE_CAPABILITY_MATRIX.json `outside_role_policy`).
- The LLM is never the security boundary: every tool/action call re-enters the decision server-side.
