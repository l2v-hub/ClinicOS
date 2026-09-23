# PO-05 — Contratto sessione di importazione v1

Data 23 settembre 2026. Baseline `ef562bf51f296153ff0ec51ed6ab620da8e2dc1a`.
Implementazione autorizzata dal coordinatore dopo PO-04 online. Backend/schema/test: worktree `po05-import-runtime`; frontend: `po05-scan-ui`; Python: `po05-runtime-recovery`; manifest, lockfile, integrazione e pubblicazione: root.

## Invarianti

- Una sessione contiene originali immutabili e pagine con ID stabile; ogni pagina appartiene esattamente a una lettera/gruppo.
- Un PDF originale viene contato realmente e può fornire pagine a gruppi diversi. `sourcePageNumber` è **1-based**. JPEG/PNG hanno una pagina. La scansione corrente può continuare a produrre un PDF singolo.
- Ordine dei gruppi e ordine delle pagine nel gruppo sono espliciti. Il riordino non cambia ID pagina né byte originali.
- OCR per pagina, estrazione per gruppo, poi `mergeExtractions` esistente. Nessuna lettera vincitrice implicita, nuova fusione di terapie o nuova UX di fonte unica.
- Risultati discordanti restano candidati con provenienza; consultare una lettera non risemina la bozza. Conferma richiede decisione esplicita per ogni conflitto corrente.
- Una pagina fallita resta visibile; le altre e i loro checkpoint non vengono cancellati. `review_ready` richiede tutte le pagine e i gruppi correnti completi, senza troncamento.
- Nessun byte clinico nel local storage. Il client salva soltanto ID sessione/chiave idempotenza associati all'operatore.

## PublicJob additivo

Le proprietà attuali di `PublicJob` e `documents` rimangono. `documents` contiene metadata degli originali attualmente referenziati, mai `dataBase64`, percorsi locali, token worker o testo OCR. `fileCount/totalFiles` contano originali; `completedFiles` conta originali le cui pagine attive hanno OCR riuscito. La nuova UI usa `progress` per pagine/gruppi.

```ts
type UnitStatus = 'pending' | 'running' | 'completed' | 'failed';
type PublicImportPage = {
  id: string;
  documentId: string;
  sourcePageNumber: number;
  groupId: string;
  sortOrder: number; // 0..N-1 nel gruppo
  status: UnitStatus;
  canRetry: boolean;
  errorCode: string | null;
  error: string | null; // messaggio sanitizzato
};
type PublicImportGroup = {
  id: string;
  label: string; // 1..80 caratteri
  sortOrder: number;
  status: UnitStatus;
  pageCount: number;
  completedPages: number;
  errorCode: string | null;
  error: string | null;
  pdfUrl: string | null; // endpoint autenticato, non URL pubblico firmato
};
type PublicJobV1Additions = {
  capabilities: { sessionVersion: 1; pageEditing: true; atomicReplacement: true };
  manifest: {
    version: 1;
    revision: number;
    groups: PublicImportGroup[];
    pages: PublicImportPage[];
  };
  limits: {
    maxPages: number;
    maxSourceFiles: number;
    maxGroups: number;
    maxTotalBytes: number;
    maxFileBytes: number;
    maxFilesPerRequest: number;
    maxRequestBytes: number;
    acceptedMimeTypes: string[];
  };
  progress: {
    phase: 'documents' | 'ocr' | 'extraction' | 'review' | 'error';
    totalPages: number;
    completedPages: number;
    failedPages: number;
    totalGroups: number;
    completedGroups: number;
    currentPageId: string | null;
    currentGroupId: string | null;
  };
  review: {
    manifestRevision: number | null;
    resultHash: string | null;
    unresolvedConflicts: number;
    canProceed: boolean;
    draftId: string | null;
    draftSourceIsCurrent: boolean;
  };
};
```

Ogni `PublicDocument` aggiunge `pageCount` e `contentUrl`. La pagina usa il contenuto originale e `sourcePageNumber` per PDF.js; non servono miniature persistenti aggiuntive. GET metadata seleziona campi espliciti e stato/hash dei checkpoint, mai payload clinici.

Valori iniziali di collaudo: 30 pagine, 30 originali, 30 gruppi, 25 MiB di originali attivi. La UI invia un file per richiesta; il server può mantenere fino a 10 file/request per compatibilità, con **25 MiB aggregati di file/request**, non 25 MiB per ogni file. `maxRequestBytes` include un margine multipart esplicito di 256 KiB. Questi limiti sono distinti dal limite JSON/base64 runtime; i valori definitivi si fissano dopo misure 30 pagine/3×10. Il limite aggregato deve fermare l'allocazione, anche senza Content-Length.

