# Privacy, sicurezza e retention — Importa lettera di dimissione (REQ-019)

Documento operativo per il flusso AI di importazione documenti sanitari ClinicOS.
Da completare con il DPA del fornitore **prima** di trattare dati reali.

## Dati trattati

- Documenti sanitari caricati (PDF/immagini/DOCX/TXT) e relativi metadati (nome file
  sanitizzato, MIME reale, hash SHA-256, dimensione).
- Output strutturato dell'estrazione (campi clinici proposti per la revisione umana).
- Identità operatore (id + ruolo) ai soli fini di autorizzazione e audit.

## Base e minimizzazione

- Nessun paziente viene creato durante l'upload o l'estrazione: solo dopo conferma
  umana esplicita (REQ-017/REQ-018).
- I dati mancanti non vengono inventati; l'operatore valida ogni campo.

## Sicurezza

- **Autorizzazione**: gli endpoint `/ai/extraction/jobs/*` richiedono un ruolo
  operatore valido (`requireOperator`, REQ-019). Anonimo → 401; ruolo non ammesso → 403.
- **Rate limit + cost guard**: limite richieste/minuto e limite estrazioni (path a
  costo modello) per operatore; superamento → 429. Configurabili via env.
- **Validazione file**: MIME reale via magic bytes (no fiducia a estensione/Content-Type),
  filename sanitizzato (no path traversal), limiti per-file e totali, dedup SHA-256.
  I file non vengono mai eseguiti.
- **Segreti**: `GEMINI_API_KEY` solo nel secret manager Railway, mai nel repository,
  nei bundle frontend o nei log. Hook di scansione segreti in CI (REQ-020).
- **Log**: nessun contenuto clinico completo e nessun segreto nei log; mascheramento
  via `redact.ts`. La risposta grezza del modello non viene persistita né loggata.

## Retention e cancellazione

- Storage temporaneo su disco con permessi `0600`, sotto `AI_UPLOAD_DIR`.
- Retention configurabile (`AI_JOB_RETENTION_MIN`, default 60'); sweep periodico
  elimina job scaduti (righe DB + file su disco).
- Cancellazione manuale del job (`POST :id/cancel`) rimuove file e azzera i byte.
- Eliminazione lato provider: non applicabile con invio inline; da rivedere se si
  passa alla File API del provider.

## Audit

- `ImportAudit` registra: `job_created`, `files_added`, `process_started/completed/
failed`, `job_cancelled`, `confirm_started`, `patient_created`, `confirm_committed`,
  `duplicate_flagged`, `confirm_failed` — con operatore e linkage job↔paziente↔documenti.
  Nessun contenuto clinico nel dettaglio.

## Configurazione (env, server-side)

- `AI_RATE_LIMIT_PER_MIN` (default 60), `AI_MAX_EXTRACTIONS_PER_5MIN` (default 10)
- `AI_UPLOAD_DIR`, `AI_JOB_RETENTION_MIN`, `AI_MAX_FILES`, `AI_MAX_TOTAL_MB`
- `AI_PROVIDER`, `AI_MODEL`, `GEMINI_API_KEY` (segreto), timeouts/retry.

## Test

- Solo documenti **sintetici**; nessun dato reale o identificativo in test, log,
  screenshot, issue o commit.

## TODO prima dei dati reali

- [ ] Firmare/allegare il DPA del fornitore del modello.
- [ ] Definire titolare/responsabile del trattamento e tempi di conservazione legali.
- [ ] Valutare hook antivirus sull'upload se disponibile nell'ambiente.
- [ ] Sostituire il role-gate con identità verificata quando esiste un IdP.
