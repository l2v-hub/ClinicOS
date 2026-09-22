# Decisione di pubblicazione PO-01

Decisione: ALLOW dopo superamento delle verifiche mirate e build sul candidato integrato.

Autorità: approvazione esplicita dell'utente del piano PO e istruzione di pushare/deployare tutto, senza ulteriori domande. Integrazione e pubblicazione eseguite da root; agente frontend in worktree isolato, audit backend indipendente in lettura.

Perimetro: solo file PO-01 elencati nel commit; preservare gli script launcher estranei e gli artifact precedenti. Migrazione aggiuntiva che ammette DOB null e indicizza le bozze confermate, senza cancellare o riscrivere righe esistenti. Unicità CF e controlli di accesso mantenuti. Nessuna mutazione di pazienti live per le prove.

Destinazioni già utilizzate e autorizzate: backend Railway, progetto bddf5d1b-ee83-4362-8238-a79721f795e5, ambiente demo 8021987e-8eaa-4bc8-a102-20566db5e6b4, servizio c000f011-0349-4ea9-9b56-13c625b5767b; frontend Vercel clinicos__, alias clinicos-eosin.vercel.app. Conservare configurazioni, segreti e comandi del servizio. Esportare esclusivamente blob di un commit identificato e verificarne i byte prima dell'upload.

Ordine: commit/push → export verificato → backend/migrate SUCCESS/health → frontend READY/alias → smoke in lettura → ricevuta. Se il backend fallisce non procedere col frontend. Il gate non autorizza pubblicazioni su servizi diversi o cambi ai segreti.