## Mutazioni e risposte

Base autenticata esistente: `/ai/extraction/jobs`. Ownership resta quella corrente; ID estranei e inesistenti danno 404. Tutte le mutazioni V1 sono serializzate con lock sul job. Gli ID del client sono opachi, limitati e validati; etichette e indici sono validati al confine.

| Endpoint | Corpo/risposta V1 |
|---|---|
| `POST /` | `Idempotency-Key` obbligatoria per nuovo client; JSON `{sessionVersion:1}`. `201 {job,outcomes:[]}`. Replay stesso operatore ritorna stessa sessione. |
| `GET /:id` | `200 PublicJob`, metadata soltanto. Resume non ricarica byte clinici nel DB/API. |
| `POST /:id/files` | Multipart `files` + `metadata` JSON `{requestId,expectedRevision,groupId,items:[{clientFileId}]}`. Items allineati ai file per posizione, non per filename. `200 {job,outcomes}`. |
| `PUT /:id/manifest` | `{requestId,expectedRevision,groups:[{id,label,sortOrder}],pages:[{id,groupId,sortOrder}]}`. ID pagina devono essere esattamente quelli attivi: omissione non significa cancellazione. Gruppi nuovi ammessi, gruppo eliminabile soltanto se vuoto. `200 PublicJob`. |
| `DELETE /:id/pages/:pageId` | JSON `{requestId,expectedRevision}`. Rimuove il riferimento pagina e libera un originale solo quando nessun'altra pagina lo usa. `200 PublicJob`. |
| `POST /:id/pages/:pageId/replace` | Multipart un solo file + `metadata` `{requestId,expectedRevision,clientFileId}`. Il nuovo file deve contenere una sola pagina. Mantiene pagina ID/gruppo/ordine; cambia riferimento originale atomicamente. `200 {job,outcomes}`. |
| `GET /:id/files/:docId/content` | Byte originali verificati per lunghezza/SHA; Content-Type corretto, Content-Disposition inline con filename sanitizzato, Cache-Control private/no-store. |
| `GET /:id/groups/:groupId/pdf` | PDF composto nell'ordine corrente; header `X-Import-Revision`. Stesso scope proprietario; client scarta risposta appartenente a revisione superata. |
| `POST /:id/process` | `{expectedRevision}`. `202 PublicJob + message`; invio ripetuto della stessa revisione queued/attiva è idempotente. |
| `POST /:id/retry` | `{expectedRevision,pageIds?:string[],groupIds?:string[]}`. Solo unità fallite indicate, oppure tutte le fallite. Le dipendenze riuscite restano; gli estrattori dei gruppi coinvolti vengono ricalcolati solo quando cambia il relativo input. |
| `POST /:id/reopen` | `{expectedRevision}`. Invalida token/lease della run e ritorna alla fase documenti; conserva originali/checkpoint validi/bozza modificata. |
| `POST /:id/cancel` | Eliminazione esplicita sessione; invalida prima run/token e poi pulisce. Chiudere il modal non chiama questo endpoint. |
| `GET /:id/result` | Mantiene `{status,model,resultData}` e aggiunge nel risultato i campi gruppi/provenienza descritti sotto. |
| `PUT /:id/review` | `{manifestRevision,resultHash,decisions:[...]}`; registra decisioni sul risultato esatto. Risposta `{job,review}`. |

`FileOutcome` mantiene filename/status/documentId/reason/message e aggiunge `{clientFileId,pageIds:string[]}`. Anche `duplicate` restituisce documentId/pageIds esistenti. Una nuova chiave per gli stessi byte non duplica documento o pagine; file con nome uguale e byte diversi rimangono distinti. Il client usa i pageIds restituiti.

La ricevuta idempotente viene verificata **prima** del CAS revisione: replay di una richiesta già applicata ritorna gli stessi outcomes e il PublicJob corrente. Stessa requestId con azione/digest differente: `409 idempotency_conflict`. Revisione vecchia senza ricevuta corrispondente: `409 {code:'revision_conflict',error,currentRevision,job}` senza mutazioni. Una nuova operazione dopo il refresh usa nuova requestId; non riusa la chiave di un invio fallito semanticamente.

Caricamento batch conserva gli outcomes per file validi/rifiutati esistenti; incremento revisione unico se cambia la sessione. Replacement è tutto-o-niente: conteggio pagine invariato, bytes/file al netto soltanto degli originali che diventano completamente non referenziati. Non si sconta 1/30 del peso di un PDF ancora usato dalle altre 29 pagine. Vecchia pagina/originale restano integri se validazione o transazione fallisce; cleanup disco solo dopo commit e solo per path verificati.

