# Data Model — 016 Fase LLM di Agnos (letture NL)

## Entità runtime (non persistite salvo dove indicato)

### AssistantQuestion (input)
| Campo | Tipo | Note |
|---|---|---|
| text | string | domanda digitata o trascrizione vocale (cap lunghezza) |
| channel | 'testo' \| 'voce' | canale d'ingresso |
| currentPatientId | string? | paziente aperto nella UI, se presente |
| operator | { id, roles[], permittedPatientIds \| null } | identità/perimetro (dal contesto gateway) |

### QueryPlan (invariato da REQ-040, prodotto da deterministico o LLM)
```
intent: AssistantIntent            // allergies|therapies|vitals_*|narrative_search|document_search|
                                   // timeline|appointments|correlate|patient_search|refuse_clinical|unknown
scope: 'current_patient'|'cross_patient'
tools: Array<{ tool: string, args: Record<string,unknown> }>   // SOLO tool di lettura in allowlist
requiresCrossPatientAccess: boolean                            // RICALCOLATO server-side
refusalReason?: string
```
Vincolo: `tool` ∈ allowlist read (13 tool gateway). Nomi fuori lista ⇒ piano scartato ⇒ fallback.

### PlanSource (nuovo, runtime)
`'deterministic' | 'llm'` — quale motore ha prodotto il piano. Registrato in audit (D6).

### AssistantAnswer (esteso)
Campi esistenti (`intent, scope, plan, results[], sources[], navigation[], notFound, refusal?, truncated`) + nuovo:
| Campo | Tipo | Note |
|---|---|---|
| answerText | string? | risposta discorsiva (solo se composer attivo e post-check superato) |
| mode | 'deterministic' \| 'llm' | modalità effettiva |
| composed | boolean | true se `answerText` è stato generato e validato |

### Result + Source (invariato)
Ogni risultato porta un `SourceReference` (VITAL_SIGN | THERAPY | NARRATIVE_SECTION | DOCUMENT | APPOINTMENT | …) con `patientId` e `recordId`. Base per navigazione e per il post-check anti-invenzione.

## Entità persistite

### AiAuditEvent (SPEC-015) — estensione ADDITIVA opzionale (D6, subordinata ad approvazione)
| Campo aggiunto | Tipo | Note |
|---|---|---|
| mode | String? | 'llm' \| 'deterministic' |
| model | String? | id modello usato (planner/composer), mai valori clinici |

Se la migrazione additiva non è approvata: `mode`/`model` restano nel log runtime (stdout), l'evento audit invariato. Nessuna FK, nessun `migrate reset`.

## Configurazione (env, runtime + backend)
| Variabile | Ruolo |
|---|---|
| `AI_ASSISTANT_LLM_ENABLED` | master flag motore LLM per le letture |
| `AI_ASSISTANT_PLAN_ENABLED` / `AI_ASSISTANT_COMPOSE_ENABLED` | flag indipendenti per planner/composer |
| `AI_ASSISTANT_PLAN_MODEL` / `AI_ASSISTANT_COMPOSE_MODEL` | `provider:model_id` per ruolo (composer: solo host EU/self-hosted) |
| `AI_ASSISTANT_TIMEOUT_MS` | soglia timeout (default 8000) → fallback deterministico |

## Transizioni (percorso lettura)
`domanda → [F0 risoluzione paziente/pattern] → planQuery(det) | planQueryLLM(+validazione→fallback) → dispatch() sul gateway (authz) → results+sources → [F2 compose+post-check | strutturato] → AssistantAnswer`.
Rami: `refuse_clinical` (rifiuto), `unknown/paziente non identificato` (nessuna invenzione), `cross_patient non autorizzato` (rifiuto ruolo), `timeout/LLM assente` (fallback deterministico).
