# BUG-049 (#71) — Production verification

Date: 2026-06-25
Prod backend: https://clinicos-backend-production-df88.up.railway.app (health 200)
Fix commit: 996d41b "BUG-048/049: source refs in markdown path + durable in-DB import bytes" — ancestor of main HEAD.

## Verdict: PASS (backend) — BLOCKED-on-PHI for full end-to-end closure

Backend fix is LIVE on prod. The forbidden step (confirming an import = creating a real patient
on the PHI prod DB) was NOT executed, so the persistence-after-confirm acceptance criteria are
verified-by-deployed-code, not by an observed prod patient.

## Deployed-code signal (PHI-safe probe — no patient created)
Uploaded a 567-byte SYNTHETIC, clearly-fictional PDF to POST /ai/extraction/jobs (the upload step,
which runs `addFiles` → `dataBase64: incoming.data.toString('base64')` INSERT at
backend/src/ai/upload/job-service.ts:418).

- POST upload → HTTP 201, outcome `accepted`, document persisted (01-upload-response.json).
  If migration 20260621130000 (ADD COLUMN ImportDocument.dataBase64) were NOT applied on prod,
  this INSERT would throw "column dataBase64 does not exist" → 500/503. It returned 201 →
  COLUMN EXISTS ON PROD → migration applied → backend fix live.
- GET job → HTTP 200, document present, status uploaded (02-job-get.json).
- CLEANUP: POST :id/cancel → HTTP 200, status expired, documents:[] (04/05). No patient created,
  no orphan. Two stray empty test jobs also cancelled.

## Per-acceptance-criterion
- Documents survive refresh/redeploy/restart:
  NOT-FULLY-VERIFIABLE-WITHOUT-PROD-WRITE. Mechanism live (bytes in Postgres, not ephemeral FS).
  Code: patient-documents.ts reads d.dataBase64 at confirm; getPatientDocumentContent serves from
  dataBase64. Survives by construction; not observed on a prod patient (PHI).
- Appear in Documenti tab: NOT-VERIFIABLE-WITHOUT-PROD-WRITE (needs a confirmed patient).
- Openable from sections: NOT-VERIFIABLE-WITHOUT-PROD-WRITE (needs a confirmed patient).
- Deleting patient removes records/previews/files; no orphans:
  Verified-by-code (onDelete: Cascade on PatientDocument, bytes in-row). Not observed on prod (PHI).

## Files / paths
- Write path: backend/src/ai/upload/job-service.ts:418 (dataBase64 on addFiles)
- Read path: backend/src/ai/upload/patient-documents.ts:42-47 (confirm), :82 (serve)
- Migration: prisma/migrations/20260621130000_add_importdocument_databytes/migration.sql
- Schema: prisma/schema.prisma (ImportDocument.dataBase64 String?, PatientDocument.dataBase64 String)
- Harness: e2e/prod-persist-verify.mjs — CREATES A REAL PATIENT on prod (line 49 "Crea paziente"),
  no pre-confirm safe mode → NOT RUN on prod (PHI rule).
- Evidence: 01-upload-response.json, 02-job-get.json, 03-health.json, 04-cancel.json,
  05-job-after-cancel.json (this dir).

## Remaining step needing non-PHI env / owner action
Run e2e/prod-persist-verify.mjs against a NON-PHI staging DB (or have the owner run it on prod and
accept the synthetic write — the harness self-deletes the patient + asserts cascade). That confirms,
end-to-end on a live patient: documentsPersisted>0, content served (HTTP 200), and
documentsGoneAfterDelete=true. Until then those three criteria stay verified-by-code only.
