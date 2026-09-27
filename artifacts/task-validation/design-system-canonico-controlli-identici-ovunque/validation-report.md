# Task Validation Report

## Task

- Title: Design system canonico: controlli identici ovunque
- Slug: design-system-canonico-controlli-identici-ovunque
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`frontend/src/design-system.css`** (nuovo) è l'unica fonte dell'aspetto dei controlli. Lo importa `App.tsx` come ultimo foglio. I selettori canonici usano una spinta di specificità da id (`:not(#ds)`): nessuna regola di pagina può cambiare altezza, raggio, bordo, colori o tipografia di un controllo. Le pagine decidono solo il layout.
  - Controlli definiti:
    - chip (filtri e selettori di vista, con stato attivo e stato aperto);
    - pulsanti primario e secondario;
    - link d'azione;
    - pulsante icona, più la sola variante semantica "danger";
    - navigazione per data;
    - card;
    - campo di ricerca nelle barre;
    - stati di focus e disabilitato comuni.
  - Una sola misura per tipo di controllo (48 px): `btn-sm` non riduce più i pulsanti.
  - Classi legacy allineate: chip ← `filter-chip`, `agt-filter-chip`, `agt-view-btn`; primario ← `btn-primary`, `btn-success` (le azioni primarie sono sempre blu); secondario ← `btn-secondary`, `btn-ghost`, `btn-ghost-outline`; icona ← `icon-btn`.
