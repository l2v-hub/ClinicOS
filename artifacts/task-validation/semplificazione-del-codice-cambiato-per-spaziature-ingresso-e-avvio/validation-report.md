# Task Validation Report

## Task

- Title: Semplificazione del codice cambiato per spaziature, ingresso e avvio
- Slug: semplificazione-del-codice-cambiato-per-spaziature-ingresso-e-avvio
- Commit: vedi la pull request verso `main`
- Date: 2026-11-19

## Implementation Summary

Skill `simplify` sul diff `3360d52d..97e36fda -- frontend/src frontend/index.html`: quattro
revisioni indipendenti (riuso, semplificazione, efficienza, livello della correzione), poi le
correzioni a comportamento invariato.

Applicate:

1. `design-system.css`: l'elenco delle pagine del «Ritmo di pagina» era scritto due volte; ora una
   (regola annidata per i figli). Tolto `min-width: 0` sui figli: in una colonna flessibile non ha
   effetto (lo sbordo a 390px l'ha corretto la colonna di `.consegna-quick`). Aggiunta `.nps`
   (scelta del «Nuovo ingresso»), che ripeteva a mano le stesse dichiarazioni.
2. `design-system.css`: uniti i due blocchi `@media` identici (puntatore touch, ≤600px); il commento
   sui 44px spostato sul token che li definisce.
3. CSS rimasto inutile dopo la regola unica: `.rp-page { padding: 0 }` sotto i 1024px,
   `.op-management`/`.admin-dashboard { max-width: none }`, la regola e l'intestazione di
   `.operator-agenda-view` (classe non più usata), le dichiarazioni duplicate di `.nps`.
4. `ParametriTab`: i giorni già compilati si calcolano con l'esistente `giornoHasData` in un solo
   passaggio (prima una seconda regola «ha valori» nello stesso file); «Tutto il mese» usa il chip
   canonico, che mostra lo stato premuto.
5. `cfCheck.ts`: `fiscalCodeSex` normalizza una volta e decodifica l'omocodia con un solo aiuto.
6. Un solo percorso d'importazione per il controllo del codice fiscale: tolta la riesportazione da
   `codiceFiscale.ts`; `StepAnagrafica` e il test puntano a `cfCheck`.
7. `App.tsx`: la scheda d'ingresso (con il catalogo dei comuni) si precarica solo dopo l'accesso e
   solo se l'utente può aprire un ingresso (`intake.create_draft`), non più dalla schermata di
   accesso per tutti; un solo aiuto `whenIdle` per i precaricamenti.

Scartate (con motivo):

- Card di pagina su `.ds-card` invece dell'elenco nel foglio canonico; titolo e didascalie
  dell'ingresso sulle classi `ds-card__title` / `cts__title`: tocca il markup di molte pagine o
  cambia l'aspetto (troncamento delle didascalie). Fuori dalla portata di una pulizia.
- `.cr-tab-content` senza rientri di base, togliendo i due neutralizzatori (ingresso, consegne):
  cambia la cartella paziente e la stampa; da fare come compito a sé, con verifica visiva.
- Anello di fuoco dell'intestazione su tutte le pagine: cambio di comportamento.
- `--ds-control-h` ridefinito in `AssessmentCatalog.css` (stesso valore, nessun effetto): il file
  non è formattato e la modifica lo farebbe riformattare tutto.
- Precarico della libreria MSAL alla schermata di accesso: l'accesso Entra non è configurato in
  nessun ambiente.

## Files Changed

`frontend/src/design-system.css`, `App.css`, `App.tsx`, `components/admin/RolePermissionsPage.css`,
`components/operator/NewPatientStart.css`, `components/operator/cartella/ParametriTab.tsx`,
`components/shared/intake/StepAnagrafica.tsx`, `lib/cfCheck.ts`, `lib/codiceFiscale.ts`,
`lib/__tests__/intakeDemographics.test.ts`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                           |
| --- | -----: | -------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | elenco sopra (7 applicate, 5 scartate con motivo)                                                  |
| AC2 |   PASS | build OK; suite frontend 1597/1597; lint: stessi errori di prima nei file toccati (App.tsx 12 → 12) |
| AC3 |   PASS | solo `frontend/src` più questa cartella                                                            |
| AC4 |   PASS | `test-results/intake-flow.txt` (13 PASS), `test-results/cf-flow.txt` (5 PASS)                      |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                  |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | suite frontend 1597/1597                                                                                                                                                  |
| Integration      |     NA |                                                                                                                                                                           |
| API              |     NA |                                                                                                                                                                           |
| Playwright       |   PASS | `logs/blocks-after-simplify.txt`: stesse misure di pagina di prima (16px fra i blocchi ovunque); l'unica riga in più è il filtro di stato dell'Agenda, che compare quando ci sono appuntamenti |
| Persistence      |   PASS | `test-results/intake-flow.txt`: bozza salvata, ricaricata e ripresa                                                                                                       |
| Agnos AI         |     NA |                                                                                                                                                                           |
| Voice            |     NA |                                                                                                                                                                           |
| OCR              |     NA |                                                                                                                                                                           |
| Security/privacy |     NA |                                                                                                                                                                           |

## Runtime Evidence

Ambiente locale con dati sintetici. `test-results/preload-check.txt`: nessuna richiesta della scheda
d'ingresso prima dell'accesso; una richiesta dopo l'accesso per operatore e amministratore (nella
policy locale entrambi possono aprire un ingresso).

## Logs

Only sanitized logs are allowed. `logs/blocks-after-simplify.txt`.

## Residual Risks

- La regola annidata nel CSS viene appiattita dalla build (verificato nel CSS prodotto); i figli
  della pagina ricevono il margine zero con una specificità più alta di prima: misure identiche
  sulle 17 pagine.

## Final Decision

CLOSED — VERIFIED
