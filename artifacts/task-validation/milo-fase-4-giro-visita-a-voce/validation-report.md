# Task Validation Report

## Task

- Title: Milo fase 4 giro visita a voce
- Slug: milo-fase-4-giro-visita-a-voce
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (commit «Milo fase 4»)
- Date: 2026-11-22

## Implementation Summary

Nel pannello di Milo, «Inizia giro visita» oppure il comando «giro visita» apre il giro.

L'operatore detta, con il microfono del browser e il consenso esplicito già usato da Milo, oppure
scrive. Può dettare più pazienti e più parametri di seguito. Il parser deterministico
`lib/wardRound.ts`:

- divide il testo per paziente, riconoscendo cognome, nome e stanza/letto fra i primi 100 pazienti
  del perimetro;
- riconosce PA, SpO₂, FC, FR, temperatura, glicemia, ossigeno e coscienza ACVPU, anche con i numeri
  scritti in parole;
- attribuisce i frammenti senza nome al paziente precedente.

Per ogni paziente nasce una bozza modificabile, con lo stesso controllo di formato della pagina
Parametri. Le bozze vivono solo nella memoria della pagina: sopravvivono alla chiusura del pannello,
non sono salvate nel browser.

«Conferma e registra» invia UNA rilevazione alla rotta esistente
`POST /patients/:id/parameter-readings`. In caso di errore la bozza resta, con lo stesso
`requestId`.

«Termina giro» mostra il riepilogo: registrati, rimasti in bozza, frammenti senza paziente.

Nessuna modifica a backend, schema o rotte.

## Files Changed

- `frontend/src/lib/wardRound.ts` (nuovo).
- `frontend/src/components/shared/agnos/WardRound.tsx` (nuovo).
- `frontend/src/components/shared/AgnosPanel.tsx`: ingresso, ripresa e comando.
- `frontend/src/App.css`.
- Test: `frontend/src/lib/wardRound.test.ts`, `frontend/src/components/shared/agnos/wardRoundPanel.test.ts`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                               |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/frontend-milo-phase4.log`: 5 pazienti dettati in 5 frammenti → 5 bozze con tutti i valori attesi, nessun frammento non attribuito                                                                                                |
| AC2 |   PASS | `wardRoundPanel.test.ts`: dettare non chiama la rete; la conferma invia una sola rilevazione del paziente; dopo l'errore il nuovo tentativo ha lo stesso corpo e lo stesso `requestId`; un paziente già registrato non viene reinviato |
| AC3 |   PASS | `wardRound.test.ts`: cognome ambiguo con candidati, cognome e letto in conflitto, letto sconosciuto, testo senza paziente, PA 120/800 e temperatura 375 rifiutate, ossigeno contraddittorio; formato controllato prima della conferma  |
| AC4 |   PASS | `roundSummary` (test) e la vista «Fine giro»                                                                                                                                                                                           |
| AC5 |   PASS | stato solo in memoria (`WardRound.tsx`): nessun `localStorage` o `sessionStorage`                                                                                                                                                      |
| AC6 |   PASS | frontend 1621/0, typecheck, build                                                                                                                                                                                                      |

## Test Results

| Test             |  Result | Evidence                                                                                       |
| ---------------- | ------: | ---------------------------------------------------------------------------------------------- |
| Unit             |    PASS | `logs/frontend-milo-phase4.log` (9/9)                                                          |
| Integration      |    PASS | conferma → richiesta alla rotta dei parametri con funzione di salvataggio simulata             |
| API              |      NA | rotta esistente, invariata                                                                     |
| Playwright       | NOT RUN | sul sito: previsto dopo il rilascio                                                            |
| Persistence      | NOT RUN | dopo il rilascio: valori confermati visibili nella pagina Parametri                            |
| Agnos AI         |      NA | nessuna azione nuova del registro                                                              |
| Voice            |    PASS | frammenti di trascrizione, numeri in parole (unit); il microfono reale non è provato in locale |
| OCR              |      NA |                                                                                                |
| Security/privacy |    PASS | nessun dato clinico nel browser; scritture solo sui pazienti autorizzati dal backend           |

## Runtime Evidence

`screenshots/giro-visita-render-locale.png`: pannello del giro reso con gli stili dell'app e dati
sintetici. Mostra una bozza registrata, due in bozza, un cognome ambiguo da attribuire e un valore
impossibile segnalato. Non è il sito.

## Logs

`logs/frontend-milo-phase4.log`, `logs/frontend-tests.log`, `logs/frontend-typecheck.log`,
`logs/frontend-build.log`.

## Residual Risks

- Le bozze si perdono ricaricando la pagina, per non tenere dati clinici nel browser. Un salvataggio
  lato server richiede una tabella nuova: è una scelta dell'utente.
- Elenco limitato ai primi 100 pazienti del perimetro.
- La trascrizione reale del browser può scrivere i numeri in forme non previste: diventano avvisi,
  mai valori.

## Final Decision

IMPLEMENTED — NOT VERIFIED
