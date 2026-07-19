# SPEC-016 follow-up — Motore di query componibile (Agnos composable reads)

**Data:** 2026-07-05
**Branch:** `016-facility-reads`
**Stato:** design approvato (brainstorming) — supera la bozza "tool fissi per capacità".

## 1. Obiettivo e visione

Rendere l'assistente Agnos capace di rispondere a una **classe generale** di domande sui dati (gestionali, operative, cliniche-strutturate), non a un elenco cablato. Principio: _ogni domanda esprimibile come **filtra + correla + aggrega** sulle entità/campi esposti diventa una composizione_, senza codice per-domanda.

Traguardo a due fasi:

- **Fase 1 (questo spec):** un **motore di query componibile fidato** — l'LLM emette un _piano di query multi-step_ (con dipendenze e condizioni dichiarative) che il backend valida ed esegue in sicurezza. Copre già i 5 esempi + domande condizionali/correlate.
- **Fase 2 (documentata, §9):** **orchestrazione agentica** (supervisore + sub-agenti Agno tool-calling) _sopra_ il motore, per ragionamento iterativo in linguaggio naturale sui risultati intermedi. Fattibilità confermata (Azure `gpt-5.4-mini` supporta il tool-calling — verificato live).

## 2. Invarianti di sicurezza (invariati rispetto a F0–F2)

- **SOURCE_ONLY**: ogni valore in risposta proviene da un record ed è citato; post-check anti-invenzione del composer resta attivo.
- **Solo letture**: il DSL non ha operazioni di scrittura; nessun tool di mutazione è raggiungibile.
- **Deny-by-default**: entità/campi/relazioni/operatori non nella whitelist → piano **rifiutato** (fallback deterministico F0/F1).
- **Paziente autoritativo lato server**: l'identità paziente nel DSL è risolta server-side (per nome via `searchPatients`/F0 o paziente corrente); mai un id grezzo dall'LLM.
- **Mai fidarsi di campi dichiarati dall'LLM** (scope/authz/id): il backend valida contro lo schema e **ricalcola** l'authz.
- **Coesistenza**: i tool clinici esistenti (allergie/terapie/narrativa, F0–F2) **restano**; il motore copre lo strutturato/relazionale/aggregato. Il planner sceglie.

## 3. Componenti (Fase 1)

Nuovo sotto-sistema nel backend, `backend/src/ai/gateway/query/`:

