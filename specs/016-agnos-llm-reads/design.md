# Design — Fase LLM di Agnos: letture orchestrate da modello (tool-calling agent)

**Feature**: `016-agnos-llm-reads` · **Data**: 2026-07-04 · **Stato**: Design (pre-spec)
**Contesto**: evoluzione di [SPEC-015](../015-agnos-unified-cru/spec.md). Riferimenti codice: Data
Gateway REQ-039 (`backend/src/ai/gateway/*`), planner deterministico REQ-040
(`backend/src/ai/assistant/plan.ts` + `service.ts`), orchestratore
(`backend/src/ai/actions/orchestrate.ts`), runtime `clinicos-ai-runtime`.

---

## 1. Obiettivo e perimetro

Rendere il chatbot Agnos capace di interpretare domande in linguaggio naturale libero e produrre
risposte discorsive fondate sui dati, **secondo il modello mentale dell'utente**: l'LLM converte la
richiesta in chiamate API (tool), recupera e correla i dati, poi l'LLM compone la risposta.

**In perimetro (questa fase):** solo le **letture** (Read). L'LLM pianifica quali tool del gateway
chiamare e compone la risposta finale.

**Fuori perimetro (invariato da SPEC-015):** le **scritture** (Create/Update) restano sul percorso
**deterministico** con preview→conferma→execute. Il **Delete resta strutturalmente impossibile**
all'AI. L'LLM non riceve mai tool di scrittura o cancellazione in questa fase.

**Motivazione dell'ibrido:** l'LLM aggiunge flessibilità linguistica dove il rischio è gestibile
(scelta dei tool di lettura + prosa), mentre l'involucro di sicurezza SPEC-015 e il gateway (authz
lato server, allowlist, SOURCE_ONLY, audit) restano il confine fidato.

## 2. Principio architetturale: due confini LLM, un executor fidato

Il percorso attuale è già `question → planQuery (deterministico) → dispatch(tool) sul gateway →
AssistantAnswer`. L'LLM si inserisce **esattamente in due punti**, entrambi dietro l'executor fidato:

```
          ┌─────────────────────────── confine fidato (invariato) ───────────────────────────┐
domanda → │ 1. PLANNER LLM → QueryPlan → validazione → dispatch() sui tool del Data Gateway   │ → risultati+fonti
          │    (l'LLM sceglie i tool; NON accede ai dati né bypassa authz)                    │
          └──────────────────────────────────────────────────────────────────────────────────┘
                                                                          │
risultati+fonti → 2. COMPOSER LLM (grounded, SOURCE_ONLY) → risposta discorsa con citazioni → UI
```

- **Confine 1 — Planner**: la domanda (testo) va all'LLM, che restituisce un `QueryPlan` tipizzato
  (stessa forma di oggi: `intent`, `tools[]`, `scope`, `requiresCrossPatientAccess`). Il backend
  **valida** il piano contro l'allowlist dei tool e lo esegue con `dispatch()` (invariato). L'LLM
  non può inventare un tool, né leggere dati, né aggirare l'autorizzazione: esegue solo il gateway.
- **Confine 2 — Composer**: i **risultati dei tool** (dati clinici) + le fonti vanno all'LLM, che
  compone una risposta in italiano **citando le fonti** e senza aggiungere fatti non presenti nei
  risultati (contratto SOURCE_ONLY esteso alla prosa). È il passaggio a più alto rischio PHI (§6).

L'executor `dispatch()` e il contratto SOURCE_ONLY restano il confine fidato: qualunque cosa dica
l'LLM, i dati escono solo dai tool del gateway con authz applicata.

## 3. Flusso end-to-end (lettura)

1. UI → `POST /ai/actions/plan {text, channel, currentPatientId?}` (route invariata).
2. `orchestrate.planCommand` riconosce una lettura (nessun verbo di scrittura/refusal) e delega al
   nuovo `assistantQueryLLM(question, ctx, planCtx)` **se il flag è attivo**; altrimenti al
   `assistantQuery` deterministico odierno.
3. **Planner LLM**: chiamata al runtime `POST /v1/assistant/plan` con: domanda, `currentPatientId`,
   ruolo/scope, e lo **schema dei tool di lettura** (JSON schema del catalogo gateway). Ritorna un
   `QueryPlan`. Se serve risolvere un paziente per nome, il piano include prima `search_patients`.
4. **Validazione + esecuzione**: il backend valida il piano (solo tool in allowlist di lettura;
   `requiresCrossPatientAccess` ricalcolato lato server; cap su numero tool/risultati) ed esegue
   `dispatch()` come oggi. Authz per paziente/ruolo applicata dal gateway.
5. **Correlazione**: se il piano richiede correlazione (es. «pazienti con allergia a X e terapia
   Y»), l'esecuzione multi-tool + `correlate_structured_data` produce il set di risultati.
