# Task Contract

## Task

- Title: HMI parità 12: pannello Assistente come il prototipo
- Slug: hmi-parita-12-pannello-assistente-come-il-prototipo
- Type: feature
- Date: 2026-09-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |      yes |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

Il pannello dell'assistente (AgnosPanel) si apre in due modi: dalla voce "Assistente" della sidebar e da un pulsante flottante (`.ai-fab`), che nel prototipo non c'è. Il pannello si discosta dal prototipo HMI 1 (`artifacts/hmi-parity/proto/assistente.png`):

- La testata dice "Assistente virtuale IA" con un sottotitolo e un pulsante "Leggi risposte" con testo.
- La pagina dietro è oscurata.
- Le domande suggerite stanno in una card con titolo, aiuto e categorie, e ogni pulsante ha una freccia.
- Il composer ha un'etichetta, un'area di testo di 3 righe, "Parla" e "Invia richiesta" come pulsanti legacy, e testi d'aiuto.

## Expected Behaviour

Il pannello segue il prototipo senza perdere funzioni né garanzie:

- **Un solo accesso**: la voce "Assistente" della sidebar, che mostra lo stato aperto. Il pulsante flottante viene rimosso.
- **Testata**: "Assistente" con l'icona AI (viola, come nel prototipo) e l'etichetta "IA". Lettura vocale e chiusura sono `ds-icon-btn`; la lettura vocale conserva `aria-pressed` e il nome accessibile.
- **Dichiarazione**: sotto la testata, una riga in stile prototipo: "Assistente virtuale (IA), non un operatore umano: legge i dati della vista in cui sei. Ogni scrittura passa dalla scheda di conferma." Il perimetro (paziente corrente o tutti i pazienti autorizzati) resta visibile.
- **Pagina dietro**: non viene oscurata, ma il clic fuori dal pannello lo chiude come oggi.
- **Domande suggerite**: una lista di pulsanti canonici (`ds-btn--secondary`, a tutta larghezza, testo a sinistra, a capo se serve). Un clic compila il campo senza inviare, come oggi.
- **Composer**: campo "Chiedi o detta" (area di testo che cresce), microfono come `ds-icon-btn` ("Parla: detta una richiesta", `aria-pressed`) e invio come `ds-btn--primary`. Consenso vocale, trascrizione, stato, errore, "Interrompi lettura" e "Disattiva dettatura" restano invariati.
- **Invariati**: brief, turni, conferme, cronologia, navigazione, modalità workspace e riduzione, chiusura con Esc o X e nome accessibile del dialogo ("Assistente virtuale ClinicOS").

## Acceptance Criteria

- AC1: Nessun `.ai-fab` in nessuna pagina (operatore e admin). La voce "Assistente" della sidebar apre il pannello a tutte le larghezze (drawer a ≤1023px) e dichiara lo stato aperto (`aria-expanded`); chiudendo il pannello il fuoco torna alla voce.
- AC2: Testata come il prototipo ("Assistente" con icona e "IA"; lettura vocale e chiusura come `ds-icon-btn` 48px). Sotto compaiono la dichiarazione "non un operatore umano" e il perimetro. La pagina dietro non viene oscurata e il clic fuori chiude il pannello.
- AC3: Domande suggerite come lista di `ds-btn--secondary` a tutta larghezza. Un clic compila il campo senza inviare; nessuna domanda viene persa rispetto a oggi.
- AC4: Composer con placeholder "Chiedi o detta", microfono `ds-icon-btn` con `aria-pressed` e invio `ds-btn--primary`. Invio con Enter e con il pulsante; consenso e dettatura (simulati) funzionano come prima. L'audit DS non esenta più `.ai-fab` e passa a tutte le larghezze, con il pannello aperto compreso.
- AC5: npm run build passa; suite completa senza nuovi fallimenti rispetto alla baseline; test Agnos verdi.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                             |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | suite completa, test Agnos (agnos*.test.ts) e guardia DS                                                                                           |
| Integration               |       no | nessuna API toccata                                                                                                                                |
| API                       |       no |                                                                                                                                                    |
| Playwright                |      yes | evidence: apertura dalla sidebar, testata, dichiarazione, suggerimenti, composer, dettatura simulata, 5 larghezze; audit DS con il pannello aperto |
| Persistence after refresh |       no |                                                                                                                                                    |
| Agnos action registry     |       no | le azioni non cambiano                                                                                                                             |
| Voice simulation          |      yes | microfono e consenso con SpeechRecognition simulato                                                                                                |
| OCR/import test           |       no |                                                                                                                                                    |
| Security/privacy scan     |       no |                                                                                                                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots del pannello a 390/768/1024/1180/1440, accanto al prototipo
- log dell'evidence Playwright e dell'audit DS

## Risks

- Spostare il FAB: su telefono e tablet l'accesso passa dal drawer della sidebar (due tocchi). È il comportamento del prototipo.
- I testi della dichiarazione AI devono restare espliciti (trasparenza): la dichiarazione "non un operatore umano" non viene tolta, solo spostata.
- Lo spec non-CI `e2e/remediation/issue-239.spec.ts` apre l'assistente dal FAB: va aggiornato per usare la sidebar.

## Gate Status

READY FOR IMPLEMENTATION
