# Validation Report — Issue #156: terapia dimissioni → righe strutturate

**Stato:** IMPLEMENTED (incremento 1 — backend parser + seed). **NON** VERIFIED/CLOSED — il gate QA/close è di Codex (governance AGENTS.md / CLAUDE.md). Nessun merge su main né deploy prod eseguiti da Claude.

## Scope di questo incremento (backend, deterministico + evidenziabile)

Parser deterministico e **generico** (nessun hardcoding di nomi farmaco) che trasforma il testo terapia della lettera di dimissioni in **righe strutturate, una per farmaco**, con stato `ok`/`da_verificare`, e wiring nel seed del draft di import.

- `backend/src/intake/parse-discharge-therapy.ts` — `parseDischargeTherapy(text) → ParsedTherapyRow[]`; estrae per riga: farmaco, forma, dosaggio, via, quantità, orari[], giorni[], dataInizio (ISO), classe, note, `originalText` (verbatim), `stato`.
- `backend/src/intake/draft-service.ts` — `buildImportDraftData` ora semina **`data.terapiaImport`** = righe strutturate (mantenendo `_terapiaText` grezzo per audit lossless); `'terapiaImport'` compare in `_importedFields`.

**Regressione intercettata (prima del merge):** il confirm frontend (`IntakeWorkspace.handleConfirm`) mappa già `data.terapia` con `therapyFormToInput` (shape `TherapyFormValue`). Seminare le righe `ParsedTherapyRow` sotto `data.terapia` avrebbe **crashato il confirm** dell'import. Fix: chiave dedicata `terapiaImport` (sezione "Terapie rilevate", separata dall'editor manuale). Test aggiunto: `data.terapia === undefined` dopo il seed import.

## Increment 2 — frontend IMPLEMENTED + build-validato (gate verde)

- `frontend/.../intake/dischargeTherapy.ts` — tipo `DischargeTherapyRow` + mapper `dischargeRowToTherapyInput` (orari→schedules, forma→pharmaceuticalForm, via OS→orale…, classe/giorni/quantità/originalText/flag→note; `dataInizio` fallback oggi). Nota: lo schema Prisma non ha un campo giorni-settimana → i giorni sono preservati in `note` (nessuna modifica schema, per vincolo CLAUDE.md).
- `frontend/.../intake/DischargeTherapyReview.tsx` — tabella **editabile** "Terapie rilevate dalla lettera di dimissioni": una riga/farmaco, orari/giorni visibili, alert righe `da_verificare`, campi modificabili (AC7). Testid per E2E.
- `StepClinica.tsx` — rende la tabella quando `data.terapiaImport` è presente.
- `IntakeWorkspace.handleConfirm` — persiste le righe rilevate (eventualmente modificate): `terapiaImport → TherapyCreateInput[]` unite a quelle manuali → `confirmDraft` → `createTherapyInTx` → `PatientTherapy` (AC8/AC9).
- `e2e/therapy-import.spec.ts` — Playwright spec (AC2/AC4/AC6/AC7/AC8/AC9) su stack live (skip senza `E2E_IMPORT_DRAFT_ID`).

**Evidenza gate**: build frontend (`tsc -b && vite build`) + backend build/test **verdi** con tutti i file. AC7/AC8/AC9 coperti a livello di codice + spec E2E.

## E2E in CI — WIRED + VERDE

`e2e/therapy-import-api.mjs` (livello API, deterministico, nello step `gate`): seed job con narrativa terapia → `from-import` → parser produce `terapiaImport` strutturato (assert AC2/AC4/AC5/AC6 + no-collision con `data.terapia`) → confirm con therapies mappate → **PatientTherapy persistito** (lettura DB fresca = "dopo refresh", AC8/AC9). Step gate **success** (run 28756690549). Copre la persistenza end-to-end senza flakiness browser.

## Increment 2 — residuo (per Codex)

- **Screenshot browser** in CI (visual): la Playwright spec browser (`e2e/therapy-import.spec.ts`) è pronta ma il job `browser-e2e` in mock non produce testo terapia dai file (nessuna estrazione reale) → per screenshot end-to-end del flusso UI servirebbe far emettere al mock una sezione terapia (chirurgia multi-layer sul mock, rischio sul happy-path). La **funzionalità** è però provata dall'E2E API sopra + build frontend verde.

## Blocchi terminali (governance)

Il completamento end-to-end della skill /process-requirement (UI tabella + confirm persistenza + Playwright + screenshot + deploy + close) è **bloccato** in questo ambiente da:

