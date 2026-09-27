# Task Validation Report

## Task

- Title: Navigazione: freccia indietro globale che ripristina contesto, paziente e sezione
- Slug: navigazione-freccia-indietro-globale-che-ripristina-contesto-paziente-e-sezione
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **Nuovo `frontend/src/lib/navHistory.ts`:**
  - `NavEntry`: pagina, id paziente, nome (solo per l'etichetta), sezione della cartella.
  - `navHistoryState` costruisce `history.state` con `prevLabel`, cioè dove porta "indietro".
  - `navEntryLabel` produce "Pazienti" oppure "Cognome, Nome · Sezione".
- **`App.tsx`:**
  - `pushNav(key, paziente?, patientTab?)` salva la voce completa e aggiorna l'etichetta della
    freccia.
  - `pushPatientTab` aggiunge una voce a ogni cambio di sezione della cartella, ma non se la
    sezione resta la stessa.
  - Su `popstate`, `restoreNavEntryRef` ripristina il paziente giusto (lettura mirata
    `GET /patients/:id` se diverso da quello aperto) e la sezione, tramite
    `initialTab` + `navigationRequestId` già esistenti.
  - Nuova freccia `.topbar-back` nella barra superiore, con la destinazione (solo icona sotto
    767px). La freccia della testata della cartella usa la stessa etichetta.
- **`PatientDetail.tsx`:** prop `onTabNavigate`, chiamata solo sulle scelte dell'operatore
  (`switchTab`/`switchGroup`), mai sui ripristini.
- **`App.css`:** stile `.topbar-back` con i token esistenti.

## QA round 1 (FAILED VALIDATION) → correzioni

1. **[BLOCCANTE] Corsa sul paziente:** con due "indietro" rapidi, una lettura del paziente partita
   col primo poteva arrivare dopo il secondo e mostrare A mentre URL e cronologia puntavano a B.
   **Corretto:** ogni ripristino incrementa `patientNavigationSequenceRef` prima di tutto, quindi le
   letture vecchie vengono scartate. Nuovo scenario R: cronologia diretta A↔B dalla ricerca
   globale, letture lente di 1500 ms, due "indietro" a 150 ms. La testata mostra il paziente
   dell'URL.
2. **Dopo una ricarica:** freccia e passi di sezione si perdevano. **Corretto:** all'avvio la voce
   corrente e la destinazione si riprendono da `history.state` (profondità 1 se esiste una voce
   precedente), e si riapre anche la sezione salvata. Nuovo scenario L: sezione ripristinata,
   freccia presente, un cambio di sezione aggiunge una voce.
3. **Nome per l'etichetta** quando il paziente arriva dopo: completato da un effetto su
   `pazienteSelezionato`.

## QA round 2 (FAILED VALIDATION) → correzione

- **[BLOCCANTE] Cartella vuota:** la correzione della corsa incrementava
  `patientNavigationSequenceRef`, usato anche da `loadCartella`. Un "indietro" durante il
  caricamento della cartella la scartava, e la scheda mostrava una cartella vuota ("Nessuna
  diagnosi registrata") come se fosse reale.
- **Corretto:**
  - un contatore dedicato `restoreSequenceRef` invalida solo le letture di paziente avviate da un
    ripristino; si scartano anche se nel frattempo c'è stata una nuova navigazione;
  - se il paziente è già a schermo ma la sua cartella non è caricata, il ripristino la ricarica.
- **Nuovo scenario D:** cartella in ritardo di 2 s, cambio di sezione, "indietro" durante il
  caricamento. Clinica mostra le diagnosi reali. Lo scenario R (corsa) resta verde.

## QA round 3 (FAILED VALIDATION) → correzione

- **[BLOCCANTE] Ricarica lenta + "indietro":** la lettura del paziente dall'URL dopo una ricarica
  non era più annullata dal ripristino, e poteva sovrascrivere il paziente ripristinato.
- **Corretto:** quella lettura cattura `restoreSequenceRef` e viene scartata se nel frattempo c'è
  stato un ripristino. Il flag di caricamento si azzera comunque.
- **Nuovo scenario H:** ricarica su B con lettura di B in ritardo di 2,5 s, poi "indietro" subito.
  URL e testata mostrano A.

## Files Changed

- frontend/src/lib/navHistory.ts (nuovo)
- frontend/src/lib/**tests**/navHistory.test.ts (nuovo)
- frontend/src/App.tsx
- frontend/src/components/operator/PatientDetail.tsx
- frontend/src/App.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                 |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | test-results/unit.txt 5/5                                                                                                                                                                                                |
| AC2 |   PASS | logs/playwright-evidence.txt, passi 1–10: da B indietro alla lista, poi al paziente A (non B) nella sezione Clinica › Diagnosi, poi Contatti, Anagrafica, Pazienti, Dashboard. Le etichette sono verificate a ogni passo |
| AC3 |   PASS | passi 2–3 (etichetta della sezione precedente) e 6–8 (ripristino delle sezioni)                                                                                                                                          |
| AC4 |   PASS | passi 0 e 10: senza cronologia la freccia non c'è                                                                                                                                                                        |
| AC5 |   PASS | build.txt exit 0 (frontend); unit-full.txt 810/819, stessi 9 fallimenti della baseline. I test di contratto sulla navigazione passano                                                                                    |

## Test Results

| Test             | Result | Evidence                                                                                                                                         |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit             |   PASS | unit.txt 5/5; unit-full.txt 810/819 (9 preesistenti)                                                                                             |
| Integration      |     NA |                                                                                                                                                  |
| API              |     NA |                                                                                                                                                  |
| Playwright       |   PASS | evidence.mjs 21/21 (stub API + preview), compreso il tasto indietro del browser                                                                  |
| Persistence      |     NA | navigazione di sessione                                                                                                                          |
| Agnos AI         |     NA |                                                                                                                                                  |
| Voice            |     NA |                                                                                                                                                  |
| OCR              |     NA |                                                                                                                                                  |
| Security/privacy |   PASS | URL = `/#/dettaglio-paziente/<id>`, nessun nome (passo "privacy"). Il nome compare solo in `history.state.prevLabel`, nella sessione del browser |

## Runtime Evidence

- screenshots/1-freccia-su-sezione.png ("‹ Moretti, Andrea · Contatti")
- screenshots/2-paziente-B.png
- screenshots/3-tornato-su-A-clinica.png

## Logs

Only sanitized logs are allowed. I nomi nel log sono pazienti sintetici dello stub.

## Residual Risks

- Gli stati interni di altre pagine (data della Terapia, filtri della lista, modalità Consegne)
  non entrano nella cronologia: "indietro" riporta alla pagina, non al filtro.
- Una sessione aperta direttamente da un link `#/dettaglio-paziente/<id>` non ha voci
  precedenti, quindi la freccia compare dal primo passo in poi.

## QA

- QA indipendente in 4 giri:
  - giri 1–3: FAILED VALIDATION. Ogni giro ha trovato una corsa o una regressione reale sul
    paziente o sulla cartella, tutte corrette e coperte dagli scenari R, D, H;
  - giro 4: READY FOR QA, con gli scenari avversari S1–S7 e V3 superati.
- Variante V4, non bloccante (clic su una sezione mentre un ripristino è in caricamento):
  corretta dopo il giro 4, perché `pushPatientTab` ignora il clic se il paziente della voce
  corrente non è quello a schermo. Prova 21/21, suite 810/819 (baseline), build ok.

## Final Decision

CLOSED — VERIFIED
