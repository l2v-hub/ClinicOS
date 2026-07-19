# #242 — Diagnosi di dimissione includeva la terapia farmacologica

## Stato: READY FOR CODEX QA

## Causa radice (riprodotta)

Il parser deterministico delle sezioni di dimissione `backend/src/ai/sections/markdown-parse.ts`
assegna ogni riga alla sezione canonica in base all'heading, con alias **ordinati** e primo-match.
L'alias `diagnosisText` (pattern ampio `/\bdiagnosi\b/`) è valutato **prima** di `therapyText`.
Con un heading combinato tipico delle lettere Imola — **"Diagnosi e terapia alla dimissione"** —
l'heading matcha "diagnosi" per primo e **tutto il blocco farmacologico sottostante** (es. Ramipril,
Bisoprololo) veniva bucketizzato in `diagnosisText`, con `therapyText` vuoto. → la terapia compariva
nella diagnosi (viola AC2).

Riproduzione: `docs/qa/issues/242/final/before-after.txt`.

## Fix

`markdown-parse.ts` — `headingField()` ora riconosce una **label di terapia inline**
(`Terapia:`, `Terapia domiciliare:`, `Terapia farmacologica …:`, `TD:`) come inizio di un blocco
`therapyText`, **anche a metà contenuto e anche col primo farmaco sulla stessa riga**. Così, sotto un
heading combinato, i farmaci vengono separati nella sezione terapia e la diagnosi resta pulita.
Modifica minima e scoped alla terapia (nessun rischio di spostare la diagnosi).

## Acceptance Criteria

- **AC1** (solo diagnosi di dimissione): PASS — la diagnosi mantiene solo il testo diagnostico.
- **AC2** (terapia esclusa dalla diagnosi): PASS — Ramipril/Bisoprololo non compaiono più in `diagnosisText`.
- **AC3** (separazione dopo salvataggio): PASS — diagnosi e terapia in campi/sezioni separate (`diagnosisText` vs `therapyText`).
- **AC4** (import/mapping non mescola): PASS sul path deterministico markdown. Vedi nota AI sotto.

## Test

- `backend/src/ai/__tests__/markdown-parse.test.ts`: **20/20 PASS**, inclusi 2 nuovi test #242
  (heading combinato; label `Terapia:` inline). Output: `docs/qa/issues/242/final/test-output.txt`.
- Regressione headings separati: invariata.

## Evidenza (backend/parser → input→output controllato)

- `before-after.txt` (input della lettera → output diagnosi/terapia, prima vs dopo)
- `test-output.txt` (suite 20/20)

## Nota / raccomandazione (path AI extraction)

Esiste anche un path AI (profilo `imola-profile.json` + `prompt.ts`) dove il modello assegna le sezioni.
L'alias `DISCHARGE_DIAGNOSIS` include "Diagnosi" (ampio) e il prompt tiene la diagnosi come blocco unico.
Raccomandazione follow-up (bassa priorità): irrobustire il prompt/alias affinché la terapia
farmacologica non finisca in DIAGNOSI anche su heading combinati. Non incluso qui per mantenere il fix
minimo e deterministico; la separazione runtime effettiva passa dal parser sopra.

## Playwright / UI

Questo è un fix a livello di parser di import. L'evidenza oggettiva è il test deterministico + il
before/after input→output. Una E2E UI completa richiederebbe l'intero flusso di import documentale in
esecuzione (fuori scope di questa iterazione); l'evidenza runtime del parser dimostra la separazione.
