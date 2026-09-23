# PO15 — Catalogo Moduli e storico NRS

Preparazione soltanto. GO dopo PO14 pubblicata/verificata. Piano e delivery autorizzati dall'utente; nessuna nuova approvazione richiesta per questo ambito. Root integra/pubblica, worker isolati. Test solo sintetici.

## Esperienza operativa

Moduli apre un elenco compatto, non una sequenza di otto grandi tab. Due gruppi: Assistenza e mobilizzazione (Medicazioni, Contenzioni, Trasferimenti posturali); Scale di valutazione (Braden, PAINAD, Tinetti, MNA, GDS-15). Ogni riga mostra nome riconoscibile, ultima data pertinente o nessuna compilazione e azioni Apri/Nuova compilazione dove il modulo supporta tale azione. Nessun modulo non ancora operativo e nessuna nuova implementazione di Medicazioni/Contenzioni/Braden.

Un solo percorso di navigazione: dal catalogo al modulo e ritorno Tutti i moduli; mantenere il livello principale Moduli, senza duplicare l'elenco come seconda tabbar concorrente. Collegamenti precedenti e destinazioni Agnos continuano ad aprire il modulo corretto. Nuova compilazione crea solo una bozza locale e non registra risposte; non perdere bozze passando al catalogo, al paziente o al modulo diverso. Se un modulo legacy non espone il comando nuovo separato, aprire e focalizzare il suo form esistente senza salvare.

Ultima compilazione distingue data clinica e registrazione, finale e bozza personale; per i moduli nuovi usare finali terminali delle catene ordinati per data clinica (stessa regola di current). Una bozza altrui non compare. Le schede legacy non acquisiscono retroattivamente metadati di finalizzazione. Quando sono presenti solo bozze proprie, renderle raggiungibili e indicare Bozza.

Caricamento: nomi e comandi del catalogo immediati; metadati in caricamento/errore espliciti e riprovabili, mai errore interpretato come nessuna valutazione. Un reader aggregato bounded per i cinque tipi nuovi evita N+1 e download di risposte/PDF; patientScope e cache private/no-store. DTO minimale con tipi/versioni implementati, latest finale e conteggi/ultima bozza propri; conteggi esatti prima del limite. Le tre schede legacy usano Cartella già caricata. Callback/refetch isolati per paziente/sessione e dopo salvataggio.

## NRS precedente

PAINAD è già disponibile. NRS esce dalle nuove compilazioni, ma un collegamento Storico NRS precedente resta chiaramente reperibile nel catalogo. Vecchi collegamenti `nrs` aprono dettaglio/stampa storici; nessun form nuovo, modifica o cancellazione. Conservare integralmente Cartella.valutazioniNRS, nessuna conversione o ricalcolo in PAINAD.

Proteggere il ramo NRS nel PUT Cartella con lo stesso meccanismo PO12: omissione conserva, uguale permette altre modifiche, differente rifiuta esplicitamente, lettura sotto lock. Non cancellare o cambiare i campi dolore NRS dei parametri vitali, le registrazioni di altri flussi o i relativi permessi. Nello storico punteggi invalidi/assenti non ricevono una fascia di severità; zero è valido,−1 non è dolore lieve. Non inventare autore autenticato/data/ora mancanti.

## Prove

Aprire ognuno degli8moduli, nuovo/ripresa/storico, paziente senza valutazioni e con sole bozze proprie, bozza altrui invisibile, rettifica tardiva vecchia, caricamento/errore/riprova e cambio paziente rapido. Una sola richiesta aggregata per catalogo nuovo; payload senza risposte/PDF e limiti su volumi realistici. Nessun cambio del comportamento Medicazioni/Contenzioni/Braden.

NRS vecchi link/dettaglio/stampa, dati identici e PUT protetto, altri campi NRS funzionanti. Archivio multi-tipologia e stampa multipla con PAINAD/Transfers/Tinetti/MNA/GDS, rientro al modulo esatto. Mobile/tablet/desktop/tastiera senza overflow/focus nascosto; nomi e comandi riconoscibili. Build/secret scan, manifest e review. Deploy backend prima frontend, verifica health/alias primaPO16.
