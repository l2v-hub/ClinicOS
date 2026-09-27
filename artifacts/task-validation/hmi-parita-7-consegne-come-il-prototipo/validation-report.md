# Task Validation Report

## Task

- Title: HMI parità 7: consegne come il prototipo
- Slug: hmi-parita-7-consegne-come-il-prototipo
- Commit: (see PR)
- Date: 2026-09-27

## Implementation Summary

Only the presentation changes. The draft store, save, "Salva e prossimo", summaries and Feed stay as they are.

- **`ConsegneWorkspace.tsx`**: the header reads "Consegne · Giro pazienti e feed delle consegne", and the mode buttons become 48 px chips (aria-pressed, as before).
- **`ConsegneRounds.tsx`**: two columns, as in the prototype.
  - Left: the "TURNO …" heading (facility clock), search, room filter and "Ordine del giro" (collapsible), the list, and "Carica altri".
  - Right: save/error messages above the card.
- **`ConsegnePatientRoster.tsx`**: each row shows the room box (from the current location), name, CF (the room for screen readers) and the same summary badges as before, including the honest states.
- **`ConsegnaComposer.tsx`**:
  - title "Consegna · Name" and state "Nuova consegna" / "Bozza non salvata";
  - the same fields;
  - buttons: "Salva" secondary and "Salva e prossimo" primary at the bottom right, "Scarta bozza" on the left;
  - the name is not repeated in the identity on wide screens (it stays sticky on phones).
- **`ConsegneRounds.css`**: HMI 1 block (chips, rows, 48 px card and buttons, breakpoints).

## Files Changed

- frontend/src/components/operator/ConsegneWorkspace.tsx, ConsegneRounds.tsx, ConsegnePatientRoster.tsx,
  ConsegnaComposer.tsx, ConsegneRounds.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                     |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Header, "Turno pomeriggio" heading, order panel closed; rows show room 104, name, CF and real badges; card "Consegna · Andrea Moretti"; "Salva e prossimo" 48 px at the bottom right                                                                                                         |
| AC2 |   PASS | The draft survives switching patient and is marked "Bozza"; the card says "Bozza non salvata". "Salva e prossimo" sends a single POST (note, type, priority, due date, requestId) and moves on to the next patient; the row is marked "Appena salvata". "Scarta bozza" asks for confirmation |
| AC3 |   PASS | Summary 500: "Riepilogo non disponibile", no counts. Summary slow: "Verifica consegne…". Name search 12 → 1; the room filter sends `room` to the server                                                                                                                                      |
| AC4 |   PASS | Feed reachable and populated; overflow 0 at 390, 768, 1024, 1180 and 1440                                                                                                                                                                                                                    |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 859/868 with only the 9 baseline failures (consegneGiroUi green)                                                                                                                                                                                             |

## Test Results

| Test                                                       | Result | Evidence                                 |
| ---------------------------------------------------------- | -----: | ---------------------------------------- |
| Unit                                                       |   PASS | full suite (baseline); consegneGiroUi ok |
| Playwright                                                 |   PASS | evidence.mjs 25/25                       |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | same API                                 |

## QA indipendente (clinicos-qa)

- Giro 1, **FAILED VALIDATION**:
  - (1) A fine lista, a 1180×820, l'identità del paziente usciva dallo schermo mentre si scriveva.
  - (2) I nomi lunghi uscivano dalla colonna, rendendo indistinguibili omonimi quasi uguali.
  - Avvisi:
    - posizione datata presentata come attuale;
    - letto perso;
    - "Anagrafica da completare" assente;
    - ordine di Tab non coerente;
    - titolo in ordine Nome Cognome.
  - Correzioni:
    - le righe usano di nuovo `PatientIdentity` (nome intero, CF, posto letto con data e fonte, anagrafica da completare);
    - il roster usa `minmax(0,1fr)`;
    - le colonne sono sticky e il titolo è "Cognome, Nome";
    - l'ordine nel DOM ora coincide con quello visivo.
- Giro 2, **FAILED VALIDATION**: tra 801 e 1023 px la colonna si agganciava sotto la topbar e il nome era nascosto nell'identità.
  - Correzioni:
    - offset sticky pari a topbar + 16 px in quella fascia;
    - lista pazienti con scorrimento interno;
    - identità visibile e agganciata in cima alla colonna.
  - Casi QA2 aggiunti (1000×700, 900×560, 1180×600).
- Giro 3, **READY FOR QA**: nome sempre leggibile nella card a ogni dimensione e dopo "Salva e prossimo", pulsanti raggiungibili nelle finestre basse, nomi lunghi dentro la colonna. L'avviso sui campi coperti durante la risalita con Shift+Tab è stato poi corretto con `scroll-margin`.

## Runtime Evidence

- screenshots/consegne-1180.png (alongside hmi-parity/proto/consegne.png), dopo-salva.png, feed-1180.png,
  consegne-390/768/1024/1440.png

## Residual Risks

- **SBAR and the AI draft from the prototype are missing.** ClinicOS has neither the data model nor an endpoint for them; they would require an API and an AI flow (user decision). Today the handover is operational: type, priority, due date, assignee, text.
- The "Feed consegne" tab keeps today's layout; its parity is left for a later cycle.

## Final Decision

CLOSED — VERIFIED
