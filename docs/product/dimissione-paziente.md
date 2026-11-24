# Dimissione del paziente

«Dimetti paziente» sta nella scheda **Dimissione** della cartella, nella sezione «Stato del ricovero».

## Che cosa fa

Una sola operazione del server, `POST /patients/:id/discharge` (corpo `{"confirmed": true}`), che in
un'unica transazione:

- mette la cartella in stato **Dimesso** e toglie camera e letto dalla cartella;
- libera il posto letto del paziente **da oggi**;
- scrive in cartella la traccia `dimissioneRegistrata` (giorno, operatore, letto lasciato).

O riesce tutto o non cambia nulla. Ripeterla su un paziente già dimesso non dà errore e non cambia
altro. Il paziente esce dalle liste dei presenti e dal giro, e compare in «Dimessi e archivio».

### Il posto letto

Le assegnazioni dei letti valgono per giorni interi, estremi compresi. Perché il letto sia libero
già il giorno della dimissione:

- un'assegnazione iniziata nei giorni precedenti viene chiusa al giorno prima (la stessa regola che
  uno spostamento applica al letto lasciato);
- un'assegnazione iniziata oggi, o prenotata per i giorni successivi, viene rimossa: il letto
  resta scritto nella traccia `dimissioneRegistrata`.

## Chi può dimettere

Permesso proprio: `patients.discharge` («Pazienti — dimetti e annulla dimissione»).

| Profilo        | Configurazione iniziale |
| -------------- | ----------------------- |
| Medico         | consentito              |
| Infermiere     | consentito              |
| Coordinatore   | negato                  |
| Amministratore | negato                  |
| OSS            | negato                  |

È un'operazione a sé perché nessun profilo ha insieme il salvataggio della cartella (medico,
infermiere) e la gestione dei letti (coordinatore, amministratore). Chi dimette libera soltanto il
letto del paziente che sta dimettendo: spostare e assegnare i letti resta al coordinatore.

Il server chiede sempre la conferma esplicita (`confirmed: true`): senza, risponde 400
`confirmation_required`. Chi non ha il permesso riceve 403 e nella scheda non vede l'azione.

**Siti con una configurazione dei permessi salvata.** Un permesso nuovo non è contenuto nelle
configurazioni salvate prima della sua introduzione, e lì vale il valore predefinito (negato). Su
quei siti l'amministratore lo concede da «Ruoli e permessi» a medico e infermiere. Dove è attiva la
configurazione iniziale non serve fare nulla.

## Annullare una dimissione

«Annulla dimissione» è anch'esso un comando del server, `POST /patients/:id/discharge/undo` (stesso
permesso, stessa conferma): riporta il paziente al regime che aveva prima della dimissione
(ricoverato, day hospital, ambulatoriale) e lascia in cartella la traccia della dimissione, segnata
come annullata. Il posto letto **non** viene riassegnato: lo sceglie di nuovo il coordinatore.

## Lo stato «Dimesso» è protetto

Lo stato «Dimesso» si raggiunge e si lascia **solo** con i due comandi. Il normale salvataggio della
cartella invia la cartella intera, spesso da una copia letta prima (un'altra postazione, un modulo
aperto prima della dimissione): se potesse cambiare lo stato, riporterebbe in silenzio il paziente
tra i presenti, o lo segnerebbe dimesso lasciando il letto occupato. Per questo, quando salva una
cartella, il server:

- se il paziente è dimesso, conserva stato, camera e letto così come sono;
- se non lo è, ignora un eventuale «dimesso» in arrivo;
- non accetta mai la traccia `dimissioneRegistrata` da chi salva: la scrivono solo i comandi.

Il resto del salvataggio passa normalmente.

## Per chi sviluppa

- Servizio: `backend/src/patients/discharge.ts`; rotta in `backend/src/routes/patients.ts`.
- Prove: `backend/src/patients/__tests__/discharge.e2e.test.ts`,
  `frontend/src/lib/__tests__/patientDischarge.test.ts`.
- Interfaccia: `frontend/src/components/operator/cartella/DimissioneTab.tsx`, regole e testi in
  `frontend/src/lib/patientDischarge.ts`. La chiamata passa dalla coda dei salvataggi della
  cartella (`App.tsx`), così un salvataggio in corso non la sovrascrive.
- La protezione dei salvataggi è `preserveDischargeState` (stesso file del servizio), applicata da
  `saveCartella` insieme alle altre protezioni della cartella.
