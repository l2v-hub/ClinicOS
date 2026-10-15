# Pulizia di `production` e verifica del sito pubblico — 15 ottobre 2026

L'utente ha richiesto esplicitamente la pulizia della produzione e della versione online. La transazione sul database Railway **`production`** è stata completata alle **13:44:35 UTC**, conservando accessi e configurazione. Nessuna migrazione o procedura di seed è stata eseguita in produzione.

La verifica finale ha rilevato che il sito pubblico usa un backend **`demo` separato**: vi sono ancora pazienti e il token disponibile non autorizza l'accesso a quel database. La richiesta di rendere pulita la versione online **non è ancora completata**. I conteggi e il backup sotto indicati riguardano soltanto `production`.

## Destinazione e risultato

- Progetto Railway: `bddf5d1b-ee83-4362-8238-a79721f795e5`.
- Ambiente `production`: `235fd681-2b0a-4c09-a0c4-04d862a99b38`.
- Backend: `clinicos-backend`, servizio `c000f011-0349-4ea9-9b56-13c625b5767b`.
- PostgreSQL 18.6, database `railway`, host privato `postgres.railway.internal`.

| Dati | Prima | Dopo |
| --- | ---: | ---: |
| Pazienti / cartelle | 5 / 5 | 0 / 0 |
| Terapie / orari | 22 / 24 | 0 / 0 |
| Somministrazioni | 43 | 0 |
| Documenti paziente / documenti di ingresso | 18 / 18 | 0 / 0 |
| Sezioni narrative | 50 | 0 |
| Assegnazioni ai letti | 3 | 0 |
| Consegne / messaggi riferiti a pazienti | 17 / 4 | 0 / 0 |
| Import / documenti importati / bozze | 503 / 38 / 64 | 0 / 0 / 0 |
| Eventi di audit con riferimento al paziente | 342 | 0 |

Anche tutte le altre tabelle cliniche selezionate sono vuote. I 90 eventi di audit senza riferimento a pazienti sono conservati. I dati preservati sono stati confrontati per contenuto, oltre che per conteggio: **8 utenti, 8 operatori, 13 stanze, 16 letti, 6 contesti di reparto, 159.880 farmaci, 159.420 associazioni di principio attivo e 58 migrazioni**. Preferenze, turni e autorizzazioni sono invariati. I contatori di invalidazione della cache del roster sono stati incrementati.

I foreign key sono rimasti attivi; i trigger applicativi sospesi all'interno della transazione sono stati ripristinati nello stato originale. Una tabella non classificata, una modifica clinica successiva al backup o un dato preservato differente avrebbero impedito il commit.

## Backup riservato e recupero

Dump PostgreSQL consistente creato alle **13:41:19 UTC** su un volume privato realmente montato; ripristino isolato verificato confrontando il contenuto di tutte le **45 tabelle**. Il job successivo ha verificato nuovamente l'accessibilità del backup dopo la sostituzione del container, ha ripristinato il dump, verificato un rollback dopo un errore simulato e provato la pulizia completa sul clone prima di intervenire sulla produzione.

- Volume conservato: `61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b`.
- Nome: `clinicos-backup-20261015-38743287285-volume`.
- File alla radice del volume: `/patient-reset-2026-10-15/database.dump`.
- SHA-256: `43e463f591f8c4c63ed794d356f4c614f8c02cd5e719c2364939a234876b9907`.
- Manifest e attestazioni: `baseline-private.json`, `restore-verified.json`, `cleanup-result.json`, nella stessa directory privata.

Il volume è **scollegato e conservato**. Il servizio temporaneo che aveva accesso al database è stato eliminato dopo la rimozione dei suoi binding. Non sono stati pubblicati dump, credenziali, documenti o righe dei pazienti nei log o negli artifact GitHub.

Per un recupero, collegare il volume a un servizio isolato autorizzato nel progetto Railway, verificarne SHA-256 e manifest e ripristinare inizialmente in un database isolato. Non ripristinare automaticamente l'intero dump sul database online.

Il backup attesta il contenuto PostgreSQL. Nell'inventario precedente, 32 documenti di importazione storici avevano `dataBase64` nullo: il dump ne contiene i metadati, ma non attesta la recuperabilità dei vecchi file temporanei esterni al database. I documenti persistenti del paziente sono inclusi nel dump.

