# Task Contract

## Task

- Title: Agenda coerenza admin operatore stati e tocco
- Slug: agenda-coerenza-admin-operatore-stati-e-tocco
- Type: refactor
- Date: 2026-08-08
- Issue: —

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

Solo presentazione: `AdminAgenda.tsx`, `OperatorAgenda.tsx`, `App.tsx` (un flag di caricamento),
`app-additions.css`. Nessuna logica di dominio, nessuna chiamata API nuova.

## Current Behaviour

Le due agende sono nate dallo stesso impianto ma sono divergute senza motivo di prodotto:

- La legenda dei colori di stato (`.agt-legend`: Completato / In corso / Programmato / Disponibile)
  esiste solo in OperatorAgenda. In AdminAgenda le stesse pastiglie colorate compaiono senza alcuna
  chiave di lettura.
- AdminAgenda non gestisce il caso "nessun operatore attivo": la griglia viene costruita con
  `gridTemplateColumns: 52px repeat(0, ...)`, cioe' resta la sola colonna oraria e la pagina sembra
  rotta invece di spiegare cosa manca.
- Ne' AdminAgenda ne' OperatorAgenda hanno uno stato "nessun appuntamento" nelle viste settimana e
  mese: una settimana vuota e' indistinguibile da una settimana non ancora caricata.
- `appuntamenti` parte da array vuoto e non esiste alcun flag di caricamento: durante il primo
  fetch l'agenda dichiara "0/0 completati", "0%" occupazione e tutti gli slot "Disponibile". Su uno
  strumento clinico e' un'informazione falsa, non solo mancante. Il resto dell'app ha gia' il
  pattern condiviso `LoadingState` / `EmptyState`.
- Touch target sotto la soglia tablet di 44px: `.agt-admin-cell` ha `min-height: 34px`,
  `.agt-nav-btn` e' 34x34, `.agt-week-therapy-dot` e' 32x32. ClinicOS si usa su tablet di reparto.
- `.agt-admin-cell.occ` imposta `cursor: default` pur avendo un onClick che seleziona
  l'appuntamento: il cursore nega un'affordance che invece esiste.
- L'header della settimana mostra il contatore appuntamenti solo in AdminAgenda
  (`.agt-week-hdr__count`), non in OperatorAgenda.

## Expected Behaviour

- La legenda `.agt-legend` compare in AdminAgenda con le stesse quattro voci di OperatorAgenda.
- AdminAgenda con zero operatori attivi mostra un `.empty-state-card` ("Nessun operatore attivo:
  attiva un operatore per pianificare gli appuntamenti") al posto della griglia.
- Vista settimana e vista mese, in entrambe le agende, mostrano un messaggio di vuoto esplicito
  quando non ci sono appuntamenti nel periodo.
- `App.tsx` espone `loadingAppuntamenti`; finche' e' true le agende mostrano un caricamento
  coerente col resto dell'app invece di una griglia che afferma "tutto libero".
- Touch target portati a >= 44px sugli elementi interattivi dell'agenda: celle della griglia
  giornaliera admin, pulsanti di navigazione, pallino terapia settimanale.
- `.agt-admin-cell.occ` usa `cursor: pointer` (l'azione esiste).
- Il contatore appuntamenti nell'header settimanale c'e' in entrambe le agende.

Nessun cambio di palette: navy #1A3357 e medical-blue restano invariati, il rosso resta riservato
agli stati di errore e non diventa colore di marca.

## Acceptance Criteria

- AC1: AdminAgenda mostra la legenda stati con le stesse quattro voci e gli stessi colori di
  OperatorAgenda.
- AC2: con zero operatori attivi AdminAgenda mostra un empty state testuale in italiano e non la
  griglia vuota.
- AC3: settimana e mese senza appuntamenti mostrano un messaggio di vuoto esplicito in entrambe le
  agende.
- AC4: durante il caricamento degli appuntamenti l'agenda non mostra dati di occupazione fasulli
  ma uno stato di caricamento.
- AC5: `.agt-admin-cell`, `.agt-nav-btn` e `.agt-week-therapy-dot` hanno dimensione utile >= 44px.
- AC6: `.agt-admin-cell.occ` ha cursor pointer.
- AC7: il contatore appuntamenti nell'header settimanale e' presente in entrambe le agende.
- AC8: nessuna variazione di palette; nessun uso del rosso come colore di marca.
- AC9: `npx tsc --noEmit` e `npm run build` sul frontend passano; nessun console.log aggiunto.

## Test Plan

| Test type                 | Required | Reason                                                                            |
| ------------------------- | -------: | ----------------------------------------------------------------------------------- |
| Unit                      |       no | modifiche di sola presentazione, nessuna funzione pura                              |
| Integration               |       no | nessun modulo backend toccato                                                       |
| API                       |       no | nessuna chiamata nuova                                                              |
| Playwright                |       no | nessun ambiente runtime con dati in questa sessione — limite residuo dichiarato     |
| Persistence after refresh |       no | nessun dato scritto                                                                 |
| Agnos action registry     |       no | non toccato                                                                         |
| Voice simulation          |       no | non toccato                                                                         |
| OCR/import test           |       no | non toccato                                                                         |
| Security/privacy scan     |       no | nessun dato nuovo esposto, nessun log aggiunto                                      |
| Type check / build        |      yes | npx tsc --noEmit + npm run build — gate obbligatorio del progetto                   |

## Evidence Plan

- Output di `npx tsc --noEmit` e `npm run build` (frontend) nel validation-report.
- Grep sui valori CSS modificati (min-height, cursor) a prova di AC5 e AC6.
- Elenco dei file toccati con conteggio righe.

## Risks

- **Verifica visiva non eseguita**: senza avvio del frontend con dati reali, la resa a schermo non
  e' provata. Dichiarata come limite residuo.
- **Altezza celle maggiore**: la griglia giornaliera admin diventa piu' alta e richiede piu'
  scroll verticale. Accettato: la soglia di 44px per tablet e' un vincolo del design system.

## Gate Status

READY FOR IMPLEMENTATION