## Risultati, conflitti e passaggio alla bozza

Ogni gruppo completo produce un `DocResult` esistente con `docId=groupId`, filename=label, data validata del gruppo e modello. Una sola chiamata `mergeExtractions(allGroupResults)` conserva le sue semantiche e tutti i candidati. Il risultato aggiunge:

```ts
type GroupResult = {
  groupId: string; label: string; pageIds: string[]; inputHash: string;
  model: string; _full: unknown; _narrative: unknown;
  rawText: string; cleanedRawText: string; _sections: unknown;
};
type ConflictDecision =
  | { conflictId: string; action: 'select'; candidateId: string }
  | { conflictId: string; action: 'defer' };
// resultData mantiene _merge/anagrafica/cartella:
type ResultAdditions = {
  _source: { manifestRevision: number; resultHash: string };
  _groups: GroupResult[];
  _conflicts: Array<{
    id: string; field: string; label: string; itemKey?: string;
    candidates: Array<{
      id: string; value: unknown; displayValue: string;
      sources: Array<{
        groupId: string; label: string; model: string;
        pages: Array<{ pageId: string; documentId: string; sourcePageNumber: number }>;
        snippet?: string;
      }>;
    }>;
  }>;
  _review: { decisions: ConflictDecision[]; unresolvedConflictIds: string[] };
};
```

Gli ID di conflitto/candidato derivano da JSON canonico di campo/chiave/valore/provenienza, non da un indice UI. `resultHash` lega risultati di gruppo, ordine e versione merge. `select` deve nominare un candidato di quel conflitto; `defer` lascia la voce esplicitamente da verificare, persiste nel draft e non genera una prescrizione. Le decisioni non alterano l'evidenza grezza né cancellano gli altri candidati. `sources.pages` è l'insieme delle pagine della lettera: non si inventa l'attribuzione del singolo campo a una pagina quando l'estrazione non la fornisce.

Audit FE: non esiste un pannello generico candidati/merge. Riutilizzare ImportSectionsReview (testo/fonti/verifica) e DischargeTherapyReview (Lascia in bozza/verifica terapia); aggiungere solo il piccolo pannello candidati sopra la revisione. Nessun merge lato client. `_review` restituisce sempre le decisioni persistite per il reload. Etichetta e displayValue sono proiezioni leggibili, il valore originale resta invariato e non viene troncato semanticamente.

La narrativa complessiva conserva testo di **tutte** le lettere, separate da provenienza, mentre `_groups` permette consultazione separata. Non basta mostrare quella narrativa: unresolvedConflicts deve essere zero prima di procedere. Per una sola lettera i campi legacy `_full`, `_narrative`, `_sections`, rawText restano equivalenti al comportamento attuale. Per più lettere nessun `_full` può essere copiato implicitamente dal primo/ultimo gruppo.

Draft data conserva `_importSource:{manifestRevision,resultHash,reviewHash,groupHashes}` e `_importReview` con le decisioni. `from-import` e conferma verificano la sorgente contro il job. La conferma V1 richiede una bozza ed accetta `_importSource:{manifestRevision,resultHash}` nel payload. Il draft già modificato non viene riseminato automaticamente: `409 import_review_outdated` conserva tutti i dati.

Decisione finale autorizzata: `POST /intake/drafts/:id/refresh-import` con `{requestId,expectedDraftVersion,manifestRevision,resultHash}`, azione UI “Rivedi le nuove pagine”. Richiede revisione corrente senza conflitti irrisolti. Preserva anagrafica, tutte le sezioni manuali, tutte le terapie manuali e `reviewedTherapy`. Le righe con gruppo/hash invariato conservano la verifica; quelle con sorgenti modificate diventano `sourceOutdated:true,stato:'da_verificare'`. I dati originali e la loro provenienza non vengono sovrascritti. Identiche righe da più lettere mantengono `importSources`; cambiare ordine dei gruppi non genera proposte duplicate.

Le nuove righe rimangono `_importProposals:[{id,groupId,inputHash,row,kind:'new'|'changed',status:'pending'|'added'|'deferred'}]`. `POST /intake/drafts/:id/import-proposals/:proposalId/decide` con `{requestId,expectedDraftVersion,action:'add'|'defer'}` gestisce una proposta una sola volta; solo `add` appende una riga da verificare. Una proposta già presente non può duplicare la terapia. Le decisioni di conflitto rinviate rimangono escluse da prescrizioni, anche se il client tenta di modificare il flag.

