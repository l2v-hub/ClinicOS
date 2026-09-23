# PO-05 — esecuzione autorizzata

Baseline applicativa: ef562bf51f296153ff0ec51ed6ab620da8e2dc1a. PO-04 pubblicato e verificato prima dell'avvio.

Autorizzazione: conferma utente dell'intero piano, implementazione, push e deploy delle modifiche verificate. Root integra e pubblica; gli altri writer lavorano solo nei tre worktree assegnati. Nessun test altera pazienti live, nessuna chiave/configurazione provider modificata, nessun provider reale per collaudo.

Proprietà: backend/schema/test in po05-import-runtime; UI in po05-scan-ui; Python in po05-runtime-recovery. Root: dipendenze/lockfile, integrazione, browser sintetico, ricevute di rilascio. Porta 4186 riservata alla fixture root. Le modifiche PowerShell e gli artifact estranei restano esclusi.

Contratto: docs/product/po05-import-session-contract.md nel worktree backend, condiviso con frontend. Stati interni queued_pages/processing_pages proteggono dal worker legacy durante rolling deploy. Aggiornamento esplicito della sorgente bozza preserva valori manuali e richiede nuova verifica per le righe importate coinvolte; nuovi candidati restano proposte, mai duplicazioni automatiche.

Accettazione: 30 pagine oppure tre lettere da dieci, conteggio PDF reale, gruppi/ordine/retake atomico, recupero di pagina fallita, chiusura non distruttiva e ripresa, decisioni di conflitto e hash/revisione verificati, finalizzazione idempotente con originali e PDF di gruppo nell'archivio esistente. Nessun successo su OCR/estrazione troncati.

Gate: test unitari e integrazione isolata, failure path/replay/CAS, build, verifica UX desktop/mobile sintetica, manifest sorgenti e artefatti; deploy da commit esatto, migrazione additiva, runtime compatibile prima del backend, frontend per ultimo. Prove fisiche iOS/Android e qualità clinica/provider restano dichiarate separatamente dalle prove automatiche.
