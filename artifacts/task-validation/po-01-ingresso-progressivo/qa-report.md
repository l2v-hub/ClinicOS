# PO-01 — Ingresso progressivo

Baseline: af48e322d3ba99561949f4a7901290e3cace09db. Integrazione sul branch codex/subtle-dashboard-notifications.

## Risultato verificato

Ingresso manuale/OCR con nome, cognome e operatore autenticato anche quando nascita, codice fiscale e telefono non sono disponibili. I valori assenti restano null; quelli presenti sono validati. Lo stato di completezza distingue campi assenti o non validi e apre il relativo editor sulla stessa scheda. Il POST legacy diretto mantiene il contratto di anagrafica completa: tutti i percorsi UI attivi usano la bozza persistente.

Le conferme della bozza e dell'importazione condividono lock/transazione, paziente e documenti. I reinvii, anche dopo una risposta persa, recuperano la scheda già creata. L'operatore vede quali terapie vengono create e quali restano nella bozza; le escluse sono conservate e consultabili dalla scheda, senza prescrizione né programmazione. Le righe incluse devono corrispondere alla revisione salvata. Le guardie allergie, documenti originali e narrativa sono conservate. La ricerca degli omonimi rispetta lo scope; un conflitto CF non rivela identità di altri pazienti.

## Prove

- 44 test frontend mirati superati: dati mancanti/invalidi, età nullable, cancellazione esplicita di errori OCR, selezione e normalizzazione delle terapie, protezione delle fonti, ripresa della bozza, recupero dopo risposta persa.
- 30 test backend superati: fixture PGlite isolata con tutte le migrazioni, ingressi manuale/OCR, date impossibili, conferme concorrenti e race job/bozza, CF concorrente, completamento atomico, scope, archivio, terapie escluse, sorgente mancante e regressioni legacy/telefono. Nessun DATABASE_URL esterno utilizzato.
- Build frontend e backend: vedere final-build.log. Le dipendenze non sono state aggiornate.
- Browser locale con componenti reali e API/DB sintetici: ingresso manuale senza tre campi; completamento sullo stesso ID; bozza OCR riaperta dopo esclusione; conferma di una terapia alle 20:00 e una differita; residuo consultabile e documento archiviato. Riepilogo verificato a 390px senza overflow orizzontale. Screenshot solo sintetici.
- Fonti frontend dei precedenti 8 fallimenti di suite generale confrontate col baseline e non modificate: dettagli in frontend-handoff.md. Non si dichiara verde l'intera suite generale.

## Limiti e pubblicazione

Verifica responsive in browser desktop: non è una prova fisica iOS/Android o una convalida clinica. Le altre attività PO-02…PO-16 restano nel registro del piano. Il deploy deve applicare prima la migrazione non distruttiva e il backend demo, poi il frontend Vercel; gli ID effettivi e il commit saranno registrati nella ricevuta di deploy. Nessuna scrittura di collaudo sui pazienti del sito.