Ogni risposta bozza contiene `version:number`, inizialmente0. PATCH mantiene payload piatto con `expectedDraftVersion` obbligatorio per V1 e `requestId` opzionale. I due campi sono rimossi prima del merge. Ogni PATCH/refresh/decisione riuscita incrementa la versione; replay identico non la incrementa e restituisce la bozza corrente. Un CAS vecchio fallisce409 con `currentVersion` e bozza corrente. Senza requestId PATCH usa una chiave derivata da draft/version. `_narrative`, `_sections`, `_terapiaText`, `_confirmation`, `_importedFields`, `_importSource`, `_importReview`, `_importProposals` e provenienza riga sono gestiti dal server. `_accepted` resta editabile.

La verifica esplicita di una riga superata richiede PATCH con `sourceOutdated:false`, `sourceReviewHash:resultHash corrente`, `stato:'ok'` e `reviewedTherapy`; la sorgente della bozza deve già essere corrente. Una riga superata inclusa blocca conferma. Cancel elimina payload temporanei, originali, checkpoint e ricevute della sessione; una bozza esistente resta conservata ma non confermabile da quella sessione. Chiusura modale conserva tutto. Mutazioni riuscite/process/review/refresh e heartbeat corrente rinnovano la scadenza; GET non la rinnova. Expiry ignora lease ancora valide e invalida fencing prima della pulizia.

## Migrazione minima e checkpoint

Migrazione additiva, senza backfill di byte/PDF durante deploy:

- ImportJob: `manifest Json?`, `resultSummary Json?`, `manifestRevision Int @default(0)`, `maxPages Int?`, `runToken String?`, `runRevision Int?`, `leaseExpiresAt DateTime?`; indice su stato/lease. Decisioni nel resultData controllato dal server; resultSummary permette GET senza leggere risultati clinici.
- PatientIntakeDraft: `version Int @default(0)` per CAS/replay degli aggiornamenti.
- ImportDocument: `pageCount Int?`. SHA/byte esistenti riusati; nessuna mutazione del contenuto di un originale ancora referenziato.
- ImportProcessingUnit: id, jobId/FK cascade, kind `ocr|extraction`, unitKey (pageId/groupId), inputHash, outputHash nullable, status, runtimeJobId nullable, runtimeAttempt Int, result Json?, errorCode/message sanitizzati, updatedAt; unique `(jobId,kind,unitKey,inputHash)` e indice job/stato. Payload OCR/estrazione esclusi da GET metadata.
- ImportMutation: id, jobId/FK cascade, requestId, action, requestHash, resultingRevision, outcomes Json, createdAt; unique `(jobId,requestId)`. Ricevuta e mutazioni atomiche sotto lock job.
- PatientDocument: `sourceManifest Json?` per kind, groupId, manifestRevision, membri pagina/originale e hash sorgente, distinto dai byte già presenti. IDs deterministici `import-<originalId>` e `import-group-<jobId>-<groupId>` evitano duplicati; job confermato immutabile.

Il manifest persistito contiene soltanto identità/gruppo/ordine e riferimenti, non stati di elaborazione. Gli stati pubblici sono proiettati dai checkpoint corrispondenti agli hash correnti. L'hash OCR include SHA sorgente, pagina, versione split e contratto/prompt; l'hash estrazione include testo OCR completo ordinato, pagine/gruppo e versioni schema/prompt. Riordinare riusa OCR ma invalida soltanto estrazioni dei gruppi cambiati.

Il worker acquisisce job queued con CAS, assegna runToken casuale, runRevision e lease; rinnova lease durante polling. Ogni aggiornamento job/checkpoint verifica token, revisione e lease ancora corrente sotto lock/CAS. Reopen/modifica/cancel cambiano revisione o token prima di restituire; un vecchio worker non può scrivere successo né errore. Recovery reclama soltanto lease scadute, non tutte le run attive. La concorrenza della singola unità è seriale per job; secondo worker non avvia provider con un claim perso.

I byte vengono caricati dal DB per l'originale corrente, verificando lunghezza, SHA e descrittore iniziale. Disco è fallback verificato per import legacy, mai prerequisito. Un solo originale verificato/PDF parsed è mantenuto nella cache locale della run, espulso prima di leggere il successivo e azzerato in finally. PDF di pagina usa metadata deterministici, così un replay produce gli stessi byte. L'estrazione di gruppo passa `validateExtraction` prima del checkpoint e del merge.

## Contratto runtime concordato con worker Python

