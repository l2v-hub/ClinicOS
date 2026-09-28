# Task Contract

## Task

- Title: Terapia: modalità calendario della settimana
- Slug: terapia-modalita-calendario-della-settimana
- Type: feature
- Date: 2026-09-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

La sezione Terapia mostra solo il giro di un giorno: fasce, righe di somministrazione e navigazione per data. Per vedere l'andamento di più giorni bisogna cambiare data un giorno alla volta.

La richiesta dell'utente: "nella sezione Terapia mostra un pulsante che switch in modalità calendario".

## Expected Behaviour

- **Selettore di modalità**: "Giro" / "Calendario", due chip del design system con `aria-pressed`, nella barra strumenti della pagina. Il giro resta la modalità predefinita.
- **Calendario della settimana** (da lunedì a domenica, con la settimana del giorno scelto):
  - una colonna per giorno, una riga per fascia oraria;
  - una cella per giorno e fascia con "registrate/totale", presi dai totali reali del servizio delle fasce (`/therapy-slots/page` giorno per giorno, stesso servizio del giro);
  - nessun conteggio stimato o ricostruito.
- **Stato di ogni cella**, dichiarato in testo e per i lettori di schermo:
  - completa: tutte registrate;
  - da fare: oggi, ancora da fare;
  - da verificare: fascia passata con somministrazioni senza registrazione. Il dato dice solo che manca la registrazione, non che è stata saltata;
  - futura;
  - vuota: nessuna somministrazione.
- **Il clic su una cella apre il giro** di quel giorno su quella fascia.
- **Navigazione**: `DateNav` del design system (settimana precedente/successiva, "Oggi").
- **Stati onesti**:
  - caricamento per giorno;
  - un giorno non caricato mostra "—", con un avviso e "Riprova";
  - totali non esatti (`summaryExact` falso) segnalati.
- **Sola lettura (admin)**: il calendario è visibile; il giro che si apre resta in sola lettura come oggi.

## Acceptance Criteria

- AC1: il pulsante "Calendario" mostra la settimana con 7 colonne (lunedì–domenica), le fasce in ordine orario e "registrate/totale" per cella, coerenti con i totali del servizio per quel giorno. "Giro" torna alla vista di sempre.
- AC2: il clic su una cella apre il giro su quel giorno e su quella fascia (chip della fascia premuta, righe della fascia).
- AC3: gli stati sono corretti: da verificare, da fare, completa, vuota. Il nome accessibile della cella riporta giorno, ora e riepilogo. Il giorno odierno è evidenziato (`aria-current="date"`).
- AC4:
  - un giorno che risponde 500 mostra "—", l'avviso e "Riprova", e "Riprova" ricarica;
  - la settimana precedente/successiva ricarica;
  - nessuno scorrimento della pagina a 390, 768, 1024, 1180 e 1440: la tabella scorre dentro il suo riquadro;
  - l'audit del design system resta 13/13.
- AC5: la build passa; nessun nuovo test fallito rispetto alla baseline; test unitari per settimana, fasce e stato delle celle.

## Test Plan

| Test type                 | Required | Reason                                             |
| ------------------------- | -------: | -------------------------------------------------- |
| Unit                      |      yes | weekDays, weekFasce, cellTone, cellLabel           |
| Integration               |       no |                                                    |
| API                       |       no | stesso servizio delle fasce                        |
| Playwright                |      yes | selettore, celle, apertura giro, errori, larghezze |
| Persistence after refresh |       no |                                                    |
| Agnos action registry     |       no |                                                    |
| Voice simulation          |       no |                                                    |
| OCR/import test           |       no |                                                    |
| Security/privacy scan     |       no |                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; screenshot del calendario

## Risks

- Il calendario fa 7 richieste, una per giorno. Sono indipendenti: un giorno in errore non nasconde gli altri.

## Gate Status

READY FOR IMPLEMENTATION
