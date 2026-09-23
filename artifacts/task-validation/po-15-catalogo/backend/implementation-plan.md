# PO15 — Piano backend dopo il GO

Stato: preparazione soltanto. Root mantiene integrazione, porta HTTP/browser 4196 e pubblicazione. Unico writer nella worktree po15-catalog-backend; nessuna installazione dipendenze, modifica lockfile, commit o deploy dal worker.

Accettazione catalogo: endpoint statico autenticato e no-store, cinque tipi esatti con metadati minimi, terminali corretti e bozze solo proprie, conteggi prima dei limiti e una query SQL di metadati oltre alle verifiche di accesso. Verificare che il piano e la proiezione non carichino risposte/snapshot/PDF. I test sintetici coprono volumi maggiori dei limiti della lista storico e pareggi di ordinamento.

Accettazione storico NRS: protezione PUT/import atomica sotto lock, presenza distinta e uguaglianza JSON profonda, rollback in caso di conflitto e conservazione di Tinetti e parametri vitali. La conferma conserva data.dolore nel draft e il frontend non produce nuove valutazioniNRS. Il contratto finale include la coppia legacyPainDrafts/legacyPainError di intake-review e il precheck 100 draft/2 MiB, senza bloccare le terapie in caso di overflow.

Ownership prevista: backend/src/assessments per DTO/reader/test dedicati; backend/src/routes/patient-assessments.ts per la route statica; backend/src/patients/cartella-update.ts e relativi test; backend/src/ai/upload/confirm-service.ts e test import. Un'eventuale estensione read-only per i dati NRS dei draft confermati sarà limitata al contratto approvato da root. Prisma resta invariato salvo evidenza che richieda un indice e coordinamento esplicito con root; nessuna nuova entità clinica.

Ordine dopo GO: registrare claim applicativa e sessione esatta; implementare parser DTO/reader e test SQL, poi guardie legacy e relativi test; eseguire verifiche focalizzate e regressioni precedenti; typecheck/build/schema/diff; confronto di query e payload su fixture sintetiche source-bound; manifest, ricevute e review; rilasciare sorgenti/evidenze a root. Correzioni ai risultati devono essere seguite dalla rivalidazione pertinente, senza attribuire alla preparazione test non eseguiti.

Prima del GO: solo letture, runtime privato e questi artefatti. Non aprire database, non compilare né eseguire test applicativi PO15. Il setup non sostituisce l'implementazione quando arriverà il GO.
