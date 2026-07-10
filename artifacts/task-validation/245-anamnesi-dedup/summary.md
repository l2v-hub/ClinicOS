# #245 — Eliminare/consolidare Anamnesi duplicata (READY FOR CODEX QA)

## Decisione implementativa (documentata come richiesto dall'issue)
Nella scheda paziente, gruppo "Clinica", esistevano **due destinazioni anamnesi adiacenti**:
1. "Sezioni Cliniche (testo)" → sezione narrativa clinica **ANAMNESIS** (editabile, `NarrativeSectionsTab`).
2. "Anamnesi" → form strutturato **editabile** (`AnamnesisEditor`, scrive `cartella.anamnesi`).

Le due superfici hanno **store indipendenti** (`PatientNarrativeSection` ANAMNESIS vs `Cartella.data.anamnesi` JSON), quindi non c'è duplicazione di dati ma **duplicazione della superficie di compilazione**.

**Scelta: eliminare la superficie di compilazione DUPLICATA nella scheda** (tab "Anamnesi"), lasciando
"Sezioni Cliniche (testo)" come unica superficie editabile dell'anamnesi. Scelta più sicura della
trasformazione in aggregato perché gli store sono indipendenti (nessuna derivazione da costruire) e
**nessun dato viene perso**.

## Modifiche (solo frontend, rimozione nav duplicata)
`PatientDetail.tsx`: rimossi (a) import `AnamnesisEditor`, (b) voce `'anamnesi'` dal `TabId`,
(c) tab nav `{ id: 'anamnesi', label: 'Anamnesi' }`, (d) branch di render `tab === 'anamnesi'`.

## Dati PRESERVATI (AC2) — NON toccati
- `Cartella.data.anamnesi` (JSON) resta intatto e continua a round-trippare.
- `AnamnesisEditor` + `patientSections.ts` restano: il form strutturato è ancora compilato **durante
  l'intake** (`StepClinica`, `StepVerifica`) — nessuna perdita di capacità né di dati.
- Nessun cambio a schema Prisma, API, o alla sezione narrativa ANAMNESIS.

## Acceptance Criteria
- AC1 (nessuna duplicazione operativa): PASS — una sola superficie anamnesi editabile nella scheda.
- AC2 (dati esistenti preservati): PASS — nessun dato/tabella/tipo rimosso; intake invariato.
- AC3 (navigazione coerente): PASS — il menu Clinica non mostra più due destinazioni anamnesi.

## Evidence
- Build `tsc -b && vite build` OK (tsc conferma nessun riferimento pendente a tab 'anamnesi').
- Verifica visiva: preview Vercel della PR (gruppo Clinica della scheda paziente — una sola voce anamnesi).
