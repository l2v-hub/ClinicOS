# Task Validation Report

## Task

- Title: Quality loop 8 private bounded notes mailbox
- Slug: `quality-loop-8-private-bounded-notes`
- Branch: `codex/quality-loop-20260829`
- Date: 2026-08-29

## Implementation Summary

La route `/notes` non restituisce più la cronologia facility-wide. La mailbox è costruita nel
database dall'identità autenticata, con rami inviati/ricevuti disgiunti, limite massimo 50,
cursore stabile `(createdAt,id)`, projection esplicita, ricerca full-text indicizzata e response
`private, no-store`. Autore e nomi di destinatario/paziente sono risolti server-side; input
malformati, sconosciuti o oltre soglia falliscono prima della persistenza.

Lo stato letto/risolto è ora per mailbox tramite `NotaRecipientState(noteId,operatorId)`: leggere
un broadcast non cambia lo stato visto dagli altri operatori. Autori e ruoli privilegiati possono
gestire il contenuto; un destinatario può cambiare soltanto il proprio stato; accessi estranei
restituiscono 404 non enumeranti.

Il frontend usa filtri e ricerca server-side, pagina successiva deduplicata, summary non letti
esatto anche nella sidebar, selezione paziente bounded/autorevole, error/retry visibili e guardie
abort/session/request. Il rollback di una mutazione non può reintrodurre PHI dopo logout o dopo un
cambio filtro.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | Auth, query strict, max 50 e `private, no-store` verificati via HTTP. |
| AC2 | PASS | ACL DB; test A/B/C prova assenza di note private altrui. |
| AC3 | PASS | Keyset multi-pagina senza duplicati; summary 57 oltre la prima pagina. |
| AC4 | PASS | Spoof autore ignorato; destinatario e paziente risolti nel DB. |
| AC5 | PASS | ID/query/body/message bounded; unknown/enums invalidi restituiscono 400. |
| AC6 | PASS | Test destinatario-only, autore, outsider e manager PUT/DELETE. |
| AC7 | PASS | Server filters, load-more dedup, abort e session/request guards. |
| AC8 | PASS | Loading/error/retry distinti; pagina vuota non mostrata su errore; sidebar usa summary. |
| AC9 | PASS | Test, build, lint scoped, migration, benchmark, secret scan e review verdi. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Backend focused regression | PASS | 36/36, incluse auth, notes, patients, agenda e therapy. |
| Notes PostgreSQL/API | PASS | 3/3; privacy, keyset, FTS, malformed input, ACL e broadcast B/C. |
| Frontend regression | PASS | 170/170. |
| Backend build | PASS | Prisma generate + TypeScript. |
| Frontend build | PASS | TypeScript + Vite; entry 136.04 KiB gzip. |
| Prisma migrations | PASS | PGlite temporaneo, 29/29 migration da database vuoto. |
| Prisma validate | PASS | Schema e relazioni validi. |
| Benchmark 100k | PASS | 25 corse; soglia p95 100 ms; piani indice verificati. |
| Lint scoped | PASS | Backend notes/route e frontend component/helper: 0 errori. |
| Secret scan | PASS | 0 pattern credenziale nel diff del ciclo. |
| Diff integrity | PASS | `git diff --check`; soli warning EOL Windows. |

### Benchmark receipt

Dataset sintetico di 100.000 note, 25 letture per scenario, soglia fail-closed p95 `<100 ms`:

| Scenario | p95 | EXPLAIN execution | Indici principali |
|---|---:|---:|---|
| Prima pagina | 3.98 ms | 1.304 ms | `Nota_autoreId_createdAt_id_idx` |
| Cursore profondo 80% | 1.97 ms | 0.757 ms | autore + destinatario/createdAt/id |
| Ricerca FTS | 5.18 ms | 1.945 ms | `Nota_search_fts_idx` |
| Summary unread | 1.52 ms | n/a | mailbox/recipient-state indexes |

Il benchmark è ripetibile con `node scripts/benchmark-notes-mailbox.mjs 100000`; termina con exit
non-zero se una soglia fallisce o se i piani non usano gli indici richiesti.

## Independent Review

- Security/privacy: PASS, nessun P0/P1. Verificati ACL, non-enumerazione, stato personale,
  raw SQL parametrizzato, admin/manager e race logout.
- UX/performance: PASS, nessun P0/P1. Verificati summary globale, keyset, UNION bounded per ramo,
  indici, FTS, benchmark fail-closed, broadcast B/C e stati di errore.

Le review precedenti avevano bloccato il ciclo per badge derivato dalla pagina, rollback stale,
ricerca non indicizzata, gestione privilegiata incompleta, stato broadcast globale e piano query
non dimostrato. Tutti i finding sono stati corretti e riesaminati.

## Residual Risks

- Il benchmark locale usa PostgreSQL PGlite; prima della produzione va ripetuto sul PostgreSQL
  target con statistiche e concorrenza rappresentative.
- L'ingresso nella pagina Note può ripetere una richiesta bounded già avviata al login; è un P2 di
  efficienza, non altera dati o correttezza.
- Il deploy production globale resta bloccato finché non sono disponibili configurazione Entra
  reale e credenziali/progetto Vercel verificabili.

## Final Decision

CLOSED — VERIFIED

Il ciclo 8 chiude il leakage cross-operatore, lo spoofing dell'autore, lo stato broadcast globale e
il caricamento facility-wide delle note. Il programma globale resta aperto: il ciclo 9 affronta
`/consegne` con feed keyset e aggregati dashboard esatti.
