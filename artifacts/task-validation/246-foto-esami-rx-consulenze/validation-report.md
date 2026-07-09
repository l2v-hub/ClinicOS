# Validation report — Issue #246 (Foto per Esami, RX e Consulenze)

**Final Decision: READY FOR CODEX QA**

Ambiente: stack locale reale (Postgres Podman + backend :3001 + frontend :5173), codice PR #253 sovrapposto (HMR + backend reload). Paziente sintetico Moretti, Elena. Immagine di test **sintetica** (PNG 78 byte, nessun PHI). Data: 2026-07-09.

## Esito acceptance criteria (Playwright UI reale — 10/10 PASS)

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — allegato in "Esami" | ✅ upload → POST `/patients/:id/documents` **201**, chip 🖼️ nella sezione `photos-esame` |
| AC2 — allegato in "RX" | ✅ POST **201**, chip in `photos-rx` |
| AC3 — allegato in "Consulenze" | ✅ POST **201**, chip in `photos-consulenza` |
| AC4 — persistenza + sezione corretta dopo reload | ✅ dopo `reload()` ogni chip resta nella sezione corretta (filtro per `documentType`) · `screenshots/after-refresh-3-sezioni.png` |
| AC6 — privacy/log | ✅ nessun NUOVO console error; nessun dato sensibile nei log; bytes su `PatientDocument.dataBase64` serviti da endpoint autenticato con `Cache-Control: no-store`, nessun URL pubblico |

## Percorso verificato
Operatore → Pazienti → Moretti, Elena → Clinica → **Esami & Consulenze** → per ciascuna sezione (Esami ematici / RX-Diagnostica / Consulenze) "📷 Aggiungi foto/allegato" → upload immagine sintetica → chip 🖼️ `_test-exam-photo.png` → reload → chip persiste nella sezione corretta.

## Note
- Storage: bytes base64 su `PatientDocument` (Postgres), `documentType` ∈ {esame, rx, consulenza, allegato}; nessuna migration, nessun object storage, nessun URL pubblico permanente.
- AC5 (permessi camera negati → fallback upload): il controllo è un `<input type=file capture=environment>` — su desktop apre il file picker; il fallback upload è intrinseco. Non riproducibile in modo deterministico headless (permessi camera dispositivo); coperto dal design del componente.

## Artefatti
`screenshots/` (before, after-upload-3-sezioni, after-refresh-3-sezioni) · `trace/trace.zip` · `video/*.webm` · `logs/` (upload-persistence, console-errors) · `ui-report.json` · test `e2e/issue-246-foto.mjs`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.
