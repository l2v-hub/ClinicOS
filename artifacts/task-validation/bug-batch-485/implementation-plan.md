# Implementation plan — version3

```json
{
  "title": "Usare lo spazio disponibile durante ingresso paziente",
  "feature": "Ingresso pazienti / layout manuale e import",
  "rationale": "Issue485 richiede fullscreen anche nella compilazione manuale. Il parent450 ha terminato implementazione e review sul codice immutabile6d2; piano dipendente distinto, non nuovo nome per un finding parent.",
  "analysis": "Browser indipendente: manuale1903x1032 produce rettangolo231.5/16/1440/1000; CSS limita inoltre sezioni a880. Solo modificatore import usa fullscreen. Correzione esclusivamente geometrica, nessuna logica clinica. Actual phone import source shows3.515625px of canvas/zero visible ink and painted Adatta/download overlap due32dvh row and flex shrinking.",
  "execution": {
    "difficulty": "low",
    "mode": "delegate",
    "reason": "Luna executes a precisely scoped ownership move; root6.1-Sol coordinates, freezes and commissions new independent QA."
  },
  "issues": [
    485
  ],
  "scope": [
    "frontend/src/components/shared/intake/IntakePage.css",
    "frontend/src/components/shared/import/ImportSession.css",
    "frontend/src/design-system.css"
  ],
  "acceptance": [
    {
      "issue": 485,
      "criteria": [
        "Manuale1903x1032 occupa viewport e area dati disponibile, input puntabili e modificabili.",
        "Import/review e compilazione postimport restano fullscreen e usabili a1903/820/390.",
        "At390x844 source PDF ink is visible, toolbar and download do not overlap; Adatta full button hit-target and data inputs work.",
        "Nessuna occlusione dipinta o overflow orizzontale; draft sintetico persiste dopo reload nel runtime QA isolato.",
        "Solo CSS autorizzato cambia; build/test frontend e nuova QA browser indipendente passano.",
        "Long draft identity wraps fully within patient card at320x568, action reachable and actual page/foreground widths fit."
      ]
    }
  ],
  "tasks": [
    {
      "title": "Condividere layout fullscreen e rimuovere cap arbitrari",
      "files": [
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/import/ImportSession.css"
      ],
      "steps": [
        "Usare regole fullscreen comuni per manuale/import mantenendo griglie, padding e azioni responsive.",
        "Rimuovere limite880 e centratura superflua nelle sezioni; semplificare dichiarazioni duplicate.",
        "Allocate useful phone source-preview space without toolbar/download overlap, preserving reachable scrollable patient fields.",
        "Nessuna modifica TSX, API, schema, auth, dipendenze o parent450."
      ]
    },
    {
      "title": "Canonical ownership of contextual long draft action wrapping",
      "files": [
        "frontend/src/design-system.css"
      ],
      "steps": [
        "Restore only the owned round3 PatientList.css addition to parent bytes.",
        "Move the same narrow patient-list/card action visual rule into design-system.css alongside existing contextual canonical controls; preserve full identity, wrapping, minimum token, autoheight and real resume.",
        "Do not alter tests, selector-scanner rules, TSX or unrelated canonical controls."
      ]
    }
  ],
  "verification": [
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "run",
        "build"
      ]
    },
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "test"
      ]
    }
  ],
  "evidence": [
    {
      "issue": 485,
      "screenshot": "artifacts/task-validation/bug-batch-485/evidence/manual-fullscreen-1903.png",
      "trace": "artifacts/task-validation/bug-batch-485/evidence/layout-trace.zip",
      "video": "artifacts/task-validation/bug-batch-485/evidence/layout-proof.webm"
    }
  ],
  "fileMap": [
    {
      "issue": 485,
      "files": [
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/design-system.css"
      ]
    }
  ],
  "separationReason": "Ripianificazione esplicita di nuova issue485 dopo freeze/review parent450: distinta richiesta fullscreen manuale, worktree dipendente da6d2 e un solo autore CSS. Parent sorgenti, piano, contatori4/4 e review restano invariati; integrazione dopo parent. PatientList.css overlap with frozen inactiveUX447 is explicit:485solewriter; preserve both rule sets on later447integration and revalidate; no parent edit/reset. Version3 moves contextual canonical control ownership into design-system.css; PatientList.css restored. Shared inactiveUX447 canonical stylesheet explicitly coordinated, one485writer; reconcile and retest later."
}
```

Rounds1/2/3 failed independent QA and remain immutable. Fourth/final implementation reserved before edits. Final source scope: IntakePage.css, ImportSession.css, design-system.css. Restore only the owned PatientList.css addition, moving canonical control ownership to its existing sole owner. Author Luna performs bounded move; new independent QA required on the final freeze. Parent481 and inactiveUX447 source/reviews/counters unchanged.
