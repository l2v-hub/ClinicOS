# Task Validation Report

## Task

- Title: HMI parità 2: schermata Turno come il prototipo
- Slug: hmi-parita-2-schermata-turno-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`OperatorDashboard.tsx`** riscritto sul disegno del prototipo: titolo "Il mio turno" (sottotitolo
  "N ricoverati · reparto") nell'intestazione; indicatori; griglia 5/6 con a sinistra la card
  "Adesso" e a destra "Prossimi appuntamenti" + card dei pazienti. Tolti dalla dashboard operatore
  il pulsante "Pazienti" (è nella barra), la barra allarmi a tutta larghezza (ora pulsante compatto),
  la card "Prossime terapie" e il blocco consegne urgenti (contenuti nella coda e nelle card; il
  dettaglio resta nelle pagine Terapia e Consegne). Dashboard amministratore invariata.
- **`AdessoQueue.tsx/.css`**: card "Adesso" come il prototipo (badge "N urgenti", righe ora ·
  "luogo · paziente" · titolo · pulsante "Apri" 48 px, primario se scaduto) con stati di
  caricamento/errore e "Riprova" delle terapie.
- **`lib/adessoQueue.ts`**: ogni elemento porta `ora` e `luogo`; nuovo gruppo "Orario da
  verificare" (terapie senza orario verificabile, prima dei farmaci da verificare).
- **`DashboardNotificationCenter.tsx`**: forma `compact` (pulsante "Segnalazioni N") con lo stesso
  dialogo.
- **`TurnoAppointments.tsx` + `lib/turnoAppointments.ts`**: prossimi 3 appuntamenti di oggi non
  conclusi.
- **`TurnoPatients.tsx` + `lib/turnoPatients.ts`**: card paziente dai dati reali (roster + riepilogo
  clinico + terapie in programma): camera, età, letto, badge Allergia / Parametri critici / Rischio
  elevato / Consegne, NEWS2 reale caricato quando la card entra nello schermo, "Prossima: …".
- **`OperatorClinicalKpiBand.tsx`**: etichette del prototipo ("Ricoverati", "Terapie in ritardo"),
  valore = numero di terapie in ritardo; **`DashboardKpiBand.tsx`**: `data-unavailable` quando il
  valore è "—", così il motivo resta visibile.
- **CSS**: margine del contenuto 24 px (come il prototipo) da 1024 px in su.
- **Test**: contratto della dashboard aggiornato al nuovo disegno; `operatorDirectoryLazyLoad` reso
  tollerante all'a capo introdotto da Prettier nel ciclo 1 (testo invariato).

- **Correzioni dalla QA (primo giro FAILED VALIDATION, coerenza dei dati):**
  - card: con terapie in caricamento/errore dicono "Terapie in verifica…" / "Terapie non
    disponibili", mai "nessuna terapia";
  - card: senza riepilogo clinico mostrano "Dati clinici in verifica / non disponibili" e la griglia
    un avviso con Riprova; nessuna card finché il riepilogo iniziale non arriva, così i dimessi non
    compaiono per errore;
  - "Prossima" come il prototipo: prima la dose in ritardo (con quante altre), poi la prossima
    programmata, poi "Da verificare … orario non indicato", altrimenti "Nessuna terapia in sospeso";
  - coda: "Orario da verificare" solo per le dosi di oggi; tornati gli avvisi sulle scadenze di
    domani e il piè di pagina con "Aggiorna" e "Orari della struttura (Roma)";
  - appuntamenti sull'ora della struttura; programmati passati e non iniziati marcati "da iniziare";
  - Segnalazioni: allarmi annunciati ai lettori di schermo; camera nel nome accessibile della card.

## Files Changed

