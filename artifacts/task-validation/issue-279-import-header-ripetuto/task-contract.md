# Task Contract

## Task

- Title: issue 279 import header ripetuto
- Slug: issue-279-import-header-ripetuto
- Type: bugfix
- Date: 2026-07-20
- GitHub Issue: #279

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

L'header istituzionale dell'ospedale (banner + righe con etichette in celle di tabella markdown,
es. "| Codice fiscale | ... |", "Numero Nosografico") si ripete su ogni pagina del documento
importato e NON viene rimosso da `filterRepeatedHeaders`: il rilevatore inline richiede "label:"
con i due punti, mentre l'OCR produce celle tabella senza colon; il banner sopra le righe
etichettate non porta label e resta nel testo importato.

## Expected Behaviour

`filterRepeatedHeaders` riconosce anche: (a) label come celle di tabella markdown (match esatto di
cella), (b) "numero nosografico" tra le label di default, (c) il banner istituzionale ripetuto
verbatim immediatamente sopra un blocco header rimosso (assorbito fino a 12 righe, stop su riga
vuota). Le righe di contenuto clinico non vengono mai rimosse.

## Acceptance Criteria

- AC1: Un documento multi-pagina con header in formato tabella markdown (caso del report) esce dal
  filtro senza le ripetizioni dell'header (banner + righe etichettate).
- AC2: Il contenuto clinico resta intatto: nessuna riga non-header rimossa.
- AC3: I test unit esistenti di header-filter passano + nuovi test coprono cella-tabella,
  "numero nosografico" e assorbimento banner.

## Test Plan

| Test type                 | Required | Reason                                          |
| ------------------------- | -------: | ----------------------------------------------- |
| Unit                      |      yes | header-filter.test.ts esteso con i nuovi casi   |
| Integration               |       no |                                                 |
| API                       |       no |                                                 |
| Playwright                |       no | logica backend pura, coperta da unit            |
| Persistence after refresh |       no |                                                 |
| Agnos action registry     |       no |                                                 |
| Voice simulation          |       no |                                                 |
| OCR/import test           |      yes | fixture con header reale ripetuto nel test unit |
| Security/privacy scan     |       no |                                                 |

## Evidence Plan

- validation-report.md
- output completo suite backend (vitest) con i nuovi test PASS
- log sanitizzato (solo conteggi/etichette, nessun PHI reale)

## Risks

Falsi positivi su tabelle di contenuto: mitigato con match esatto delle label per cella e stop
dell'assorbimento banner su riga vuota / riga non ripetuta.

## Gate Status

READY FOR IMPLEMENTATION
