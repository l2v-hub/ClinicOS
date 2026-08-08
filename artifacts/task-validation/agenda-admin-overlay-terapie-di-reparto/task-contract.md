# Task Contract

## Task

- Title: Agenda admin overlay terapie di reparto
- Slug: agenda-admin-overlay-terapie-di-reparto
- Type: feature
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
| Privacy / Security   |      yes |
| Config / Env         |       no |

Solo frontend: AdminAgenda.tsx, TherapySlotModal.tsx (nuova prop readOnly), App.tsx (passaggio
props), app-additions.css (classi di layout). Nessuna route, nessuno schema. Privacy: l'overlay
espone nominativi paziente e farmaci a un profilo admin — voce di rischio valutata sotto;
l'endpoint li espone gia' al ruolo admin (ALLOWED_ROLES in backend/src/ai/auth.ts).

## Current Behaviour

`GET /therapy-slots?date=` calcola al volo le somministrazioni di reparto per una data, in 5 fasce
fisse (mattina 08:00, pranzo 12:00, pomeriggio 16:00, sera 20:00, notte 22:00), incrociando
`PatientTherapy`/`TherapySchedule` con `MedicationAdministration`. `OperatorAgenda.tsx` le mostra
gia' come card `.agt-therapy-slot` (vista giorno) e pallini `.agt-week-therapy-dot` (vista
settimana), con `TherapySlotModal` per marcare erogato/non erogato.

`AdminAgenda.tsx` non ha alcun riferimento a `therapySlots`: un amministratore non vede in agenda
le terapie del reparto, pur avendo il ruolo autorizzato sull'endpoint. In `App.tsx` il refresh
`loadTherapySlots()` alla navigazione avviene solo per `navKey === 'agenda-operatore'`.

## Expected Behaviour

AdminAgenda mostra le stesse fasce terapia dell'agenda operatore, in **sola lettura**.

- **Vista giornaliera** (griglia 2D operatore x orario): la fascia terapia e' una riga full-width
  `grid-column: 1 / -1` inserita PRIMA della riga oraria corrispondente, che contiene la card
  `.agt-therapy-slot` esistente. Le fasce fuori dal range 08:00-18:30 (sera 20:00, notte 22:00)
  sono accodate in fondo alla griglia con lo stesso trattamento, come gia' fa OperatorAgenda.
  Motivazione: la terapia e' un evento **di reparto**, non di un operatore; metterla in una colonna
  operatore ne implicherebbe falsamente la titolarita', mentre una banda sopra la griglia ne
  perderebbe la collocazione temporale.
- **Vista settimanale**: pallino `.agt-week-therapy-dot` nella cella dell'ora della fascia, con
  `title` riepilogativo — identico a OperatorAgenda, incluse le fasce fuori range.
- **Vista mensile**: nessuna modifica (densita' gia' satura, nessun valore informativo aggiunto).
- **Click**: apre `TherapySlotModal` in modalita' `readOnly` — elenco pazienti/farmaci/stato
  visibile, nessun pulsante "Erogata"/"Non erogata"; le righe pending mostrano un badge neutro
  "Da erogare".

Decisione di prodotto (sola lettura per l'admin): registrare una somministrazione e' un atto
clinico tracciato su `MedicationAdministration.administeredBy`. L'admin e' un profilo gestionale e
non e' la persona al letto del paziente: consentirgli la firma inquinerebbe la tracciabilita'
clinica con un attore non erogante. All'admin serve la **visibilita' di reparto** (quante da
erogare, quante non erogate e perche'), non la capacita' di firmare. Il backend non blocca il ruolo
admin — e' la UI a non offrire l'azione; il vincolo e' di prodotto, non di sicurezza, e va
dichiarato come tale.

## Acceptance Criteria

- AC1: in AdminAgenda vista giorno, per ogni fascia con total > 0 compare una card
  `.agt-therapy-slot` full-width all'ora della fascia, con label, "N/M erogate" e riepilogo
  non erogate/da erogare; variante `--completed` quando tutte erogate.
- AC2: le fasce sera (20:00) e notte (22:00), fuori da `TIME_SLOTS`, sono rese in fondo alla
  griglia giornaliera e non vengono perse.
- AC3: in AdminAgenda vista settimana compare `.agt-week-therapy-dot` nella cella dell'ora di
  fascia, cliccabile, con `title` riepilogativo; la vista mensile e' invariata.
- AC4: il click su card/pallino apre `TherapySlotModal` senza i pulsanti "Erogata"/"Non erogata";
  le somministrazioni pending mostrano "Da erogare"; erogate e non erogate restano leggibili con
  esito e motivo.
- AC5: `OperatorAgenda` resta pienamente interattiva — nessuna regressione: i pulsanti di
  erogazione sono ancora presenti e funzionanti (prop `readOnly` assente/false).
- AC6: `App.tsx` esegue `loadTherapySlots()` anche navigando su `agenda-admin`, e AdminAgenda
  ricarica gli slot quando l'utente cambia data (stessa logica di navigate() in OperatorAgenda).
- AC7: nessuna chiamata di scrittura verso `/therapy-slots/confirm` o `/not-administered` e'
  raggiungibile da AdminAgenda.
- AC8: `npx tsc --noEmit` e `npm run build` sul frontend passano; nessun console.log aggiunto.

## Test Plan

| Test type                 | Required | Reason                                                                                       |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------------- |
| Unit                      |       no | nessuna logica pura nuova: si riusa il rendering gia' verificato in OperatorAgenda             |
| Integration               |       no | nessun modulo backend toccato                                                                  |
| API                       |       no | endpoint GET /therapy-slots invariato, gia' in uso dall'agenda operatore                       |
| Playwright                |       no | nessun Postgres popolato in questa sessione — dichiarato come limite residuo nel report        |
| Persistence after refresh |       no | la feature e' di sola lettura, non scrive nulla                                                |
| Agnos action registry     |       no | non toccato                                                                                    |
| Voice simulation          |       no | non toccato                                                                                    |
| OCR/import test           |       no | non toccato                                                                                    |
| Security/privacy scan     |      yes | verifica statica che da AdminAgenda non esista percorso di scrittura terapia (AC7)             |
| Type check / build        |      yes | npx tsc --noEmit + npm run build — gate obbligatorio del progetto                              |

## Evidence Plan

- Output di `npx tsc --noEmit` e `npm run build` (frontend) nel validation-report.
- Grep di verifica AC7 (therapy-slots/confirm, not-administered, onConfirmTherapy) sui file admin,
  con output nel report.
- Elenco dei file toccati con conteggio righe nel report.

## Risks

- **Privacy**: l'overlay espone nominativi paziente e farmaci a un profilo admin. Rischio accettato:
  l'endpoint autorizza gia' il ruolo admin e l'admin vede gli stessi nominativi in agenda
  appuntamenti e in lista pazienti. Nessun allargamento di superficie dati.
- **Densita' visiva**: la riga full-width allunga la griglia giornaliera di massimo 3 righe (le
  fasce dentro il range orario). Accettato.
- **Sola lettura come vincolo solo-UI**: un admin con accesso diretto all'API potrebbe comunque
  firmare. Dichiarato come limite: irrigidirlo lato backend e' un cambio di permessi fuori scope.

## Gate Status

READY FOR IMPLEMENTATION
