# PO16 — Giro tecnico completo

Preparazione soltanto; esecuzione dopo PO15 pubblicata/verificata. L'utente autorizza implementazione e pubblicazione dell'intero piano. Non coinvolgere o contattare terzi senza nuova richiesta; non attribuire prove a operatori/dispositivi fisici che non hanno partecipato. Il collaudo tecnico usa solo dati sintetici e PostgreSQL loopback.

## Scenario integrato

1. Ingresso con nome/cognome e presa in carico, CF/nascita/telefono mancanti espliciti, senza segnaposto inventati. Completamento successivo valido.
2. Documento lungo multipagina con più lettere: riordino/ripresa e almeno un errore recuperabile. Verificare terapia estratta e correzione dell'orario prima della conferma; prescrizione e note distinte, originali/PDF composti nell'archivio dello stesso paziente.
3. Assegnazione camera/letto, identità coerente e ordine del giro per camera/letto; cambio preferenza alfabetico preserva le bozze.
4. Registrazione parametri/somministrazione consentita, data/ora nel profilo; consegna a cinque pazienti senza digitare il nome; nessuna scrittura sul paziente vicino dopo cambio rapido o risposta lenta.
5. Catalogo moduli: compilazione/bozza/ripresa/anteprima/finale/rettifica di un modulo; verifica tutti i nuovi tipi e lo storico Tinetti/NRS precedente. PDF aperto dallo stesso record e archivio; più documenti selezionati per stampa senza eliminare dati.
6. Dimissione raggiungibile accanto a Documenti. Apertura e compilazione locale non devono registrare una dimissione implicita; eventuale salvataggio del caso sintetico con esito e storico corretti.

Riutilizzare fixture e test mirati PO01–PO15 già verificati, evitando la riscrittura integrale degli harness o duplicazione dei calcoli. Dove l'OCR esterno non è deterministico, usare estrazione sintetica dichiarata e verificare trasporto/struttura/persistenza; non affermare di avere validato riconoscimento su fotocamera fisica.

## Controlli trasversali

PatientScope per profili previsti; bozze private e sessioni isolate, salvataggi tardivi e retry senza doppioni, storia/bytes/PDF collegati al paziente giusto. Stati caricamento/salvataggio/errore comprensibili, focus ai campi problematici e risposte conservate. Identity visibile durante lo scroll. Tastiera e larghezze390/768/1262, contrasto misurato sui controlli chiave e limiti espliciti dello zoom nativo se non disponibile.

Registro finale distingue: implementato/pubblicato, verifiche automatiche, verifiche browser sintetiche, punti che richiedono osservazione con personale/dispositivi reali. Le guardie baseline già note non diventano regressioni né vengono nascoste dichiarando verde tutta la suite. Eventuali difetti concreti introdotti sono corretti e ritestati prima del rilascio.

## Consegna

Aggiornare registro16attività con commit/deploy e risultato verifiche, guida breve per verificare sul sito e limiti residui. Nessuna lista di domande o offerta di continuare al posto del lavoro autorizzato. Fare push dei sorgenti/evidenze pertinenti, escludendo launcher utente/cache/credenziali. Se PO16 introduce correzioni, esportare commit immutabile e distribuire solo i servizi cambiati; verificare health/alias/sourceCommit e smoke read-only. Non cancellare worktree o file utente.