- frontend/src/components/operator/OperatorDashboard.tsx, OperatorDashboard.css
- frontend/src/components/operator/AdessoQueue.tsx, AdessoQueue.css
- frontend/src/components/operator/TurnoAppointments.tsx (nuovo), TurnoPatients.tsx (nuovo)
- frontend/src/components/operator/DashboardNotificationCenter.tsx, DashboardNotificationCenter.css
- frontend/src/components/operator/OperatorClinicalKpiBand.tsx
- frontend/src/components/shared/DashboardKpiBand.tsx
- frontend/src/lib/adessoQueue.ts, turnoPatients.ts (nuovo), turnoAppointments.ts (nuovo)
- frontend/src/app-additions.css
- test: operator-dashboard-first-view.test.ts, turnoPatients.test.ts (nuovo),
  operatorDirectoryLazyLoad.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                         |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | 1180×820: titolo e sottotitolo in intestazione; 5 indicatori in riga con le etichette del prototipo; contenuto a y=96 (72+24); "Adesso" a sinistra, appuntamenti e griglia a 2 colonne a destra. screenshots/turno-1180.png accanto a hmi-parity/proto/turno.png |
| AC2 |   PASS | righe con ora, "Camera · Letto · Paziente", titolo, pulsante 48 px; scadute con ora rossa e pulsante primario; unit adessoQueue 4/4                                                                                                                              |
| AC3 |   PASS | card di Moretti, Davide: camera 105, "77 anni · Letto B", NEWS2 6 dalle rilevazioni, badge reali, "Prossima: Cardioaspirin 100 mg · 20:00"; la card apre la cartella giusta; unit turnoPatients 4/4                                                              |
| AC4 |   PASS | "Segnalazioni" apre il dialogo "Segnalazioni operative"; con terapie e indicatori in errore: "—" con "Dato non disponibile" su tutti e 5 gli indicatori e avviso nella coda                                                                                      |
| AC5 |   PASS | 390/768 colonne impilate, 1024/1180/1440 affiancate, overflow 0; build.txt exit 0; unit-full.txt 850/859, stessi 9 fallimenti della baseline                                                                                                                     |

## Test Results

| Test             | Result | Evidence                           |
| ---------------- | -----: | ---------------------------------- |
| Unit | PASS | unit-turno.txt 12/12 (card: stati, ritardi, orario da verificare; coda senza orario; appuntamenti); suite completa |
| Integration      |     NA |                                    |
| API              |     NA |                                    |
| Playwright | PASS | evidence.mjs 20/20 (inclusi terapie in errore, riepilogo in errore, domani non disponibile) |
| Persistence      |     NA |                                    |
| Agnos AI         |     NA |                                    |
| Voice            |     NA |                                    |
| OCR              |     NA |                                    |
| Security/privacy |     NA |                                    |

## Runtime Evidence

- screenshots/turno-1180.png, turno-390/768/1024/1440.png, segnalazioni.png, non-disponibile.png

## Independent QA

- Giro 1 FAILED VALIDATION (coerenza dei dati delle card con fonti in errore o in caricamento; "Prossima" senza ritardi; dosi senza orario di domani; avvisi di domani persi) → corretto.
- Giro 2 FAILED VALIDATION ("Nessun altro appuntamento oggi" senza dati letti) → stati degli appuntamenti passati da App, ricarica di oggi al ritorno sul Turno.
- Giro 3 FAILED VALIDATION (la ricarica perdeva il filtro dell'operatore) → stessa richiesta del caricamento iniziale; evidenza che verifica operatorId, from e to.
- Giro 4 READY FOR QA: build, suite 850/859 (baseline), evidence 20/20 rieseguita; percorso Turno → Agenda → giorno successivo → Turno → ricarica sempre con operatorId dell'operatore; admin invariato.

## Residual Risks

- Le card includono anche i pazienti in day hospital, mentre "N ricoverati" nel sottotitolo viene
  dall'aggregato dei ricoverati: i due numeri possono differire.
- Una card senza rilevazioni complete mostra "NEWS2 non calcolabile" (dato onesto).

- Il pulsante di riga è "Apri" (apre il paziente): le azioni dirette del prototipo ("Somministra",
  "Avvisa medico") con conferma arrivano nel ciclo Terapia/conferma.
- Nessuna diagnosi nelle card (il roster non la porta): al suo posto età e letto.
- NEWS2: una lettura per card visibile.

## Final Decision

CLOSED — VERIFIED