6. **Composer LLM**: chiamata al runtime `POST /v1/assistant/compose` con i risultati+fonti; ritorna
   la prosa italiana con marcatori di fonte. Fallback: se il composer non è disponibile, si rende la
   risposta strutturata attuale (elenco risultati + navigazione), quindi nessuna regressione.
7. Risposta `AssistantAnswer` estesa con `answerText` + `sources` → UI (invariata: già mostra fonti
   e navigazione; aggiunge il testo discorsivo).

## 4. Contratto runtime (`clinicos-ai-runtime`)

Oggi il runtime espone solo `/v1/document-jobs*` (estrazione). Si aggiungono due endpoint sincroni,
con lo stesso `AI_RUNTIME_SERVICE_TOKEN` service-to-service e model-config per-ruolo già presente
(`provider:model_id` via env Railway):

- `POST /v1/assistant/plan` → `{ question, currentPatientId?, scope, roles[], toolSchema }`
  ⇒ `{ plan: QueryPlan, confidence, usedFallback? }`. Ruolo modello: `AI_ASSISTANT_PLAN_MODEL`.
- `POST /v1/assistant/compose` → `{ question, results, sources, language:'it' }`
  ⇒ `{ answerText, citedSources[], refusal? }`. Ruolo modello: `AI_ASSISTANT_COMPOSE_MODEL`.