| File          | Responsabilità                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`   | **Descrittore dichiarativo** whitelist: entità → campi (con tag sensibilità) → relazioni (1-hop) → **authz-class** per entità. Unica fonte di verità di cosa l'LLM può toccare. |
| `dsl.ts`      | Tipi del **piano di query** (steps, filtri, relate, aggregate, select, condizioni/dipendenze).                                                                                  |
| `validate.ts` | Piano LLM → query validata o **rifiuto** (deny-by-default su entità/campo/relazione/operatore ignoti).                                                                          |
| `engine.ts`   | Query validata → **Prisma** (mai SQL grezzo) → `SourcedResult`; authz per-entità, valutazione condizioni tra step, limiti, `sourceRefs`.                                        |

Più: integrazione planner (`llm-planner.ts`, `read-tools.ts`, prompt runtime `assistant.py`), executor (`service.ts`), fonti (`gateway/types.ts` + `sources.ts`), authz (`gateway/context.ts`).

## 4. Schema descriptor (dove vive la sicurezza)

`schema.ts` dichiara per ogni entità: nome logico, tabella Prisma, campi ammessi (con tipo + tag `sensitive` per PHI), relazioni ammesse (target + chiave, 1-hop), e **authz-class**:

- `facility` — dati logistici di struttura (room, bed, roomAssignment, appointment aggregati). Gate: `AI_FACILITY_QUERIES_ENABLED`.
- `patient-scoped` — dati di un singolo paziente (vitalSign, therapy, appointment-del-paziente). Gate: tenant + paziente risolto/autoritativo (F0).
- `public` — anagrafica non sensibile (es. count pazienti). Gate: nessuno oltre tenant.

Estendere la copertura futura = aggiungere righe qui, **zero codice esecutivo nuovo** (payoff dell'approccio componibile).

**Entità v1** (campi curati): `patient` (nome, MRN, dob, sex — nome=sensitive), `room` (numero, tipo, piano, reparto, stato), `bed` (label, stato), `roomAssignment` (patientId, roomId, bedId, startDate, endDate), `appointment` (patientId, scheduledAt, status, reason), `therapy` (campi principali), `vitalSign` (etichetta, valore, rilevato — da `Cartella.parametriVitali`).

## 5. Query DSL (piano multi-step)

```jsonc
{
  "intent": "<uno degli enum>",
  "steps": [
    {
      "id": "s1",
      "from": "<entità>",
      "filter": [ { "field": "...", "op": "eq|in|lt|lte|gt|gte|isNull|contains|between|dateWindow", "value": ... } ],
      "relate": ["<relazione>", ...],           // join 1-hop whitelistati
      "aggregate": { "op": "count|countDistinct|min|max|avg|sum", "field": "...", "groupBy": ["..."] },
      "select": ["field", "rel.field", ...],
      "sort": [{ "field": "...", "dir": "asc|desc" }],
      "limit": <n>,
      "runIf": { "step": "s0", "predicate": "nonEmpty|empty|countGte", "value": <n> },  // condizione
      "bindFrom": { "step": "s0", "field": "patientId", "into": "patientId" }            // correlazione (in-list)
    }
  ],
  "answer": { "primaryStep": "sN" }              // quale/i step alimentano la risposta
}
```

- **`dateWindow`**: `{ lastDays: n }` | `{ day: "today"|"yesterday" }` | `{ from, to }`. Risolto server-side (niente date arbitrarie dal modello oltre lo schema).
- **`runIf`**: esecuzione condizionale su risultato di uno step precedente (deterministica). → copre _"se ieri PA<Y, allora recupera 7 giorni"_.
- **`bindFrom`**: un passo usa gli id emessi da un passo precedente (fan-out/correlazione), es. pazienti trovati → loro parametri.
- Limiti hard: max step, max righe per step, max relate/step, timeout — rifiuto se superati.

## 6. Autorizzazione

- Nuovo flag env **`AI_FACILITY_QUERIES_ENABLED`** (default `false`; prod `true` — decisione committente). Nuova `canFacilityRead(env)` in `context.ts` (solo flag, no ruolo).
- L'engine, per **ogni step**, applica l'authz-class dell'entità: `facility` → richiede `canFacilityRead`; `patient-scoped` → tenant + paziente risolto (autoritativo) + `permittedPatientIds`; `public` → tenant. Uno step non autorizzato → rifiuto motivato dell'intero piano (nessuna esecuzione parziale silenziosa).
- Ricerca clinica cross-patient (`canCrossPatientSearch`, flag+ruolo) **invariata**.
- Campi `sensitive` (es. nome paziente) in output di query `facility` (es. "chi è in camera 12") ammessi dietro `AI_FACILITY_QUERIES_ENABLED` (accettato dal committente); comunque citati (SOURCE_ONLY).

## 7. Planner, executor, composer, fonti

- **Planner**: nuovo tool `query_data` (in `READ_TOOLS`/`READ_TOOL_SCHEMA`) che porta il piano DSL; nuovi intent nell'enum (`llm-planner.ts` + prompt `assistant.py`): `data_query` (generico) accanto agli esistenti. Il prompt insegna DSL + lo **schema esposto** (entità/campi/relazioni/operatori). Validazione → esecuzione; su piano invalido → fallback deterministico (F0/F1).
- **Executor** (`service.ts`): case `query_data` → `engine.run(validatedPlan, ctx, env)`.
- **Fonti** (`types.ts`/`sources.ts`): nuovi source-type `ROOM`/`OCCUPANCY`/`APPOINTMENT` come serve; ogni riga/valore porta la sua fonte; gli aggregati citano l'insieme di record contati; `navFromSource` mappa ad azioni "apri camera/agenda/paziente".
- **Composer F2**: riusato senza modifiche strutturali — descrive conteggi/righe/trend citando le fonti; post-check anti-invenzione attivo.

## 8. Mappatura esempi → piano (nessun codice per-domanda)

| Domanda                           | Piano DSL                                                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Quante camere occupate?           | `s1: from roomAssignment, filter endDate isNull, aggregate countDistinct(roomId)`                                                       |
| Quanti pazienti in struttura?     | `s1: from roomAssignment, filter endDate isNull, countDistinct(patientId)` **+** `s2: from patient, count` → answer entrambi            |
| Camera 12 e da chi?               | `s1: from roomAssignment, filter endDate isNull & room.numero=12, relate bed,room,patient, select room.numero,bed.label,patient.nome`   |
| Andamento parametri 7gg di X      | `s1: from vitalSign, filter patient=X & etichetta=PA & rilevato dateWindow lastDays 7, select etichetta,valore,rilevato, sort rilevato` |
| Appuntamenti di oggi              | `s1: from appointment, filter scheduledAt dateWindow today, relate patient, select scheduledAt,patient.nome,reason`                     |
| **Se ieri PA<Y, dammi anche 7gg** | `s1: vitalSign X, PA, yesterday, systolic<Y` → `s2: runIf s1 nonEmpty → vitalSign X, PA, lastDays 7` → answer s1+s2                     |

## 9. Fase 2 — Orchestrazione supervisore + sub-agenti (documentata, non in questo spec)

- **Fattibilità confermata**: Azure `gpt-5.4-mini` (EU/GDPR) supporta il tool-calling nativo (verificato live: `finish_reason=tool_calls`).
- **Forma**: team Agno nel runtime; il **supervisore** decompone la domanda e coordina **sub-agenti**, ognuno dei quali usa come _tool_ il **motore di query** del backend (via endpoint) — quindi ogni accesso resta validato/authz/SOURCE_ONLY. Il supervisore **correla** i risultati e compone.
- **Perché sopra la Fase 1**: i sub-agenti non toccano il DB; usano il motore come layer-strumenti fidato. Senza Fase 1, niente garanzie.
- **Da definire in un brainstorm dedicato**: schema dei tool esposti al supervisore, bounding (max sub-agenti/step/round, timeout, budget token), topologia (loop nel backend che chiama il runtime per il ragionamento vs team Agno nel runtime che richiama il backend), preservazione SOURCE_ONLY end-to-end, osservabilità.

## 10. Test

- **Unit `schema`/`validate`**: entità/campo/relazione/operatore fuori whitelist → rifiuto; piano ben formato → validato.
- **Unit `engine`** (`node:test`): occupazione (camere/letti/pazienti con assegnazioni attive/chiuse + camere inattive), room lookup (occupata/libera/inesistente), finestra data vitali, `runIf` (step2 saltato/eseguito), `bindFrom` (correlazione), limiti superati → rifiuto.
- **Authz**: entità `facility` con flag off → rifiuto; on → esecuzione; `patient-scoped` senza paziente risolto → rifiuto; cross-patient clinico invariato.
- **Planner**: `query_data` con DSL valido → eseguito; DSL invalido → fallback deterministico. Guardia prompt estesa ai nuovi intent.
- **Verifica live** (prod, roster reale): i 6 esempi (inclusa la condizionale) → risposte corrette con fonti; `AI_FACILITY_QUERIES_ENABLED=true`.

## 11. Deploy

- Backend: build+test via `ai-import-e2e.yml` (gate) su PR → `deploy-backend.yml` al merge.
- Runtime: prompt DSL in `assistant.py` → `deploy-runtime.yml`.
- Flag: `AI_FACILITY_QUERIES_ENABLED=true` su `clinicos-backend` via `railway-set-var.yml` + redeploy.

## 12. Fuori scope (YAGNI)

- Fase 2 (multi-agente) — brainstorm/spec separati.
- Grafici/dashboard visuali (risposte solo testo in chat).
- Relazioni multi-hop / subquery annidate oltre `bindFrom` 1-livello (v1).
- Login/ruolo manager verificato (IdP) — autorizzazione a flag di deployment.
