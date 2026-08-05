# Task Contract

## Task
- Title: Paginazione liste cliniche e indici Prisma mancanti
- Slug: paginazione-liste-cliniche-e-indici-prisma-mancanti
- Type: feature
- Date: 2026-07-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

`GET /patients`, `GET /consegne`, `GET /notes` restituiscono l'intera tabella (`findMany` senza
`take`/`skip`), ordinando per `createdAt desc` senza indice su quel campo. `MedicationAdministration`
ha indici separati su `[date,fascia]` e `[patientId]` ma la query reale filtra
`patientId`+`date` insieme. `PatientDiaryEntry` ha indici singoli su `patientId`/`authorType`/
`entryDateTime` separati, la query reale filtra `patientId` e ordina per `entryDateTime`.

## Expected Behaviour

Le tre route supportano `?limit=&offset=`, opt-in: SENZA questi parametri il comportamento resta
IDENTICO a oggi (tutti i record, nessuna regressione per i chiamanti frontend esistenti, dato che
non e' verificabile in questa sessione quante righe abbiano oggi le tabelle in ambienti reali).
Quando `limit` e' presente viene comunque limitato (clamp) a un tetto massimo di 500 per evitare
richieste eccessive. Nuovi indici Prisma: `Patient(createdAt)`, `Consegna(createdAt)`,
`Nota(createdAt)`, `MedicationAdministration(patientId, date)`,
`PatientDiaryEntry(patientId, entryDateTime)`.

## Acceptance Criteria

- AC1: `GET /patients`, `/consegne`, `/notes` accettano `limit`/`offset` opzionali; SENZA
  parametri il comportamento e la risposta sono identici a oggi (nessuna regressione); con `limit`
  presente il valore e' comunque limitato (clamp) a un massimo di 500.
- AC2: `prisma/schema.prisma` include i 5 nuovi indici elencati sopra; migrazione SQL
  hand-authored presente in `prisma/migrations/<timestamp>_clinical_lists_indexes/migration.sql`
  con `CREATE INDEX` (non distruttiva, solo additiva).
- AC3: Nessuna riga di dati esistente modificata dalla migrazione (solo indici, nessun ALTER su
  colonne esistenti).
- AC4: `cd backend && npx tsc --noEmit` pulito; `npx prisma validate --schema=../prisma/schema.prisma`
  (o equivalente) conferma lo schema sintatticamente valido.
- AC5: la migrazione non e' stata applicata ad alcun database in questa sessione (nessun DB
  raggiungibile) — resta da eseguire (`prisma migrate deploy`) quando l'ambiente lo permette,
  esplicitamente tracciato come rischio residuo.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Integration | yes | Verifica che limit/offset producano il sottoinsieme atteso e che il default (nessun parametro) non superi 100 elementi — eseguibile solo con DB reale, altrimenti verificabile per ispezione dei parametri passati a Prisma. |
| API | no | Coperto da integration. |
| Playwright | no | Nessun impatto visivo diretto (le liste frontend non hanno oggi controlli di paginazione UI; il default piu' basso potrebbe nascondere righe se una lista supera 100 elementi — vedi Risks). |
| Persistence after refresh | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output tsc --noEmit / prisma validate
- contenuto della migrazione SQL generata

## Risks

- **Cambio di comportamento silenzioso per il frontend**: mitigato per design — la paginazione e'
  puramente opt-in (nessun default piu' basso), quindi nessun chiamante esistente puo' vedere meno
  dati di oggi. Resta da fare, in un task futuro, l'adozione lato frontend dei parametri
  limit/offset quando servira' davvero (non in scope qui).
- **Migrazione non testata contro un DB reale**: essendo solo `CREATE INDEX` additivi il rischio
  tecnico e' basso (nessuna perdita dati, nessun lock prolungato su tabelle di dimensioni RSA
  contenute), ma non e' stata verificata l'applicazione reale in questa sessione.
- **Nome/timestamp della cartella migrazione**: deve essere successivo all'ultima migrazione
  esistente (20260725140000) per rispettare l'ordine cronologico atteso da Prisma.

## Gate Status

READY FOR IMPLEMENTATION
