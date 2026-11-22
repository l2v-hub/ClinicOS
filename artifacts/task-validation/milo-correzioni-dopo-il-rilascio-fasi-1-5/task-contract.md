# Task Contract

## Task

- Title: Milo correzioni dopo il rilascio fasi 1-5
- Slug: milo-correzioni-dopo-il-rilascio-fasi-1-5
- Type: bugfix
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Note: trovato nella verifica sulla demo dopo il rilascio della PR #544 (2026-11-22). Nessuna
modifica a Prisma o rotte.

## Current Behaviour

Sulla demo, con il pianificatore LLM attivo:

- «chi è di turno domani?» → panoramica di struttura (non i turni);
- «com'è l'agenda della settimana?» → `query_data` con `scheduledAt lt "2026-11-23T00:00:00"`
  (data senza fuso): Prisma la rifiuta e la risposta è un errore 500.

## Expected Behaviour

- Le domande che il pianificatore deterministico riconosce con certezza fra i nuovi tipi (turni,
  agenda, parametri, NEWS2, diario, scale, somministrazioni) usano lo strumento dedicato anche con
  il pianificatore LLM attivo.
- Nei filtri di `query_data` sui campi data i valori diventano istanti:
  - data e ora senza fuso = ora della struttura (Europe/Rome);
  - solo data = mezzanotte della struttura;
  - un valore non interpretabile = richiesta rifiutata (400 interno, risposta «non trovato»), mai 500.

## Acceptance Criteria

- AC1: con un piano LLM generico (panoramica/`query_data`) per «chi è di turno domani?» e per
  l'agenda, si usano `query_staff_shifts` e `query_agenda`.
- AC2: `query_data` con `scheduledAt lt "2026-11-23T00:00:00"` esegue la query con l'istante di
  mezzanotte a Roma; con un valore non valido rifiuta senza errore 500.
- AC3: test nuovi, suite dei pianificatori e del motore di query, typecheck e build.
- AC4 (dopo il rilascio): sulla demo le due domande rispondono senza errore con lo strumento giusto.
- AC5: la prosa del compositore e del team usa l'ora della struttura (mai «UTC») e cita le fonti
  come [n] coerenti con l'elenco sotto la risposta, non con identificativi grezzi (trovato sulla
  demo con il paziente di prova: «18:33:06 UTC», «fonte: c3743db8-…»).

## Test Plan

| Test type                 | Required | Reason                                 |
| ------------------------- | -------: | -------------------------------------- |
| Unit                      |      yes | precedenza del piano, conversione date |
| Integration               |      yes | `query_data` su PGlite                 |
| API                       |      yes | dopo il rilascio: `/ai/actions/plan`   |
| Playwright                |      yes | dopo il rilascio: domande sulla demo   |
| Persistence after refresh |       no | sola lettura                           |
| Agnos action registry     |       no |                                        |
| Voice simulation          |       no |                                        |
| OCR/import test           |       no |                                        |
| Security/privacy scan     |       no | nessun nuovo accesso                   |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test; verifica sulla demo

## Risks

- Il pianificatore LLM resta utile per le domande che il deterministico non riconosce.

## Gate Status

READY FOR IMPLEMENTATION
