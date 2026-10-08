# #405 — verifica con lettore di schermo reale: NON ESEGUITA

AC3 resta UNVERIFIED. Playwright, DOM, screenshot e aria snapshot non costituiscono ascolto di un lettore di schermo. Questa postazione non dispone di lettore installato/in esecuzione rilevato né di API per controllare applicazioni native. Non installare software o usare pazienti reali senza autorità esplicita.

## Preparazione della prova umana

Usare un ambiente di test con dati esclusivamente sintetici e il candidato21f8c75c221c464fb00499326cf261143b444bf4, non l'attuale produzione precedente. L'ambiente interattivo deve essere predisposto separatamente: il nostro qa-browser.mjs usa intercettazioni per browser automatico e chiude le finestre a fine prova; avviare solo qa-server.mjs NON predispone un backend sintetico per un browser umano. Non indirizzare una sessione non intercettata a dati di produzione.

L'esecutore deve registrare data/ora, commit/build esatto, OS, nome e versione del lettore (ad esempio NVDA o Narrator realmente avviato), browser/versione, ruolo Infermiere e viewport. Usare una registrazione dello schermo con audio/voce del lettore o log del visualizzatore vocale del lettore reale, oscurando ogni informazione non sintetica. Nessuna lettura reale è stata prodotta da questo report.

## Passi e risultati richiesti

1. Nell'agenda infermiere, portare la tastiera allo slot libero14:00 e premere Invio. Ascoltare l'annuncio del dialogo «Nuovo Appuntamento» e il focus iniziale «Chiudi».
2. Premere Tab e Shift+Tab, registrando ciò che il lettore pronuncia e il controllo focalizzato. Devono essere distinguibili Paziente, Data, Ora, Durata, Tipo intervento, Priorità, Operatore, Camera(opz.), Stato, Note cliniche, inclusi i pulsanti. I segmenti interni di Data/Ora possono aggiungere fermate native ma non devono perdere il nome del campo. Il focus non deve uscire dal dialogo.
3. Nel campo Paziente cercare un identificativo sintetico, usare frecce e Invio per selezionare il risultato. Verificare che il nome/identificativo sintetico selezionato e le istruzioni restino comprensibili. Non creare un paziente reale.
4. Predisporre un conflitto di appuntamento controllato nel backend di test e tentare il salvataggio. Il lettore deve annunciare l'errore; il dialogo e il pulsante Salva devono descrivere quel messaggio. Gli altri campi non devono essere annunciati arbitrariamente come invalidi.
5. Correggere il conflitto, verificare che le informazioni inserite non vadano perse. Durante una risposta di salvataggio trattenuta nel test, Escape/Chiudi/Annulla non devono chiudere il dialogo né generare una seconda scrittura. Nessuna interazione con backend reale.
6. Annullare una nuova apertura e provare Escape: ascoltare/controllare il ritorno del focus allo stesso slot14:00. Ripetere su modifica di appuntamento sintetico: Paziente è in sola lettura, gli altri9campi mantengono nome e ordine; Escape torna al pulsante Modifica.
7. Ripetere il percorso essenziale a390px o con zoom che riproduca un layout stretto. Il layout non sostituisce la prova vocale.

## Ricevuta da restituire

- Commit/build, ambiente sintetico e URL di test, data/ora, nome/versione AT/browser/OS.
- Esito PASS/FAIL per punti1–7 e trascrizione/log/audio del lettore effettivo.
- Eventuali nomi omessi, ordine incoerente, mancati annunci/errori o focus non restituito.
- Conferma zero pazienti reali/segreti nelle prove.

Solo una prova reale, collegata al candidato, può consentire al gatekeeper di riesaminare AC3. Nessuna approvazione è implicita in questo protocollo.
