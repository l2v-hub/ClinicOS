# Task Validation Report

## Task

- Title: Diario terapia 2: valida terapia dal diario con anteprima e link
- Slug: diario-terapia-2-valida-terapia-dal-diario-con-anteprima-e-link
- Commit: (vedi PR)
- Date: 2026-09-30

## Implementation Summary

Solo frontend: usa gli endpoint del PR 1 (#375), già in produzione. Backend e schema invariati.

- **Diario** (`DiarioPazienteTab.tsx`):
  - nel modulo di nuova voce c'è il pulsante "Valida terapia" (`ds-btn--secondary`), disattivato se il contenuto è vuoto;
  - la card di una voce collegata mostra "Terapia aggiunta: <FARMACO> — apri" con il badge dello stato, oppure "Terapia non più presente";
  - dopo la modifica di una voce collegata il riferimento alla terapia resta, anche se la risposta della PUT non lo contiene.
- **Pannello di anteprima** (`DiaryTherapyPanel.tsx`, caricato solo al primo uso):
  - riusa i campi della sezione Terapia (`TherapyFormFields`) e mostra sempre avvisi, ambiguità, date dedotte, conflitti di fascia e testo originale;
  - per sospensione, somministrazione o modifica non c'è conferma, solo un messaggio che dice dove agire;
  - la conferma si attiva solo con i campi validi;
  - `requestId` per versione: stesso payload → stesso id, qualsiasi modifica → id nuovo, più un blocco del doppio invio;
  - errori del server tradotti in italiano, senza perdere quanto inserito.
- **Logica pura** (`diaryTherapy.ts`, `diaryTherapyLink.ts`):
  - mapping dalla riga dell'anteprima al form senza valori inventati: dosaggio composto e forme fuori elenco vanno nelle note;
  - data di inizio proposta dalla voce se il testo non la scrive, segnalata nel riepilogo.
- **Terapia** (`TerapiaFarmacologicaTab.tsx`, `TherapyEditor.tsx`, `PatientDetail.tsx`): con `focusTherapyId` si apre la sotto-scheda giusta e la riga viene portata in vista ed evidenziata per 6 s; se la terapia non è caricata, nessun errore.
- **Design system**: il pulsante "Cambia / Riprova / Continua ricerca" del campo farmaco, condiviso con Terapia e scheda d'ingresso, passa da un controllo locale di 26px a `ds-btn ds-btn--secondary`. Nel diario il nome letto dal testo è etichettato "Nome letto dal testo: non verificato in anagrafica AIFA…" (prop `nomeDaTesto`, false per default).
- **Accessibilità**: il focus va sul titolo del pannello all'apertura e sul link "apri" dopo la conferma. Se il filtro autore nasconde la voce creata, il focus torna su "Aggiungi voce".

## Files Changed

- frontend/src/components/operator/cartella/: DiarioPazienteTab.tsx, DiaryTherapyPanel.tsx/.css (nuovi), diaryTherapy.ts (nuovo), diaryTherapyLink.ts (nuovo), TherapyRowFocus.css (nuovo), TerapiaFarmacologicaTab.tsx, TherapyFormFields.tsx, CampoFarmaco.tsx/.css, SelectedDrugPackage.tsx, **tests**/diaryTherapy.test.ts (nuovo)
- frontend/src/components/operator/: PatientDetail.tsx, sections/TherapyEditor.tsx
- frontend/src/components/shared/intake/dischargeTherapy.ts (solo export)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                    |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Anteprima RAMIPRIL, 5 mg, compressa, orale, 08:00; una sola terapia creata; card "Terapia aggiunta: RAMIPRIL — apri" con lo stato Attiva; "apri" porta a Terapia con la riga evidenziata e visibile.        |
| AC2 |   PASS | Testo non riconosciuto → avviso visibile, campi vuoti, conferma disattivata. Conflitto di fascia → conferma bloccata con il suggerimento di due terapie.                                                    |
| AC3 |   PASS | "Sospendere Ramipril": nessuna conferma, messaggio "Sospendi la terapia dalla sezione Terapia", e "Salva" registra la voce normale.                                                                         |
| AC4 |   PASS | Errore del server mostrato senza perdere nulla; nuovo tentativo e doppio clic riusano lo stesso `requestId` (una sola creazione); una modifica genera un id nuovo (test unitario + verifica QA in browser). |
| AC5 |   PASS | Salva, modifica ed elimina di una voce normale verificati dalla QA (POST 201, PUT 200, DELETE 200). Build ok; npm test 924, 915 passati, 9 falliti (tutti della baseline); guardia del design system ok.    |
| AC6 |   PASS | 390, 768, 1024, 1180, 1440px: nessuno scorrimento orizzontale; su touch tutti i controlli del pannello sono ≥ 44px.                                                                                         |

## Test Results

| Test                      | Result | Evidence                                                                                                                                               |
| ------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit                      |   PASS | diaryTherapy.test.ts, 16 test, alcuni con l'interprete reale del backend                                                                               |
| Playwright                |   PASS | evidence.mjs 25/25 (logs/playwright-evidence.txt), con le anteprime dell'interprete reale (previews.json)                                              |
| Persistence after refresh |   PASS | dopo il ricaricamento link e stato restano; una terapia cancellata dà "Terapia non più presente"                                                       |
| Security/privacy          |   PASS | il testo del diario non compare mai negli URL né in console; solo il nome del farmaco scelto va a /farmaci/cerca (ricerca in anagrafica già esistente) |
| API                       |     NA | backend invariato                                                                                                                                      |

## Independent QA

clinicos-qa:

- **Primo giro: FAILED VALIDATION.**
  - Bloccante: dopo la modifica di una voce collegata compariva "Terapia non più presente".
  - Tre avvisi: nome "già presente in terapia", focus perso, script di debug rimasto.
  - Tutti corretti, con il nuovo controllo Playwright QA1 (GET ritardata).
- **Secondo giro: READY FOR QA.** Restavano due avvisi non bloccanti, corretti dopo:
  - il controllo sul nome era vacuo: ora si fa a pannello aperto;
  - con il filtro autore attivo il focus finiva su BODY: ora torna su "Aggiungi voce".
- **Verifiche avversariali della QA:**
  - 249 frasi reali passate da interprete a form: nessun valore inventato;
  - 87 anteprime confermabili, tutte accettate dal validatore reale del backend;
  - 566 nuovi tentativi simulati con `replayMatches` reale: nessun falso 409.

## Residual Risks

- "Cambia" nella scheda d'ingresso non è stato misurato: lo stub non ha gli endpoint della bozza. Il componente è lo stesso misurato in Terapia e nel diario.
- Preesistente, identico su origin/main: in Terapia un clic reale su "+ Aggiungi farmaco" richiude la sezione.
- Gli errori ESLint rimasti nei file toccati sono tutti preesistenti su origin/main (react-refresh, set-state-in-effect).
- La produzione è dietro Entra: la verifica finale sul dispositivo spetta all'utente, con ricarica forzata.

## Final Decision

CLOSED — VERIFIED
