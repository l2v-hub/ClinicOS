# Task Contract

## Task

- Title: Dimetti paziente nella scheda Dimissione
- Slug: dimetti-paziente-nella-scheda-dimissione
- Type: change
- Date: 2026-11-24

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-24): «aggiungi "Dimetti paziente" nella scheda Dimissione».
Verifica in locale: nessun profilo può oggi sia liberare un letto (coordinatore, amministratore) sia
salvare la cartella (medico, infermiere). Decisione dell'utente (2026-11-24): **possono dimettere
medico e infermiere**, con una nuova operazione nel server che cambia lo stato e libera il letto in
un solo passo, con un permesso proprio. Il coordinatore continua a spostare e assegnare i letti.
Nessuna modifica allo schema Prisma: «Database» = dati scritti dall'operazione.

## Current Behaviour

- Nessuna schermata permette di mettere un paziente in stato «Dimesso»: l'unico selettore sta in una
  finestra (camera e stato di ricovero) che nessun pulsante apre.
- La scheda «Dimissione» compila la documentazione ma non cambia lo stato.
- Un paziente non esce mai dalla lista «Non dimessi» né dal giro.

## Expected Behaviour

- Nuova operazione nel server `POST /patients/:id/discharge` (con conferma esplicita nel corpo): in
  una sola transazione mette la cartella in stato «Dimesso» (togliendo camera e letto dalla cartella,
  con la traccia di chi e quando) e libera da oggi il posto letto del paziente: l'assegnazione
  iniziata nei giorni precedenti si chiude al giorno prima, quella iniziata oggi o prenotata per
  dopo viene rimossa. O tutto o niente.
- Nuovo permesso `patients.discharge`: concesso a medico e infermiere, negato a coordinatore,
  amministratore e OSS nella configurazione iniziale; modificabile da «Ruoli e permessi».
- Nella scheda «Dimissione» una sezione «Stato del ricovero» con l'azione **Dimetti paziente**,
  visibile solo a chi ha il permesso.
- Conferma esplicita che dice cosa succede: il paziente esce dalle liste dei presenti, il posto letto
  (se assegnato) viene liberato da oggi, la cartella resta consultabile; avviso se la scheda di
  dimissione non è compilata.
- Su un paziente dimesso la sezione lo dice e offre **Annulla dimissione** (torna al regime
  precedente, senza riassegnare il letto), anch'essa con conferma: comando del server
  `POST /patients/:id/discharge/undo`, stesso permesso.
- Lo stato «Dimesso» è protetto: un salvataggio qualunque della cartella (anche da una copia letta
  prima della dimissione) non lo toglie né lo mette, e non scrive la traccia della dimissione.
- Durante il salvataggio i pulsanti sono disabilitati; un errore viene mostrato.
- Correzione collegata: la chiusura di un'assegnazione letto dal cambio camera non ignora più il
  rifiuto del server.

## Acceptance Criteria

- AC1: «Dimetti paziente» visibile nella scheda Dimissione di un paziente presente per medico e
  infermiere; conferma con conseguenze e posto letto nominato quando c'è.
- AC2: alla conferma il paziente risulta «Dimesso», il letto è libero, il paziente non è più in
  «Non dimessi» e compare in «Dimessi e archivio»; lo stato resta dopo la ricarica.
- AC3: l'operazione è atomica: se una parte fallisce non cambia nulla; ripeterla su un paziente già
  dimesso non dà errore e non cambia altro.
- AC4: coordinatore, amministratore e OSS ricevono un rifiuto (403) dal server e non vedono l'azione;
  un paziente fuori dall'ambito dell'operatore non è dimissibile.
- AC5: «Annulla dimissione» riporta il paziente tra i presenti, con conferma; un salvataggio della
  cartella partito da una copia precedente non annulla la dimissione.
- AC6: test del server (ruoli, letto, stato, ripetizione), test delle regole, suite frontend e
  backend senza nuove rotture, typecheck e build; catalogo dei permessi e registro rigenerati.
- AC7 (dopo il rilascio): provato sulla demo su un paziente di prova, con evidenze.

## Test Plan

| Test type                 | Required | Reason                                                |
| ------------------------- | -------: | ----------------------------------------------------- |
| Unit                      |      yes | regole della sezione e messaggi                       |
| Integration               |      yes | operazione nuova: stato + letto in una transazione    |
| API                       |      yes | ruoli ammessi e negati, ripetizione, ambito           |
| Playwright                |      yes | flusso in locale e sulla demo                         |
| Persistence after refresh |      yes | lo stato resta dopo ricarica                          |
| Agnos action registry     |       no |                                                       |
| Voice simulation          |       no |                                                       |
| OCR/import test           |       no |                                                       |
| Security/privacy scan     |      yes | permesso nuovo: chi è ammesso, chi no, rotta censita  |

## Evidence Plan

Required evidence:

- validation-report.md
- schermate e log del flusso (locale e demo), esito dei test e della build

## Risks

- Dimettere per errore: conferma esplicita e «Annulla dimissione».
- Stato cambiato e letto rimasto occupato (o viceversa): una sola transazione nel server.
- Permesso nuovo: un sito con una configurazione dei permessi salvata non lo contiene e applica il
  valore predefinito; la demo usa la configurazione iniziale. Va detto nelle note di rilascio.
- Il permesso libera un letto senza dare a medico e infermiere la gestione dei letti: l'operazione
  chiude solo le assegnazioni del paziente dimesso.

## Gate Status

READY FOR IMPLEMENTATION
