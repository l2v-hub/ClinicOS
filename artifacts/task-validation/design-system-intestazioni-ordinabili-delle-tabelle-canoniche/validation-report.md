# Task Validation Report

## Task

- Title: Design system: intestazioni ordinabili delle tabelle canoniche
- Slug: design-system-intestazioni-ordinabili-delle-tabelle-canoniche
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **design-system.css**
  - **Tipografia unica delle intestazioni** per la lista pazienti e per le tabelle cliniche (`.clinicos-table thead th`, `.patient-roster th`): 14/500 grigio, senza maiuscolo, come nel prototipo.
  - **Nuovo controllo canonico `ds-sort`**:
    - intestazione cliccabile a tutta cella, alta almeno 48px, che eredita il testo della cella;
    - blu al passaggio del mouse e quando la colonna è ordinata (`th[aria-sort]`);
    - fuoco visibile di 3px.
- **`SortArrow`** (nuovo, `components/shared/SortArrow.tsx`)
  - Freccia disegnata in SVG (↑, ↓, ↕) che segue il colore del testo.
  - Sostituisce i caratteri ▲ ▼ ⇅ e ↑ ↓ ↕, che su Windows diventavano emoji colorate: un colore diverso per ogni colonna.
- **PatientRoster**: `ds-sort` + `SortArrow`. Comportamento, `aria-sort` e nome accessibile restano invariati.
- **ClinicalTable**
  - Usa `ds-sort` + `SortArrow`.
  - Nuovo: `aria-sort` sul `th` della colonna ordinata.
  - Nuovo: il pulsante ha un nome accessibile che annuncia l'ordine che verrà applicato ("Ordina per X in ordine crescente", "… decrescente", "Togli l'ordinamento per X").
  - Il ciclo di ordinamento non cambia: crescente, poi decrescente, poi nessuno.
- **Pulizia**
  - Tolte le regole di pagina di `.patient-roster__sort` (PatientList.css) e di `.cdt__sort-btn` (app-additions.css, PatientRecordData.css).
  - Le vecchie classi restano solo come aggancio.
- **Guardia** (designSystem.test.ts)
  - Le due classi entrano in `RETIRED_LOOKS`.
  - Test nuovo: markup `ds-sort` e `aria-sort`/nome accessibile nelle tabelle cliniche; `.ds-sort` è stilato solo dal design system.
- **Audit DS**: tolta l'esenzione `.cdt__sort-btn`; aggiunte le categorie "ordinamento" e "ordinamento-attivo".

## Files Changed

- frontend/src/design-system.css, app-additions.css
- components/shared/SortArrow.tsx (nuovo)
- components/operator/PatientRoster.tsx, PatientList.css, PatientRecordData.css
- components/operator/cartella/ClinicalTable.tsx
- lib/\_\_tests\_\_/designSystem.test.ts
- artifacts: ds-audit.mjs del design system

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                          |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Lista e tabella clinica usano `ds-sort` con `SortArrow`. Guardia DS 12/12. L'audit non esenta più `.cdt__sort-btn` e misura "ordinamento": 30 controlli con una sola firma, più 2 controlli nella variante attiva.                                |
| AC2 |   PASS | Una sola firma, "48px 14px 500 none", tra lista pazienti e tabella Operatori. Le intestazioni della tabella clinica sono 14/500 senza maiuscolo. La colonna ordinata è in `rgb(29, 79, 196)` e il fuoco è di 3px.                                 |
| AC3 |   PASS | Lista: crescente, poi decrescente, con `aria-sort` e freccia che seguono. Tabella clinica: crescente → decrescente → nessun ordinamento, con la prima riga che torna come all'inizio; nome accessibile "… decrescente" / "Togli l'ordinamento …". |
| AC4 |   PASS | Nessuno scorrimento orizzontale su Operatori e Pazienti a 390/768/1024/1440. Audit DS 21/21 su 102 + 68 stati.                                                                                                                                    |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 889/898, con i soli 9 fallimenti della baseline.                                                                                                                                                                  |

## Test Results

| Test                                                       | Result | Evidence                                    |
| ---------------------------------------------------------- | -----: | ------------------------------------------- |
| Unit                                                       |   PASS | guardia DS 12/12; suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 10/10; ds-audit 21/21 + 21/21  |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | solo aspetto e accessibilità                |

## Runtime Evidence

- screenshots/pazienti-ordinati-1180.png, operatori-ordinati-1180.png, operatori-390/768/1024/1440.png, pazienti-390/768/1024/1440.png
- logs/playwright-evidence.txt, ds-audit-390-768-1180.txt, ds-audit-1024-1440.txt, unit-full.txt, build.txt

## Independent QA

- clinicos-qa: READY FOR QA, senza bloccanti.
  - Sonde: lista pazienti (3 colonne), Operatori (5), Terapia della cartella (7); tastiera (Invio/Spazio/Tab); cinque larghezze; tipografia delle intestazioni non ordinabili; audit 21/21 + 21/21; suite 889/898 (baseline).
- Avvisi corretti dopo la QA:
  - intestazione della tabella clinica alta 48px (prima 69), togliendo il padding verticale del th;
  - tolto il margine negativo del pulsante (traboccava di 4-8px nelle colonne strette): verificato 0 trabocchi a 1024;
  - tolto un selettore ridondante.
  - Evidence 10/10, audit 21/21 + 21/21, suite 889/898 e build rieseguiti dopo le correzioni.

## Residual Risks

- Le intestazioni delle tabelle cliniche passano da 12px/800 maiuscolo a 14/500. È un cambio visivo voluto (prototipo e uniformità con la lista) e interessa tutte le tabelle della cartella e dell'amministrazione.
- Le tabelle dei moduli in cartella (Braden, medicazioni, parametri) restano con la loro intestazione 11.5px maiuscola, come il modulo cartaceo: da confermare.
- Il selettore d'ordine della lista su telefono ("↑ Crescente") usa ancora il carattere freccia nel testo di un pulsante canonico. Non fa parte delle intestazioni.

## Final Decision

CLOSED — VERIFIED
