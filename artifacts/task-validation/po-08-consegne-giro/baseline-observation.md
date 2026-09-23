# PO08 — baseline c52af623

Le nuove prove HTTP eseguite sul baseline applicativo falliscono come atteso: summary non esistente, room non applicata alla pagina identity e requestId rifiutato dal create legacy. Output completo in baseline-integration-tests.log. Fixture PostgreSQL nativa, 72 pazienti autorizzati e dati sintetici; cluster chiuso.

La UI baseline è un feed cronologico con Nuova consegna e ricerca paziente obbligatoria nel form; nessun elenco iniziale per il giro, nessuna azione Salva e prossimo e callback App ridotta a boolean. Non è stata raccolta una misura con operatori reali; il confronto candidato misurerà il percorso sintetico di cinque pazienti e la persistenza per ID.

La suite candidata riusa esattamente la stessa fixture e aggiunge assert su doppio scope, ordine filtrato prima della pagina, POST concorrenti, hash iniziale dopo edit/delete, cinque salvataggi e revoca patientScope. Nessuna scrittura su pazienti live.
