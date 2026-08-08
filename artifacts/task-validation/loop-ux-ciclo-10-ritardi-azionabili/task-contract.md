# Task Contract

## Task
- Title: Loop UX ciclo 10 - Somministrazioni in ritardo, elenco azionabile per paziente
- Slug: loop-ux-ciclo-10-ritardi-azionabili
- Type: feature (frontend-only, completa il percorso "issue -> paziente -> azione")
- Date: 2026-08-08

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Contesto

Continuazione diretta del ciclo 9 (card KPI "Somministrazioni in ritardo"), stessa iniziativa
"Clinic Control Center". Il ciclo 9 rispondeva a "quante?"; questo ciclo completa il percorso
esplicitamente richiesto dall'iniziativa ADMIN "issue -> operatore/paziente -> azione": oggi il
numero non diceva PER QUALE paziente, l'operatore doveva andare in Agenda e cercarlo. Trasformato
il segnale da contatore a elenco azionabile, riusando un pattern gia' esistente nello stesso file
(banner "farmaci non in anagrafica").

## Expected Behaviour

Un banner rosso (urgenza clinica reale, non ambra) compare su entrambe le dashboard quando
`inRitardo > 0`, con un elenco di pazienti (non di singole dosi) ordinato per gravita' massima
decrescente, ogni riga cliccabile porta direttamente alla cartella del paziente. Tetto a 5 righe
con "+N altre" cliccabile verso l'Agenda (mai un vicolo cieco).

## Acceptance Criteria

### Verificati staticamente

- AC1 — `useRiepilogoSomministrazioni` esteso con `ritardi: RitardoPaziente[]` (nome, elenco
  farmaci/orario/minuti di ritardo), raggruppato per `patientId` (non per nome, che non e'
  garantito univoco), ordinato per ritardo-massimo-del-paziente decrescente — non per numero di
  dosi in ritardo. *Verifica: lettura del codice riga per riga dal gate QA, confermato a runtime
  (AC-R1).*
- AC2 — Banner rosso (`.coverage-alert` di base, non `--amber`: spec confermata da clinicos-uiux,
  "urgenza clinica reale, stesso registro delle consegne urgenti") su entrambe le dashboard,
  posizionato fra "consegne urgenti" e "farmaci non in anagrafica" in Operatore, subito dopo
  "consegne urgenti" in Admin (che non ha il banner ambra).
  *Verifica: lettura del codice, screenshot.*
- AC3 — Riuso letterale delle classi generiche `.anomalie-reparto__lista/__nome`, con un solo
  modificatore mirato `.anomalie-reparto__riga--rosso` per correggere l'hover (di base ambra,
  sbagliato dentro un banner rosso) — non una classe gemella intera duplicata.
  *Verifica: lettura del codice + CSS dal gate QA.*
- AC4 — Tetto a 5 righe, "+N altre" cliccabile verso l'Agenda del ruolo corretto.
  *Verifica: lettura del codice, runtime (AC-R2).*
- AC5 — **Difetto trovato dal gate QA**: bug di pluralizzazione italiana pre-esistente nel banner
  "farmaci non in anagrafica" ("N pazientei" invece di "N pazienti"), copiato per errore nei due
  nuovi banner. Corretto in tutte e tre le occorrenze (le due nuove e l'originale, per coerenza).
  *Verifica: runtime (AC-R1), stringa "pazientei" assente dal DOM.*
- AC6 — `npx tsc --noEmit` pulito, `npm run build` verde, `npm test` 140/140 invariato,
  `eslint --no-cache` zero errori nuovi.
  *Verifica: eseguiti da clinicos-implementer, ri-verificati indipendentemente da clinicos-qa e da
  me dopo la correzione della pluralizzazione.*

### Aperti — verificati a runtime nel validation-report

- AC-R1: l'ordinamento per gravita' (non per numero di dosi) e il raggruppamento per paziente sono
  visibili e corretti a schermo con dati reali attraverso il componente; la pluralizzazione e'
  corretta con N>1; il click su una riga apre la cartella del paziente ESATTO (non un altro).
- AC-R2: il tetto a 5 righe scatta correttamente con 7 pazienti in ritardo, e "+2 altre" naviga
  all'Agenda.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | logica di ordinamento/raggruppamento gia' verificata riga per riga dal gate QA; il test runtime end-to-end la esercita sui dati reali del componente, prova piu' forte di un unit test isolato per questo tipo di bug (l'ordinamento sbagliato sarebbe visibile solo integrando hook+rendering) |
| Integration | no | nessun modulo backend toccato |
| API | no | nessuna modifica, stesso endpoint gia' in uso dal ciclo 9 |
| Playwright | yes | l'ordinamento per gravita', il raggruppamento per paziente e il click-through al paziente esatto richiedono un browser reale con dati costruiti apposta |
| Persistence after refresh | no | nessuna modifica al modello dati |
| Security/privacy | yes | nessuna nuova esposizione: stessi dati del ciclo 9, solo presentati diversamente |

## Risks

**R1 — Stesso limite del ciclo 9, invariato.** Il dato resta reparto-wide, non filtrato per
operatore (nessuna vera assegnazione paziente-operatore/turno nel modello dati attuale).
Documentato, non risolto (richiederebbe un cambiamento di schema fuori scope senza approvazione
esplicita).

**R2 — Ridondanza intenzionale con la card KPI del ciclo 9.** Il banner (elenco d'azione, compare
solo quando c'e' qualcosa da fare) e la card (contatore di controllo, sempre visibile anche a
zero) convivono per ruoli diversi — stesso schema gia' in uso fra il banner ambra "farmaci non in
anagrafica" e il relativo indicatore. Non una duplicazione da correggere.

**R3 — Fuori ambito, deliberatamente.** Nessuna azione diretta dalla riga (es. "segna come
erogata") — il click porta alla cartella del paziente, dove l'azione clinica vera si compie con
tutte le sue verifiche esistenti (guardie, conferme). Aggiungere un'azione rapida diretta dal
banner tocca il flusso di somministrazione clinica — da valutare in un ciclo futuro con la dovuta
cautela, non qui.

## Gate Status

CLOSED — VERIFIED (vedi validation-report.md)
