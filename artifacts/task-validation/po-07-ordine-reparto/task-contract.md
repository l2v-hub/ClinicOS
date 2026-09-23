# PO-07 — ordine del giro reparto

Stato: preparazione. Implementazione soltanto dopo la verifica del rilascio PO-06. L'utente ha autorizzato l'intero piano, push e deploy. Un'unica attività applicativa alla volta e un writer per worktree.

## Risultato e ambito

Scelta visibile Cognome / Camera e letto, crescente/decrescente. Preferenza personale per contesto reparto, default modificabile da admin/manager, fallback alfabetico. Ordinamento server prima del limite nelle viste Pazienti, Parametri e Terapia; il roster Consegne verrà collegato in PO-08, mantenendo il feed cronologico esistente. Nessun contesto di ordinamento amplia o filtra il patientScope.

Operator.department nel database è autorevole per la configurazione; non usare App.utente.reparto, che può provenire da mockData. RosterContext con ID stabile, etichetta e default nullable/versionato; Operator.rosterContextId nullable; OperatorRosterPreference unica su operatorId/contextId, override nullable e revisione CAS. Backfill conservativo per stringa reparto esatta, senza normalizzazioni che fondono reparti distinti. Contesto esplicito Senza reparto. Profilo DB assente: ordine temporaneo dichiarato, nessuna creazione implicita del profilo. Cambi amministrativi del reparto aggiornano il collegamento al contesto senza toccare scope pazienti.

API personale GET/PATCH /me/roster-order; risolve operatore dal contesto autenticato, non accetta operatorId del client. Risposta con contesto, default, override, effective, source personal/department/system, revision e canEdit. PATCH {contextId, override: {criterion:name|location,direction:asc|desc}|null, expectedVersion}; reset conserva riga/versione. Endpoint admin per elenco contesti e PATCH default con CAS. Tutte le risposte private/no-store, 409 su conflitto.

## Ordine, cursori e concorrenza

Cognome/nome normalizzati come alphabetical-order.ts; camera/letto con token numerici e testuali naturali (1A,1B,2A,2B,10A), nomi/ID come spareggio deterministico. Camera mancante in fondo in entrambe le direzioni; letto mancante in fondo alla stessa camera. Stessa tupla per ORDER BY e keyset. Nessun riordino solo delle righe caricate. Posizione autorevole PO-06 e asOf Europe/Rome.

Cursore v3 lega vista, scope autenticato, contextId, sort, filtri normalizzati, asOf ed epoch, più ultima tupla. Ricerca nominativa resta POST. Terapia usa chiave paziente + therapyId e conserva merge di pazienti parziali/totali esatti. Snapshot REPEATABLE READ per epoch e pagina. Contatore transazionale DB invalidato da modifiche rilevanti a identità/ownership, assegnazioni, Room/Bed e scalari Cartella; includere mutazioni delle terapie dovute nel contatore pertinente senza invalidare per ogni somministrazione. Cambi durante il paging danno 409 roster_changed: ripartire dalla prima pagina conservando bozze per patientId. Data diversa invalida il cursore anche senza scritture.

## UX e prove

Controllo condiviso compatto, scelta corrente evidente, esito di salvataggio e retry. Preferenza non disponibile: spiegare ordine temporaneo, non simulare persistenza. Cambio ordine/context abortisce le richieste vecchie, resetta pagine e preserva valori/nota per paziente, senza trasferire bozze. Mantenere selezione per ID e gerarchia visiva PO-06. Default reparto editabile solo da admin/manager; controlli personali non cambiano gli altri operatori.

Prove con oltre 50 pazienti e più pagine: entrambi i criteri/direzioni; accenti/omonimi; posizioni 1A…10A e mancanti/incoerenti; scope operatori/admin; cambio letto/identità/reparto a metà paging; reset e CAS concorrenti; ricarica e preferenze indipendenti. Backend HTTP/PostgreSQL loopback, browser desktop/mobile/tastiera, build/tipi, confronto con baseline PO-06 e verifica zero N+1/cartelle intere. Nessun paziente live modificato.

Root integra dopo claim release e hash, con migrazione additiva verificata, quindi pubblica backend e frontend dal commit immutabile. Nessuna nuova dipendenza prevista. Le source manifest includono migrazioni e helper realmente eseguiti. Il piano resta aperto per PO-08 e PO-09…16.
