# Task Contract

## Task

- Title: Diario terapia 2: valida terapia dal diario con anteprima e link
- Slug: diario-terapia-2-valida-terapia-dal-diario-con-anteprima-e-link
- Type: feature
- Date: 2026-09-30

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Persistence: usa gli endpoint del PR 1 (#375, già in produzione), `POST /patients/:id/diary/therapy-preview` e `POST /patients/:id/diary/with-therapy`. Nessuna modifica al backend né allo schema.

Privacy: il testo clinico viaggia solo nel body delle richieste POST, mai nell'URL, e non viene registrato in console.

## Current Behaviour

Nel Diario Paziente si possono scrivere voci di testo (titolo, contenuto, priorità, stato), ma non c'è modo di trasformare una prescrizione scritta nel diario in una terapia: l'operatore deve riscriverla da capo nella sezione Terapia. Il backend dell'interprete e della creazione collegata esiste (PR 1), ma nessuna UI lo usa.

## Expected Behaviour

Richiesta dell'utente (2026-09-29): nel Diario Paziente si può scrivere una terapia; un pulsante "Valida terapia" mostra l'anteprima della terapia; chi la conferma la aggiunge direttamente in Terapia; la voce di diario mostra il link alla riga della terapia.

Decisioni dell'utente:

- conferma chi oggi può già prescrivere;
- interprete deterministico, senza mai inventare valori;
- il diario conserva il testo scritto più "Terapia aggiunta: <farmaco> — apri";
- due orari nella stessa fascia bloccano la creazione e suggeriscono due terapie.

Comportamento:

1. **Pulsante.** Nel modulo di nuova voce del diario, accanto a "Salva", c'è il pulsante secondario "Valida terapia" (`ds-btn ds-btn--secondary`). È disattivato se il contenuto è vuoto.
2. **Anteprima.** Il pulsante chiama `therapy-preview` con `{text, entryDateTime}` e apre un pannello di anteprima modificabile nello stesso modulo, riusando i campi di Terapia (`TherapyFormFields`). I campi sono precompilati dalla `row` della risposta; quelli vuoti restano vuoti.
   - Sopra i campi, un riepilogo mostra sempre in chiaro:
     - `warnings`: "Testo non riconosciuto: controlla le note", "Il testo menziona una sospensione/somministrazione/modifica";
     - `ambiguous`: orari ambigui, più farmaci;
     - `inferred`: date dedotte;
     - `fasciaConflicts`;
     - lo stato `da_verificare`.
   - Il testo originale resta visibile, in sola lettura.
3. **Intento non prescrittivo.** Se l'anteprima restituisce `intent` sospensione, somministrazione o modifica, non c'è nessun pulsante di conferma. Un messaggio spiega dove agire (giro terapia o sezione Terapia) e la voce si può comunque salvare come voce normale.
4. **Conferma.** "Conferma e aggiungi in Terapia" (`ds-btn--primary`) resta disattivato finché i campi obbligatori non sono validi. La validazione è la stessa del form Terapia (`therapyInputDiagnostics` / `therapyFormToInput`); i problemi vengono mostrati sui campi.
   - La conferma invia `with-therapy` con un `requestId` (UUID) nuovo per ogni versione dell'anteprima: ogni modifica ai campi ne genera uno nuovo, mentre un doppio clic o un nuovo tentativo sulla stessa versione riusa lo stesso.
   - Gli errori 400 e 409 del server (`fascia_conflict`, `schedule_required`, `unit_required`, `intent_not_prescription`, `request_id_reused`, errori di validazione) diventano messaggi in italiano nel pannello, senza perdere quanto inserito.
5. **Dopo la conferma.** La voce compare nel diario, il pannello si chiude e il modulo si svuota. La card della voce collegata mostra "Terapia aggiunta: <FARMACO> — apri", con il badge dello stato della terapia (attiva / sospesa / …) preso da `entry.therapy`.
   - "Apri" porta alla scheda Terapia della cartella con la riga di quella terapia messa a fuoco ed evidenziata.
   - Se la terapia è stata cancellata (`therapy` null ma `therapyId` era presente), la card mostra "Terapia non più presente", senza link.
6. **Invariati.** Nessun cambiamento a salvataggio, modifica ed eliminazione delle voci normali, né alla sezione Terapia, salvo il supporto alla terapia da mettere a fuoco. Il design system resta canonico: solo classi `ds-*`, con controlli da 48px su tablet e telefono.

## Acceptance Criteria

- **AC1.** Con il testo "Ramipril 5 mg 1 cpr per os ore 8" (stub o backend reale):
  - "Valida terapia" mostra l'anteprima con RAMIPRIL, 5 mg, 1 compressa, OS, 08:00;
  - la conferma crea la voce e la terapia con una sola chiamata `with-therapy`;
  - la card della voce mostra "Terapia aggiunta: RAMIPRIL — apri" con lo stato;
  - "apri" porta a Terapia con la riga evidenziata.
- **AC2.** Con un testo che genera avvisi o ambiguità, per esempio "Febbre Tachipirina 1000 mg 1 cpr per os ore 8" o "…ore 8 e 10", l'anteprima mostra gli avvisi e i campi vuoti non sono precompilati.
  - Se ci sono campi obbligatori vuoti, la conferma resta disattivata.
  - Con un conflitto di fascia la conferma è bloccata e il messaggio suggerisce due terapie.
- **AC3.** Con "Sospendere Ramipril" non c'è nessun pulsante di conferma, compare il messaggio sull'intento, e "Salva" come voce normale continua a funzionare.
- **AC4.** Idempotenza lato client:
  - un doppio clic su "Conferma" produce una sola chiamata, oppure due con lo stesso `requestId`;
  - una modifica di un campo dopo un errore genera un nuovo `requestId`;
  - un errore 409 o 400 mostra un messaggio senza perdere quanto inserito.
- **AC5.** Nessuna regressione:
  - salvataggio, modifica ed eliminazione di una voce normale funzionano come prima;
  - la sezione Terapia funziona come prima.
  - `npm run build` passa, e la suite unitaria non ha fallimenti nuovi rispetto alla baseline (9 noti).
  - Il test di guardia del design system passa.
- **AC6.** Layout a 390, 768, 1024, 1180 e 1440px senza scorrimento orizzontale, con controlli da almeno 44px su tablet e telefono.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                                       |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | mappatura dalla riga dell'anteprima al form di terapia (niente valori inventati, frazioni, orari, date, note); traduzione degli errori; gestione del `requestId` per versione dell'anteprima |
| Integration               |       no |                                                                                                                                                                                              |
| API                       |       no | backend invariato (PR 1)                                                                                                                                                                     |
| Playwright                |      yes | flussi AC1–AC4 con stub (`page.route`) e sweep di larghezze (AC6); screenshot                                                                                                                |
| Persistence after refresh |      yes | dopo il ricaricamento, la voce collegata mostra ancora link e stato (stub che restituisce `therapy`)                                                                                         |
| Agnos action registry     |       no |                                                                                                                                                                                              |
| Voice simulation          |       no |                                                                                                                                                                                              |
| OCR/import test           |       no |                                                                                                                                                                                              |
| Security/privacy scan     |      yes | nessun testo clinico negli URL o nei log della console                                                                                                                                       |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari e della build
- screenshot: anteprima pulita, anteprima con avvisi, intento bloccato, card con link, Terapia con la riga evidenziata, sweep di larghezze
- log dell'evidence Playwright

## Risks

- **Campi vuoti.** Molte frasi reali arrivano con i campi vuoti (interprete prudente), quindi l'operatore compila a mano. È voluto; va misurato sull'uso reale.
- **Dosaggio testuale.** "5 mg/5 ml" e "875/125 mg" non vanno mai convertiti in un numero: restano nelle note o come stringa, come nel mapping delle dimissioni.
- **Messa a fuoco in Terapia.** Se la riga non è nel primo caricamento, la messa a fuoco deve degradare con garbo: aprire Terapia senza errori.

## Gate Status

READY FOR IMPLEMENTATION
