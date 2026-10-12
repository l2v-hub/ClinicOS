# Task Contract

## Task

- Title: Schemi insulina a fasce glicemiche: formato tabella, pompa ml/h, dosi multiple per fascia, avvisi sovrapposizioni e buchi
- Slug: schemi-insulina-a-fasce-glicemiche-formato-tabella-pompa-ml-h-dosi-multiple-per
- Type: change
- Date: 2026-10-12
- Branch: feat/insulin-glucose-scale-schemes (da origin/main 59baeb86a)

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Persistence: solo il contenuto JSON di `PatientTherapy.doseProtocol` (campo esistente). Nessuna
modifica allo schema Prisma, nessuna migrazione.

## Current Behaviour

Su origin/main esiste già `doseMode: 'glucose_scale'` con `doseProtocol {kind, measurementUnit,
doseUnit:'unità', rules:[{minMgDl,maxMgDl,units}]}`, editor nel form terapia, dose calcolata in
somministrazione dalla glicemia misurata, e parsing all'import del formato "in riga"
("4 U se glicemia tra 200-250, 6 U tra 250-300 ..."). Verificato su due documenti reali (utente,
2026-10-12):

- Protocollo DEA Imola, formato TABELLA ("Insulina rapida sottocute secondo schema:" poi riga
  intestazione "GLUCOSTIX INSULINA" poi una fascia per riga "121-140 4U.I"): ogni fascia diventa
  una riga terapia separata senza farmaco; l'intestazione spezza la catena; la fascia OCR "11-120"
  viene scartata (sotto la soglia di plausibilità); la fascia ">350 Bolo 5 U.I e.v. +15U.I s.c"
  viene persa.
- Schema in POMPA endovena (glicemia → ml/h, "+ 6 U.I in bolo"): non rappresentabile, il modello
  accetta solo 'unità'; ogni fascia diventa una riga "1 ml".
- Lettera Imola (Humalog): fasce sovrapposte (200-250 / 250-300) e buco 301-349 vengono importate
  senza alcun avviso specifico.

## Expected Behaviour (decisioni utente 2026-10-12)

- Formato tabella: intestazione + righe di fasce consecutive diventano UNA riga terapia con tutto
  lo schema, qualunque sia il numero di fasce. Il farmaco può essere scritto come "insulina",
  principio attivo o nome commerciale.
- Lo schema ha un'unità di dose: `unità` (sottocute) oppure `ml/h` (pompa). Stessa tabella,
  stesso calcolo in somministrazione, etichetta coerente con l'unità.
- Più componenti per fascia: ogni fascia ha la dose principale (nell'unità dello schema) e
  0..n dosi aggiuntive `{amount, unit, route?, label?}` (es. bolo 5 U e.v.). Visibili in
  somministrazione insieme alla dose principale.
- Lo schema si importa ESATTAMENTE come scritto: nessun confine adattato. Sovrapposizioni, buchi
  e valori sospetti (es. "11-120") producono avvisi evidenziati sulla riga; la riga è sempre
  `da_verificare`. Le sovrapposizioni bloccano la conferma finché l'operatore non corregge (una
  glicemia non può avere due dosi); i buchi restano consentiti e bloccano la somministrazione
  per i valori non coperti.

## Acceptance Criteria

- AC1: Il testo tabellare del protocollo (intestazione + 9 fasce, una per riga) produce UNA riga
  `doseMode: glucose_scale` con 9 fasce nei valori del documento (incluso ">350" con dose
  principale 15 unità s.c. + dose aggiuntiva 5 unità e.v. bolo) e nessuna riga orfana per fascia.
- AC2: Lo schema in pompa produce UNA riga con `doseUnit: 'ml/h'`, 6 fasce (1..6 ml/h) e
  la fascia ">350" con dose aggiuntiva 6 unità bolo.
- AC3: La lettera Imola produce lo schema Humalog esattamente come scritto (200-250:4,
  250-300:6, 350-450:8) con avvisi "sovrapposizione a 250" e "301–349 non coperto";
  "11-120" in tabella è conservata con avviso "valore sospetto"; nessuna fascia corretta.
- AC4: Backend: `normalizeGlucoseScaleProtocol` accetta `doseUnit` 'unità'|'ml/h' e `extraDoses`
  validate; rifiuta sovrapposizioni (400); i protocolli esistenti senza i nuovi campi restano
  validi e invariati (retro-compatibilità). La somministrazione registra la dose con l'unità
  giusta ("2 ml/h (glicemia 180 mg/dL)") e le dosi aggiuntive.
- AC5: Frontend: l'editor dello schema (Aggiungi terapia e revisione import) permette di scegliere
  l'unità, aggiungere N fasce e dosi aggiuntive per fascia, mostra avvisi di sovrapposizione/buco;
  la somministrazione mostra dose principale + aggiuntive con unità corretta.
- AC6: Nessuna regressione: suite parser/intake/therapies backend e test frontend toccati verdi
  (al netto della baseline documentata), `tsc` backend e `npm run build` frontend verdi.

## Test Plan

| Test type                 | Required | Reason                                                       |
| ------------------------- | -------: | ------------------------------------------------------------ |
| Unit                      |      yes | parser (tabella, pompa, riga, avvisi), normalize, doseFor    |
| Integration               |      yes | conferma import → PatientTherapy.doseProtocol con nuovi campi |
| API                       |      yes | create/patch terapia schema ml/h + extraDoses; 400 su overlap |
| Playwright                |      yes | editor schema + somministrazione con dose ml/h e aggiuntive   |
| Persistence after refresh |      yes | doseProtocol salvato e riletto (DB locale usa e getta)        |
| Agnos action registry     |       no |                                                              |
| Voice simulation          |       no |                                                              |
| OCR/import test           |      yes | fixture testo dei due documenti forniti dall'utente           |
| Security/privacy scan     |       no | solo dati sintetici/anonimizzati                              |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- Rischio clinico di dose errata: mitigato da import sempre `da_verificare`, testo originale
  sempre visibile, avvisi espliciti, nessun confine adattato, overlap bloccante.
- Dosi aggiuntive (es. bolo e.v.) non calcolate automaticamente in altro modo: sono mostrate
  come istruzione obbligatoria accanto alla dose principale.
- Retro-compatibilità dei protocolli già salvati: campi nuovi opzionali, default 'unità'.

## Gate Status

READY FOR IMPLEMENTATION
