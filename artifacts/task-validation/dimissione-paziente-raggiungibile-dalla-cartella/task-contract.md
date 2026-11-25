# Task Contract

## Task

- Title: Dimissione paziente raggiungibile dalla cartella
- Slug: dimissione-paziente-raggiungibile-dalla-cartella
- Type: bugfix
- Date: 2026-11-24

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |       no |
| Config / Env         |       no |

Auth / Permissions: l'interfaccia legge i permessi esistenti del ruolo (`clinical_record.save`,
`room_assignments.create|update`) per mostrare a ciascuno solo ciò che può salvare; la policy e
l'autorizzazione sul server non cambiano.

Nessuna modifica a backend, schema Prisma, rotte o `VITE_API_URL`: si usano le chiamate
esistenti (`PUT /patients/:id/cartella`, `PUT /patients/:id/room-assignments/:id`).

## Current Behaviour

- In `PatientDetail.tsx` la finestra «Camera e Assegnazione» (`renderCameraModal`,
  `cardModal === 'camera'`) contiene l'unico campo «Stato ricovero» (Ricoverato / Ambulatoriale /
  Day Hospital / Dimesso), ma nessun punto del file chiama `setCardModal('camera')`: la finestra è
  irraggiungibile.
- Anche se si aprisse, «Salva» resta disabilitato finché non sono scelti camera e letto: non si
  potrebbe salvare «Dimesso» senza assegnare un posto letto.
- Il tab «Dimissione» (`DimissioneTab.tsx`) è solo documentazione e non scrive `statoRicovero`.
- Gli elenchi dipendono da quel campo (`patientListView.ts`, `turnoPatients.ts`,
  `useGiroParametri.ts`): senza un'azione in interfaccia un paziente non lascia mai «Non dimessi».
  Sulla demo un paziente di prova è stato dimesso chiamando l'API a mano.

## Expected Behaviour

Decisioni del product owner (2026-11-24):

1. **Dove**: azione «Dimetti paziente» nel tab «Dimissione» **e** intestazione della cartella
   (camera/letto) che apre la finestra «Camera e Assegnazione» esistente.
2. **Posto letto**: la dimissione chiude l'assegnazione attiva del letto (percorso esistente
   `onAssignCamera`, data di fine = oggi) e toglie camera/letto dalla cartella.
3. **Prerequisiti**: nessuno — la «Scheda di Dimissione» resta documentazione indipendente.
4. **Permessi (decisione del 2026-11-25, dopo la prima prova)**: nella policy predefinita
   infermiere e medico modificano la cartella ma non gestiscono i posti letto
   (`room_assignments.update` negato, 403), mentre supervisore e amministratore gestiscono i letti
   ma non modificano la cartella. Scelta: **la dimissione cambia sempre lo stato**; il letto viene
   chiuso solo se il ruolo può gestirlo, altrimenti resta assegnato e la conferma lo dice («lo
   libera chi li coordina»). Chi gestisce i letti senza modificare la cartella salva solo il letto.
   Nessuna modifica alla policy né al backend.

Un solo percorso di salvataggio (`saveStay` → `onAssignCamera` → `updConEsito`) e una sola
conferma, usati sia dal tab sia dalla finestra. La dimissione si può annullare («Annulla
dimissione» → Ricoverato; il letto non viene riassegnato da solo).

## Acceptance Criteria

- AC1: dal tab «Dimissione» un operatore vede lo stato del ricovero e l'azione «Dimetti paziente».
- AC2: «Dimetti paziente» apre una conferma esplicita che dichiara le conseguenze (il paziente
  esce dagli elenchi di reparto, l'assegnazione del letto viene chiusa); «Annulla» non salva nulla.
- AC3: confermando, `PUT /patients/:id/cartella` invia `statoRicovero: "dimesso"`. Con un ruolo
  che gestisce i posti letto l'assegnazione attiva viene chiusa
  (`PUT /patients/:id/room-assignments/:id` con `endDate`) e la cartella è salvata senza
  `cameraNumero`/`lettoNumero`; con un ruolo che non li gestisce nessuna scrittura tocca le
  assegnazioni e il letto resta assegnato.
- AC4: il paziente dimesso esce da «Non dimessi» e compare in «Dimessi e archivio»; lo stato resta
  dopo il ricaricamento della pagina.
- AC5: l'intestazione della cartella (camera/letto o «posto letto non assegnato») è un controllo
  che apre la finestra «Camera e Assegnazione»; scegliendo «Dimesso» il salvataggio non richiede
  camera e letto e passa dalla stessa conferma.
- AC6: la dimissione si annulla: «Annulla dimissione» (con conferma) riporta lo stato a
  «Ricoverato» e il paziente torna in «Non dimessi».
- AC7: se la chiusura dell'assegnazione del letto fallisce, lo stato non viene cambiato e
  l'operatore riceve un messaggio.
- AC9: ogni ruolo vede solo ciò che può salvare: senza permesso sulla cartella lo stato è
  visibile ma senza azione di dimissione; senza permesso sui letti camera e letto sono bloccati;
  chi gestisce i letti chiude dalla finestra il letto di un paziente già dimesso.
- AC8: nessuna regressione: `npm run build` e `npm test` del frontend passano; nessun errore in
  console e nessuna risposta 4xx/5xx nel flusso.

## Test Plan

| Test type                 | Required | Reason                                                                           |
| ------------------------- | -------: | -------------------------------------------------------------------------------- |
| Unit                      |      yes | Regole di salvataggio (stato, letto) e raggiungibilità dell'azione e del dialogo |
| Integration               |       no | Nessuna modifica al backend                                                      |
| API                       |       no | Nessuna rotta nuova o modificata                                                 |
| Playwright                |      yes | Flusso reale: dimetti → elenchi → ricarica → annulla; finestra dall'intestazione |
| Persistence after refresh |      yes | Lo stato «Dimesso» deve restare dopo il ricaricamento                            |
| Agnos action registry     |       no | Non toccato                                                                      |
| Voice simulation          |       no | Non toccato                                                                      |
| OCR/import test           |       no | Non toccato                                                                      |
| Security/privacy scan     |       no | Nessun dato nuovo, nessun permesso nuovo; evidenze solo su dati sintetici        |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (`npm test` frontend, `npm run build`)
- screenshots del flusso (tab, conferma, elenchi, finestra, annullamento)
- Playwright trace
- persistence proof (stato dopo ricaricamento, corpo della richiesta `PUT`)

Stack locale con dati sintetici (seed `POST /admin/synthetic-data/seed`): nessun dato reale.

## Risks

- **Letto occupato fino a fine giornata**: il backend considera attiva un'assegnazione con data di
  fine = oggi; il letto torna libero dal giorno dopo. Comportamento esistente (#128), non
  modificato: la conferma lo dice in chiaro e resta una decisione aperta per il product owner.
- **Annullamento**: riporta sempre a «Ricoverato» (lo stato precedente non è memorizzato); altri
  regimi si scelgono dalla finestra «Camera e Assegnazione».
- **Permessi**: nessun permesso nuovo. L'azione è offerta a chi apre la cartella, come la finestra
  esistente; l'autorizzazione resta quella del server su `PUT /patients/:id/cartella`.
- **Nessun rilascio**: la modifica resta nel sorgente; i due siti si aggiornano solo con
  l'operazione del proprietario.

## Gate Status

READY FOR IMPLEMENTATION
