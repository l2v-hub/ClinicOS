# Task Contract

## Task
- Title: 202 privacy voice logging
- Slug: 202-privacy-voice-logging
- Type: change
- Date: 2026-07-06
- GitHub Issue: #202 (Privacy voice logging, p0, parent #164)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Il percorso vocale Agnos è PHI-safe **per costruzione**: l'unico log che trasporta contenuto è
`voice/audit.ts:54` (`[ai-voice] …`) e contiene solo NOMI di campo (`fields.slice(0,20)`), mai valori
né trascrizione; route/orchestratore loggano solo `err.message` (`routes/ai-voice.ts:30`,
`routes/ai-actions.ts:52`); il planner LLM inghiotte gli errori senza loggarli (`llm-planner.ts:90`).
**Manca però un test di regressione** che catturi l'output di log reale e dimostri che la trascrizione
non compare mai (AC3). Senza questo test, una futura modifica potrebbe reintrodurre un leak senza che il
gate se ne accorga.

## Expected Behaviour

Esiste un test privacy deterministico e DB-free che, eseguendo flussi vocali reali (create confermato,
rifiuto delete, errore) con una trascrizione contenente stringhe-sentinella (nome paziente + valore
parlato), cattura `console.log`/`console.error` e l'evento persistito e **asserisce**:
- nessuna sottostringa della trascrizione compare in alcun log/evento (AC1);
- l'entry audit `[ai-voice]` contiene solo le chiavi di metadati consentite e `fields` sono soli nomi (AC2);
- l'evento persistito (`recordAuditEvent`, via spy iniettato) non contiene trascrizione né valori (AC2/AC3).

## Acceptance Criteria

- AC1: No full transcript is logged — nessuna porzione della trascrizione vocale compare in stdout/stderr o nell'evento audit persistito.
- AC2: Audit stores minimal metadata only — l'entry contiene solo `{requestId,userId,patientId,actionType,recordId,fields,source,channel,outcome,at}` e `fields` sono nomi di campo, non valori.
- AC3: Privacy test verifies sanitized logs — esiste ed è verde un test che cattura i log reali e verifica la sanitizzazione.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Nuovo test privacy DB-free che cattura i log ed asserisce assenza trascrizione + metadati minimi |
| Integration | no | |
| API | no | Non serve server live: orchestratore eseguito in-process con dipendenze iniettate |
| Playwright | no | Nessuna modifica UI (issue: Playwright non richiesto) |
| Persistence after refresh | no | Nessun dato modificato dal task |
| Agnos action registry | no | Nessuna modifica al catalogo |
| Voice simulation | yes | Il test simula trascrizioni vocali (canale VOCE) reali |
| OCR/import test | no | |
| Security/privacy scan | yes | Il test È la verifica privacy dei log |

## Evidence Plan

Required evidence:
- validation-report.md con Final Decision derivata dai test
- output `npm test` (test suite backend, incluso il nuovo file) → `test-results/`
- log sanitizzati catturati dal test → `logs/`

## Risks

- Rischio: il test cattura `console.*` globalmente → deve ripristinare gli originali in `finally` per non
  inquinare gli altri test. Mitigazione: wrapper capture con try/finally.
- Rischio: falsa sicurezza se la sentinella non attraversa davvero il percorso di log. Mitigazione: usare
  una sentinella che il planner processa (nome paziente risolto + valore vitale parlato) e verificare che
  il flusso produca effettivamente un'entry audit.

## Gate Status

READY FOR IMPLEMENTATION
