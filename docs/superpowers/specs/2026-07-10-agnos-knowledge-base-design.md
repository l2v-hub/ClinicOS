# Agnos Knowledge Base — Design

**Data:** 2026-07-10 · **Stato:** approvato in brainstorming (sez. 1–4) · **Autore:** Claude + Luca
**Contesto:** primo sottoprogetto della visione "Agnos al centro come vero assistente che si nutre di tutti i dati della piattaforma". Sottoprogetti successivi (fuori scope qui): ottimizzazione flussi inserimento/gestione paziente; potenziamenti voce (STT server-side, wake word).

## Obiettivo

Espandere ciò che Agnos sa leggere e come pianifica le risposte, per operatori **e** amministratori (il pannello è già montato a livello App con `operatorRole`; la voce — input Web Speech + TTS — esiste già e resta invariata):

1. Comparazione parametri vitali: oggi vs ieri, due date, trend 7gg, scostamenti (come dato, mai giudizio)
2. Camere con occupanti per nome (role-gated: **entrambi i ruoli**, stessa disclosure della UI attuale)
3. Nuove fonti interrogabili: consegne, diario+note, moduli clinici (scale), operatori/turni (entrambi i ruoli — decisione 2026-07-10)
4. Planning **LLM-first** (approccio B scelto dall'utente) con guardie deterministiche e fallback
5. Chiarimento guidato: domande generiche → suggerimenti cliccabili, mai risposte indovinate

## Non-obiettivi

- Nessun lavoro sulla voce (Web Speech API attuale sufficiente per questa fase)
- Nessuna modifica ai flussi UI di inserimento/gestione paziente (spec separata)
- Nessun nuovo storage/migration previsto (fonti = modelli Prisma esistenti); se in implementazione emergesse necessità di indici, vanno additivi e motivati
- Nessuna funzione di giudizio/allarme clinico (il guard `refuse_clinical` resta invariato)

## Architettura (Sezione 1 — approvata)

```
Utente (testo o voce) → AgnosPanel → POST /ai/actions/plan
  1. GUARDIE DETERMINISTICHE (sempre prima dell'LLM, invariate)
     delete → rifiutato · write terapie/allergie → rifiutato ·
     refuse_clinical → rifiutato · write appuntamenti/parametri/diario → preview/confirm
  2. PLANNER LLM (Azure gpt-5.5, runtime esistente) per TUTTE le letture
     input: domanda + catalogo tool + ruolo + currentPatientId
     output: QueryPlan tipizzato (schema attuale) · validazione rigida post-LLM
     (intent ∈ enum, args ∈ schema, patientId iniettato dal backend, mai dall'LLM) · timeout 5s
  3. FALLBACK DETERMINISTICO (assistant/plan.ts attuale, non si rimuove)
     Azure giù / timeout / piano invalido → planner regex → risposta comunque
  4. ESECUZIONE SOURCE_ONLY (invariata)
     tool read-only sul Data Gateway (Prisma) · delta e statistiche computati dal
     BACKEND, mai dall'LLM · composer formatta da dati reali con fonte citata
```

Mitigazioni dell'approccio LLM-first:
- Sicurezza mai delegata all'LLM (step 1 deterministico, coperto dai test esistenti)
- L'LLM sceglie *cosa leggere*, mai *cosa rispondere coi numeri*
- Latenza ~2–3s accettata (UI "Agnos sta elaborando…"); fallback <100ms
- Costo: 1 chiamata Azure per domanda read; il fallback regex è promuovibile a fast-path senza refactoring se il costo diventasse un problema

## Nuovi intent e tool (Sezione 2 — approvata)

| Intent | Esempio | Tool → fonte | Ruoli |
|---|---|---|---|
| `vitals_compare` | "PA rispetto a ieri?" | `compare_patient_vitals` → `VitalSign` | entrambi, paziente in contesto |
| `vitals_trend` | "Andamento temperatura settimana" | `get_patient_vitals_trend` → `VitalSign` 7gg | entrambi, paziente in contesto |
| `rooms_occupants` | "Camera 12 occupata da chi?" | `query_room_occupants` → `Room`/`Bed`/`PatientRoomAssignment` con nomi | entrambi |
| `consegne` | "Consegne per Moretti / di oggi" | `get_consegne` → route `/consegne` | entrambi |
| `diary_notes` | "Cosa è stato scritto ieri?" | `get_patient_diary` → `patient-diary` + note | entrambi, paziente in contesto |
| `clinical_scores` | "Ultimo Braden / medicazioni attive" | `get_clinical_scores` → moduli `Cartella.data` | entrambi, paziente in contesto |
| `operators_on_duty` | "Chi è di turno oggi?" | `query_operators` → turni/assegnazioni | **entrambi** (decisione 2026-07-10, era solo-admin: la route pubblica non veicola privilegi admin) |

Regole trasversali:
- Fonte citata sempre; `SourceType` esteso: `CONSEGNE`, `DIARY`, `CLINICAL_SCORE`, `OPERATOR_SCHEDULE`, `ROOM_OCCUPANTS`
- Intent per-paziente senza scheda aperta: risoluzione nome dal testo (pattern esistente); ambiguità → `clarify`, mai indovinare
- `rooms_occupancy` (aggregato, senza nomi) resta per domande generiche; `rooms_occupants` è il puntuale con nomi
- Scostamenti: non un intent separato — allegati a `vitals_compare`/`vitals_trend` quando |delta| supera soglia configurabile, formulati come dato numerico

## Comparazioni, composer, chiarimento guidato (Sezione 3 — approvata)

**Motore di confronto** — `backend/src/ai/assistant/vitals-compare.ts`, funzioni pure:
- `compareVitals(patientId, label, dateA, dateB)` → `{ valoreA, valoreB, delta, unita }` (default oggi vs ieri)
- `vitalsTrend(patientId, label, giorni=7)` → serie `{ data, min, max, media }[]` + `direzione: 'salita'|'stabile'|'calo'`
- `deviationFlag(delta, mediaSettimanale, soglia)` — soglie default via env: PA ±15, FC ±15, T ±0.8, SpO₂ ±3

Composer: solo dati con fonte, es. *"PA oggi 150/90 (08:12) · ieri 140/85 · +10/+5 mmHg · media 7gg 142/86 — Fonte: PARAMETRI"*. Nessun aggettivo clinico.

**Chiarimento guidato** — nuovo esito `clarify` accanto a `read`/`refuse`/`unknown`:
- Scatta quando: domanda sotto-specificata (giudizio LLM) **oppure** piano LLM non valido
- Contiene 2–4 suggerimenti cliccabili generati dal contesto (ruolo, scheda aperta, dati disponibili)
- I suggerimenti provengono da un **catalogo statico di template per intent** compilati con dati reali del contesto (non testo libero LLM) → ogni chip è per costruzione una domanda eseguibile
- UI: chips "Forse intendevi:" sotto il messaggio; click = nuovo turno. TTS legge solo la frase introduttiva

## Errori, test, evidenza (Sezione 4 — approvata)

**Errori**
- Azure giù/timeout/JSON invalido/piano invalido → fallback deterministico trasparente; log sanificato `planner=llm|fallback` (no PHI, no prompt integrali)
- Paziente non risolvibile → `clarify` (mai esecuzione su paziente indovinato)
- `operators_on_duty` → disponibile a entrambi i ruoli (decisione 2026-07-10: dato organizzativo non clinico, nessun dato paziente; la route pubblica fissa comunque `roles=['operatore']` per design)
- Tool nuovi: Prisma read-only; errore DB → messaggio di indisponibilità, mai stacktrace

**Test**
- Unit: `vitals-compare.test.ts` (delta/trend/direzione/soglie); `assistant-plan.test.ts` esteso (fallback per i 7 intent); validazione post-LLM (piani malformati rifiutati); `clarify` (generiche → suggerimenti, mai notFound)
- Invarianti ri-asseriti: delete rifiutato, write terapie rifiutato, `refuse_clinical` intatto, aggregato camere senza nomi; `rooms_occupants` testato per ruolo
- LLM sempre mockato nei test (fixture piani validi/invalidi)

**Evidenza (Codex Gate)**
- Playwright UI reale su stack locale: uno scenario per intent nuovo + scenario `clarify` (domanda generica → chips → click → risposta) + scenario voce (dettatura → risposta letta)
- Artifacts sotto `artifacts/task-validation/<issue>-agnos-knowledge-base/` (screenshot, trace, video, log sanificati)
- Esito dichiarabile da Claude: **READY FOR CODEX QA** — niente chiusure/merge/deploy

## Decisioni prese (con motivazione)

| Decisione | Scelta | Perché |
|---|---|---|
| Planning | **B — LLM-first** con guardie+fallback deterministici | Scelta esplicita utente: robustezza linguistica da "vero assistente"; i rischi (latenza/costo/allucinazione) mitigati da validazione rigida, delta backend-only, fallback |
| Nomi nelle risposte camere | Entrambi i ruoli | La UI attuale mostra già nome+camera a entrambi; Agnos non amplia la disclosure |
| Confronti | Tutti e 4 i tipi | Richiesta utente; scostamenti come dato, mai giudizio |
| Copertura KB | Consegne, diario+note, scale, operatori/turni | Richiesta utente; turni disponibili a entrambi i ruoli (decisione 2026-07-10: dato organizzativo non clinico → admin-only rendeva l'intent morto per tutti, dato che la route pubblica fissa `roles=['operatore']` per design) |
| Voce | Invariata (Web Speech) | Sufficiente per la fase; potenziamenti in spec separata |
| Domande generiche | `clarify` con chips da template | Richiesta utente anti-allucinazione; template statici ⇒ chips sempre eseguibili |