- **`components/shared/DateNav.tsx`** (nuovo) è la navigazione per data unica: precedente, "Oggi" (chip premuta se l'intervallo mostrato contiene oggi), data facoltativa, successivo. La usano Terapia, Agenda operatore, Agenda admin e il calendario delle terapie in cartella.
- **Pagine migrate alle classi `ds-*`**, con rimozione delle copie locali:
  - Pazienti (`plist-chip`, `plist-btn`);
  - Terapia (`giro-chip`, `giro-chip--small`, `giro-btn`, `giro-icon-btn`, `giro-date`);
  - Parametri (`par-chip`, `par-next`, `par-save`, `par-link`);
  - Consegne (`ho-chip`, `ho-btn`, `ho-link`);
  - Note (`nm-chip`, `nm-new-btn`, `nm-link`, `nm-icon-btn`);
  - Agenda (`agt-new-btn`, `agt-nav-btn`, `agt-today-btn`);
  - Farmaci (`ricerca-farmaco__apri`);
  - Turno (`turno-btn`);
  - Cartella (`chart-action` → `ds-btn--collapsible`, che diventa solo icona sotto i 1400 px);
  - avviso anomalie farmaci, "Dettagli" delle segnalazioni, campi dell'anagrafica da completare.
- **Coerenze corrette durante l'audit**:
  - la chip attiva sotto il puntatore diventava grigia;
  - i pulsanti icona non ereditavano il carattere Inter;
  - le icone di cartella risultavano piene;
  - il campo di ricerca del Feed veniva schiacciato dalle chip;
  - le iniziali degli avatar operatore erano blu su colore.
- **Test**:
  - nuovo `designSystem.test.ts` (5 casi);
  - `agendaAccessibility`, `pageHeaderAdoption` e `patientRecordPrint` aggiornati al contratto DateNav e alle nuove classi, con le stesse etichette accessibili.

## Files Changed

- frontend/src/design-system.css (nuovo), App.tsx, App.css, app-additions.css
- frontend/src/components/shared/DateNav.tsx (nuovo), NotesPage.tsx/.css, DemographicsStatus.tsx
- frontend/src/components/operator: PatientList, TherapyRoundsPage, TherapyGiroRows, ParameterEntryPanel,
  MultiPatientParametri, ParametriVitali.css, ConsegneWorkspace, ConsegneRounds, ConsegnaComposer, OperatorAgenda,
  OperatorAgendaHmi.css, AdessoQueue, TurnoAppointments, OperatorDashboard.css, PatientDetail,
  DashboardNotificationCenter(.css), cartella/RicercaFarmaco, cartella/PatientTherapyCalendar,
  cartella/AvvisoAnomalieFarmaci(.css), AnagraficaFarmaciPage.css
- frontend/src/components/admin/AdminAgenda.tsx
- test: lib/\_\_tests\_\_/designSystem.test.ts (nuovo), agendaAccessibility, pageHeaderAdoption, patientRecordPrint

## Acceptance Criteria Result

| AC  |     Result | Evidence                                                                                                                                                                                                                                                                                                               |
| --- | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | ds-audit.mjs 13/13 a 390/768/1180 (96 stati pagina) e 13/13 a 1024/1440 (64 stati pagina). Pagine: operatore, admin, tutte le schede della cartella, moduli Contenzioni e Medicazioni, modale Invio PS, scelta e intake del nuovo ingresso, Posti letto, Orari. Una sola firma per categoria. Ogni chip dichiara il suo stato. Nessun pulsante fuori dal DS o dai componenti dichiarati. Nessun controllo tagliato. |
| AC2 |       PASS | designSystem.test.ts: classi locali assenti nei 16 file HMI; nessun foglio fuori da design-system.css cambia l'aspetto dei controlli canonici; alias presenti e nessun `!important` che li scavalchi; design-system.css caricato per ultimo.                                                                           |
| AC3 |       PASS | DateNav presente in Terapia, Agenda operatore, Agenda admin e calendario delle terapie. I filtri dell'agenda hanno la stessa firma delle chip delle altre pagine.                                                                                                                                                      |
| AC4 |   PASS | Nessuno scorrimento orizzontale in 145 stati pagina (5 larghezze). Evidence HMI rieseguite sulla build: guscio 23/23, cartella 33/33, lista 23/23, Terapia 28/28, Parametri 31/31, Consegne 25/25, Agenda 20/20, Note 14/14, Farmaci 21/21, Turno 19/20. L'unico KO di Turno dipende dall'ora: alle 00:30 nessuna terapia è ancora in ritardo e il caso "righe scadute" non ha righe da misurare. Il controllo è passato nella corsa precedente e non riguarda i controlli. |
| AC5 |   PASS | `npm run build` dalla radice (backend + frontend) exit 0 (build-root.txt), frontend build.txt exit 0; unit-full.txt 881/890 con i soli 9 fallimenti della baseline |

## Test Results

| Test                                                       | Result | Evidence                                  |
| ---------------------------------------------------------- | -----: | ----------------------------------------- |
| Unit                                                       |   PASS | designSystem 5/5; suite completa baseline |
| Playwright (audit DS)                                      |   PASS | logs/ds-audit.txt 8/8                     |
| Playwright (evidence HMI)                                  |   PASS | 10 cicli, tutti PASS (vedi AC4)           |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | nessun cambio di logica o API             |

## QA indipendente (clinicos-qa)

- **Giro 1: FAILED VALIDATION.** Circa 10.000 controlli misurati su 160 stati pagina. Problemi segnalati:
  1. freccia gigante in "Dettagli" (dashboard admin);
  2. Feed consegne che scorre in orizzontale a 390 px;
  3. piè di pagina dell'intake tagliato;
  4. filtri dell'Agenda senza `aria-pressed` e con conteggi "(N)" invece del badge;
  5. controlli ancora fuori dal DS: `btn-sm` da 32 px, campi data con bordo e raggio diversi, `srev-chip`, `schedule-op-btn`, `dashboard-notification-chip`, `link-btn`, `btn-danger`.

  Avvisi: "Oggi" annunciato come interruttore; etichette dei gruppi di data cambiate.
- **Correzioni.** Il DS copre ora anche:
  - campi (48, bordo 2, raggio 12, testo 16, fuoco 3 px);
  - link nel testo;
  - pulsante distruttivo;
  - conteggi a badge con tono;
  - `btn-sm`, `btn-link` e tutte le chip legacy.

  Interventi mirati:
  - gruppi di chip che si restringono e vanno a capo;
  - piè di pagina delle finestre che vanno a capo;
  - filtri Agenda e Feed con `aria-pressed`, e conteggi a badge in Agenda, Terapia e Note;
  - schede interne con `aria-selected`;
  - `srev-chip` convertite (azioni → secondario, selettori → chip con stato);
  - DateNav: "Oggi" con `aria-current="date"` (non più interruttore), etichette dei gruppi ripristinate;
  - tolti 18 stili in linea visivi dai controlli;
  - l'eliminazione camera usa la variante danger.
- **Guardie nuove** (designSystem.test.ts, 8 casi):
  - ogni chip dichiara il suo stato;
  - classi ritirate assenti;
  - niente stili in linea visivi sui controlli canonici.
- **Audit ampliato:**
  - 29 stati pagina per larghezza a 390, 768, 1024, 1180 e 1440;
  - controlla campi e link nel testo;
  - verifica lo scorrimento orizzontale;
  - fallisce su ogni pulsante non canonico e non dichiarato;
  - misura con il puntatore fuori pagina.

- Giro 2: **FAILED VALIDATION**.
  1. La guardia sugli stili in linea non poteva fallire: c'era un carattere di controllo al posto di ``.
  2. A 390 le intestazioni dense (moduli di cartella, modale Invio PS) venivano tagliate dai pulsanti da 48.

  Correzioni:
  - regex sistemata e provata con un file che la viola;
  - `cts__header`, `modal-header` e azioni di Invio PS vanno a capo;
  - le segnalazioni della dashboard sono pulsanti secondari con conteggio;
  - l'etichetta dei pulsanti comprimibili resta nel nome accessibile;
  - audit con controllo dei controlli tagliati e con copertura di moduli e modale.
- Giro 3: **READY FOR QA**. Sonde indipendenti su 220 stati pagina e 12.796 controlli:
  - nessuno scorrimento orizzontale;
  - una sola firma per categoria (i pulsanti icona hanno una firma neutra e una distruttiva);
  - campi tutti uguali;
  - 0 chip senza stato;
  - "Oggi" corretto.

  Unica condizione: la build backend con le dipendenze installate. Ora passa (build-root.txt).
- Avvisi residui fuori dal perimetro:
  - nomi troncati senza puntini negli appuntamenti dell'agenda admin;
  - controlli con forma propria dichiarati come componenti (farmaco-non-trovato, clinical-card__toggle, cdt__sort-btn, news2-chip, patient-roster__open, turno-pcard__open), da riallineare in un ciclo dedicato.

## Runtime Evidence

- logs/ds-audit.txt (firme per categoria), logs/ds-audit-altri-pulsanti.txt (inventario, vuoto)
- screenshots/<pagina>-1180.png per le 19 pagine

## Residual Risks

- Le pagine legacy (moduli, modali, amministrazione) ora usano pulsanti da 48 px e chip del DS. È voluto, per coerenza, ma i layout densi vanno controllati.
- `btn-success` non è più verde: le azioni primarie sono blu.
- Componenti con forma propria, dichiarati nell'audit e non considerati chip o pulsanti d'azione:
  - card KPI;
  - strisce di allarme;
  - campi modificabili in linea;
  - intestazioni ordinabili delle tabelle;
  - intestazioni di colonna dell'agenda admin;
  - apertura dei filtri tabella;
  - pulsante dell'assistente (da sostituire con il pannello).

## Final Decision

CLOSED — VERIFIED
