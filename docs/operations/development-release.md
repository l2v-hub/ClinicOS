# ClinicOS: ambiente development unico

L'ambiente di lavoro è `https://clinicos-development-isolated.vercel.app`. È sintetico, persistente, senza scadenza dell'istanza e separato dalla demo precedente. I cinque profili sono amministratore, supervisore, medico, infermiere e OSS. Le sessioni restano soggette al proprio TTL; la scadenza dell'istanza è una proprietà distinta.

## Destinazioni

| Componente | Destinazione dedicata |
|---|---|
| Frontend | progetto Vercel `clinicos-development-isolated`, `prj_521wrOk01zqRUqFym41yxJw5KS3u` |
| API | `https://development-backend-development-a4a4.up.railway.app` |
| Railway project | `30bfd0c6-2b4d-4fcd-b219-f1fbfe1d9820` |
| Unico Railway environment | `development`, `e54fd397-76c8-4a14-ac03-4d8a4d580173` |
| Backend | `f46547d5-1eb2-42a0-bd13-de2a1f7feca1` |
| Runtime AI privato | `b3bf897a-4e0f-41a1-aa58-3687d9a66443` |
| PostgreSQL | `8cc1c795-5a61-4ead-b6f4-020b2c29a91b` |
| Volume PostgreSQL | `64536a4c-e0c1-4cff-ad76-7f8f33f18926`, `/var/lib/postgresql/data` |

Vercel usa il proprio target di hosting `production` per l'URL stabile di questo progetto dedicato. L'applicazione rimane development sintetico. La futura produzione ClinicOS non è stata creata.

## Sorgenti e prossime modifiche

La branch di lavoro dedicata raccoglie la base applicativa revisionata M, la configurazione frontend rivolta al nuovo backend e la compatibilità STT corrente. Le release registrano separatamente commit, tree, deployment ID e digest osservato per ogni componente: una branch più recente non prova che sia già distribuita. Il manifest della release verificata prevale sulle supposizioni basate sul solo HEAD locale.

Per ogni modifica:

1. Usare una worktree posseduta e un Task Contract valido; preservare le modifiche preesistenti della cartella utente. Sviluppare sulla sorgente dedicata, con dati sintetici.
2. Congelare il commit e far revisionare il cambiamento con i controlli pertinenti. Tenere distinte review applicative, QA e approvazioni protette del controller.
3. Verificare dal provider gli ID della tabella, il DB privato e il volume, le configurazioni effettive e le dipendenze. Configurare esclusivamente i servizi nuovi; la chiave OpenAI rimane nel runtime privato.
4. Preparare un'operazione di rilascio specifica, con intent scritto prima dell'effetto, sorgente e target esatti e nessun retry automatico degli esiti incerti. Il vero operatore deve disporre dell'autorizzazione corrente: un file JSON, OAuth, hash o test fake non la conferisce. I controlli prima di una scrittura non sono un CAS del provider.
5. Distribuire il runtime necessario, poi backend e frontend sul solo progetto development; verificare build e readiness reali. Le variabili modificate richiedono un nuovo deployment qualificato: non presumere che un semplice restart le applichi.
6. Verificare cinque profili, permessi API/UI, funzioni interessate, dati ricaricati e persistenza pertinente. Registrare failure e risultati ignoti; dichiarare completato solo dopo il Validation Report verificato e la QA indipendente.

I helper di questa prima installazione sono one-shot, legati ai loro predecessor e già consumati quando indicato dai receipt. Per una release successiva occorre una nuova operazione revisionata con nuovi input; non cancellare marker, azzerare contatori o modificare receipt storici per far ripartire quelli vecchi. Non attivare automaticamente workflow o controller protetti senza il percorso di approvazione richiesto dal repository.

## Recupero e dati

La demo precedente rimane online e indipendente. Il rollback del development deve usare sorgente, immagine e configurazione già attestati del solo progetto dedicato. Non spostare alias della demo, non copiare i suoi dati o segreti e non eliminare ambienti per recuperare una release.

Le fixture di collaudo sono record sintetici marcati e conservati. Non eseguire seed, SQL manuale o cancellazioni implicite. Prima di un riavvio di persistenza, fermare i propri harness e attendere che i job siano terminali; osservare il riavvio effettivo del processo e la rilettura dei dati. La sola accettazione della richiesta o uno stato `SUCCESS` subito dopo non prova un riavvio.

Un worker OCR riavviato può rimettere in coda un job in corso. Per il collaudo import non effettuare deploy/riavvii concorrenti; se il processo cambia o l'esito è incerto, riconciliare il job esistente. Il budget AI in memoria e il limite di concorrenza dei job non sono un tetto globale di spesa o una garanzia globale di assenza di retry. La revoca delle sessioni simulator è in memoria nella base M: la verifica di logout vale per il processo osservato, non prova revoca durevole attraverso un restart.

Quando l'utente deciderà di preparare la produzione, partire dalla release development allora verificata, predisporre destinazioni e credenziali proprie e qualificare il nuovo ambiente. Questa fase futura richiederà una richiesta separata; nessuna promozione automatica è inclusa nel development.
