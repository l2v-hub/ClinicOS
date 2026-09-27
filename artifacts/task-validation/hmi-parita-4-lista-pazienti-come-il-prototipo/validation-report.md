# Task Validation Report

## Task

- Title: HMI parità 4: lista pazienti come il prototipo
- Slug: hmi-parita-4-lista-pazienti-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`PatientList.tsx`**: titolo nell'intestazione (senza breadcrumb); card "Nuovo ingresso" (icona,
  titolo, testo, "Importa dimissione" come scorciatoia, pulsante primario "Nuovo ingresso" che apre
  la scelta esistente); card elenco con ricerca 48, chip "Ricoverati" (predefinita) / "Dimessi e
  archivio" / "Tutti" con i conteggi dei pazienti caricati, "Filtri e ordine" che apre sesso e
  ordinamento di oggi; la ricerca passa a "Tutti".
- **`lib/patientListView.ts`** (nuovo): regola delle viste; lo stato non noto resta fra i ricoverati.
- **`PatientRoster.tsx`**: riga con riquadro 48 della camera, nome, "N anni · Letto X · CF";
  colonna NEWS2 (reale, caricato quando visibile) al posto della colonna codice fiscale;
  intestazioni ordinabili come prima; il codice fiscale resta ordinabile dal selettore (visibile con
  "Filtri e ordine" aperto); stato dell'ordinamento solo per i lettori di schermo.
- **`LazyNews2.tsx`** (nuovo, estratto da `TurnoPatients.tsx`): NEWS2 caricato alla visibilità,
  condiviso fra Turno e lista.
- **`PatientList.css`**: card, controlli 48, chip, righe ≥ 72, badge 32 del prototipo.
- **Test**: `patientListView.test.ts` (nuovo); `patientListIdentityGuard` e `rosterOrderUi`
  aggiornati alle nuove colonne (NEWS2 al posto del codice fiscale, ordinamento per CF dal selettore).

## Files Changed

- frontend/src/components/operator/PatientList.tsx, PatientRoster.tsx, PatientList.css
- frontend/src/components/operator/LazyNews2.tsx (nuovo), TurnoPatients.tsx
- frontend/src/lib/patientListView.ts (nuovo)
- test: patientListView.test.ts (nuovo), patientListIdentityGuard.test.ts, rosterOrderUi.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                  |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | titolo "Pazienti" in intestazione; card "Nuovo ingresso" con pulsante primario 48 che apre la scelta; ricerca e chip 48                                                                   |
| AC2 |   PASS | intestazioni Paziente, Ricovero, NEWS2, Segnalazioni, Azione; righe ≥ 72 con camera 105, "77 anni · Letto B · CF RSSMRA49A01H501J", stato, NEWS2 6; il clic apre la cartella del paziente |
| AC3 |   PASS | Ricoverati 9 (nessun dimesso), Dimessi e archivio 3 (solo dimessi), Tutti 12; somma coerente; la ricerca passa a Tutti; unit patientListView 3/3                                          |
| AC4 |   PASS | "Filtri e ordine": sesso Tutti/Maschio/Femmina e selettore dell'ordinamento con codice fiscale; overflow 0 a 390/768/1024/1180/1440                                                       |
| AC5 |   PASS | build.txt exit 0; unit-full.txt con i soli 9 fallimenti della baseline                                                                                                                    |

## Test Results

| Test                                                       | Result | Evidence                                       |
| ---------------------------------------------------------- | -----: | ---------------------------------------------- |
| Unit                                                       |   PASS | patientListView 3/3; suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 23/23                             |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA |                                                |

## QA indipendente (clinicos-qa)

- Giro 1 — FAILED: un clic dentro lo storico NEWS2 apriva la cartella; conteggi falsi con il
  riepilogo in errore; filtro per sesso invisibile a pannello chiuso. Corretti (guardia sul clic
  della riga, conteggi `null` con avviso, indicatori sul pulsante e avviso).
- Giro 2 — FAILED: lo storico NEWS2 si impilava sotto l'intestazione e due storici potevano essere
  aperti. Corretto con il portale su `document.body` (vale anche per Turno e cartella).
- Giro 3 — **READY FOR QA**: tutti i controlli rieseguiti (1180/768/390, tastiera, Escape e fuoco,
  Turno e Panoramica), overflow 0, build ok, 859/868 con i soli 9 fallimenti di baseline. Unica
  condizione: togliere dal commit due file di stato del tooling (`frontend/src/.claude-flow/*`),
  fatto.

## Runtime Evidence

- screenshots/pazienti-1180.png (accanto a hmi-parity/proto/pazienti.png), filtri-e-ordine.png,
  pazienti-390/768/1024/1440.png, storico-news2-1180/390.png

## Residual Risks

- Nessuna colonna "Diagnosi": il roster non porta la diagnosi.
- Il filtro predefinito è "Ricoverati" (prima "Tutti"): i dimessi sono a un tocco e la ricerca li
  trova sempre. I conteggi valgono per i pazienti caricati (come prima).
- Day Hospital e Ambulatoriale contano fra i "Ricoverati" (in carico); il filtro fine per stato non
  c'è più, resta l'ordinamento per la colonna Ricovero.
- Con il riepilogo non disponibile la vista "Dimessi" dice "Nessun paziente trovato" accanto
  all'avviso che i dimessi non sono ancora distinguibili.
- Errore eslint `react-hooks/set-state-in-effect` in `News2Chip.tsx`, già presente su main.
- Righe con molte segnalazioni superano 72 px perché i badge vanno a capo.

## Final Decision

CLOSED — VERIFIED
