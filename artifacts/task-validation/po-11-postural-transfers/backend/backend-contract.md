# PO11 — Contratto backend pronto per il GO

Preparazione soltanto. Worktree assegnato: `C:/Workspace/ClinicOSHouse-worktrees/po11-transfers-backend`, branch `codex/po11-transfers-backend`, baseline `d659c1b459eb72a2920cbd9f678a2c11f9bf7efd`. Root autorizza runtime privato, ricevute e piano; nessuna implementazione applicativa prima del GO dopo PO10 pubblicata/verificata.

Fonte normativa: `task-contract.snapshot.md`, copia esatta del contratto nel commit. Il frontend ha confermato esplicitamente questa proposta nella conversazione. Qualsiasi modifica successiva al contratto root prevale su questo documento.

## DTO e snapshot

- `AssessmentDto = PainadAssessmentDto | TransfersAssessmentDto`; discriminanti `type` e `formVersion`. PAINAD mantiene forma, versione e snapshot v1 esistenti.
- Transfers: `postural_transfers`, `transfers-it-2026-09-22-v1`, risposte strutturate dal contratto, `completion: {complete, missingPaths}`, `result: null`, nessun `answeredCount`.
- Dettaglio con `snapshotSha256: string|null` server-authoritative. Errori422 Transfers con `missingPaths` strutturati; gli errori PAINAD conservano `missingItems`.
- Snapshot Transfers: campi comuni immutabili (identità, autore, date, fonte/versione/hash, predecessore/motivo), `sections[{id,label,rows:[{path,label,value:string}]}]`, `result:null`, `signatureLabels`. Preservare gli a capo. Etichette/valori di presentazione derivano dal server; renderer esclusivamente dallo snapshot.
- Archivio e deep-link usano `{id,type}`. `PatientDocument.assessment.type` e PDF dispatch non assumono PAINAD.

## Endpoint

Base `/patients/:patientId/assessments`; autenticazione, current patientScope e cache private/no-store invariati.

| Endpoint | Contratto |
|---|---|
| POST base, GET/:id, PATCH/:id, POST/:id/finalize, POST/:id/pdf/retry | Involucro PO10 e codici esistenti; parser per type/version persistiti, CAS e ricevute iniziali immutabili |
| GET base | Tipo applicato prima di limite/cursore; default storico PAINAD preservato. UI invia sempre tipo esplicito; default25/max100 e scope nella binding |
| GET /current?type=postural_transfers | `{assessment: FinalAssessmentDto|null}`; assenza di finale visibile produce null, fuori scope404 |
| GET /:id/attestations?limit=25&cursor=... | `{assessmentId,snapshotSha256,correctedById,items,pageInfo,counts,me:{registeredQualification,allowedKinds,attestedKinds}}`; max100, cursore legato ad assessment/paziente/attore/scope |
| POST /:id/attestations | `{kind,snapshotSha256}` → `{attestation,replayed}`,201 nuova/200 replay; la ricevuta identifica assessmentId/hash/kind |

`kind = physiotherapist_confirmation | operator_acknowledgement`. Nessun requestId ulteriore: unicità naturale `(assessmentId,kind,actorId)`. Conteggi, eventi personali e permessi si riferiscono allo stesso assessment/hash. Nessun autore/nome/qualifica/istante client ammesso. Hash diverso409.

Current seleziona le foglie finali delle catene: esclude predecessori con successore finale prima di LIMIT, filtra paziente/tipo/scope, ordina `assessedAt DESC, createdAt DESC, id DESC`. Una bozza di rettifica non rimpiazza il finale; una rettifica tardiva con data clinica vecchia non supera una valutazione più recente. La data della rettifica viene inizializzata da quella del predecessore. Non ricavare current dalla prima pagina dello storico.

## Conferme e persistenza

Evento separato append-only: id, assessmentId, snapshotSha256, kind, actorId, nome e qualifica registrata al momento, timestamp server. Unicità DB e controllo finale/hash; UPDATE/DELETE vietati. Non trasferire eventi al successore e non rigenerare il PDF dopo una conferma. `correctedById` informa sull'eventuale rettifica del finale attestato.

Scope e stato finale controllati nella transazione. Per una nuova conferma fisioterapista leggere la riga operatore nel DB sotto lock: qualifica normalizzata trim/lowercase esattamente `fisioterapista`. Ruolo/reparto/nome client non conferiscono qualifica. Presa visione per operatore autenticato nel patientScope. Nessun numero minimo di conferme blocca la finalizzazione.

Le modifiche Prisma/SQL dopo GO dovranno discriminare validazione PAINAD/Transfers e preservare i vincoli dei finali esistenti; nuova risorsa attestazioni con prove DB di immutabilità e legame all'hash. Root mantiene proprietà di package/lockfile, build integrata e release.
