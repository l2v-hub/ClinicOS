# PO12 — Tinetti versionata e storico precedente

Preparazione soltanto. GO applicativo dopo PO11 pubblicata/verificata. Utente autorizza l'intero piano e delivery; root integra/pubblica, worker backend/frontend isolati. Nessun test scrive pazienti online.

## Modello conservato

Nuovo tipo `tinetti`, versione `tinetti-it-2026-09-22-v1` in PatientAssessment. Conservare esattamente i venti item, opzioni e soglie già applicati: 10 equilibrio (massimo16) e 10 andatura (massimo12), totale28. Non riprodurre l'item11 incoerente dell'allegato che ridurrebbe il massimo a26. Decisione e fonti già documentate in docs/product/note-implementazione-piano-2026-09-23.md; nessuna nuova ricerca o convalida clinica da inventare.

Definizione corrente: frontend/src/components/operator/cartella/ScalaTinettiTab.tsx, SHA256 `7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09`. Fonte allegata PDF SHA256 `feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6`. La provenienza del nuovo modello dichiara mantenimento della struttura esistente e quattro risposte lunghezza/altezza DX/SX, non trascrizione letterale o convalida indipendente.

Equilibrio, ordine e massimo item: equilibrioSeduto1, alzarsi2, tentativiAlzarsi2, equilibrioImmediato2, equilibrioProlungato2, rombergSpinta2, occhiChiusi1, girarsi360Passi1, girarsi360Stabilita1, sedersi2.

Andatura, ordine e massimo item: iniziazione1, lunghezzaPassoDx1, altezzaPassoDx1, lunghezzaPassoSx1, altezzaPassoSx1, simmetria1, continuita1, traiettoria2, tronco2, cammino1. Etichette e descrizioni complete riprese dal codice corrente citato.

Answers: venti chiavi con `null` oppure intero ammesso 0..massimo del proprio item; note facoltative massimo4000 caratteri con a capo conservati. Rifiutare chiavi sconosciute, -1, stringhe numeriche, frazioni o fuori dominio. Nessuna preselezione. Completezza: numero risposte/20 e percorsi mancanti; result null fino a tutte valide, nessuna fascia clinica su parziali. Completa: equilibrio/andatura/totale e fascia. Soglie esistenti: 0–18 Alto rischio cadute;19–23 Rischio moderato;24–28 Basso rischio.

## Ciclo comune e UI

Riutilizzare PO10/11: bozza privata/CAS/replay, rettifica distinta, istante clinico originale inizialmente conservato, finale immutabile, PDF recuperabile/archivio e deep-link per tipo. Non alterare snapshot PAINAD/Transfers/versioni esistenti. Snapshot/PDF contengono tutti20item con descrizioni, subtotali, totale, fascia, note, fonte/versione, identità/autore/date e rettifica. Nessuna terapia/diagnosi o azione automatica.

Due gruppi Equilibrio/Andatura leggibili e avanzamento globale; identità sempre visibile e focus non coperto. Nuove compilazioni soltanto nel workspace versionato. Lo storico precedente compare nella stessa scheda, distinto dal nuovo, senza nuovi tab usati come filtri. Accesso al dettaglio/stampa delle vecchie schede conservato.

## Conservazione legacy effettiva

Cartella.valutazioniTinetti resta integralmente nel JSON: nessuna migrazione/backfill/conversione. Nella vista precedente eliminare creazione, modifica e cancellazione. L'adattatore read-only conserva ID/data/createdAt/operatore testuale/note e risposte senza inventare versione, autore autenticato, finalizzazione o ora clinica. Per record completi validi mantiene gli stessi risultati matematici attuali. Per−1/missing/out-of-domain restituisce risultato e fascia null e segnala incompletezza/dati non validi; non modifica il JSON. Non usare ID legacy come predecessorId.

PUT Cartella attuale sostituisce tutto il JSON: proteggere sotto lock il ramo legacy esistente. Se il ramo è omesso, conservarlo; se presente e diverso, rifiutare la modifica con errore esplicito, conservando i dati del form. Se uguale, permettere le altre modifiche autorizzate. Nessuna alterazione/cancellazione legacy tramite client vecchio o payload stale. Non attestare immutabilità storica che il sistema precedente non garantiva. Conteggio stampa generale attualmente legacy va etichettato come storico precedente oppure separato dai nuovi record, senza totale incompleto ambiguo.

## Prove e pubblicazione

Test importano produzione, non copie del calcolo presenti in scaleScoring.test.ts. Tutte48opzioni, minimo0, massimi16/12/28, confini18/19/23/24; venti casi mancanti, zero distinto da null,−1/stringhe/frazioni/out-of-domain. Possibile esaustivo separato:11664 combinazioni equilibrio e2304 andatura. Legacy completo risultati invariati, parziale senza classe, JSON identico dopo visualizzazione/stampa/nuova valutazione; PUT omesso/uguale/diverso e concorrenza su ramo legacy. Regressioni PAINAD/Transfers, CAS/replay/permessi e switching paziente/tipo.

Browser sintetico con bozza/ripresa/anteprima/finale/rettifica/archivio, desktop/tablet/mobile/tastiera; PDF20item e note lunghe renderizzato/ispezionato. Build/secret scan; manifest source/evidenze e rilascio claim prima dell'integrazione. Deploy backend prima del frontend e verifica health/alias/sourceCommit primaPO13.
