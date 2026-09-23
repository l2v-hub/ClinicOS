# PO-08 — Consegne durante il giro pazienti

Preparazione in sola lettura; GO applicativo soltanto dopo rilascio PO07 verificato. Autorizzazione utente: piano completo, implementazione autonoma, push e deploy. Root integra; writer backend/frontend in worktree distinti. Non aprire un nuovo sistema di workflow.

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

Giro5pazienti senza digitare nomi; omonimi; >50pazienti; ordini/direzioni e camera oltreprima pagina; ritorno bozze; salvataggio albordopagina. Cambi ordine/letto/paziente durante request, logout, risposta tardiva,409, doppio clic, POSTconcorrenti, response-loss/restart, retry dopoedit/delete. Scope su roster/badge/create, zero/solostorico/errori. Regressione dashboard/Agnos/feed/quick-add/voce. Browser sintetico desktop/mobile/tastiera. Niente pazienti live modificati.

Preparazione derivata da audit source-only di clinical_forms_source_audit sul baseline PO06; adattare helper ai sorgenti PO07 integrati prima del GO.
