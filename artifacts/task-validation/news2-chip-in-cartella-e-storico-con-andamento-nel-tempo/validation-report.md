# Task Validation Report

## Task

- Title: NEWS2: chip in cartella e storico con andamento nel tempo
- Slug: news2-chip-in-cartella-e-storico-con-andamento-nel-tempo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`frontend/src/lib/news2.ts`:** soglie RCP 2017 per i sette parametri, scala SpO₂ 1.
  - PA: si usa la sistolica.
  - O₂ sì vale 2.
  - Coscienza: A vale 0, C/V/P/U valgono 3.
  - TC accetta la virgola decimale.
  - Una rilevazione incompleta ha `risk = null`, e non espone mai un totale come NEWS2.
- **`frontend/src/lib/news2History.ts`:** punti ordinati dal più recente, ultima rilevazione
  completa, tono visivo.
- **`News2Chip.tsx` + `News2.css`:**
  - chip nella testata della cartella, calcolato sull'ultima rilevazione completa, con ora e
    colore di rischio (rosso solo per ≥ 5);
  - senza rilevazioni complete il chip dice "non calcolabile" e ne spiega il motivo;
  - toccando il chip si apre lo storico: valutazione attuale e risposta clinica, grafico a
    fasce, tabella con sotto-punteggi, righe incomplete senza totale, "Carica rilevazioni
    precedenti" e la dichiarazione su scala SpO₂ 1 e supporto alla decisione.
- **`patientParameterReadings.saveParameterReading`:** emette
  `clinicos:parameter-reading-saved`, così il chip si aggiorna subito dopo un nuovo salvataggio.
- **`PatientCompactHeader`:** il chip compare accanto al badge Allergie.

## QA round 1 (FAILED VALIDATION) → correzioni

1. **[BLOCCANTE] Falsa rassicurazione:** il chip mostrava un NEWS2 0 verde di giorni prima (con
   la sola ora) mentre c'era una rilevazione recente incompleta e preoccupante.
   **Corretto:**
   - la data compare quando non è di oggi;
   - "da aggiornare" se esistono rilevazioni più recenti incomplete o se il punteggio ha più di
     12 ore;
   - in quel caso i toni rassicuranti (verde/blu) diventano neutri, mentre un rischio alto resta
     visibile;
   - lo storico spiega il perché.

   Scenario S.
2. **[BLOCCANTE] Errore presentato come assenza di dati.**
   **Corretto:** chip "NEWS2 non caricato"; lo storico dice che il caricamento non è riuscito, con
   "Riprova". Scenario E.
3. **Errore sulle pagine precedenti non gestito.**
   **Corretto:** messaggio visibile, nessuna eccezione. Scenario M.
4. **Letture annullabili:** ogni lettura annulla la precedente (anche l'aggiornamento dopo un
   salvataggio).
5. **Valori non plausibili o malformati** ("368" °C, "0x1F", "1e1", "-5", SpO₂ 150, PA senza
   diastolica) rendono il parametro illeggibile. La rilevazione diventa incompleta e non mostra
   un punteggio falso. Unit test.
6. **Colori:**
   - rosso solo per il totale ≥ 5 (chip, fasce 5–6 e ≥ 7 in rosso chiaro/pieno);
   - sotto-punteggio +3 in ambra;
   - +1/+2 neutri.
7. **Grammatica:** "c'è 1 rilevazione incompleta".

## QA round 2 (READY FOR QA) → avvisi chiusi

1. Il pulsante "Carica rilevazioni precedenti" restava bloccato se un aggiornamento annullava il
   caricamento. **Corretto:** `load()` azzera `loadingMore`. Scenario R6.
2. La soglia "da aggiornare" ora segue la frequenza minima RCP di ogni livello:
   - 0 → 12 h;
   - 1–4 → 6 h;
   - singolo 3 e 5–6 → 1 h;
   - ≥ 7 → 1 h per le rilevazioni manuali.

   Unit test e scenario R7 (NEWS2 1 di 8 h fa → da aggiornare).
