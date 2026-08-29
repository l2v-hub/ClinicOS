# Task Validation Report

## Task

- Title: Quality loop 5 AI gateway signed context and input bounds
- Slug: quality-loop-5-ai-gateway-signed-context-input-bounds
- Branch: `codex/quality-loop-20260829`
- Commit: same commit as this report (`git rev-parse HEAD` after checkout)
- Date: 2026-08-29

## Implementation Summary

Il gateway AI interno non accetta piu' identita', ruoli o scope paziente da header indipendenti e
spoofabili. Oltre al service token richiede un envelope JSON base64url firmato HMAC-SHA256 con un
segreto distinto di almeno 32 byte, confronto constant-time, campi allowlisted e scadenza massima
di 60 secondi. Richieste mancanti, manomesse, scadute o future falliscono chiuse.

Le ricerche paziente, cliniche, documentali e correlate validano input e limiti prima del database.
ACL, testo normalizzato, codice fiscale canonico/legacy, allergie e terapie relazionali/legacy sono
in query SQL PostgreSQL parametrizzate prima del `LIMIT`; le letture successive sono batch e con
proiezioni minime. Le risposte interne sono `private, no-store`.

## Files Changed

- `backend/src/ai/gateway/context.ts`
- `backend/src/ai/gateway/validation.ts`
- `backend/src/ai/gateway/filters.ts`
- `backend/src/ai/gateway/services.ts`
- `backend/src/routes/internal-ai.ts`
- test unitari, API, concorrenza e integrazione DB del backend
- `backend/.env.example`
- contract e report del ciclo

Gli artifact runtime Ruflo e il drift preesistente di `start-claude-team.ps1` restano esclusi.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | Service token con header legacy viene respinto 401; il route test accetta solo envelope firmato. |
| AC2 | PASS | HMAC-SHA256, segreto separato >=32 byte, `timingSafeEqual`, envelope <=4096 byte e TTL <=60 secondi. |
| AC3 | PASS | Ruoli allowlisted, ID sicuri, max 100 pazienti, request ID bounded; tampering/expiry/future fail closed. |
| AC4 | PASS | Validator limita testo, token, CF, date e limit 1..50 e rifiuta ricerche vuote. |
| AC5 | PASS | ACL e filtri sono predicati SQL parametrizzati prima del `LIMIT`; scope vuoto restituisce zero righe. |
| AC6 | PASS | Query e batch selezionano solo campi necessari; nessun caricamento completo dei record paziente. |
| AC7 | PASS | Test focused 26/26, test DB 2/2, suite backend combinata chiusa, build/lint/secret scan verdi. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Build monorepo | PASS | Frontend TypeScript/Vite e backend Prisma/TypeScript completati; entry JS 134.70 KiB gzip. |
| Gateway/context/API focused | PASS | 26/26, 0 fail: firma, spoofing, input bounds, ACL, filtri e route. |
| PostgreSQL integration | PASS | PGlite temporaneo, 27 migration applicate, 2/2 test su CF/terapie legacy-relazionali, accenti, ACL, narrative, documenti e correlate. |
| Backend regression | PASS (combined evidence) | Run sequenziale iniziale 513/516; i 3 fail erano assertion obsolete su RBAC/fail-closed. Dopo aggiornamento, i file interessati passano 9/9. |
| Frontend regression | PASS | 153/153, 0 fail; frontend non modificato in questo ciclo. |
| Lint scoped | PASS | 0 errori sui file TypeScript modificati e nuovi. |
| Frontend secret scan | PASS | 0 finding in `frontend/src` e `frontend/index.html`. |
| Diff integrity | PASS | `git diff --check` pulito; nessun segreto reale nel candidato. |
| Dependency audit | KNOWN RISK | 3 high transitivi Prisma/deepmerge-ts; il fix automatico proposto richiede downgrade breaking. |

## Independent Review

La review security leggera non rileva P0/P1: firma e token sono confrontati in constant-time, il
gateway fallisce chiuso e le query sono parametrizzate. La review performance finale e' PASS dopo
aver verificato sul codice corrente che ogni ricerca paziente passa da `searchStructuredPatientRows`,
con ACL e filtri prima del limite. I precedenti finding su terapia legacy, codice fiscale legacy,
accenti e correlate/N+1 sono stati corretti e coperti dal test PostgreSQL.

## Residual Risks

- Un envelope firmato e' riutilizzabile durante la finestra massima di 60 secondi. Il gateway e'
  read-only; per future azioni mutanti servono nonce/idempotency, replay cache e audit del comando.
- `translate(lower(...)) LIKE '%...%'` puo' causare full scan su volumi elevati. Il prossimo ciclo
  deve introdurre colonne normalizzate/materializzate e indici funzionali o trigram verificati con
  `EXPLAIN ANALYZE` su un dataset rappresentativo.
- L'emittente esterno deve migrare al nuovo envelope e derivare lo scope da policy server-side. Nel
  repository non esiste un caller interno da migrare; senza configurazione il gateway rifiuta tutto.
- `services.ts` supera il limite progettuale di 500 righe e va separato per bounded context senza
  cambiare il contratto di autorizzazione.
- Il deploy production resta subordinato a credenziali Vercel e configurazione Entra reali; nessun
  esito locale viene presentato come verifica production.

## Final Decision

CLOSED — VERIFIED

Il contratto del ciclo 5 e' implementato e verificato. Il programma globale resta aperto: il ciclo
successivo rimuove il roster pazienti caricato al login e prepara l'indicizzazione delle ricerche
normalizzate su volumi elevati.
