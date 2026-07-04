# Research — 016 Fase LLM di Agnos (letture NL)

Basata su ricognizione codebase 2026-07-04 (percorso read attuale + gateway + runtime). Riferimento design: [design.md](./design.md).

## D1 — Punto di innesto dell'LLM

- **Decision**: l'LLM entra in due punti dietro l'executor fidato: (1) **planner** (`llm-planner.ts`) che sostituisce/affianca `planQuery` producendo lo stesso tipo `QueryPlan`; (2) **composer** (`composer.ts`) che trasforma i risultati dei tool in prosa. L'executor `dispatch()` sul gateway e il contratto SOURCE_ONLY restano invariati.
- **Rationale**: il confine dati (gateway, authz, allowlist) non cambia; l'LLM decide solo *quali* letture e *come* formulare la risposta. Riduce la superficie di rischio e riusa tutto il codice esistente (Constitution I).
- **Alternatives considered**: LLM che interroga direttamente il DB (respinto: viola Backend Data Authority e authz); riscrittura dell'executor (inutile, aumenta rischio).

## D2 — Risoluzione del paziente per nome (F0, senza LLM)

- **Decision**: in `plan.ts`, prima delle intent, se la domanda contiene «di/per/del paziente <Nome [Cognome]>» e non c'è `currentPatientId`, pianificare `search_patients` e, se univoco, usare quel `patientId` come scope; se ambiguo/assente → esito «paziente non identificato» (nessuna invenzione). Normalizzazione accenti/maiuscole già presente (`norm`).
- **Rationale**: è la causa radice principale del malfunzionamento odierno (le intern current-patient richiedono un paziente aperto). Deterministico, GDPR-safe, immediato; diventa il fallback per le fasi LLM.
- **Alternatives considered**: obbligare l'apertura scheda (UX povera, è il difetto attuale); demandare tutto all'LLM (rischio/latency, non disponibile a LLM spento).

## D3 — Robustezza dei pattern (F0)

- **Decision**: estendere i pattern a plurali/sinonimi: `terapi\w*|farmac\w*`, `allerg\w*`, `parametr\w*|pressione|saturazione|temperatura|frequenza`, `appuntament\w*|agenda`, `document\w*`, ecc.; togliere il singolare-only (`/terapia/` → `/terapi\w*/`).
- **Rationale**: colma i falsi `unknown` (es. «terapie» plurale). Testabile con golden set.
- **Alternatives considered**: elenco chiuso di sinonimi (fragile); solo LLM (non copre il fallback).

## D4 — Contratto planner LLM (F1)

- **Decision**: `POST /v1/assistant/plan {question, currentPatientId?, scope, roles[], toolSchema}` → `{plan, confidence}` con structured output vincolato allo schema JSON dei 13 tool read. Il backend **valida** ogni tool contro l'allowlist read; qualunque tool fuori lista o JSON malformato → fallback deterministico + audit. `requiresCrossPatientAccess` **ricalcolato server-side**, mai dall'LLM.
- **Rationale**: FR-002/FR-009/FR-013; l'LLM propone, il backend dispone. Nessuno strumento di scrittura è nello schema (FR-008).
- **Alternatives considered**: free-text tool names (rischio injection di tool inesistenti); tool-calling nativo del provider (equivalente, ma la validazione server resta obbligatoria comunque).

## D5 — Contratto composer LLM (F2) e SOURCE_ONLY

- **Decision**: `POST /v1/assistant/compose {question, results, sources, language:'it'}` → `{answerText, citedSources, refusal?}`. Prompt vincola a usare solo i dati forniti e citare le fonti. **Post-check** lato backend: se `answerText` contiene entità/valori non presenti nei `results`, scartare la prosa e rendere la risposta strutturata (FR-006). Temperatura 0.
- **Rationale**: FR-005/FR-006; l'anti-invenzione non è affidata solo al prompt ma verificata a valle.
- **Alternatives considered**: fidarsi del prompt (insufficiente in sanità); template deterministico di frasi (rigido, non «discorsivo» come chiesto) — resta come fallback.

## D6 — Audit della modalità

- **Decision**: registrare `mode` (llm|deterministic), `model`, `confidence` per ogni lettura. Preferenza: campi **additivi** su `AiAuditEvent` (`mode`,`model`) — **solo con approvazione esplicita del committente** (Constitution IV). Senza approvazione: la modalità va nel log runtime (stdout) e non nello schema; l'evento audit resta come SPEC-015.
- **Rationale**: FR-010; tracciabilità forense. Subordinato all'approvazione migrazione.
- **Alternatives considered**: nuovo modello audit separato (over-engineering); nessun tracciamento (non conforme a FR-010).

## D7 — Postura GDPR / modello per la composizione (DECISIONE COMMITTENTE)

- **Decision (vincolo)**: i dati clinici raggiungono l'LLM **solo** nel composer (F2) e **solo** verso un modello **self-hosted o in regione EU sotto DPA**, coerente con la scelta già adottata per l'estrazione dimissioni (Mistral Document AI su Azure EU, GDPR-compliant, per memoria progetto). Verso host non approvati la composizione resta **disattivata** (risposta strutturata). Il planner (F1) riceve solo la domanda (PHI minimo: eventuale nome).
- **OPEN — da confermare in questa fase di planning**: quale modello/host concreto per `compose` (il runtime attuale `provider:model` in EU? il Mistral/Azure EU dell'estrazione?) e se `plan` usa lo stesso modello o uno più economico.
- **Rationale**: FR-011/FR-012/Constitution VII; esiste un precedente conforme nel progetto.
- **Alternatives considered**: API esterna generica (respinta: PHI verso host non approvato); nessun LLM (è la fase F0, insufficiente per la visione «l'LLM elabora la risposta»).

## D8 — Difesa in profondità (Delete impossibile, prompt injection)

- **Decision**: (1) lo schema tool esposto all'LLM contiene **solo letture**; (2) il tipo `QueryPlan` non ammette tool di scrittura; (3) l'executor esegue solo nomi in allowlist read; (4) i dati recuperati sono passati al composer come **contenuto marcato**, non come istruzioni; (5) il planner tratta la domanda come dato. Le scritture restano sul percorso deterministico SPEC-015 con conferma.
- **Rationale**: FR-008/SC-003/SC-007; il divieto Delete è strutturale, non basato sul prompt, quindi resistente a jailbreak e a injection dai documenti importati.
- **Alternatives considered**: solo istruzioni di prompt «non cancellare» (aggirabile — respinto).

## D9 — Fallback e timeout

- **Decision**: `AI_ASSISTANT_LLM_ENABLED` (globale) + flag per `plan`/`compose`; `AI_ASSISTANT_TIMEOUT_MS` (default 8000). Runtime assente/timeout/piano invalido → percorso deterministico entro la soglia, nessun errore utente. Il composer non disponibile → risposta strutturata.
- **Rationale**: FR-013/FR-014/SC-005; nessuna regressione rispetto a oggi.

## D10 — Validazione (golden set + adversarial)

- **Decision**: golden set `domanda→piano atteso` per misurare il planner (SC-001); suite adversarial obbligatoria (prompt injection nel testo e nei documenti importati, jailbreak «cancella», accesso cross-patient non autorizzato) → 0 cancellazioni/invenzioni/accessi (SC-007); E2E `e2e/agnos-llm-reads.mjs` sul pattern esistente.
- **Rationale**: SC-001/SC-004/SC-007; il pattern harness è già rodato (agnos-cru.mjs).
