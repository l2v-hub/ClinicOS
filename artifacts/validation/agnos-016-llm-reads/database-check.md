# Database / Persistence Check — Agnos/016

**Ambiente**: produzione (Postgres su Railway, dietro il backend).

## Metodo
La validazione è **read-only sulla produzione** (nessuna mutazione dei dati reali).
La persistenza è verificata indirettamente ma oggettivamente: le letture di Agnos passano per il
Data Gateway (REQ-039) che interroga il DB — se i dati non fossero persistiti, la lettura sarebbe
vuota. Le scritture NON sono state testate su prod (eviterei di alterare dati reali); la loro
persistenza è coperta dai test backend (246/246) e dalle verifiche E2E su ambiente locale seed.

## Evidenze di retrieval dal DB (prod)

| Query | Risultato | Interpretazione |
|---|---|---|
| «mostra le allergie di Ugo Folli» | `intent=allergies`, **2 risultati** con `SourceReference` | il gateway ha letto 2 allergie reali dal DB del paziente risolto per nome → dati persistiti e recuperabili |
| «mostra gli ultimi parametri di Ugo Folli» | `intent=vitals_recent`, 0 risultati | paziente risolto, nessun parametro registrato per lui (dato valido, non un errore) |

## Audit persistente (design verificato)
- Modello `AiAuditEvent` (migrazione additiva `20260703225843_ai_audit_event`) su Postgres.
- **PHI-safe per costruzione**: il campo `fields` contiene solo NOMI campo, mai valori clinici
  (verificato nei test unit `backend/src/ai/__tests__/actions.test.ts` e nel codice `audit-store.ts`).
- Ogni azione (read/create/update/refusal) è registrata con operatore, paziente, esito, canale, timestamp.

## Migrazioni
- Nessuna nuova migrazione in F0/F1/F2 (solo `AiAuditEvent` da SPEC-015, già applicata da Railway
  allo start con `prisma migrate deploy`). Nessun `migrate reset`.

## Limite
Scritture (create_vital_sign, add_diary_note, ecc.) NON testate su produzione per non alterare dati
reali → persistenza coperta da test backend + E2E locali (documentati in SPEC-015/SPEC-016).