- `external_job_id=po05:<jobId>:<kind>:<unitId>:<inputHash>`; nuovo `input_hash` 64 hex attiva dedup. Vecchio external_job_id senza hash resta legacy.
- Create stessa chiave/hash/**fingerprint reale prompt/schema/files** restituisce stesso job; riuso incompatibile 409. Prima di run il backend verifica echo input_hash e attempt intero non negativo; runtime vecchio che ignora campi nuovi viene fermato prima del provider.
- `/run` fissa mode alla prima esecuzione; stessa mode torna stato corrente senza nuova task anche in stato terminale, mode diversa 409.
- `/retry {expected_attempt:N}` avanza una sola volta; replay dopo avanzamento torna tentativo corrente, numero futuro 409. Backend persiste runtimeJobId e prossimo attempt prima di run/retry: richiesta persa conserva il CAS del tentativo atteso. Poll e result devono restituire esattamente quell'attempt e input_hash.
- Status/result aggiungono input_hash, attempt, finish_reason nullable, truncated boolean. `output_truncated`/`output_incomplete` sono fallimenti non ritentabili; data=null. Nessun merge/checkpoint di successo se truncated o status diverso da review_ready.
- Runtime 404 dopo riavvio: ricreare medesima unità; provider può rieseguire una chiamata non ancora registrata. Nessuna promessa exactly-once del provider, nessun duplicato applicativo.
- Capabilities additiva `document_job_contract_version:2` e, se disponibile, max_upload_bytes. Il backend misura il JSON effettivo con base64 e metadata prima invio; 413 rimane autorevole. Pagina troppo grande fallisce esplicitamente conservando le altre.

## Archivio atomico

Preparare PDF per gruppo e verificare originali/SHA prima della transazione di conferma. Riutilizzare il PDF originale se gruppo equivale esattamente a tutte le sue pagine in ordine. Dentro la transazione esistente job→draft→patient: verificare revisione/hash/decisioni, persistere originali attivi e PDF di gruppo nell'archivio corrente con provenance, poi confermare. Un errore di integrità/archiviazione annulla tutto. Replay conferma verifica gli stessi ID; nessun secondo paziente/documento/terapia. Gli originali non più referenziati per rimozione esplicita non appartengono al documento finale.

## Retrocompatibilità di deploy

Nuovo client opt-in `sessionVersion:1`; server espone capabilities. Vecchi job senza manifest continuano attraverso adapter legacy, senza fingere conteggi PDF verificati. Formati storici oltre PDF/JPEG/PNG restano nel percorso legacy; la UI V1 mostra soltanto i MIME realmente supportati per editing per pagina. Migrazione additiva → runtime con nuovo contratto → backend → frontend; feature operativa solo quando echo runtime è valido.

Le repliche vecchie non devono elaborare sessioni V1: usare stati DB interni distinti (`queued_pages`, `processing_pages`) proiettati negli stati PublicJob esistenti, oppure deployment con drain verificato del vecchio worker prima di accodarle. Root decide il gate e non viene assunto un rolling upgrade atomicamente sicuro. Le route legacy reorder/logical/remove possono adattare solo operazioni esprimibili sui documenti interi; modifiche ambigue su pagine separate danno 409, senza perdita dati.

## Prove senza provider

- Unit: manifest validato, conteggio PDF reale, ordine/retake, hash e dipendenze, invarianti di limite/idempotenza, conflitti/candidati/decisioni e protezione revisione.
- PGlite con migrazioni reali: 30 JPEG/PDF-page, PDF da 30 pagine, tre lettere da 10, file stesso nome/byte diversi, retry dopo risposta persa, retake a pagina30, SHA corrotta, disk assente/DB presente, GET metadata privo di base64.
- Runtime fake su loopback con marcatori pagina/gruppo: pagina17 fallisce; ripresa riusa16 checkpoint; riavvio backend e runtime; risposta ritardata vecchia run dopo reorder; output troncato non completo; due claim concorrenti.
- Conferma reale: conflitti senza decisione rifiutati, defer non prescrive, decisione source-bound, archivio originale+PDF ordinato e replay senza duplicati.
- PostgreSQL locale isolato per prova reale di lock/CAS concorrente; PGlite non dimostra ogni proprietà d'isolamento PostgreSQL.
- Root: browser sintetico e build; test fisici iOS/Safari e Android/Chrome restano distinti, come accuratezza OCR/provider reale. Misurare peak RSS, byte originali/request/runtime, durata e numero chiamate sui due scenari30/3×10.

Nessuna rigenerazione Prisma attraverso node_modules condiviso: root coordina un client generato isolato prima di test schema. Nessuna credenziale/configurazione live, commit, push o deploy da questo worker.
