# Task Contract

## Task
- Title: 450 ingresso correzioni minime
- Slug: 450-ingresso-correzioni-minime
- Type: change
- Date: 2026-10-13

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Issue #450 (decisione del responsabile 13/10/2026: resta la pagina completa del 28/09, solo correzioni minime). «Nuovo ingresso» offre due schede documenti che fanno la stessa cosa («Da lettera di dimissione», «Da file del trasferimento») più il riquadro «Come funziona». Nel modulo a mano la sezione «Ingresso» appare completata appena aperta, perché data e ora di presa in carico si compilano da sole. Sopra l'anagrafica il riquadro «Anagrafica da completare» ripete i 4 campi sottostanti, due testi spiegano quali campi sono obbligatori, e sotto i campi ci sono aiuti ovvi («Usato per calcolare il CF», «Sigla provincia; EE per l'estero», «Si compila automaticamente…»).

## Expected Behaviour

Una sola opzione «Lettera o trasferimento» (con «A mano»), senza «Come funziona». «Ingresso» è completata solo con dati scritti dall'operatore oltre a data e ora automatiche. Niente riquadro che ripete i campi, niente paragrafi sui campi obbligatori (restano i segni di obbligatorietà e gli errori sui campi), niente aiuti ovvi; resta l'avviso quando il codice fiscale è calcolato automaticamente. Nessuna riduzione delle sezioni né modifica backend.

## Acceptance Criteria

- AC1: una sola opzione per caricare documenti (lettera o trasferimento) nella pagina «Nuovo ingresso».
- AC2: nessuna sezione appare completata se non contiene dati scritti dall'operatore; «Ingresso» appena aperta non è completata.
- AC3: nessun riquadro che ripete i campi dell'anagrafica, nessun paragrafo che spiega i campi obbligatori, nessun aiuto ovvio sotto i campi.
- AC4: la creazione a mano resta funzionante (paziente creato nel DB locale); tsc, build e unit verdi.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | stato delle sezioni con i soli valori automatici |
| Integration | no | |
| API | no | |
| Playwright | yes | pagina iniziale, sezione Ingresso, anagrafica, creazione |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Il riquadro DemographicsStatus resta nel Riepilogo (dove riassume, non ripete). Le regole di obbligatorietà non cambiano.

## Gate Status

READY FOR IMPLEMENTATION
