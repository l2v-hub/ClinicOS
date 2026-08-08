# Task Contract

## Task

- Title: Agenda azioni appuntamento modifica sposta elimina
- Slug: agenda-azioni-appuntamento-modifica-sposta-elimina
- Type: feature
- Date: 2026-08-08
- Issue: —

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
| Privacy / Security   |       no |
| Config / Env         |       no |

Solo frontend: `AppointmentForm.tsx` (modalita' modifica), `App.tsx` (due handler REST),
`AdminAgenda.tsx` e `OperatorAgenda.tsx` (barra azioni), `app-additions.css`.
Persistenza: si', ma solo perche' la UI inizia finalmente a usare `PATCH` e `DELETE`
`/appointments/:id` gia' esistenti e gia' testati lato backend. Nessuna route nuova, nessuna
migration.

## Current Behaviour

Il backend espone da tempo `PATCH /appointments/:id` (data, ora, tipologia, note, durata, stato,
operatorId — con gestione 404 / 409 slot occupato) e `DELETE /appointments/:id` (204). Il
frontend **non li chiama mai**: in `App.tsx` esistono solo `loadAppuntamenti()` e
`addAppuntamento()`.

Di conseguenza in agenda un appuntamento **non si puo' ne' modificare, ne' spostare, ne'
cancellare**. Il click su un appuntamento in vista giornaliera si limita a selezionarlo/
deselezionarlo (`selectedAptId`), senza offrire alcuna azione: in OperatorAgenda la selezione
mostra solo la nota clinica, in AdminAgenda non mostra nulla. In vista settimanale e mensile il
click su un appuntamento non fa nulla. `AppointmentForm` e' hardcodato sulla creazione (titolo
"Nuovo Appuntamento", pulsante "Salva appuntamento", stato iniziale sempre da zero).

Un errore di orario oggi si corregge solo creando un secondo appuntamento e lasciando il primo
in agenda: e' il buco di interazione piu' grave dell'Agenda.

## Expected Behaviour

`AppointmentForm` diventa bimodale tramite una prop opzionale `appuntamento?: Appuntamento`:

- assente: comportamento attuale (titolo "Nuovo Appuntamento", CTA "Salva appuntamento");
- presente: titolo "Modifica Appuntamento", CTA "Salva modifiche", campi precompilati con i valori
  esistenti. Cambiare data / ora / operatore nel form E' l'operazione di spostamento (nessun
  drag and drop: ostile su tablet di reparto e fuori scope).

In entrambe le agende, l'appuntamento selezionato in vista giornaliera mostra una barra azioni
`.agt-apt-card__actions` con due pulsanti: "Modifica" (apre il form in modalita' modifica) e
"Elimina" (chiede conferma esplicita, poi elimina). In vista settimanale il click su un
appuntamento apre direttamente il form in modalita' modifica, invece di non fare nulla.

`App.tsx` guadagna `updateAppuntamento(id, apt)` e `deleteAppuntamento(id)`:

- `updateAppuntamento` chiama `PATCH /appointments/:id`, ritorna il messaggio d'errore o null con
  la stessa convenzione di `addAppuntamento`, propaga il 409 slot occupato al form, e in caso di
  successo aggiorna la lista in memoria e mostra il toast "Appuntamento aggiornato";
- `deleteAppuntamento` chiama `DELETE /appointments/:id` con aggiornamento ottimistico e rollback
  della lista in caso di errore, come gia' fa `deleteConsegna`, con toast di esito.

## Acceptance Criteria

- AC1: `AppointmentForm` con prop `appuntamento` valorizzata mostra titolo "Modifica Appuntamento",
  CTA "Salva modifiche" e tutti i campi precompilati (data, ora, durata, paziente, operatore, tipo,
  priorita', stato, camera, note).
- AC2: `AppointmentForm` senza `appuntamento` e' identico a oggi (creazione), nessuna regressione.
- AC3: in vista giornaliera (admin e operatore) l'appuntamento selezionato mostra i pulsanti
  "Modifica" ed "Elimina"; entrambi hanno touch target >= 44px.
- AC4: "Elimina" richiede una conferma esplicita prima di chiamare l'API; annullando, nulla viene
  eliminato.
- AC5: il salvataggio di una modifica invia `PATCH /appointments/:id` con i soli campi supportati
  dalla route (data, ora, durata, tipologia, note, stato, operatorId) e aggiorna la card in agenda
  senza ricaricare la pagina.
- AC6: un 409 (slot occupato) in modifica mostra il messaggio d'errore dentro il form e NON chiude
  il form, esattamente come gia' avviene in creazione.
- AC7: l'eliminazione rimuove la card dalla vista giorno / settimana / mese; se l'API fallisce la
  lista viene ripristinata e compare un toast di errore.
- AC8: in vista settimanale il click su un appuntamento apre il form in modifica; il click su cella
  libera continua ad aprire il form in creazione.
- AC9: `npx tsc --noEmit` e `npm run build` sul frontend passano; nessun console.log aggiunto.

## Test Plan

| Test type                 | Required | Reason                                                                                    |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------- |
| Unit                      |       no | nessuna funzione pura nuova; la logica e' cablatura REST + rendering condizionale           |
| Integration               |       no | nessun modulo backend modificato                                                            |
| API                       |       no | PATCH e DELETE /appointments/:id gia' esistenti e coperti dai test backend esistenti        |
| Playwright                |       no | nessun Postgres popolato in questa sessione — limite residuo dichiarato nel report          |
| Persistence after refresh |      yes | requisito: modifica ed eliminazione devono sopravvivere al refresh (verifica dichiarata)    |
| Agnos action registry     |       no | non toccato                                                                                 |
| Voice simulation          |       no | non toccato                                                                                 |
| OCR/import test           |       no | non toccato                                                                                 |
| Security/privacy scan     |      yes | le due nuove fetch devono inviare operatorHeaders() come tutte le altre chiamate cliniche   |
| Type check / build        |      yes | npx tsc --noEmit + npm run build — gate obbligatorio del progetto                           |

## Evidence Plan

- Output di `npx tsc --noEmit` e `npm run build` (frontend) nel validation-report.
- Grep di verifica che le nuove fetch usino operatorHeaders() e i metodi corretti.
- Suite test backend appuntamenti eseguita per confermare che PATCH/DELETE restano verdi.
- Elenco dei file toccati con conteggio righe.

## Risks

- **Eliminazione di dato clinico**: e' l'unica azione distruttiva introdotta. Mitigata da conferma
  esplicita; la route DELETE esisteva gia' ed e' documentata come "UI-only button" (FR-010).
- **Conflitto di slot in modifica**: gestito dal backend con 409 e propagato al form; non
  introduciamo validazione client duplicata che potrebbe divergere.
- **Persistenza non verificata a runtime**: senza database popolato la prova end-to-end non e'
  producibile in questa sessione. Dichiarata come limite residuo, non come evidenza.

## Gate Status

READY FOR IMPLEMENTATION
