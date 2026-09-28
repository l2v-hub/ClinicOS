# Task Validation Report

## Task

- Title: HMI parità 12: pannello Assistente come il prototipo
- Slug: hmi-parita-12-pannello-assistente-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **Un solo accesso**: il pulsante flottante `.ai-fab` è stato tolto (App.tsx e AgnosPanel.tsx; CSS rimosso). L'assistente si apre dalla voce "Assistente" della sidebar. La voce dichiara `aria-expanded` e `aria-haspopup="dialog"` e resta evidenziata mentre il pannello è aperto (`assistantOpen`). Alla chiusura il fuoco torna sulla voce, oppure sul pulsante del menu quando la sidebar è il drawer chiuso.
- **Testata come il prototipo**: "✧ Assistente" in viola con l'etichetta "IA". Lettura vocale e chiusura sono `ds-icon-btn` da 48px; la lettura vocale conserva `aria-pressed` e il nome accessibile.
- **Dichiarazione sotto la testata**: "Assistente virtuale (IA), non un operatore umano: legge i dati della vista in cui sei. Ogni scrittura passa dalla scheda di conferma." Subito sotto, il perimetro (paziente corrente o tutti i pazienti autorizzati).
- **Pagina dietro**: non si oscura più e non c'è nessun velo. Un clic fuori chiude il pannello e prosegue: per esempio "Pazienti" naviga al primo clic, e il fuoco resta dove si è cliccato.
- **Esc**: chiude il pannello ed è ascoltato sul documento, quindi funziona ovunque sia il fuoco. Con il consenso vocale aperto chiude solo il consenso e il fuoco torna al microfono. Esc e clic fuori sono lasciati ai `dialog` e agli `alertdialog` aperti sopra.
- **Voce "Assistente"**: fa da interruttore (apre, chiude e ferma la dettatura). Il suo `aria-expanded` segue la visibilità reale del pannello, quindi è false in modalità ridotta.
- **Domande suggerite**: sono un elenco di `ds-btn ds-btn--secondary ds-btn--block`, cioè pulsanti a tutta larghezza con testo a sinistra, che vanno a capo senza tagli. Titolo e aiuto restano per i lettori di schermo; le categorie compaiono solo se sono più d'una. Un clic compila il campo e non invia.
- **Composer**: campo "Chiedi o detta" (`form-input` canonico da 48px che cresce col testo), microfono `ds-icon-btn` con `aria-pressed` e invio `ds-btn--primary`. Consenso, trascrizione, stato, errori, "Interrompi lettura", "Annulla dettatura" e "Disattiva dettatura" sono invariati. L'etichetta del campo è visibile solo quando descrive una trascrizione da controllare.
- **Brief**: il testo d'aiuto non ripete più la dichiarazione. Restano gli esempi e le garanzie ("salvata solo dopo la tua conferma", "Non elimino mai dati e non fornisco diagnosi né terapie").
- **Design system**:
  - Pulsante icona premuto (`[aria-pressed='true']`), che l'hover non copre.
  - Pulsante icona in registrazione (`ds-icon-btn--recording`, l'unico rosso di un controllo, con una pulsazione disattivata se il sistema chiede meno animazioni).
  - Pulsante a tutta larghezza `ds-btn--block`.
  - Tolte le regole di pagina che ridisegnavano lettura vocale e microfono.
- **Guardia** designSystem.test.ts: nessun `ai-fab` nel markup, nessuna regola di pagina su `.ai-fab`, `.agnos-tts` e `.agnos-mic`, e stati premuto/registrazione presenti nel design system.
- **Audit DS**: tolta l'esenzione `.ai-fab`, aggiunta la scena "assistente" (pannello aperto) e la categoria "scelta-in-elenco".
- **e2e non-CI** `issue-239.spec.ts`: apre l'assistente dalla sidebar.

## Files Changed

- frontend/src/App.tsx, App.css, app-additions.css, design-system.css
- components/shared/AgnosPanel.tsx, TeamsLikeSidebar.tsx
- components/shared/agnos/AgnosComposer.tsx, AgnosSuggestedPrompts.tsx, AgnosBrief.tsx, AgnosWorkflow.css
- lib/\_\_tests\_\_/designSystem.test.ts
- e2e/remediation/issue-239.spec.ts
- artifacts: ds-audit.mjs del design system

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Nessun `.ai-fab` per Operatore a 1180 e 390 e per Amministratore a 1180. "Assistente" apre il pannello e passa `aria-expanded` da false a true. Esc chiude il pannello e il fuoco torna alla voce (1180) o al menu (390).                                                                                                                                                                                                                                               |
| AC2 |   PASS | Testata "Assistente IA". Lettura vocale e chiusura sono `ds-icon-btn` 48×48; la lettura vocale, premuta, ha `aria-pressed=true` e il fondo del design system. Dichiarazione e perimetro sono visibili. Nessun velo; il clic fuori chiude e prosegue.                                                                                                                                                                                                                          |
| AC3 |   PASS | Suggerimenti come `ds-btn--secondary ds-btn--block` a tutta larghezza, testo a sinistra, altezza minima 48. Un clic compila il campo con "Cosa devo fare adesso?" senza inviare.                                                                                                                                                                                                                                                                                        |
| AC4 |   PASS | Campo "Chiedi o detta" come `form-input` 48/2/12/16; microfono `ds-icon-btn` con `aria-pressed`; "Invia richiesta" come `ds-btn--primary`. Enter invia (un piano col testo scelto). Dettatura simulata: consenso, poi microfono premuto e rosso con la trascrizione; "Termina" invia la proposta come prima. A 390, 768, 1024 e 1440 nessuno scorrimento orizzontale, campo e microfono dentro il pannello. Audit DS 19/19 su 102 + 68 stati, pannello aperto compreso. |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 888/897, con i soli 9 fallimenti della baseline e i test Agnos compresi; guardia DS 11/11.                                                                                                                                                                                                                                                                                                                                              |

## Test Results

| Test                                         | Result | Evidence                                   |
| -------------------------------------------- | -----: | ------------------------------------------ |
| Unit                                         |   PASS | suite completa (baseline), guardia DS      |
| Playwright                                   |   PASS | evidence.mjs 22/22; ds-audit 19/19 + 19/19 |
| Voice simulation                             |   PASS | SpeechRecognition/getUserMedia simulati    |
| Integration, API, Persistence, OCR, Security |     NA | nessuna API toccata                        |

## Runtime Evidence

- screenshots/assistente-1180.png (accanto a hmi-parity/proto/assistente.png), dettatura-1180.png, assistente-390/768/1024/1440.png
- logs/playwright-evidence.txt, ds-audit-390-768-1180.txt, ds-audit-1024-1440.txt, unit-full.txt, build.txt

## Independent QA

- **Primo giro (clinicos-qa): FAILED VALIDATION.** Esc non chiudeva il pannello durante la dettatura, con il consenso aperto e dopo "Annulla" del consenso, perché il fuoco finiva su body. Avvisi:
  - testo "premi Termina";
  - velo invisibile che assorbiva il primo clic;
  - parole lunghe nei suggerimenti;
  - `aria-expanded` in modalità ridotta;
  - `field-sizing`;
  - script e2e che usavano `.ai-fab`;
  - `aria-label` su un `<p>`;
  - pulsanti legacy nel consenso.

  Tutti corretti.

- **Secondo giro: FAILED VALIDATION.** La correzione del clic fuori spostava il fuoco sulla sidebar, e il testo scritto nel campo cliccato andava perso. Avvisi: `alertdialog` non escluso; la voce della sidebar non richiudeva. Tutti corretti.
- **Terzo giro: READY FOR QA.**
  - Scrittura dopo il clic fuori, a 1180 e 768, in Pazienti e Parametri.
  - `alertdialog` sintetico: il clic dentro non chiude; il primo Esc chiude solo la conferma.
  - Interruttore della sidebar, anche durante la dettatura e dalla modalità ridotta.
  - Regressione su Esc e fuoco.
  - Suite 888/897 (baseline); audit 19/19 su 102 e 68 stati; evidence 22/22.

## Residual Risks

- L'esclusione degli `alertdialog` è verificata con un dialogo sintetico: nello stub non si raggiunge una conferma reale sopra il pannello.
- Su telefono e tablet l'assistente si apre dal menu (due tocchi), come nel prototipo. Il pulsante flottante non c'è più.
- Il suggerimento già scelto non ha più un evidenziamento proprio (prima aveva un bordo blu): il testo è visibile nel campo.
- A 390 e 768 la voce "Assistente" non richiude il pannello (a 390 il pannello copre il menu, a 768 il clic sul menu è già un clic fuori): si chiude con X, Esc o clic fuori.
- `AIAssistantButton.tsx` (assistente precedente, oggi usato solo per tipi e `AnswerView`) contiene ancora un `ai-fab` nel suo componente, che non viene renderizzato.

## Final Decision

CLOSED — VERIFIED