1. **Governance** (CLAUDE.md/AGENTS.md): Claude non fa merge su main, deploy prod, né chiude issue — spetta a Codex. I passi finali della skill sono quindi fuori dal mandato di Claude.
2. **Ambiente (mode B)**: nessun run locale dell'app / Playwright / screenshot (macchina Zscaler, no worktree/Postgres locale). La verifica E2E/visuale può girare solo nel job `browser-e2e` del gate CI, non in locale.
   Increment 2 (frontend) è progettato e pronto da implementare via branch+CI: `DischargeTherapyReview` (tabella editabile su `data.terapiaImport`, orari/giorni, alert `da_verificare`), mapper `ParsedTherapyRow → TherapyCreateInput` in `handleConfirm` (orari→schedules, forma→pharmaceuticalForm, classe/giorni/originalText→note; `dataInizio` fallback oggi), Playwright spec.

## Evidenza (test automatici — gireranno nel gate `ai-import-e2e.yml`)

`backend/src/intake/__tests__/parse-discharge-therapy.test.ts` + wiring in `seed-draft-from-import.test.ts` (entrambi registrati in `backend/package.json`).

Validazione locale del parser (harness Node, fixture #156 + prescrizione diversa):

```
KEPPRA    → via=OS quantita="1 Cpr" orari=[08:00,20:00] dosaggio="500 MGR" data=2026-07-03 classe=A stato=ok
CACIT     → giorni=[Mar,Gio,Sab,Dom] dosaggio="1GR/880UI" quantita="1 Dosi" stato=ok
CETIRIZINA→ dosaggio="10MG" quantita="1/2 Dosi" classe="" stato=ok
PEVARYL   → tutti campi vuoti, stato=da_verificare (riga NON scartata, originalText preservato)
AUGMENTIN → (NON in fixture) via=OS orari=[09:00,21:00] giorni=[Lun,Mer,Ven] data=2027-01-12 stato=ok  ← prova no-hardcoding
```

## Copertura Acceptance Criteria

| AC   | Descrizione                                                                        | Stato                                                         |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| AC1  | Riconoscimento sezione terapia                                                     | ✅ (parser su therapyText)                                    |
| AC2  | Una riga per farmaco                                                               | ✅ test                                                       |
| AC3  | Campi strutturati (farmaco/dosaggio/quantità/orari/data/via/classe/note+originale) | ✅ test                                                       |
| AC4  | Orari multipli ("08:00 e alle 20:00")                                              | ✅ test                                                       |
| AC5  | Giorni specifici ("Mar Gio Sab Dom")                                               | ✅ test                                                       |
| AC6  | Incompleti → "da verificare", non scartati                                         | ✅ test (PEVARYL)                                             |
| AC10 | Nessun hardcoding                                                                  | ✅ test (AUGMENTIN, prescrizione diversa)                     |
| AC7  | Modifica prima del salvataggio                                                     | ⏳ incremento 2 (UI tabella intake)                           |
| AC8  | Conferma obbligatoria                                                              | ⏳ incremento 2 (confirm già richiede conferma; wiring righe) |
| AC9  | Persistenza dopo refresh                                                           | ⏳ incremento 2 (confirm → PatientTherapy + Playwright)       |

## Rimanente (incremento 2 — per completare la DoD)

Richiede lavoro **frontend** + E2E, non deterministico-unit:

1. UI intake "Terapie rilevate dalla lettera di dimissioni": tabella editabile che legge `draft.data.terapia`, mostra orari/giorni, evidenzia righe `da_verificare`, permette modifica.
2. Confirm: mappare le righe (eventualmente modificate) → `TherapyCreateInput[]` nel payload → `createTherapyInTx` (persistenza `PatientTherapy`). Gestire "dosaggio non nel menu" (mantieni valore, proponi creazione, non svuotare, non bloccare).
3. Playwright E2E (AC8/AC9): import → sezione "Terapie rilevate" → KEPPRA 08:00/20:00 → CACIT giorni → PEVARYL da verificare → modifica → conferma → terapia paziente → persistenza dopo refresh.

## Privacy

Il parser non logga nulla. Il chiamante deve loggare solo correlationId / n. righe / stato parsing / errore sanitizzato — **mai** il testo terapia completo (rispettato: nessun log aggiunto).

## Note

- Non modifica lo schema Prisma (`TherapyCreateInput` esistente ha tutti i campi target).
- `giorni` (giorni settimana) è portato sulla riga; la mappatura a `fasce*`/`orarioSpecifico`/`schedules` è decisa in fase di confirm (incremento 2) per non perdere informazione.
