# Task Contract

## Task

- Title: Design system: intestazioni ordinabili delle tabelle canoniche
- Slug: design-system-intestazioni-ordinabili-delle-tabelle-canoniche
- Type: refactor
- Date: 2026-09-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

Le intestazioni ordinabili delle tabelle sono due controlli diversi, entrambi esentati dall'audit del design system:

- **Lista pazienti** (`.patient-roster__sort`, PatientRoster):
  - testo 14px, frecce ↑ ↓ ↕;
  - `aria-label` con l'azione e `aria-sort` sul `th`;
  - altezza minima 44, focus 2px.
- **Tabelle cliniche della cartella** (`.cdt__sort-btn`, ClinicalTable):
  - testo 11px maiuscolo, frecce ▲ ▼ ⇅;
  - altezza 0 padding, circa 16px;
  - senza `aria-sort` sul `th` e senza nome accessibile che dica l'ordine.

## Expected Behaviour

Un solo controllo canonico **`ds-sort`** nel design system, usato da entrambe le tabelle:

- **Aspetto e misure**:
  - intestazione cliccabile a tutta cella, altezza minima 48;
  - testo 14/500 nel colore dell'intestazione, freccia ↑ ↓ ↕;
  - blu quando la colonna è ordinata;
  - fuoco 3px.
- **Accessibilità**:
  - `aria-sort` sul `th` della colonna ordinata;
  - nome accessibile "Ordina per <colonna> in ordine crescente/decrescente".
- **Comportamento**: l'ordinamento non cambia, stesse chiavi e stessi cicli di ordinamento di oggi.
- **Tipografia delle intestazioni**: stessa in lista pazienti e tabelle cliniche (`.clinicos-table`): 14/500 grigio, senza maiuscolo, come nel prototipo. Il pulsante ne eredita il testo.
- **Pulizia**:
  - tolte le regole di pagina che danno forma ai due controlli;
  - tolta l'esenzione `.cdt__sort-btn` dall'audit;
  - le vecchie classi restano solo come aggancio, protette dalla guardia.

## Acceptance Criteria

- AC1: PatientRoster e ClinicalTable usano `ds-sort` (con `ds-sort__arrow`). Nessun foglio di pagina dà aspetto a `.patient-roster__sort`, `.cdt__sort-btn` o `.ds-sort`; la guardia lo verifica. L'audit non esenta più `.cdt__sort-btn` e misura la categoria "ordinamento".
- AC2: Nel browser le intestazioni ordinabili di lista e tabelle cliniche hanno la stessa firma di stile: altezza minima 48, 14/500, stessa famiglia e lo stesso colore a riposo. La colonna ordinata è blu. Fuoco visibile 3px.
- AC3: Comportamento invariato: il clic ordina come prima (crescente, poi decrescente) in lista e nelle tabelle cliniche. `aria-sort` segue lo stato e il nome accessibile dice l'ordine che verrà applicato.
- AC4: Nessuno scorrimento orizzontale della pagina a 390/768/1024/1180/1440 nelle pagine con tabelle (lista pazienti, cartella). Audit DS verde a tutte le larghezze.
- AC5: npm run build passa; suite completa senza nuovi fallimenti rispetto alla baseline (9 noti).

## Test Plan

| Test type                 | Required | Reason                                                                                                      |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | guardia designSystem.test.ts + suite completa                                                               |
| Integration               |       no |                                                                                                             |
| API                       |       no |                                                                                                             |
| Playwright                |      yes | evidence su lista e tabella clinica (ordinamento, aria-sort, firma di stile, fuoco); audit DS a 5 larghezze |
| Persistence after refresh |       no |                                                                                                             |
| Agnos action registry     |       no |                                                                                                             |
| Voice simulation          |       no |                                                                                                             |
| OCR/import test           |       no |                                                                                                             |
| Security/privacy scan     |       no |                                                                                                             |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots di lista e tabella clinica prima/dopo l'ordinamento
- log dell'evidence Playwright e dell'audit DS

## Risks

- **Intestazioni più alte (48px) nelle tabelle cliniche dense.** Verificare impaginazione e colonne strette: la freccia non deve andare a capo da sola.
- **Maiuscolo e dimensione 11px non ci sono più.** È un cambio visivo voluto per uniformità con la lista pazienti (prototipo).

## Gate Status

READY FOR IMPLEMENTATION
