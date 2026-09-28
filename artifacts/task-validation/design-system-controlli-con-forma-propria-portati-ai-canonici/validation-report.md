# Task Validation Report

## Task

- Title: Design system: controlli con forma propria portati ai canonici
- Slug: design-system-controlli-con-forma-propria-portati-ai-canonici
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **Nuovo controllo canonico `ds-badge`** (design-system.css): badge di stato come quelli del prototipo.
  - Misure: altezza minima 32px, raggio 8, testo 14/500, 8px ai lati compreso il bordo. Il testo clinico non si taglia mai: se non sta su una riga il badge va a capo e cresce.
  - Toni: `--ok`, `--info`, `--warning`, `--alarm`, `--alarm-strong` (l'unico rosso pieno), `--stale` (tratteggiato neutro), più il modificatore `--dashed`.
  - Se è cliccabile: area di tocco di almeno 48px tramite pseudo-elemento (inset -10px -4px, misurata con hit-test reale), fuoco a 3px, `aria-haspopup`.
- **NEWS2**: testata, lista pazienti, card del turno e totale nello storico usano `ds-badge`, con il tono clinico mappato da quello di oggi (ok→ok, low→info, single→warning, medium→alarm, high→alarm-strong, stale→stale).
  - Tolte da News2.css, PatientList.css e OperatorDashboard.css le regole che ridavano forma al chip.
  - Il contenitore (`.turno-pcard__news2`) ora sta in News2.css, sempre caricato insieme al badge.
- **"non in anagrafica" / "senza documento"** (Terapia): `ds-badge ds-badge--warning` con `aria-haspopup="dialog"`. "anagrafica non raggiungibile" è un `ds-badge--stale` non interattivo, senza stile inline.
- **Card cliniche** (ClinicalCard): la freccia apri/chiudi è un `ds-icon-btn` da 48px con `aria-expanded`, `aria-controls` e nome "Comprimi/Espandi <titolo>".
  - La testata non è più un `role="button"` con pulsanti annidati.
  - Il clic sulla testata continua ad aprire e chiudere la card.
  - La testata si allunga fino a contenere il pulsante.
- **Lista pazienti**:
  - Apri → `ds-icon-btn`; elimina di test → `ds-icon-btn--danger`; elimina nella card (telefono/tablet) → `ds-btn--danger`.
  - Colonne adattate: NEWS2 al 17%, così "punteggio · ora" ci sta; azioni da 80px, 136px con l'eliminazione di test attiva.
- **Guardia** (designSystem.test.ts), due test nuovi:
  1. Le classi dei controlli ritirati restano solo come aggancio, nessun foglio di pagina può ridare loro un aspetto, e il markup usa il controllo canonico.
  2. Il badge è stilato solo dal design system.
- **Audit DS**:
  - Tolte le esenzioni `.news2-chip`, `.clinical-card__toggle`, `.farmaco-non-trovato`.
  - Aggiunte le categorie badge-forma, badge per tono e badge cliccabile (area di 48 e `aria-haspopup`).

## Files Changed

- frontend/src/design-system.css, App.css
- components/operator/News2Chip.tsx, News2.css, OperatorDashboard.css, PatientList.css, PatientRoster.tsx, PatientRecordData.css
- components/operator/cartella/TerapiaFarmacologicaTab.tsx, RicercaFarmaco.css
- components/shared/ClinicalCard.tsx
- lib/\_\_tests\_\_/designSystem.test.ts
- artifacts: ds-audit.mjs del design system

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Guardia (2 test nuovi) verde. L'audit non esenta più NEWS2, il toggle delle card e "non in anagrafica".                                                                                                                                                                                                                                                                                                                             |
| AC2 |   PASS | Badge 32/8/14/500 con area di tocco di 48 e `aria-haspopup` su 71 badge cliccabili. Toggle e apri/elimina 48×48 raggio 12. Fuoco a 3px. Audit DS 18/18 su 99 + 66 stati pagina, a 5 larghezze.                                                                                                                                                                                                                                      |
| AC3 |   PASS | I 6 toni NEWS2 sono quelli attesi in lista e nel Turno; il rosso pieno compare solo per il rischio alto. Il badge apre lo storico, dove il totale è lo stesso badge (non interattivo). "Apri" apre la cartella. Il toggle chiude e riapre la card: `aria-expanded`, contenuto a 0 e nome cambiano; funziona anche da tastiera (Invio) e con il clic sulla testata. "non in anagrafica" apre la ricerca con il nome ("Tachipirina"). |
| AC4 |   PASS | Nessuno scorrimento orizzontale in Turno e Pazienti a 390, 768, 1024 e 1440; nessun controllo tagliato (audit). Il badge NEWS2 non esce più dalla sua colonna.                                                                                                                                                                                                                                                                      |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 887/896, con i soli 9 fallimenti della baseline.                                                                                                                                                                                                                                                                                                                                                    |

## Test Results

| Test                                                       | Result | Evidence                                    |
| ---------------------------------------------------------- | -----: | ------------------------------------------- |
| Unit                                                       |   PASS | guardia DS 10/10; suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 20/20; ds-audit 18/18 + 18/18  |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | solo aspetto e accessibilità, nessuna API   |

## Runtime Evidence

- screenshots/pazienti-news2-1180.png, turno-news2-1180.png, storico-news2.png, card-cliniche-1180.png, ricerca-farmaco.png, pazienti-390/768/1024/1440.png
- logs/playwright-evidence.txt, ds-audit-390-768-1180.txt, ds-audit-1024-1440.txt, unit-full.txt, build.txt

## Independent QA

- Primo giro (clinicos-qa): FAILED VALIDATION. (1) Il testo NEWS2 veniva accorciato con "…", nascondendo "da aggiornare" e l'ora rispetto a origin/main. (2) L'area di tocco reale del badge cliccabile era di circa 44px, e i controlli davano un PASS falso perché leggevano il valore CSS invece di fare un hit-test.
- Correzioni: il badge va a capo (altezza minima 32, nessun taglio); lo pseudo-elemento ora ha inset -10px -4px; evidence e audit misurano con elementFromPoint a 7,5px sopra e sotto, anche dentro i contenitori che scorrono; la guardia copre anche toni e __text.
- Secondo giro (clinicos-qa): READY FOR QA. "da aggiornare" è sempre visibile; l'area di tocco è di 49px o più e non ruba clic ai controlli vicini (campionamento a passi di 2px); audit 18/18 su 99 e 66 stati; suite 887/896 (baseline).

## Residual Risks

- Nelle colonne strette (NEWS2 nella lista a 1024 e 1180, farmaco nella terapia) il badge lungo va su 2-4 righe: si legge per intero, ma è denso.
- "anagrafica non raggiungibile" passa dall'ambra al tono neutro tratteggiato: non è un'anomalia del farmaco ma un servizio che non ha risposto. Le testate delle card cliniche passano a circa 63px per ospitare il pulsante da 48. Entrambe le cose sono segnalate all'utente.
- L'audit misura l'area di tocco solo sui badge visibili; la QA ha misurato tutti i badge.
- Restano controlli con forma propria, dentro contenitori dichiarati: le intestazioni ordinabili delle tabelle (`.patient-roster__sort`, `.cdt__sort-btn`) e il nome-collegamento della card del Turno. Sono da un prossimo ciclo.

## Final Decision

CLOSED — VERIFIED
