# Task Validation Report

## Task

- Title: Intake: dati di ingresso visibili in Presa in carico
- Slug: intake-dati-di-ingresso-visibili-in-presa-in-carico
- Commit: (vedi PR)
- Date: 2026-09-26

## Implementation Summary

- **Nuovo modulo puro `frontend/src/lib/presaInCarico.ts`:**
  - `mapIngressoToPresaInCarico` traduce il passaggio Ingresso del wizard nelle chiavi e nei
    vocabolari della presa in carico (`dataPresa→dataIngresso`, `oraPresa→oraIngresso`,
    `ospedale→dimissione_ospedaliera`).
  - Il tipo di ingresso (urgenza/programmato/trasferimento/day_hospital) va nel nuovo campo
    `tipoIngresso`, separato dal mezzo di arrivo.
  - Non inventa valutazioni cliniche.
  - `resolvePresaInCarico` legge le cartelle confermate prima del fix (campi alla radice) senza
    migrazione. Un oggetto `presaInCarico` vuoto non nasconde i campi legacy.
- **`confirmCartella.ts`:** i dati di ingresso vanno in `cartella.presaInCarico`, non più alla radice.
- **`PresaInCaricoTab.tsx`:**
  - usa il resolver;
  - vista e modulo partono da valori vuoti per ogni valutazione clinica;
  - ogni card salva solo i propri campi (`CARD_FIELDS`), quindi modificare "Dati di ingresso" non
    scrive più "vigile", "autonomo" ecc. mai valutati;
  - nei menu del modulo c'è la prima opzione "— Seleziona —";
  - "Materiale consegnato" non converte più il valore vuoto in "No";
  - nuova riga "Tipo di ingresso".
- **`InlineEditableField.tsx` (condiviso):** un menu senza valore mostra "— Seleziona —" invece
  della prima opzione, che sembrava scelta ma non veniva salvata.
- **`types.ts`:** campo opzionale `PresaInCarico.tipoIngresso`.

## QA round 1 (FAILED VALIDATION) → correzioni

1. Menu inline vuoti (`value=''`) mostravano la prima opzione; "Materiale consegnato" salvava
   "No" mostrando "Sì". **Corretto:** opzione "— Seleziona —" in InlineEditableField; il valore
   vuoto non diventa `false`.
2. Scenario B della prova non era mai stato eseguito su un secondo paziente: i pazienti
   sintetici condividono il cognome Moretti. **Corretto:** apertura via ricerca, verifica del
   nome completo in testata, screenshot distinti (md5 diversi), viewport alta.
3. "Modifica" salvava l'intero modulo con i default clinici (bug già presente su main).
   **Corretto:** salvataggio per card e modulo senza default clinici; provato sul payload PUT
   reale (scenario C).
4. Resolver con `presaInCarico: {}`. **Corretto** e coperto da test.

## QA round 2 (FAILED VALIDATION) → correzione

- Il salvataggio inline di "Dolore" lasciato su "— Seleziona —" registrava `dolore: 'assente'`.
  **Corretto** alla radice: `saveField` non scrive nulla se il valore non cambia. Questo copre
  anche l'avviso su "Compilato il" aggiornato senza dati. In più, il gestore di Dolore non
  converte più il valore vuoto in "assente".
- Nuovo scenario E (logs/playwright-evidence.txt):
  - Dolore e Orientamento salvati senza scelta non inviano alcun PUT;
  - la scelta esplicita "Orientato" viene salvata da sola (payload: `orientamento`, `compilatoAt`).

## Files Changed

- frontend/src/lib/presaInCarico.ts (nuovo)
- frontend/src/lib/**tests**/presaInCarico.test.ts (nuovo)
- frontend/src/components/shared/intake/confirmCartella.ts
- frontend/src/components/shared/intake/**tests**/confirmCartella.test.ts
- frontend/src/components/operator/cartella/PresaInCaricoTab.tsx
- frontend/src/components/shared/InlineEditableField.tsx
- frontend/src/types.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                         |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | test-results/unit-mapping.txt — "writes the whole Ingresso step into presaInCarico…", "maps every draft section…"                                                                                |
| AC2 |   PASS | unit-mapping.txt — "never invents a clinical assessment", "no Ingresso data means no presaInCarico"; logs/playwright-evidence.txt scenario C (payload PUT senza campi clinici)                   |
| AC3 |   PASS | unit-mapping.txt — 4 test `resolve…` (salvata invariata, legacy derivata, `{}` non nasconde il legacy, undefined)                                                                                |
| AC4 |   PASS | logs/playwright-evidence.txt A (7 PASS), screenshots/A-cartella-legacy-presa-in-carico.png                                                                                                       |
| AC5 |   PASS | logs/playwright-evidence.txt B (paziente B verificato dal nome completo), screenshots/B-cartella-senza-presa-in-carico.png; menu vuoti: C-modifica-dati-di-ingresso.png, D-menu-inline-vuoto.png |
| AC6 |   PASS | test-results/build.txt (exit 0); unit-mapping.txt 15/15                                                                                                                                          |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                        |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | unit-mapping.txt 15/15. Suite completa unit-full.txt: 794/803; i 9 falliti sono gli stessi che falliscono su origin/main pulito (baseline-origin-main-preexisting-failures.txt) |
| Integration      |     NA | backend invariato                                                                                                                                                               |
| API              |     NA | endpoint invariati                                                                                                                                                              |
| Playwright       |   PASS | evidence.mjs → logs/playwright-evidence.txt 20/20 PASS (stub API :3001 + preview :4173; cartella GET/PUT intercettate con page.route)                                           |
| Persistence      |     NA | nessun Postgres locale; il payload persistito è verificato sul PUT reale (scenario C) e negli unit test                                                                         |
| Agnos AI         |     NA |                                                                                                                                                                                 |
| Voice            |     NA |                                                                                                                                                                                 |
| OCR              |     NA |                                                                                                                                                                                 |
| Security/privacy |     NA | solo dati sintetici dello stub                                                                                                                                                  |

## Runtime Evidence

- screenshots/A-cartella-legacy-presa-in-carico.png
- screenshots/B-cartella-senza-presa-in-carico.png
- screenshots/C-modifica-dati-di-ingresso.png
- screenshots/D-menu-inline-vuoto.png

## Logs

Only sanitized logs are allowed. logs/playwright-evidence.txt contiene esiti e nomi dei campi, nessun valore clinico reale.

## Residual Risks

- Persistenza su Postgres reale non esercitata (nessun DB locale).
  - `cleanCartella` (backend/src/ai/upload/confirm-service.ts) rimuove solo `codiceFiscale` e le
    chiavi che iniziano con `_`, quindi `presaInCarico` passa intatto.
  - `mergeCartella` fonde gli oggetti e ignora i valori vuoti.
- Le prese in carico già salvate su main con i default clinici (bug preesistente) restano nel
  database così come sono: il fix impedisce nuove scritture, non corregge i dati storici.
- I valori vuoti nei campi enum sono stringhe `''` a runtime (cast `as unknown as PresaInCarico`).
  Nessun consumatore va in errore: l'unico lettore del tipo è questo tab.

## Final Decision

CLOSED — VERIFIED
