# Task Contract

## Task

- Title: Design system: controlli con forma propria portati ai canonici
- Slug: design-system-controlli-con-forma-propria-portati-ai-canonici
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

Alcuni controlli interattivi hanno ancora una forma propria, esentata dall'audit del design system come "componenti dichiarati":

- `.farmaco-non-trovato` (Terapia farmacologica): pill 11px alta ~26px che apre la ricerca farmaco; lo stato "anagrafica non raggiungibile" usa la stessa classe con stile inline.
- `.clinical-card__toggle` (card cliniche espandibili): pulsante 24×24, aria-label generico "Espandi / Comprimi", senza aria-expanded.
- `.news2-chip` (testata paziente, card del turno): pulsante 28px, 12,5px, raggio 999, che apre lo storico NEWS2.
- `.patient-roster__open` / `.patient-roster__delete` / `.patient-card__delete` (lista pazienti): 44×44, raggio 9, focus 2px.

## Expected Behaviour

Questi controlli usano i controlli canonici del design system (48px, raggio 12, bordo 2, font 16, focus 3px), con stato dichiarato:

- Nuovo controllo canonico **`ds-badge`** (badge di stato, come i badge del prototipo: 32px, raggio 8, 14/500, toni ok/info/avviso/allarme/allarme forte/da aggiornare). Quando è cliccabile ha un'area di tocco di 48px (pseudo-elemento), focus 3px, e dichiara `aria-haspopup="dialog"`.
- "non in anagrafica" / "senza documento" → `ds-badge ds-badge--warning` cliccabile; "anagrafica non raggiungibile" → `ds-badge ds-badge--stale` non interattivo, senza stile inline.
- apri/chiudi delle card cliniche → `ds-icon-btn` con `aria-expanded` e nome "Comprimi/Espandi <titolo>".
- NEWS2 → `ds-badge` con il tono clinico del rischio (rosso solo per rischio medio/alto, come oggi), in testata, lista pazienti e card del turno; nessuna regola di pagina ne cambia più la forma. La variante statica dello storico usa lo stesso `ds-badge` non interattivo.
- apri/elimina della lista pazienti → `ds-icon-btn` / `ds-icon-btn--danger`.
  Le esenzioni corrispondenti vengono tolte dall'audit DS e le classi ritirate entrano nella guardia "retired control classes".
  Nessun dato, testo clinico o comportamento cambia: stessi eventi, stesse destinazioni.

## Acceptance Criteria

- AC1: Nessun controllo interattivo usa più .farmaco-non-trovato, .clinical-card__toggle, .news2-chip (interattivo), .patient-roster__open/__delete, .patient-card__delete; la guardia designSystem.test.ts lo verifica e l'audit DS non li esenta più.
- AC2: Nel browser i controlli convertiti hanno la stessa firma di stile dei canonici (chip/pulsanti/icone: altezza 48, raggio 12, bordo 2, font 16; badge: 32/8/14/500 con area di tocco ≥ 48) e focus visibile 3px; audit DS 13/13 a 390/768/1180 e 1024/1440 senza le esenzioni tolte.
- AC3: Comportamento invariato: "non in anagrafica" apre la ricerca farmaco sul nome; il toggle apre/chiude la card e aria-expanded segue lo stato; NEWS2 apre lo storico e conserva tono e testo (rosso solo per rischio alto, "da aggiornare" visibile); apri/elimina della lista funzionano come prima.
- AC4: Nessuno scorrimento orizzontale né controllo tagliato a 390/768/1024/1180/1440 nelle pagine toccate (Terapia farmacologica, cartella con card cliniche, testata paziente, Turno, lista pazienti).
- AC5: npm run build passa; suite completa senza nuovi fallimenti rispetto alla baseline (9 noti).

## Test Plan

| Test type                 | Required | Reason                                                          |
| ------------------------- | -------: | --------------------------------------------------------------- |
| Unit                      |      yes | guardia designSystem.test.ts (classi ritirate) + suite completa |
| Integration               |       no |                                                                 |
| API                       |       no |                                                                 |
| Playwright                |      yes | evidenze sui controlli convertiti + audit DS a 5 larghezze      |
| Persistence after refresh |       no |                                                                 |
| Agnos action registry     |       no |                                                                 |
| Voice simulation          |       no |                                                                 |
| OCR/import test           |       no |                                                                 |
| Security/privacy scan     |       no |                                                                 |

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

- Controlli più alti (48px) in righe dense (tabella terapia, testata, card del turno): verificare impaginazione e assenza di tagli.
- NEWS2 ha toni clinici: la conversione tocca solo la geometria, non la semantica del colore.

## Gate Status

READY FOR IMPLEMENTATION