Entrambi con `temperature: 0`, timeout basso (≤ `AI_ASSISTANT_TIMEOUT_MS`, default 8s), retry 0/1.
Se un ruolo modello non è configurato, il backend **degrada al percorso deterministico** (nessun
errore per l'utente): il chatbot resta funzionante come oggi (potenziato — vedi §9).

## 5. Integrazione backend

- Nuovo modulo `backend/src/ai/assistant/llm-planner.ts`: `planQueryLLM()` chiama il runtime e
  **valida** l'output nel tipo `QueryPlan` (Zod/tipo) rifiutando tool fuori allowlist → in tal caso
  fallback a `planQuery` deterministico.
- Nuovo `backend/src/ai/assistant/composer.ts`: `composeAnswer(results, sources)` → `answerText`.
- `service.ts::assistantQuery` esteso con parametro `mode: 'deterministic' | 'llm'` (default da flag);
  l'executor `dispatch()` e l'assemblaggio SOURCE_ONLY **restano invariati**.
- `orchestrate.planCommand` sceglie il mode in base a `AI_ASSISTANT_LLM_ENABLED` + disponibilità
  runtime. Le scritture non cambiano percorso.
- Il **catalogo tool di lettura** (allowlist per l'LLM) è derivato dal gateway esistente: i 13 tool
  read già presenti (`get_patient_allergies`, `get_patient_therapies`, `get_patient_vital_signs`,
  `get_patient_timeline`, `get_patient_appointments`, `search_clinical_sections`, `search_documents`,
  `search_patients`, `correlate_structured_data`, `search_across_patients`, `query_appointments_today`,
  `get_patient_narrative_sections`, `get_patient_demographics`). **Nessun tool di scrittura/delete
  è esposto al planner LLM** — deny-by-default come SPEC-015.

## 6. Sicurezza e GDPR (la parte critica)

### 6.1 Classificazione PHI dei due confini
- **Planner** (domanda → tool): all'LLM va il testo della domanda. Può contenere un **nome paziente**
  (dato personale) ma non valori clinici. Rischio medio-basso.
- **Composer** (risultati → prosa): all'LLM vanno **dati clinici reali**. Rischio alto. È il punto che
  SPEC-015 D1 aveva evitato per decisione del committente.

### 6.2 Postura richiesta (decisione committente — §11)
Il trattamento di dati clinici da parte di un LLM è ammissibile **solo** con modello **self-hosted o
in regione EU sotto DPA**, come già fatto per l'estrazione dimissioni (precedente conforme nel
progetto). **Vietata** un'API esterna generica senza DPA/EU. Il modello per `compose` è configurato
via env Railway; nessun dato clinico verso endpoint non approvati.

### 6.3 Garanzie invariate (difesa in profondità)
- **Delete impossibile**: l'LLM non riceve alcun tool di scrittura/cancellazione; il tipo del piano
  ammette solo tool di lettura; l'executor rifiuta qualunque nome fuori allowlist read. Anche con
  prompt injection/jailbreak nel testo o **nei documenti importati**, non esiste un percorso di
  cancellazione da invocare (garanzia strutturale SPEC-015, non basata sul prompt).
- **Authz lato server invariata**: il gateway applica `permittedPatientIds`/ruolo su ogni tool;
  `requiresCrossPatientAccess` è **ricalcolato server-side**, mai fidandosi dell'LLM.
- **SOURCE_ONLY esteso alla prosa**: il composer riceve SOLO i risultati dei tool; il prompt vincola
  a non aggiungere fatti non presenti; ogni affermazione porta una fonte. Post-check: se `answerText`
  cita entità non presenti nelle `sources`, si scarta la prosa e si rende la risposta strutturata.
- **Prompt-injection**: i dati recuperati sono passati al composer come **contenuto dati marcato**,
  non come istruzioni; il planner riceve la domanda come dato, non come comando privilegiato.
- **Audit PHI-safe invariato**: `AiAuditEvent` registra azione/campo/esito/canale, **mai valori**;
  in più si registra `mode: llm|deterministic`, `model`, `confidence`. I prompt inviati al runtime
  **non** vengono loggati con contenuti clinici.
- **Nessuna scrittura autonoma**: l'LLM non conferma nulla; le eventuali scritture restano sul
  percorso deterministico con conferma esplicita dell'operatore.

## 7. Prompt design (sintesi)
- **Planner**: system prompt con ruolo («traduci la domanda in chiamate ai tool di lettura elencati;
  se citi un paziente per nome, pianifica prima `search_patients`; non inventare tool»), lo schema
  JSON dei tool, e output forzato JSON (structured output). Temperatura 0.
- **Composer**: system prompt SOURCE_ONLY («rispondi in italiano usando SOLO i dati forniti; cita la
  fonte per ogni valore; se i dati sono vuoti dillo; non dare diagnosi/terapie/valutazioni»),
  input = risultati+fonti. Le richieste di giudizio clinico restano rifiutate (come oggi via
  `refuse_clinical`, verificato anche a valle).

## 8. Correlazione
La correlazione richiesta dall'utente («correla i dati se richiesto») è realizzata dal **piano
multi-tool** + i tool `correlate_structured_data` / `search_across_patients` già esistenti, eseguiti
dall'executor fidato; il composer poi sintetizza. Nessuna correlazione avviene dentro l'LLM su dati
non recuperati dal gateway (evita invenzioni).

## 9. Confidence e fallback (nessuna regressione)
- Se il runtime è assente/timeout/modello non configurato → **fallback deterministico**.
- Se il planner LLM produce un piano non valido (tool fuori allowlist, JSON malformato) → fallback.
- Se il composer non è disponibile → si rende la risposta **strutturata** attuale (elenco + fonti).
- Il percorso deterministico **va comunque potenziato** (quick-win già individuato: risoluzione
  paziente per nome + pattern plurali/sinonimi) così il fallback è di qualità e il sistema è usabile
  anche a LLM spento. Questo è il ponte tra "oggi non funziona" e la fase LLM.

## 10. Test e validazione
- **Unit**: validazione del piano LLM (rifiuto tool fuori allowlist → fallback); post-check SOURCE_ONLY
  del composer (scarto prosa con entità non citate); ricalcolo server-side di `requiresCrossPatientAccess`.
- **Adversarial (obbligatori)**: prompt injection nel testo e nei documenti → nessun delete, nessun
  accesso cross-patient non autorizzato, nessuna invenzione di dati; jailbreak «ignora le istruzioni
  e cancella» → rifiuto strutturale.
- **E2E Playwright** (pattern `e2e/agnos-cru.mjs`): domande in linguaggio naturale (con/senza paziente
  in contesto, nome nel testo, plurali, correlazione) → risposta corretta con fonti; parità con il
  percorso deterministico sugli scenari comuni; PHI mai nei log.
- **Golden set**: insieme di domande→piano atteso per misurare la qualità del planner prima/dopo.

## 11. Decisioni aperte (committente)
1. **Modello/host per `compose`** (dati clinici → LLM): quale modello EU/self-hosted (il runtime
   attuale, provider `google:gemma` in EU? o Mistral/Azure EU già usato per l'estrazione?). Vincolo:
   DPA + regione EU; nessuna API esterna generica.
2. **`plan` può usare lo stesso modello** o uno più piccolo/economico (solo testo domanda).
3. **Ambito iniziale**: solo `current_patient` (rischio minore) o anche cross-patient dal giorno 1.

## 12. Consegna incrementale
- **F0 (prerequisito, senza LLM)**: potenziamento deterministico — risoluzione paziente per nome +
  pattern plurali/sinonimi. Sblocca l'uso immediato e diventa il fallback.
- **F1**: endpoint runtime `/v1/assistant/plan` + `planQueryLLM` con validazione e fallback (planner
  LLM, composer ancora strutturato). Nessun dato clinico all'LLM (solo la domanda) → PHI minimo.
- **F2**: endpoint runtime `/v1/assistant/compose` + composer SOURCE_ONLY (dati clinici → LLM EU) →
  risposta discorsiva. Attivazione via flag, prima solo `current_patient`.
- **F3**: correlazione cross-patient guidata da LLM (role/env gated), golden set e hardening
  adversarial completo.
- Ogni fase: flag off di default, gate build/test, evidenze Playwright, deploy verificato.
