# Data Model — 015 Agnos AI unificato

## Nuove entità persistite

### AiAuditEvent (nuovo modello Prisma — migrazione ADDITIVA)

| Campo        | Tipo                        | Note                                                                                             |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------ |
| id           | String @id @default(cuid()) |                                                                                                  |
| requestId    | String                      | correlazione con log runtime                                                                     |
| operatorId   | String                      | identità operatore validata server-side                                                          |
| operatorRole | String                      | ruolo dichiarato dall'header (forense)                                                           |
| patientId    | String?                     | null per azioni cross-patient / rifiuti generici                                                 |
| actionType   | String                      | nome azione dal catalogo, o `refused_delete`, `refused_clinical`, `refused_forbidden`, `unknown` |
| kind         | String                      | `read` \| `create` \| `update` \| `refusal`                                                      |
| channel      | String                      | `testo` \| `voce`                                                                                |
| fields       | String[]                    | SOLO nomi campo, MAI valori (PHI-safe)                                                           |
| outcome      | String                      | `ok` \| `denied` \| `error` \| `deduped` \| `empty`                                              |
| createdAt    | DateTime @default(now())    | indice per consultazione temporale                                                               |

Indici: `@@index([operatorId, createdAt])`, `@@index([patientId, createdAt])`, `@@index([outcome])`.

Vincoli: nessuna FK verso Patient/Operator (l'audit sopravvive alla cancellazione dei referenti; ids restano come stringhe). Nessuna retention automatica in questa release.

## Entità esistenti riusate (nessuna modifica schema)

- **Appointment** (schema.prisma:172): id, patientId, operatorId, createdByUserId, data/ora slot, status (SCHEDULED/...). CRU via `appointment-service`; Delete solo route UI.
- **Cartella JSON** (`parametriVitali`), **PatientDiaryEntry**, **PatientNarrativeSection**, **Patient** (campi anagrafici whitelisted): già scritti da `write-services.ts`, invariati.

## Entità runtime (non persistite)

### AgnosAction (entry del catalogo allowlist)

```
name: string                 // es. create_vital_sign
kind: 'read'|'create'|'update'   // 'delete' NON esiste nel tipo
entity: string               // vital_sign | demographics | narrative | diary | appointment | query
enabled: boolean             // deny-by-default: assente ⇒ rifiutata
description: string          // per consultazione/ispezione
```

Catalogo v2: 12 read (tool gateway esistenti) + 6 write: `create_vital_sign`, `update_patient_demographics`, `update_narrative_section`, `add_diary_note`, `create_appointment`, `update_appointment`.

### AgnosPlan (estende ActionPlan esistente — `backend/src/ai/voice/types.ts`)

Aggiunte: `channel: 'testo'|'voce'`; actionType ampliato con `create_appointment`, `update_appointment`; ambiguità appuntamento (operatore/slot mancante, conflitto slot in preview come warning bloccante se sovrapposto).

### Stato transizioni comando (invariato dal flusso voce, ora condiviso)

`input → plan → [read: risposta diretta] | [write: preview → attesa-conferma → esecuzione → completato]`; rami: `ambiguo` (conferma disabilitata), `rifiutato` (refusal + audit), `errore`.
