# PO-08 — Consegne durante il giro pazienti

GO applicativo emesso dopo rilascio PO07 c52af623 verificato: Railway de579c06-cd7d-4164-af15-ea11357adbed SUCCESS, migrazione e health200; Vercel dpl_HriFD1fuaDkr1FNWCxFkVDuydrAw READY con sourceCommit alias verificato. Autorizzazione utente: piano completo, implementazione autonoma, push e deploy. Root integra; writer backend/frontend in worktree distinti. Non aprire un nuovo sistema di workflow.

## Risultato

Apertura generale Consegne sul giro Pazienti, roster immediato e compositore con identità PO06. Feed cronologico esistente sempre raggiungibile e selezionato esplicitamente per ingressi dashboard/Agnos con filtro/focusId. Ordine condiviso PO07, ricerca nominativa POST facoltativa; filtro camera server applicato prima del limite e legato al cursore. Nessun ampliamento del patientScope, nessun caricamento di cartelle intere.

Elenco compatto dedicato che riusa PatientIdentity, lettore paginato e controllo ordine. Desktop affiancato, mobile sequenziale; identità sempre visibile durante la scrittura. Salva e Salva e prossimo distinti; nuova consegna sempre aperta. Nessuna transizione automatica a eseguita.

## Contratti da riusare/estendere

- `POST /consegne/patient-summary {patientIds}` massimo50. Intersezione patientScope AND visibilità consegna (autore/assegnatario o ruolo globale). Per paziente: total, open, urgentOpen, statoRicovero disponibile; zero, caricamento ed errore distinti. Il vecchio loadPatientConsegnaCounts non rispetta questo doppio perimetro: non riusarlo direttamente.
- `POST /consegne`: requestId stabile additivo, facoltativo per chiamanti legacy, obbligatorio nelle nuove UI. Risultato compatibile record+requestId/replayed; client valida ID paziente/richiesta. Unica creazione comune con servizio vocale.
- Ricevuta creazione `(actorId,requestId)` unica, hash del payload iniziale immutabile e consegnaId; transazione con la creazione. Stesso payload/key restituisce stesso esito; payload diverso409. La ricevuta sopravvive a modifica/eliminazione della consegna: un retry tardivo non ricrea la riga eliminata e restituisce esito esplicito.
- Identità/attore risolti sul server, scope verificato nella transazione per nuova creazione. Non restringere l'assegnazione a colleghi oggi permessa al ruolo operatore. Stato dimesso non è una nuova revoca: mostrarlo, mantenere la bozza e le policy correnti.

## Bozze ed esiti

Workspace in memoria per paziente: tutti i campi, revisione locale, richiesta pendente immutabile e ricevuta. Niente dati clinici nel localStorage. Cambio paziente riprende la sua bozza; passaggio al Feed conserva workspace. Protezione uscita con modifiche non salvate, senza promettere ripresa dopo ricarica.

Salva e prossimo congela paziente/richiesta/successore per ID nell'ordine visibile e generazione roster; guard sincrono doppio clic. Avanza soltanto dopo ricevuta valida e se selezione/filtri/contesto/generazione non sono cambiati. Al bordo pagina carica la continuazione;409 ricarica e preserva selezione/bozze senza saltare ad altro paziente. Errore incerto conserva key/payload, nessun avanzamento; errore refresh successivo non trasforma un salvataggio riuscito in fallito.

Aggiornare callback App e due quick-add PatientDetail oggi void: attendere risultato prima di chiudere/azzerare. Mostrare “Consegna salvata per …”; badge appena salvata dalla ricevuta. Nessuna consegna visibile fuori scope abilita nuovo accesso al paziente.

## Verifica

Wire concordato durante preparazione: `room` trim massimo80, vuoto assente, ricerca contiene sulla sola camera autorevole con wildcard letterali escaped; `requestId` valida /^[A-Za-z0-9_-]{1,128}$/ (UUID consentito). Summary `{items:[{patientId,total,open,urgentOpen,statoRicovero}]}`; ID fuori scope omesso, distinto da zero. Replay dopo edit restituisce record corrente, stesso ID; UI controlla paziente/richiesta senza confrontare testo attuale con payload originale. Replay eliminato:410 `consegna_creation_deleted` con soli requestId/consegnaId/pazienteId; conflitto payload409 `consegna_request_conflict`. Default scadenza risolto solo alla prima creazione, omissione stabile nell'hash. Cache vocali non possono bypassare la receipt DB.

Ingresso globale `openConsegneFeed({patientId?,status?,focusId?})` per dashboard/Agnos, sidebar generale su Giro. Il tab Consegne paziente resta raggiungibile. Worktree assegnati da c52af623: po08-handover-backend e po08-handover-ui; preparazione isolata in attesa deployPO07. Memoria Ruflo richiamata: vecchio pattern ordinamento pagine locali superato daPO07, non ripristinarlo.

Giro5pazienti senza digitare nomi; omonimi; >50pazienti; ordini/direzioni e camera oltreprima pagina; ritorno bozze; salvataggio albordopagina. Cambi ordine/letto/paziente durante request, logout, risposta tardiva,409, doppio clic, POSTconcorrenti, response-loss/restart, retry dopoedit/delete. Scope su roster/badge/create, zero/solostorico/errori. Regressione dashboard/Agnos/feed/quick-add/voce. Browser sintetico desktop/mobile/tastiera. Niente pazienti live modificati.

Preparazione derivata da audit source-only di clinical_forms_source_audit sul baseline PO06; adattare helper ai sorgenti PO07 integrati prima del GO.
