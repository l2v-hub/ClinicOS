# PO-10 — Contratto backend di preparazione

Stato: handoff del contratto DTO/API già proposto a root, senza nuova analisi o implementazione. GO applicativo soltanto dopo PO09 verificata. Nessun sorgente applicativo o Prisma modificato.

Decisione: consentita da root la sola persistenza di questo documento nel worktree `C:/Workspace/ClinicOSHouse-worktrees/po08-handover-backend`. Root possiede integrazione, dipendenze, asset e pubblicazione. La claim di preparazione viene rilasciata dopo salvataggio e hash; la ricevuta del rilascio resta nella conversazione, senza creare altri file.

Fonti lette nel worktree root `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications`:

- `artifacts/task-validation/po-10-painad/task-contract.md`
- `docs/product/specifiche-moduli-2026-09-22.md`
- `docs/product/note-implementazione-piano-2026-09-23.md`
- `artifacts/task-validation/po-10-painad/source-text/painad.txt`
- `artifacts/task-validation/po-10-painad/source-text/provenance.md`

Questo handoff non è una convalida clinica indipendente. Riusa l'audit delle fonti già disponibile e definisce il contratto concreto per la preparazione frontend dopo PO09.

## Versioni e DTO

Usare `type: "painad"` e `formVersion: "painad-it-2026-09-22-v1"`, legata al PDF SHA256 `2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1`. Le sole correzioni editoriali restano quelle documentate: “osservazionale” e “consolare”.

```ts
type PainadValue = 0 | 1 | 2 | null;

interface PainadAnswers {
  respiration: PainadValue;
  negativeVocalization: PainadValue;
  facialExpression: PainadValue;
  bodyLanguage: PainadValue;
  consolability: PainadValue;
}

interface AssessmentDto {
  id: string;
  patientId: string;
  type: "painad";
  formVersion: "painad-it-2026-09-22-v1";
  status: "draft" | "final";
  version: number; // CAS; incremento solo per modifica/finalizzazione
  assessedAt: string; // istante UTC ISO, visualizzazione Europe/Rome
  createdAt: string;  // prima registrazione
  updatedAt: string;
  finalizedAt: string | null;
  author: { operatorId: string; name: string };
  answers: PainadAnswers;
  answeredCount: number;
  result: null | {
    total: number;
    band: "none" | "mild" | "moderate" | "severe";
    label: string;
  };
  predecessorId: string | null;
  correctionReason: string | null;
  correctedById: string | null; // derivato dal successore finale
  finalSnapshot: AssessmentSnapshot | null;
  pdf: null | {
    status: "pending" | "ready" | "failed";
    documentId: string | null;
    errorCode: string | null;
    retryAvailable: boolean;
  };
}
```

Tutte le cinque chiavi sono obbligatorie; `null` significa risposta assente. `result` resta `null` fino al completamento, anche per una bozza. Le fasce sono 0, 1–3, 4–6, 7–10. Risposte, score, autore e identità non vengono ricavati da descrizioni inviate dal client.

`formVersion`, `version`, `snapshotVersion: 1` e `rendererVersion` sono distinti. Nessun endpoint di catalogo aggiuntivo necessario: frontend e backend riusano una definizione statica versionata con le quindici alternative complete.

`AssessmentSnapshot` è il contenuto finale descritto nella sezione Persistenza: versione snapshot, identità PO06, autore, date, fonte/versione, cinque item con etichette e descrizioni selezionate, risultato e rettifica.

## API proposta

Base: `/patients/:patientId/assessments`. Autenticazione, scope corrente e `private, no-store` su tutte le operazioni.

| Operazione | Input e risposta |
|---|---|
| `POST /` | `{requestId,type,formVersion,assessedAt,answers,predecessorId?,correctionReason?}` → `{assessment,requestId,replayed}`; **201** nuova bozza, **200** replay |
| `GET /` | `type=painad`, `status=all\|draft\|final`, `limit` default 25/max 100, `cursor?`, `from?/to?` come date Europe/Rome → `{items,pageInfo:{loadedCount,hasMore,nextCursor}}` |
| `GET /:id` | `{assessment}` |
| `PATCH /:id` | `{expectedVersion,assessedAt,answers,correctionReason?}`; intero stato editabile della bozza → `{assessment}` |
| `POST /:id/finalize` | `{requestId,expectedVersion}`; finalizza le risposte già salvate → `{assessment,requestId,replayed}`, **200** |
| `POST /:id/pdf/retry` | `{}` → `{assessment}`, **200**; `ready` restituisce il documento esistente, lease attiva restituisce `pending` |

Per lo storico è proposto ordine stabile sulla registrazione `(createdAt DESC,id DESC)`, mostrando separatamente `assessedAt`. Il cursore è bounded, massimo 1.024 caratteri, e lega paziente, attore/scope, tipo, stato e filtri. Niente risposte complete, snapshot o bytes nelle righe dello storico: `items` contiene solo metadata, avanzamento, risultato e stato PDF.

Validazioni: `requestId` UUID, ID paziente conforme al parser esistente, `expectedVersion` intero positivo, istante UTC canonico valido, motivo di rettifica trim 1–1.000 caratteri. Corpo massimo 16 KiB; campi sconosciuti rifiutati. Il motivo è obbligatorio solo con predecessore.

