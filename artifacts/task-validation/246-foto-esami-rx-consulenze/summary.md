# #246 — Foto per esami, RX e consulenze specialistiche (READY FOR CODEX QA)

## Approccio (lightest path, nessun cambio schema)
Riuso dello store esistente `PatientDocument` (bytes base64 in Postgres, serviti dal backend
autenticato, mai URL pubblici). L'unico writer esistente girava dentro l'import AI; aggiunto un piccolo
endpoint per allegare una foto a una scheda già esistente.

## Implementazione
Backend (additivo, nessuna migration):
- `ai/upload/patient-documents.ts`: `createPatientDocument(patientId, file, documentType)` — crea una
  riga `PatientDocument` (base64, mime, sha256, sortOrder, `documentType` = esame|rx|consulenza).
- `routes/patient-documents.ts`: `POST /patients/:patientId/documents` (multer memoryStorage, max 15MB,
  1 file; MIME ammessi: image/jpeg,png,webp,heic,heif + application/pdf; `documentType` validato).
Frontend:
- `EsamiConsulenzeTab.tsx`: componente `SectionPhotos` — input file `accept="image/*,application/pdf"`
  `capture="environment"` (fotocamera su mobile, picker su desktop) che POSTa il file (FormData) e
  mostra gli allegati della sezione con link "Apri". Reso sotto ciascuna delle 3 sezioni
  (Esami ematici → `esame`, RX/Diagnostica → `rx`, Consulenze → `consulenza`).

## Acceptance Criteria
- Acquisizione foto/upload immagine dalle sezioni esami/RX/consulenze: PASS — controllo per sezione.
- Documento allegato alla cartella digitale, persistito: PASS — `PatientDocument` (Postgres base64),
  servito con ownership-check dall'endpoint content esistente.
- Nessun URL pubblico permanente / privacy: PASS — bytes serviti dal backend, `Cache-Control: no-store`.

## Test / Build
- Backend `tsc -p tsconfig.json`: OK (0 errori; nessun cambio schema — riusa `PatientDocument`).
- Frontend `tsc -b && vite build`: OK.
- Pattern `capture="environment"` già collaudato nel repo (NewPatientModal, DischargeLetterImport).

## Nota QA
Upload runtime end-to-end (scatto foto → salvataggio → riapertura scheda mostra l'allegato) richiede lo
stack + DB in esecuzione: verificabile da Codex su preview Vercel + backend. Intake step 5 (F5) resta
fuori scope (questa issue riguarda le sezioni esami/RX/consulenze della scheda).
