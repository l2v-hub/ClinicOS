# PO10 — Note di revisione e integrazione

Stato: collaudo root completato; il risultato è nel validation-report.md. Non è una ricevuta di pubblicazione.

- Corretto durante i test backend lo scostamento di due ore di adapter-pg con sessione PostgreSQL Europe/Rome. Transazioni del modulo/metadata usano UTC localmente; il fixture mantiene il fuso originale. Confronti contro SQL e paginazione inclusi nei test del worker, confronto HTTP/SQL aggiunto da root.
- Il revisore indipendente ha trovato un P2 nell'accesso AI ai PDF: il contesto globale autorevole `permittedPatientIds=null` poteva avere `roles=['operatore']`, quindi non era corretto ricostruire il perimetro solo dai ruoli. Worker corretto e regressioni sui due reader; revisore ha confermato la correzione. Nessun altro P1/P2 concreto riferito nella revisione preliminare; verifica dei manifest finali ancora richiesta.
- Root ha letto le tre pagine PNG del renderer sorgente prodotte dai test backend (normale una pagina, testo lungo due). Accenti e greco leggibili, intestazione ripetuta, margini e pie' di pagina senza sovrapposizioni, motivo rettifica e testo lungo non tagliati. Non sostituisce la prova del renderer compilato e della riapertura del PDF dall'archivio.
- Dipendenze/asset sono proprietà root: `@pdf-lib/fontkit`, Noto Sans Regular/Bold e OFL, copia verificata nel build. Worker intenzionalmente non cambia manifest/lock. Il collaudo finale deve chiamare il renderer in `backend/dist`, non soltanto il sorgente via tsx.
- Le prove utente con operatori e dispositivi fisici non sono state svolte. Il collaudo locale usa solo pazienti sintetici; nessuno screenshot clinico reale.

- Chiusura backend: corretto anche il clock di lease letto dopo il lock; verificati manifest finali senza mismatch e nessun P1/P2 residuo.
- Chiusura UI root: TSX 20b629b23f1859ec5111dd5c880fa6ef734f1c656008ee1b63c466215662e94a; CSS 9460d68936651f90cbc275fdee8dd5aa01f8ccf54cec1e29c3b1901823b7c2cb. Revisore indipendente ha chiuso la riserva tablet dopo correzione overflow <=1023 e prove geometriche mobile/tablet/desktop. Il limite sulla conferma nativa è conservato nel report.
