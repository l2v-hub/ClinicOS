# Validation report — Issue #242 (Diagnosi di dimissione senza terapia farmacologica)

**Final Decision: READY FOR CODEX QA**

Fix: **backend-only** in `backend/src/ai/sections/markdown-parse.ts` (`headingField()` riconosce l'etichetta inline `Terapia:`/`TD:` e avvia un blocco `therapyText` anche dentro un'intestazione combinata "Diagnosi e terapia alla dimissione"). Il frontend (`deriveSections` / `ImportSectionsReview`) si limita a renderizzare `diagnosisText`/`therapyText`, quindi separare correttamente i due campi a livello di parser determina l'esito UI.

Poiché il percorso UI reale richiede OCR di una lettera, l'evidenza oggettiva è una **superficie QA controllata input→output** (consentita per feature backend): il parser runtime è alimentato con una lettera sintetica a intestazione combinata e il risultato è renderizzato/HTML + screenshot + trace, oltre agli unit test.

## Esito acceptance criteria

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — diagnosi = solo diagnosi di dimissione | ✅ `diagnosisText` contiene Scompenso/Ipertensione · `logs/parse-input-output.log` |
| AC2 — la terapia NON appare nella diagnosi | ✅ 0 farmaci in `diagnosisText` (Ramipril/Bisoprololo/Furosemide assenti) · `screenshots/diagnosi-terapia-separate.png` |
| AC3 — diagnosi e terapia restano separate | ✅ i due campi sono popolati indipendentemente dal parser |
| AC4 — mapping import: diagnosi→diagnosi, terapia→terapia | ✅ tutti e 3 i farmaci in `therapyText` |
| Regressione parser | ✅ `markdown-parse.test.ts` **20/20 PASS** (incl. 2 test #242) |

## Nota di trasparenza
- La superficie di prova è **sintetica, senza PHI**. Il parser è il componente runtime del fix; il render UI (Diagnosi/Terapia) segue i due campi.
- `diagnosisText` include la riga di intestazione "## Diagnosi e terapia alla dimissione" (titolo di sezione): irrilevante ai fini AC — nessun **farmaco** è presente nella diagnosi.
- Limite noto (dal PR): il percorso di estrazione AI (`imola-profile.json` + `prompt.ts`) è hardening a bassa priorità, non incluso; AC4 provato sul percorso markdown deterministico (quello del fix).

## Artefatti
`report.html` · `screenshots/diagnosi-terapia-separate.png` · `trace/trace.zip` · `logs/parse-input-output.log` · test: `e2e/issue-242-parse.ts` (parser I/O) + `e2e/issue-242-shot.mjs` (screenshot). Unit test: `backend/src/ai/__tests__/markdown-parse.test.ts`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.
