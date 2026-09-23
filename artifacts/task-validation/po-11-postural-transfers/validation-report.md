# PO11 — Trasferimenti posturali

Implementazione pronta per il rilascio autorizzato il 23 settembre 2026. Il modulo usa dati strutturati senza punteggio, bozze parziali, anteprima/finale, rettifiche e PDF archiviato. Conferma fisioterapista e presa visione sono eventi personali legati alla versione; non firme digitali e non modificano il PDF.

## Evidenze

- Backend: 66 test in 15 file, 45 migrazioni su PostgreSQL sintetico; typecheck e PDF normale/lungo. Input finale `15bc32a12d8fcc1ab72f3fa6e036c364523c8692cbe41eda8f981801f3b41653`.
- Frontend: 92 test prima della rifinitura sulla data, poi 17 test mirati sullo stato finale; build, lint senza nuovi rilievi, scansione segreti. Stato finale `1f589b0c42efc83f5c1a7912ce4ea5c0604e346015372dab1df721ae9e994c10`.
- Root: 3 prove HTTP/PG integrate verdi, build backend/frontend e scansione sorgenti/bundle senza segreti. Reviewer indipendente senza P1/P2 residui.
- Browser sintetico: 1999 in input nativo, anteprima/DB/PDF concordi; assistenza DX poi rettifica SX, tre trasferimenti indipendenti, dodici ausili verificati e proprietà della carrozzina; bozza parziale e ripresa; cambio paziente durante risposta lenta e separazione PAINAD.
- Perdita risposta: PATCH riconciliata automaticamente con GET corrispondente; creazione/finalizzazione/conferma reinviate con lo stesso payload. Stato esportato: 2 finali, 1 bozza, 2 documenti, 2 conferme, nessun duplicato.
- Conferma fisioterapista disponibile con qualifica registrata; manager privo della qualifica vede soltanto presa visione. Rettifica senza conferme ereditate. Archivio apre il PDF e ritorna al tipo corretto.
- Desktop/tastiera, tablet 768 e mobile 390: nessun overflow orizzontale nei gruppi, focus visibile sotto identità. PDF compilato di due pagine renderizzato e ispezionato; testi, a capo, fonte, firme cartacee e intestazione leggibili. Font del build identici ai sorgenti.

## Limiti dichiarati

L'automazione del browser ha normalizzato l'immissione dell'anno 10000 e non ha riprodotto il raw input; il caso, la conservazione della bozza e la correzione a 1999 sono coperti dai 17 test mirati. La finestra nativa di uscita/cambio sessione non è stata collaudata qui; isolamento e stato non salvato sono coperti dai test. Nessuna prova con operatori clinici o dispositivi fisici viene dichiarata. Il primo tab sintetico è stato riaperto dopo un timeout iniziale di Vite; il tab utente con terapia non salvata è rimasto intatto. Le sei guardie statiche note della baseline restano fuori dall'esito delle suite mirate.

Backend e migrazione devono precedere il frontend; il gate lega le evidenze al commit immutabile. Nessuna interazione di test scrive sui pazienti del sito.
