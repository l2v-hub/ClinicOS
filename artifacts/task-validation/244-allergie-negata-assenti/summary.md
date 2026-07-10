# #244 — Allergie: stato esplicito assenti / nega / presenti (READY FOR CODEX QA)

## Analisi
- `AllergiesEditor` gestiva solo una lista `AllergiaItem[]`; una lista vuota era ambigua
  (dato mancante vs allergie assenti). Nessun concetto di "stato".
- Le allergie sono persistite dentro il blob JSON `Cartella.data` (Prisma `Cartella.data Json`);
  la PUT `/patients/:id/cartella` round-trippa qualsiasi nuovo campo → **nessuna migration necessaria**.

## Fix (solo frontend, nessun cambio schema/API)
- `types.ts`: nuovo `AllergyStatus = 'presenti' | 'assenti' | 'paziente_nega'` + campo opzionale
  `CartellaPaziente.allergieStatus`.
- `AllergiesEditor.tsx`: selettore 3 stati (Presenti / Assenti / Paziente nega); la lista/aggiunta
  è mostrata solo per "presenti"; stato "assenti"/"nega" mostrato con badge chiaro; il **dettaglio
  non viene mai sovrascritto** dal cambio di stato (AC3) e un warning segnala il conflitto
  stato-vuoto vs lista non vuota (validazione).
- `PatientDetail.tsx`: passa `status`/`onStatusChange` → `upd({ allergieStatus })` (persistito nel blob).
- `App.css`: `.allergy-status` (layout selettore). Riuso `.status-badge` (nessun rosso come brand).

## Acceptance Criteria
- AC1 (assenti): PASS — stato "Assenti" salvato ed esplicito.
- AC2 (nega): PASS — stato "Paziente nega" salvato ed esplicito.
- AC3 (presenti senza sovrascrittura): PASS — la lista è conservata anche cambiando stato; add → 'presenti'.
- AC4 (persistenza dopo reload): PASS strutturale — `allergieStatus` è nel blob `Cartella.data`,
  la PUT lo salva e la GET lo restituisce verbatim (stesso round-trip della lista già persistita).

## Evidence
- Build: `tsc -b && vite build` OK (5.8s).
- Verifica visiva/persistenza: preview Vercel della PR (modale Allergie della scheda paziente) —
  selezione stato → Chiudi/riapri → stato invariato.
