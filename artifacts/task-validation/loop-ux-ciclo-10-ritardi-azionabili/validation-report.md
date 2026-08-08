# Task Validation Report

## Task
- Title: Loop UX ciclo 10 - Somministrazioni in ritardo, elenco azionabile per paziente
- Slug: loop-ux-ciclo-10-ritardi-azionabili
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-10-ritardi-azionabili (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Continuazione diretta del ciclo 9. Esteso `useRiepilogoSomministrazioni` con un elenco `ritardi`
per paziente (raggruppato per `patientId`, ordinato per gravita' massima decrescente — non per
numero di dosi). Aggiunto un banner rosso azionabile a entrambe le dashboard, ogni riga cliccabile
verso il paziente, tetto a 5 con "+N altre" verso l'Agenda. Lavoro svolto tramite lo stesso team
coordinato dei cicli precedenti (clinicos-uiux -> clinicos-implementer -> clinicos-qa).

## Files Changed

- `frontend/src/components/operator/cartella/useRiepilogoSomministrazioni.ts` (esteso)
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/operator/cartella/AvvisoAnomalieFarmaci.css`

## Round 1 - Gate QA: APPROVE con una correzione richiesta

clinicos-qa ha verificato riga per riga (non fidandosi del commento) che l'ordinamento
`ritardi.sort((a,b) => b.voci[0].minutiRitardo - a.voci[0].minutiRitardo)` legge `voci[0]` DOPO
che il `.map()` precedente ha gia' ordinato ogni `voci` interno in modo decrescente — quindi e'
davvero il ritardo peggiore del paziente, non un elemento arbitrario. Ha tracciato manualmente lo
scenario discriminante (paziente con 1 dose a +60min deve precedere uno con 3 dosi a +5/+6/+7min)
e confermato che il codice lo gestisce correttamente. Ha anche verificato che il raggruppamento usa
`patientId` (chiave univoca) e non `nome` (non garantito univoco), e che la regola CSS
`.anomalie-reparto__riga--rosso:hover` e' davvero applicata dal markup in entrambi i file (non solo
dichiarata nel CSS senza uso).

Unico difetto reale trovato: un bug di pluralizzazione italiana. Il template
`{count} paziente{count === 1 ? '' : 'i'}` produce "N pazientei" (concatenazione errata di
"paziente" + "i") per ogni N diverso da 1. Il bug era GIA' presente nel banner "farmaci non in
anagrafica" preesistente (non introdotto da questo ciclo), ma l'implementer lo aveva copiato
fedelmente nei due nuovi banner, raddoppiandone la presenza. QA lo ha classificato non-bloccante
per il gate tecnico ma da correggere prima della cattura di evidenza runtime, dato che qualunque
screenshot con piu' di un paziente in ritardo avrebbe mostrato un errore visibile di italiano in
un banner di urgenza clinica.

## Round 2 - Correzione

Corretto il template in tutte e TRE le occorrenze (le due nuove aggiunte da questo ciclo, piu'
l'originale preesistente nel banner ambra, per coerenza — lasciare l'originale rotto mentre si
correggono le copie sarebbe stato incoerente): `pazient{count === 1 ? 'e' : 'i'}`. Verificato con
una prova diretta (`node -e`) che produce "1 paziente" e "2 pazienti" correttamente.

Ri-verificato indipendentemente: `npx tsc --noEmit` pulito, `eslint --no-cache` sui 3 file zero
errori, `npm test` 140/140 invariato.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 - hook esteso, raggruppamento per patientId, ordinamento per gravita | PASS | Lettura codice dal gate QA (verifica riga per riga, non fiducia nel commento) |
| AC2 - banner rosso, posizionamento corretto in entrambi i file | PASS | Screenshot `01-banner-ordinamento.png`; verificato da QA |
| AC3 - riuso classi generiche + un solo modificatore hover mirato | PASS | Lettura CSS + markup da QA |
| AC4 - tetto a 5 + "+N altre" cliccabile | PASS | Runtime: vedi AC-R2 |
| AC5 - bug pluralizzazione corretto in tutte e 3 le occorrenze | PASS | Runtime: vedi AC-R1, stringa "pazientei" assente |
| AC6 - tsc/build/test/eslint puliti | PASS | Round 2, ri-verificato indipendentemente |
| AC-R1 - ordinamento, raggruppamento, pluralizzazione, click-through corretti a schermo | PASS | `e2e/loop-ux-ciclo-10-ritardi-azionabili.mjs`, 10/10 |
| AC-R2 - tetto a 5 + "+2 altre" naviga all Agenda | PASS | Stesso script, scenario 2 |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA (per scelta motivata) | vedi Test Plan nel contract |
| Integration | NA | nessun modulo backend toccato |
| API | NA | stesso endpoint gia' in uso dal ciclo 9 |
| Playwright | PASS | `node e2e/loop-ux-ciclo-10-ritardi-azionabili.mjs`: **10/10** |
| Persistence | NA | nessuna modifica al modello dati |
| Security/privacy | PASS (statico) | nessun dato aggiuntivo esposto rispetto al ciclo 9 |

## Runtime Evidence

Due scenari costruiti apposta, entrambi via `page.route` stubbing (nessun Postgres/Podman
disponibile, stesso vincolo dei cicli precedenti).

**Scenario 1** (ordinamento + click-through + pluralizzazione): tre pazienti — Aldo Neri (1 dose,
70 min di ritardo), Carla Rossi (1 dose, 40 min), Bruna Villa (3 dosi, 5/6/7 min). Verificato:
1. Ordine a schermo esattamente Neri, Rossi, Villa — la gravita' massima vince sul numero di dosi,
   NON un artefatto di lettura del codice ma un dato osservato nel DOM reale.
2. La riga di Villa elenca tutte e tre le dosi (AUGMENTIN, LASIX, INSULINA) — raggruppamento per
   paziente confermato, non tre righe separate.
3. Pluralizzazione "3 pazienti" (non "3 pazientei") — il fix del Round 2 verificato sui dati reali.
4. Click sulla riga di Rossi apre la cartella di **Rossi, Carla** (non Neri, non Villa) —
   `.patient-compact-header__name` letto dopo il click conferma il paziente esatto.

**Scenario 2** (tetto): 7 pazienti in ritardo, severita' decrescente. Verificato: esattamente 5
righe visibili, bottone "+2 altre" presente e cliccabile, il click naviga all'Agenda (mai un
vicolo cieco per i pazienti oltre il tetto).

Screenshot in `screenshots/`: `01-banner-ordinamento.png` (il banner con le tre righe ordinate,
badge rosso "+70 MIN"/"+40 MIN"/"+7 MIN"), `02-click-through-paziente.png` (cartella di Rossi,
Carla aperta), `03-tetto-a-5.png` (7 pazienti, 5 mostrati + "+2 altre"). Dettaglio in
`screenshots/verifiche.json`.

## Residual Risks

- **Dato reparto-wide** (R1 nel contract): invariato dal ciclo 9, stesso limite dichiarato.
- **Nessuna azione rapida dal banner** (R3): il click porta alla cartella, non a un'azione diretta
  ("segna come erogata") — deliberato, un'azione diretta dal banner tocca il flusso clinico di
  somministrazione e richiede la cautela di un ciclo dedicato.
- **Autocertificazione parziale**: implementer e QA sono sub-agenti della stessa sessione; la
  verifica Playwright e la correzione finale (pluralizzazione) sono state fatte da me
  (il coordinatore) indipendentemente da entrambi.

## Final Decision

CLOSED — VERIFIED

Ogni AC del contract e' verificato: quelli statici tramite lettura del codice (compresa una
verifica riga-per-riga dell'ordinamento da parte del gate QA, non una fiducia nel commento) e i
gate tsc/build/test/eslint, quelli a runtime tramite un browser reale con dati costruiti per
discriminare esattamente i casi che contano (gravita' vs numero di dosi; raggruppamento per
paziente; tetto e "+N altre"). Il gate QA ha trovato un difetto reale (pluralizzazione) prima che
raggiungesse questo report, corretto e ri-verificato.