## Verifica di `production` e riscontro sul sito pubblico

Un inventario indipendente di `production` ha confermato zero dati clinici e zero riferimenti paziente nei messaggi e negli audit. Backend e runtime AI di quell'ambiente sono stati riavviati per rimuovere cache e file effimeri; il backend non ha volumi collegati. Readiness e health del backend e pagina frontend hanno risposto **HTTP 200**. Tutti i servizi temporanei sono stati rimossi; il solo volume privato del backup è conservato. Questi controlli HTTP da soli non attestano che il frontend usi quel backend.

Il browser su `https://clinicos-eosin.vercel.app` chiama invece **`https://clinicos-backend-demo.up.railway.app`**. L'API di gestione Railway conferma che il servizio `production` verificato sopra espone soltanto `clinicos-backend-production-df88.up.railway.app`: il dominio `demo` non è un alias di quel servizio nell'ambiente `production`.

Una verifica attraverso il normale login del simulatore ha ricevuto HTTP 201 per la sessione e ha letto con successo `/auth/me`. La prima pagina di `/patients/page?limit=1` sul backend realmente usato dal sito restituisce **1 paziente**, quindi il requisito di elenco vuoto fallisce. Non sono stati stampati pazienti, credenziali o token; la sessione di collaudo è stata revocata e non sono state effettuate scritture cliniche.

La CLI rifiuta la lettura delle variabili di `demo`; anche l'API nativa con il token esistente restituisce soltanto l'ambiente `production`. Sono stati controllati i binding candidati: `RAILWAY_TOKEN` è presente, mentre `RAILWAY_DEMO_TOKEN`, `RAILWAY_TOKEN_DEMO` e `RAILWAY_API_TOKEN` non risultano disponibili al job, nemmeno associandolo all'ambiente GitHub `glistening-friendship / demo`. La lettura dei nomi dei segreti tramite API GitHub è rifiutata con HTTP 403; non è prova dell'assenza di altri segreti con nomi diversi.

Per proseguire serve il nome di un binding già presente che autorizzi il backend `demo`, oppure un token di progetto limitato a quell'ambiente nel segreto GitHub `RAILWAY_DEMO_TOKEN`. Non occorre ripetere l'autorizzazione alla pulizia. Dopo il collegamento: verificare il target reale, inventariare le tabelle, creare e ripristinare un nuovo backup, applicare la pulizia dei dati paziente e ripetere la prova autenticata online. Non ripetere la cancellazione di `production` già completata e non ripuntare il frontend a un database diverso per mascherare il problema.

Il collegamento mancante e i controlli di completamento sono tracciati in [issue #470](https://github.com/l2v-hub/ClinicOS/issues/470). La branch operativa contiene un workflow diagnostico pronto a controllare il nuovo binding: non effettua cancellazioni e rifiuta un token destinato a un altro backend. Il suo `deploy-backend.yml` temporaneo non va unito al workflow di deployment di main.

L'accesso online usa ancora il simulatore di ruoli in modalità demo: il sito non è stato attestato per l'uso con dati reali.

- [Inventario iniziale](https://github.com/l2v-hub/ClinicOS/actions/runs/38742673237).
- [Backup persistente e ripristino completo](https://github.com/l2v-hub/ClinicOS/actions/runs/38744630305).
- [Prova sul ripristino, rollback e pulizia produttiva](https://github.com/l2v-hub/ClinicOS/actions/runs/38745021411).
- [Inventario indipendente, riavvio e conservazione del backup](https://github.com/l2v-hub/ClinicOS/actions/runs/38745491079).
- [Dominio live distinto dal backend `production`](https://github.com/l2v-hub/ClinicOS/actions/runs/38748390948).
- [Verifica dei binding e rifiuto dell'accesso a `demo`](https://github.com/l2v-hub/ClinicOS/actions/runs/38749535484).
- [Login sul vero backend online e requisito di elenco vuoto non soddisfatto](https://github.com/l2v-hub/ClinicOS/actions/runs/38750022261).

Le prime prove di persistenza si sono fermate prima delle eliminazioni perché il volume appena creato non era ancora montato. La pulizia produttiva ha utilizzato esclusivamente il backup successivo verificato come persistente.