3. Il tooltip di un punteggio da aggiornare si apre con "Da aggiornare.".

## QA round 3 (FAILED VALIDATION) → correzione

- **[BLOCCANTE, mobile]** A 390 px l'etichetta "… · da aggiornare" veniva tagliata dalla testata.
  **Corretto:** il chip può andare a capo e non supera mai la larghezza disponibile. Nuovo
  scenario P (390 px): testo intero, bordo destro dentro la testata e lo schermo, nessun
  taglio. screenshots/P-chip-390.png.

## Files Changed

- frontend/src/lib/news2.ts, frontend/src/lib/news2History.ts (nuovi) + test
- frontend/src/components/operator/News2Chip.tsx, News2.css (nuovi)
- frontend/src/components/operator/PatientCompactHeader.tsx
- frontend/src/lib/patientParameterReadings.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                        |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | test-results/unit.txt 15/15: tutti i confini di fascia di FR, SpO₂, O₂, PAS, FC, coscienza, TC; livelli di rischio; set incompleto → nessun rischio             |
| AC2 |   PASS | logs/playwright-evidence.txt A: "NEWS2 6 · hh:mm" rosso, dall'ultima COMPLETA e non dalla parziale più recente. N: "NEWS2 non calcolabile"                      |
| AC3 |   PASS | H: grafico con 4 punti (solo complete), 5 righe con la parziale "Incompleta · mancano …" senza totale, sotto-punteggi, dichiarazione. screenshots/H-storico.png |
| AC4 |   PASS | U: rilevazione completa salvata dal modulo della cartella → il chip passa a "NEWS2 0" verde senza ricaricare                                                    |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 821/830, stessi 9 fallimenti della baseline                                                                                     |

## Test Results

| Test             | Result | Evidence                                                 |
| ---------------- | -----: | -------------------------------------------------------- |
| Unit             |   PASS | unit.txt 15/15; unit-full.txt (baseline)                 |
| Integration      |     NA |                                                          |
| API              |     NA | endpoint esistente in sola lettura                       |
| Playwright       |   PASS | evidence.mjs 18/18 (rilevazioni simulate con page.route) |
| Persistence      |     NA |                                                          |
| Agnos AI         |     NA |                                                          |
| Voice            |     NA |                                                          |
| OCR              |     NA |                                                          |
| Security/privacy |     NA |                                                          |

## Runtime Evidence

- screenshots/A-chip-testata.png, screenshots/H-storico.png

## Logs

Only sanitized logs are allowed. Solo esiti.

## Residual Risks

- **Soglie cliniche:** sono quelle pubblicate dall'RCP. L'adozione in reparto va validata dal
  direttore sanitario; il tool lo dichiara.
- **Scala SpO₂ 2** (BPCO con target 88–92%) non gestita. È dichiarato nello storico.
- **Dati limitati:** il chip usa la prima pagina di rilevazioni (le 50 più recenti). Se nessuna
  di queste è completa dice "non calcolabile" anche se ce n'è una più vecchia. È voluto: un
  NEWS2 vecchio non descrive lo stato attuale. Nello storico si possono caricare le pagine
  precedenti.
- **Legacy:** le rilevazioni della griglia mensile storica e dei `parametriVitali` non hanno i
  campi NEWS2, quindi non entrano nel calcolo.

## QA

QA indipendente in 4 giri:
- FAILED al giro 1 (falsa rassicurazione, errore presentato come assenza di dati);
- READY al giro 2, con 3 avvisi poi chiusi;
- FAILED al giro 3 (etichetta tagliata a 390 px);
- READY FOR QA al giro 4, con verifiche proprie a 390 e 1024 px.

Restano per il responsabile clinico:
- i valori decimali fra due righe della tabella RCP ricevono il punteggio più mite;
- se le prime 50 rilevazioni sono tutte incomplete, il chip dice "non calcolabile".

## Final Decision

CLOSED — VERIFIED
