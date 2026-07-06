# Validation Report (Evidence Remediation) — #205 Terapie rilevate come righe strutturate

- Slug: 205-terapie-rilevate-come-righe-strutturate
- Date: 2026-07-06T15:58:06Z
- Governance: Claude produce evidenza; Codex verifica e chiude. Claude NON chiude l'issue.

## Stato: BLOCKED — evidenza runtime non producibile sulla baseline verificabile

La feature "estrazione terapia da lettera di dimissioni → righe strutturate + revisione campi incerti +
salvataggio dopo conferma" **non è presente su `origin/main`**: vive esclusivamente sul branch della
**PR #158** (`156-therapy-parse-structured`), tuttora **aperta e non mergiata**. Sulla baseline
verificabile (main) esistono solo l'import testuale grezzo (`_terapiaText`) e il wiring generico
confirm→PatientTherapy — non il parser strutturato, non `data.terapiaImport`, non `DischargeTherapyReview`.

Inoltre il flusso end-to-end di estrazione richiede il servizio **clinicos-ai-runtime** (mock OCR/estrazione
Python) in esecuzione: in CI è avviato dal workflow; in locale non è parte dello stack app.

## Perché non fabbrico evidenza
Produrre uno screenshot Playwright di un flusso che sulla baseline non esiste sarebbe evidenza fuorviante.
Le acceptance criteria (righe strutturate, campi `da_verificare`, salvataggio confermato) dipendono dal
codice della PR #158.

## Sblocco richiesto (per il Codex QA gate)
1. Merge (o checkout in ambiente QA) della **PR #158**;
2. avvio del **clinicos-ai-runtime** mock;
3. quindi eseguo il test Playwright dedicato: import lettera → estrazione → righe terapia strutturate →
   revisione campi incerti → conferma → PatientTherapy, con screenshot/trace/video.

## Decisione
BLOCKED — dipende dal merge della PR #158 e dal runtime mock. Nessuna evidenza runtime prodotta sulla baseline.
