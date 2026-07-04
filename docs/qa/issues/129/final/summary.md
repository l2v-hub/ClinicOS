# Issue #129 — Ordinamento alfabetico pazienti — Verifica finale (iterazione 1)

Data: 2026-07-04 · Branch: `fix/issue-129-ordinamento-pazienti` · Ambiente: backend :3001, frontend preview :5175 (build di produzione)

## Root cause (per vista)

| Vista | Componente | Causa |
|---|---|---|
| Consegne | `frontend/src/components/operator/ConsegnePage.tsx` | sort per priorità + `createdAt` desc: il paziente non era mai parte della chiave di ordinamento |
| Parametri | `frontend/src/components/operator/MultiPatientParametri.tsx` | nessun sort: la lista ereditava l'ordine dell'API `/patients` (`orderBy createdAt desc`) |
| Pazienti presenti | roster `pazienti` in `frontend/src/App.tsx` (reso da `PatientList`) | nessun sort alla fetch; il paziente nuovo veniva appeso in coda (`[...prev, newP]`) |
| Terapia da somministrare | `frontend/src/components/operator/TherapySlotModal.tsx` | il backend (`/therapy-slots`, `backend/src/routes/therapy.ts`) costruisce `patients` in ordine di inserimento terapie; il modal renderizzava as-is |

Nota: il backend NON è stato modificato (vincolo); l'ordinamento è ora garantito lato frontend in modo stabile.

## Fix

Utility condivisa `frontend/src/lib/patientSort.ts`:
- `comparePazienti(a,b)` — cognome poi nome, `Intl.Collator('it', { sensitivity: 'base' })` (case/accenti-insensibile), fallback al nome se il cognome manca, record senza nome in fondo;
- `comparePazientiNome(a,b)` — per nomi completi visualizzati ("Cognome, Nome");
- `sortPazienti(list)` — copia ordinata (sort V8 stabile).

Applicata in 4 punti (una funzione, nessuna duplicazione):
1. `App.tsx` — sort del roster alla fetch, al refetch post-import e all'inserimento ottimistico (AC5);
2. `MultiPatientParametri.tsx` — sort dei `filtrati` (vale anche con ricerca attiva);
3. `ConsegnePage.tsx` — chiave primaria = nome paziente, poi priorità, poi recenza;
4. `TherapySlotModal.tsx` — sort dei pazienti dello slot terapia.

## Verifica (script committato: `e2e/issue-129-verify.mjs`)

Prima del fix (screenshot in `docs/qa/issues/129/iteration-1/`): FAIL in tutte e 4 le viste.

Dopo il fix (screenshot in questa cartella): PASS —

```
Consegne: Bassi, Giorgio | Gatti, Lucia | Moretti, Elena | Neri, Carlo | Rossi, Mario
Parametri: Bassi | Camera128 | Camera128B | Ferrioli | Forlano | Gatti | Lombardi | Mancini | Martini | Moretti | Neri | Rossi | Verdi | Verifica127 | Verifica127B
Pazienti presenti: (idem Parametri)
Terapia da somministrare: BASSI | FORLANO | GATTI | MARTINI | ROSSI
Parametri dopo refresh: invariato (coerente)
PASS — issue #129
```

## Criteri di accettazione

- AC1 Consegne: PASS (`after-consegne.png`)
- AC2 Parametri: PASS (`after-parametri.png`)
- AC3 Pazienti presenti: PASS (`after-pazienti-presenti.png`)
- AC4 Terapia da somministrare: PASS (`after-terapia.png`)
- AC5 Stabilità dopo aggiornamento: PASS — inserimento ottimistico ordinato in `App.tsx`; refresh ri-verificato dallo script (`after-parametri-refresh.png`)

## Gate

- `npx tsc --noEmit`: PASS (0 errori)
- `npm run build` (frontend): PASS
- Nessun `console.log`, nessuna modifica a backend/schema/PatientList.tsx/AgnosPanel/App.css

Dati di test: esclusivamente pazienti demo esistenti + consegne/terapie fittizie create via API (nessun dato reale).
