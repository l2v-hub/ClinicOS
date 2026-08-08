# Task Validation Report

## Task

- Title: Loop UX ciclo 13 - Sicurezza clinica: reset stato form/modale al cambio paziente
- Slug: loop-ux-ciclo-13-patient-switch-safety
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-13-patient-switch-safety (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Terzo ciclo dell'iniziativa "design system globale", primo di questa iniziativa a correggere un
difetto di SICUREZZA CLINICA (dati residui del paziente sbagliato), non solo un difetto visivo.
Eseguito con agenti Ruflo reali (registrati via `agent_spawn`, esecuzione vera via Task tool,
risultati riportati in Ruflo via `agent_update`/`task_complete`/`memory_store`): un
`interaction-analyst` ha mappato tutti i punti in cui `PatientDetail` resta montato tra un cambio
paziente e l'altro e i 22 stati di form/modale non coperti dal reset esistente; un
`clinicos-implementer` ha applicato il fix; un `clinicos-qa` indipendente ha ri-derivato ogni
verifica.

## Files Changed

- `frontend/src/components/operator/PatientDetail.tsx` (unico file toccato)
- `e2e/loop-ux-ciclo-13-patient-switch-safety.mjs` (nuovo — evidenza runtime)

## Gate QA: APPROVE

clinicos-qa ha ri-derivato indipendentemente ogni verifica:

- Confermato via `git diff` che il blocco `useEffect` spostato e' identico byte-per-byte a meno
  delle 22 nuove righe di reset inserite — nessuna logica di navigazione alterata.
- Confermato che ciascuno dei 22 stati elencati nel contract ha davvero una `useState` corrispondente
  nel file (nessuno stato "dimenticato" o duplicato).
- Confermato che il file non ha hook condizionali — lo spostamento fisico dell'effect e' sicuro
  (nessun cambio nell'ordine di chiamata degli hook tra render).
- Confermato con `eslint --no-cache` + confronto `git show HEAD:<path>` (non `git stash`) che gli 8
  errori pre-esistenti (`react-hooks/refs` su `switchTab` in un `onClick` non collegato a questo
  fix, righe diverse solo per lo spostamento fisico dell'effect) sono identici prima/dopo.

## Acceptance Criteria Result

| AC                                                     | Result | Evidence                                                                 |
| ------------------------------------------------------ | -----: | ------------------------------------------------------------------------ |
| AC1 - 22 reset presenti, spostamento fisico puro       |   PASS | `git diff` (42 righe rimosse / 42 riaggiunte identiche + 22 nuove righe) |
| AC2 - tsc --noEmit pulito                              |   PASS | Eseguito direttamente, nessun output                                     |
| AC3 - build verde                                      |   PASS | `npm run build`, exit 0                                                  |
| AC4 - test 140/140 invariato                           |   PASS | `npm test -- --run`, 140 pass / 0 fail                                   |
| AC5 - eslint invariato (8 pre-esistenti, non nuovi)    |   PASS | Confronto diretto con `git show HEAD:<path>`                             |
| AC-R1 - form Note Cliniche si chiude, draft non appare |   PASS | Runtime: vedi sotto, 4/4                                                 |
| AC-R2 - form Profilo si chiude dopo switch             |   PASS | Runtime: vedi sotto                                                      |
| AC-R3 - zero errori console                            |   PASS | Runtime: vedi sotto                                                      |

## Test Results

| Test             |                   Result | Evidence                                                        |
| ---------------- | -----------------------: | --------------------------------------------------------------- |
| Unit             | NA (per scelta motivata) | fix di stato React puro, gia' coperto dal Playwright end-to-end |
| Integration      |                       NA | nessun modulo backend toccato                                   |
| API              |                       NA | nessuna modifica                                                |
| Playwright       |                     PASS | `node e2e/loop-ux-ciclo-13-patient-switch-safety.mjs`: **7/7**  |
| Persistence      |                       NA | nessuno stato persistito lato server (form locale, mai inviato) |
| Security/privacy |                       NA | nessun dato reale coinvolto, solo testo di bozza sintetico      |

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing (due
pazienti sintetici, A="Amato" e B="Bonelli"). **7/7 verifiche superate**:

1. Setup: form "+ Aggiungi Nota" aperto con testo digitato per il paziente A (screenshot
   `01-nota-in-bozza-paziente-a.png`).
2. Dopo switch a B via ricerca globale (`Ctrl+K` + click sul risultato): la cartella mostra
   davvero "Bonelli, Bice" nell'header (screenshot `02-dopo-switch-a-paziente-b.png`).
3. **Il form "+ Aggiungi Nota" si e' chiuso** — nessuna `<textarea>` visibile tornando sul tab
   Note & Visite del paziente B (screenshot `03-note-paziente-b-dopo-switch.png`).
4. Il testo della bozza di A ("Nota di test per il paziente Amato...") non compare da nessuna
   parte nella cartella di B.
5. Setup: form Profilo in modifica per il paziente B (screenshot
   `03-profilo-in-modifica-paziente-b.png`).
6. Dopo switch ad A via ricerca globale: il form Profilo si e' chiuso, torna alla vista
   sola-lettura con "Modifica" di nuovo cliccabile (screenshot
   `04-profilo-dopo-switch-a-paziente-a.png`).
7. Zero errori JavaScript in console durante l'intero scenario.

Dettaglio in `screenshots/verifiche.json`.

### Scoperta collaterale (non un bug di questo fix)

Il tentativo iniziale di testare lo scenario col modale full-overlay "Invio in PS" (invece del form
inline "Note Cliniche") ha rivelato che quel modale (`.modal-overlay`, z-index 1000,
`position:fixed inset:0`) blocca fisicamente ogni click sullo sfondo — **lo switch paziente mentre
quel modale e' aperto e' gia' irraggiungibile via mouse**. La scorciatoia `Ctrl+K` resta pero'
attiva (listener globale su `window`, non filtrato da modali aperti) e apre `.search-overlay` a
z-index 300, che finisce visivamente SOTTO il modale gia' aperto e diventa incliccabile — un
comportamento confuso ma non pericoloso per i dati (nessun retarget possibile, il click non arriva
mai al risultato di ricerca). Documentato come rischio residuo, non corretto in questo ciclo
(bug di z-index/gestione focus dei modali, categoria diversa dal reset di stato).

## Residual Risks

- **Z-index dei modali full-overlay vs. ricerca globale** (vedi sopra) — backlog design system, non
  bloccante per questo fix (il fix qui riguarda i form INLINE, che restano davvero cliccabili in
  parallelo alla ricerca e sono quindi il vettore di rischio reale).
- **Backlog design system ampio e deliberatamente differito** — vedi
  `design-system/README.md`, sezione "Backlog aperto" (bottone indietro, `PatientList` che perde
  stato, unificazione header, 4 tab-bar parallele, 5 sistemi badge, `btn-sm` isolato).
- **Autocertificazione parziale**: implementer e QA sono sub-agenti della stessa sessione; la
  verifica Playwright e' stata fatta da me (il coordinatore) indipendentemente da entrambi.

## Final Decision

CLOSED — VERIFIED

Ogni AC del contract e' verificato: quelli statici tramite un gate QA che ha ri-derivato
indipendentemente ogni controllo (incluso il confronto diretto con `git show HEAD` per escludere
regressioni eslint), quelli a runtime tramite uno scenario Playwright end-to-end che riproduce
esattamente il meccanismo reale del bug (componente non smontato, switch via ricerca globale) —
non solo "i test passano", ma la prova visiva (screenshot) che un form/bozza del paziente
precedente NON sopravvive al cambio paziente. Coerente con il requisito esplicito dell'iniziativa:
l'ispezione a runtime e' parte integrante della verifica per un fix di sicurezza clinica, non
un'aggiunta opzionale.
