# Task Validation Report

## Task

- Title: Terapia: modalità calendario della settimana
- Slug: terapia-modalita-calendario-della-settimana
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **`TherapyRoundsPage.tsx`**:
  - Selettore "Giro" / "Calendario": chip del design system con `aria-pressed`, in un gruppo con etichetta "Vista della terapia". Il giro resta il predefinito.
  - Il calendario ha una sua settimana (`weekOf`), separata dalla data del giro, che resta quella caricata. Si naviga con `DateNav`: "Settimana precedente/successiva" e "Oggi".
  - In modalità calendario il sottotitolo diventa "Calendario della settimana · 28 set – 4 ott 2026".
  - Il clic su una cella torna al giro, carica quel giorno e sceglie la fascia chiesta appena il giro è caricato. Il filtro torna su "Tutte".
- **`TherapyWeekCalendar.tsx`** (nuovo):
  - Tabella della settimana, da lunedì a domenica, con una riga per fascia.
  - Per ogni giorno fa una richiesta a `/therapy-slots/page`, lo stesso servizio del giro. Dalla risposta usa solo `summary`, cioè totali reali, mai conteggi ricostruiti.
  - Ogni giorno ha il suo stato: in caricamento "…", in errore "—" con avviso e "Riprova".
  - I totali non esatti vengono segnalati.
  - Oggi è marcato con `aria-current="date"`.
  - Ogni cella è un pulsante con un nome accessibile completo: giorno, ora, riepilogo e "Apri il giro".
- **`lib/therapyWeek.ts`** (nuovo):
  - `weekDays` calcola la settimana da lunedì.
  - `weekFasce` elenca le fasce della settimana, in ordine orario.
  - `cellTone` assegna lo stato della cella: vuota, completa, da fare, futura, da verificare. "Da verificare" vale per una fascia passata con somministrazioni senza registrazione: non vuol dire che siano state saltate.
  - `cellLabel` restituisce il testo del riepilogo.
- **`TherapyWeekCalendar.css`** (nuovo): la cella usa i token del design system; la colonna delle ore resta ferma quando si scorre su telefono.
- **Correzione trovata durante le evidenze**: cambiando settimana, le risposte venivano scartate e il calendario restava in "Caricamento". Ora una settimana nuova riparte da uno stato vuoto (le richieste della settimana precedente vengono annullate).

## Files Changed

- frontend/src/components/operator/TherapyRoundsPage.tsx, TherapyWeekCalendar.tsx (nuovo), TherapyWeekCalendar.css (nuovo)
- frontend/src/lib/therapyWeek.ts (nuovo); test lib/\_\_tests\_\_/therapyWeek.test.ts (nuovo)
- frontend/src/App.tsx (stato therapyDate passato alla pagina Terapia)
- artifacts: ds-audit.mjs del design system esteso alla modalità calendario

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                 |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | "Giro" è premuto di default. Il calendario mostra 7 colonne da lunedì, con oggi evidenziato, e le fasce 08:00/12:00/20:00. Oggi alle 08:00 la cella dà 5/5 "completa", alle 20:00 0/3 "3 da fare". Il sottotitolo è quello del calendario.                                                                               |
| AC2 |   PASS | Cella di oggi alle 20:00: torna al Giro con la data di oggi e la fascia 20:00 premuta. Settimana successiva, mercoledì alle 12:00: apre il giro del 7 ottobre sulla fascia 12:00.                                                                                                                                        |
| AC3 |   PASS | Ieri alle 08:00, con 2 somministrazioni senza registrazione: "3/5 · 2 da verificare", con etichetta accessibile "3 registrate su 5, 1 non somministrate, 2 senza registrazione. Apri il giro". Un giorno passato completo: 4/4. Domani: "futura" 0/3. Oggi è marcato con `aria-current`.                                 |
| AC4 |   PASS | Giorno in errore (500): la cella mostra "—", compare l'avviso e "Riprova" ricarica il giorno. Nella settimana successiva nessun giorno è "oggi". Nessuno scorrimento della pagina a 390, 768, 1024 e 1440. Audit del design system 13/13 su 99 stati pagina, calendario compreso. Giro terapia 28/28, senza regressioni. |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 885/894, con i soli 9 fallimenti della baseline; therapyWeek 4/4; eslint pulito.                                                                                                                                                                                                         |

## Test Results

| Test                                                       | Result | Evidence                                       |
| ---------------------------------------------------------- | -----: | ---------------------------------------------- |
| Unit                                                       |   PASS | therapyWeek 4/4; suite completa (baseline)     |
| Playwright                                                 |   PASS | evidence.mjs 17/17; ds-audit 13/13; giro 28/28 |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | stesso servizio delle fasce, nessun cambio API |

## Runtime Evidence

- screenshots/calendario-1180.png, calendario-settimana-precedente-1180.png, giro-dalla-cella-1180.png,
  calendario-390/768/1024/1440.png; logs/ds-audit.txt

## Independent QA

- Primo giro (clinicos-qa): FAILED VALIDATION. Bloccante: dopo un salto dal calendario a un altro giorno, al rientro in Terapia la pagina ripartiva da oggi mentre i dati erano del giorno caricato, e "Somministra" inviava la data sbagliata (causa precedente, resa comune dal calendario). Avvisi: giorni con totali non esatti non visibili sulla cella, testo per lettori di schermo su span senza ruolo, colori esadecimali, fascia richiesta rimasta in attesa dopo un errore.
- Correzioni: App passa alla pagina il giorno caricato (therapyDate); celle 'parziale' senza colore di stato e avviso che nomina i giorni; testo ds-sr-only; token --emerald/--amber; fascia richiesta azzerata sull'errore. Due check nuovi nelle evidenze (rientro dopo il salto, giorno non esatto).
- Secondo giro (clinicos-qa): READY FOR QA. Riproduzione del bloccante ripetuta: data, righe e POST coincidono (2026-09-29). Rientro con caricamento lento, errore seguito da DateNav, admin in sola lettura, 6 cambi di settimana rapidi, tastiera e larghezze: tutti PASS. Suite 885/894 (baseline), build ok, audit DS 13/13 su 99 + 66 stati.

## Residual Risks

- Le celle del calendario sono un componente dichiarato nell'audit DS (come le righe del giro e le card del turno): stesso raggio e bordo del DS, altezza 56px. Segnalato all'utente.
- "Oggi" e l'ora corrente del calendario si calcolano al render; il calendario non controlla roster.asOf (lo fa il giro).

- Il calendario fa 7 richieste, una per giorno, ciascuna indipendente e annullata se si cambia settimana.
- "Da verificare" indica solo che manca la registrazione per una fascia già passata: il dato non dice se la somministrazione è avvenuta o no.

## Final Decision

CLOSED — VERIFIED
