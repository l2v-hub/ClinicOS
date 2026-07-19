# Research: Terapia Farmacologica Unica e Agenda Coerente

## Codebase Audit (Phase 0)

### Decision 1 — Schema Prisma

**Decision**: Nessuna migrazione richiesta. Lo schema attuale è sufficiente.

**Rationale**: `PatientTherapy` ha tutti i campi richiesti dalla spec: farmacoNome, dosaggio,
viaSomministrazione, tipo (stringa libera → accetta `al_bisogno` senza modifica), stato,
dataInizio, dataFine, fasce (5 boolean), orarioSpecifico, dataSomministrazione,
orarioSomministrazione. `MedicationAdministration` ha tutti i campi per erogata/non erogata:
patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, stato, operatoreId,
operatoreNome, confirmedAt, motivo, note.

**Alternatives considered**: Aggiungere `therapyId FK` su `MedicationAdministration` per link
diretto. Scartato: la chiave naturale `(patientId, farmacoNome, date, fascia)` è sufficiente per
le operazioni richieste. YAGNI — il collegamento diretto non è richiesto dalla spec e aggiungerebbe
una migrazione non necessaria.

---

### Decision 2 — Duplicazione UI (TerapiaMedicaTab + TerapiaScheduleTab)

**Decision**: Rimuovere entrambi i file.

**Rationale**:

- `TerapiaMedicaTab.tsx` usa `cartella.farmaci` (JSON blob) come sorgente primaria e chiama l'API
  in fire-and-forget. Viola costituzione III (Backend Data Authority). Non è importato da nessun
  file in `frontend/src`.
- `TerapiaScheduleTab.tsx` è quasi identico a `TerapiaFarmacologicaTab.tsx`. Non è importato da
  nessun file in `frontend/src`.
- `PatientDetail.tsx` già usa esclusivamente `TerapiaFarmacologicaTab` per il tab terapia.
- `TerapieModuloView.tsx` è usato solo per la "Vista modulo" (stampa) in `TerapiaMedicaTab` — che
  viene rimossa. Verificare se va rimosso anch'esso.

**Alternatives considered**: Mantenere come file non referenziati. Scartato: violano I (Simplicity)
e III (Backend Data Authority).

---

### Decision 3 — Backend therapy.ts route

**Decision**: Il route `GET /therapy-slots` va corretto per escludere `tipo = 'al_bisogno'` dagli slot agenda.

**Rationale**: Il route attualmente fa fallback alla logica periodica per tutti i tipi non-`una_tantum`.
Se viene inserita una terapia `al_bisogno`, apparirebbe erroneamente nell'agenda. La spec dice
esplicitamente: "Terapia Al bisogno: non appare nell'Agenda programmata (slot fissi)".

**Fix**: Aggiungere `if (pt.tipo === 'al_bisogno') return false;` nel filtro `validTherapies`.

---

### Decision 4 — Frontend TerapiaFarmacologicaTab tipo options

**Decision**: Aggiungere `al_bisogno` come terza opzione di tipo.

**Rationale**: La spec richiede supporto per Periodica, Una tantum, Al bisogno. Il form attuale
mostra solo Periodica e Una tantum. Il campo `tipo` in DB è stringa libera — nessun cambio schema.

**Behavior per `al_bisogno`**: Non mostrare fasce orarie (non serve per agenda). Non mostrare
dataSomministrazione (non è una tantum). Mostrare solo farmaco, dose, via, data inizio, prescrittore.

---

### Decision 5 — console.log in production routes

**Decision**: Lasciare in place per ora (rimozione fuori scope di questa feature).

**Rationale**: `console.log` nelle route POST/DELETE è il comportamento attuale. La rimozione è
un refactor separato non richiesto dalla spec. La spec non dice nulla al riguardo e il piano utente
non la menziona.

---

### Decision 6 — TerapieModuloView.tsx

**Decision**: Mantenere il file ma NON importarlo da TerapiaFarmacologicaTab.

**Rationale**: `TerapieModuloView.tsx` è un componente per la vista stampa. Attualmente è usato
solo dentro `TerapiaMedicaTab` (che viene rimossa). È un componente standalone che non dipende da
logica di stato. Può essere rimosso ma richiederebbe verifica dipendenze. Lasciarlo è più sicuro.
Se non è importato da nessun altro file, TypeScript build lo ignorerà (tree-shake).

---

## Stack Confermato

| Layer           | Tecnologia             | Note                             |
| --------------- | ---------------------- | -------------------------------- |
| Frontend        | React 18 + TS + Vite   | `frontend/` workspace            |
| Backend         | Node.js + Express + TS | `backend/` workspace             |
| ORM             | Prisma 7               | schema in `prisma/schema.prisma` |
| DB locale       | PostgreSQL via Podman  | `localhost:5432`                 |
| DB cloud        | Railway PostgreSQL     | env var `DATABASE_URL`           |
| Frontend deploy | Vercel                 | env var `VITE_API_URL`           |
| Backend deploy  | Railway                | env var `DATABASE_URL`           |

## Vincoli Confermati

- `prisma migrate reset` → PROIBITO
- `prisma db push --force-reset` → PROIBITO
- Migrazioni additive via `prisma migrate dev` → PERMESSE se necessarie
- Questa feature: nessuna migrazione necessaria
- `VITE_API_URL` → mantenuto, frontend già lo usa correttamente
- Build target: `npm run build` deve passare senza errori TypeScript