Errori espliciti:

- **400** `assessment_invalid_input` / `assessment_invalid_cursor`.
- **404** `assessment_not_found`, anche per bozza altrui o fuori scope.
- **409** `assessment_request_conflict`, `assessment_version_conflict`, `assessment_finalized`, `assessment_already_corrected`.
- **422** `assessment_incomplete`, con gli ID degli item mancanti.
- **503** `scope_unavailable` se il controllo accessi fallisce.

Il replay precede il confronto CAS: la stessa finalizzazione già riuscita deve funzionare anche con `expectedVersion` ormai precedente. Una PATCH con risposta persa si riconcilia tramite GET; non serve introdurre una ricevuta generica per ogni modifica.

## Persistenza minima

Un solo nuovo modello `PatientAssessment`, senza tabella di ricevute separata: l'assenza di cancellazione permette di conservare nella stessa riga le prove immutabili.

| Gruppo | Campi |
|---|---|
| Identità | `id`, `patientId`, `type`, `formVersion`, `authorOperatorId`, `authorName` |
| Contenuto | `answers Json`, `assessedAt Timestamptz(3)`, `status`, `version Int` |
| Date | `createdAt`, `updatedAt`, `finalizedAt?` |
| Creazione | `requestId`, `creationPayloadHash`; univoci per `(authorOperatorId,requestId)` |
| Finalizzazione | `finalizeRequestId?`, `finalizePayloadHash?`; univoci per `(authorOperatorId,finalizeRequestId)` |
| Rettifica | `predecessorId?`, `correctionReason?` |
| Finale | `finalSnapshot Json?`, `snapshotSha256?` |
| Solo PDF | `pdfStatus?`, `pdfAttemptToken?`, `pdfLeaseUntil?`, `pdfAttemptCount`, `pdfErrorCode?`, `pdfUpdatedAt?` |

Gli hash includono operazione, paziente e payload canonico iniziale; non vengono ricalcolati dalla bozza modificata. Creazione, PATCH, finalizzazione e replay ricontrollano lo scope nella transazione, proteggendo il paziente rispetto a cambi di ownership concorrenti.

Vincoli DB necessari:

- FK paziente `Restrict`; nessun DELETE delle valutazioni.
- Identità, autore, chiave/hash iniziale e predecessore immutabili.
- Una riga finale consente esclusivamente aggiornamenti dei campi operativi PDF.
- Predecessore finale dello stesso paziente/tipo; indice univoco parziale su `predecessorId WHERE status='final'`.
- CAS atomico su `id + authorOperatorId + status=draft + version`.
- Le bozze restano private all'autore, anche rispetto a manager/admin; i finali sono leggibili nel patientScope corrente.

Lo snapshot contiene `snapshotVersion`, identità PO06, autore, date, fonte/versione, cinque item con etichette e descrizioni selezionate, risultato e rettifica. Il renderer usa soltanto questo snapshot.

Precisazione sul dato disponibile: `loadOperationalIdentities` restituisce anagrafica corrente alla finalizzazione e posizione alla **giornata** ricavata da `assessedAt` in Europe/Rome. Non offre anagrafica storicizzata o reparto. Nessun reparto va dedotto dall'operatore; posizione non disponibile resta esplicita.

## PDF e guardia archivio

Aggiungere `PatientDocument.assessmentId String? @unique`, con FK composta `(assessmentId,patientId)` verso la valutazione. Categoria riservata: `patient_assessment`, assegnabile soltanto al servizio. I documenti generati non possono essere riclassificati o modificati; i documenti legacy mantengono le policy correnti.

Il flusso è:

1. Commit del finale con `pdfStatus=pending`.
2. Acquisizione atomica di token e lease; un tentativo per richiesta.
3. Rendering fuori transazione.
4. Transazione che verifica ancora token/lease, inserisce bytes/SHA/documento e porta lo stato a `ready`.
5. Fallimento: stesso finale, stato `failed`; processo interrotto: lease scaduta recuperabile. Callback vecchie non modificano il nuovo tentativo.

Estendere i metadata archivio con:

```ts
assessment: null | {
  id: string;
  type: "painad";
  formVersion: string;
  assessedAt: string;
}
```

Il PDF si riapre tramite l'endpoint bytes esistente. La guardia SQL deve essere applicata **prima** di limite e cursore:

```text
document.assessmentId IS NULL
OR (
  assessment.patientId = document.patientId
  AND assessment.status = 'final'
  AND paziente nel patientScope corrente
)
```

Punti verificati da aggiornare: `listPatientDocuments` — incluse `total` e `sourceMatch` —, `getPatientDocumentContent`, riclassificazione, `listPatientDocumentsForAi`, `getPatientDocumentsG` e SQL `searchDocuments`. Il contesto AI deve conservare anche la propria restrizione sui pazienti autorizzati. La categoria non sostituisce questa guardia.

## Dipendenze per l'integratore

`pdf-lib` è già presente. Serve soltanto `@pdf-lib/fontkit` più un font statico incorporabile con licenza, per esempio Noto Sans Regular e Bold se utilizzato. Asset e licenza devono entrare nel deploy: `tsc` da solo non li copia. Verificare copertura dei caratteri reali e impaginazione A4; nessun nuovo framework di code, firma o workflow digitale è necessario.
