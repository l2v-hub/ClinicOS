# Task Validation Report

## Task

- Title: Farmaci fuori anagrafica segnalati come anomalie e ricerca farmaco nella maschera terapia
- Slug: farmaci-fuori-anagrafica-segnalati-come-anomalie-e-ricerca-farmaco-nella-mascher
- Commit: non committato (lavoro in working tree)
- Date: 2026-07-30

## Implementation Summary

**La causa a monte è chiusa.** Il campo farmaco della maschera terapia era un `<input>` libero:
qualunque cosa si scrivesse diventava una prescrizione senza controlli. Ora si cerca in anagrafica
AIFA per nome commerciale o principio attivo e si seleziona una confezione; nome e forma
farmaceutica arrivano dalla selezione.

Galenici ed esteri restano prescrivibili — esistono, e bloccarli romperebbe un flusso legittimo —
ma solo con un'azione deliberata («Usa comunque «X»»), che è diversa dal digitare e passare avanti.
Il farmaco viene comunque dichiarato fuori anagrafica e compare fra le anomalie: **marcarlo come
galenico legittimo richiederebbe di persistere un flag, cioè una modifica di schema, fuori
dall'ambito di questo task.**

**L'effetto a valle è visibile in quattro punti**: testa della cartella, riga in lista pazienti,
testa della scheda terapia, cruscotto operatore. Prima l'anomalia era visibile solo entrando in
quella scheda e guardando quella riga.

**Backend intatto.** Le anomalie di reparto si ricavano da `GET /therapy-slots?date=`, che
restituisce le terapie attive di tutti i pazienti in una sola richiesta — verificato a runtime:
1 chiamata a `/therapy-slots`, **0** chiamate `/patients/:id/therapies` sulla lista.

**La regola difficile del modulo non è contare i farmaci mancanti, è non contare quelli di cui non
sappiamo nulla.** Un'anagrafica che non risponde produce uno stato indeterminato, non un'anomalia:
dichiararla manderebbe un operatore a «sanare» una prescrizione corretta, e in ambito clinico un
allarme falso costa la fiducia in tutti gli allarmi successivi. AC10 esiste per questo ed è coperto
da quattro test.

### Difetti preesistenti incontrati

1. **`npx tsc --noEmit` non controlla nulla** in questo progetto (`tsconfig.json` ha `files: []` e
   solo references). CLAUDE.md e l'agente `clinicos-implementer` lo indicano come gate obbligatorio:
   è un gate vuoto. Il controllo vero è `tsc -b`. Già segnalato nel task precedente, non corretto.
2. **`node:test` si spegne su qualunque import di CSS.** Bastava che un test raggiungesse
   transitivamente un componente con il proprio foglio di stile per far cadere due suite intere con
   `ERR_UNKNOWN_FILE_EXTENSION`. Corretto alla radice con `scripts/stub-css-loader.mjs`, registrato
   dal runner: chiedere che nessun modulo raggiungibile da un test importi CSS sarebbe una regola
   invisibile che si rompe al primo componente nuovo.
3. **`import.meta.env` a livello di modulo rompe `node:test`** (è `undefined` sotto Node). La
   lettura è ora difensiva nei quattro moduli interessati.
4. **L'intestazione di `ClinicalTableSection` è un `role="button"` il cui nome accessibile ingloba
   il testo dei pulsanti annidati.** `getByRole('button', {name: /Aggiungi farmaco/i})` colpisce
   l'intestazione e collassa la sezione invece di aggiungere un farmaco. È un difetto di
   accessibilità reale (annuncio confuso per uno screen reader), non solo una trappola per i test.
   Non corretto: fuori ambito.
5. **A sezione collassata, «+ Aggiungi farmaco» non mostra nulla**: la maschera viene resa dentro il
   corpo nascosto. Non corretto: fuori ambito.

### Difetto mio, trovato guardando gli screenshot

L'icona di ricerca veniva stirata dal flex fino a riempire il campo. Nessun test l'avrebbe rilevato
— l'elemento era presente e funzionante. Corretta in entrambi i campi di ricerca, incluso quello
introdotto dal task precedente, che aveva lo stesso difetto.

## Files Changed

| File                                                                           | Natura                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `frontend/src/components/operator/cartella/anomalieFarmaco.ts`                 | nuovo — calcolo delle anomalie, logica pura              |
| `frontend/src/components/operator/cartella/useAnomalieReparto.ts`              | nuovo — anomalie di reparto da una sola `/therapy-slots` |
| `frontend/src/components/operator/cartella/AvvisoAnomalieFarmaci.tsx` + `.css` | nuovo — avviso e indicatore condivisi                    |
| `frontend/src/components/operator/cartella/CampoFarmaco.tsx` + `.css`          | nuovo — ricerca e selezione del farmaco                  |
| `frontend/src/components/operator/cartella/TherapyFormFields.tsx`              | il campo libero diventa ricerca in anagrafica            |
| `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`        | riepilogo anomalie in testa (AC7)                        |
| `frontend/src/components/operator/PatientDetail.tsx`                           | avviso in testa alla cartella (AC5)                      |
| `frontend/src/components/operator/PatientList.tsx`                             | indicatore su riga e card mobile (AC6)                   |
| `frontend/src/components/operator/OperatorDashboard.tsx`                       | elenco pazienti da bonificare (AC8)                      |
| `frontend/src/components/operator/cartella/RicercaFarmaco.css`                 | vincolo dimensione icona                                 |
| `scripts/stub-css-loader.mjs`, `scripts/run-node-tests.mjs`                    | i test sopravvivono agli import di CSS                   |
| `frontend/src/components/operator/cartella/__tests__/anomalieFarmaco.test.ts`  | nuovo — 10 test                                          |
| `e2e/anomalie-farmaci.mjs`                                                     | nuovo — 21 verifiche Playwright                          |

## Acceptance Criteria Result

| AC                                               | Result | Evidence                                                                        |
| ------------------------------------------------ | -----: | ------------------------------------------------------------------------------- |
| AC1 ricerca per nome, selezione compila il campo |   PASS | `06-ricerca-per-nome.png`, 2 esiti; nome compilato da selezione                 |
| AC2 ricerca per principio attivo                 |   PASS | `07-ricerca-principio-attivo.png`, 2 esiti su «paracetamolo»                    |
| AC3 la selezione valorizza la forma              |   PASS | `08-confezione-selezionata.png`; forma = `sciroppo` da confezione sciroppo      |
| AC4 nome libero solo con azione esplicita        |   PASS | `09-usa-comunque.png`; valore mantenuto + «comparirà fra le anomalie da sanare» |
| AC5 avviso in testa alla cartella + collegamento |   PASS | `03-testa-cartella.png`; il collegamento porta alla scheda terapia              |
| AC6 indicatore in lista pazienti                 |   PASS | `02-lista-pazienti.png`, 2 indicatori (tabella + card)                          |
| AC7 riepilogo in testa alla scheda terapia       |   PASS | `04-scheda-terapia.png`, farmaco nominato                                       |
| AC8 elenco nel cruscotto operatore               |   PASS | `01-cruscotto.png`: «Anselmi Bruno — Cardiofillina Inventata»                   |
| AC9 nessun segnale senza anomalie                |   PASS | il paziente Bassi non compare nel cruscotto e non ha indicatore in lista        |
| AC10 anagrafica muta ⇒ nessuna anomalia          |   PASS | `10-anagrafica-giu.png`: 0 avvisi, 0 indicatori; + 4 test unit                  |
| AC11 build verde, nessuna chiamata per paziente  |   PASS | `tsc -b` + `vite build` verdi; `/therapy-slots`=1, `/patients/:id/therapies`=0  |

## Test Results

| Test                      | Result | Evidence                                                                                                             |
| ------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------- |
| Unit                      |   PASS | `npm test`: 128/128 (10 nuovi su `anomalieFarmaco`)                                                                  |
| Integration               |     NA | nessuna composizione nuova fra moduli applicativi                                                                    |
| API                       |     NA | backend non toccato                                                                                                  |
| Playwright                |   PASS | `node e2e/anomalie-farmaci.mjs`: **21/21**                                                                           |
| Persistence after refresh |   PASS | il POST della terapia porta `farmacoNome: TACHIPIRINA` e `pharmaceuticalForm: sciroppo`                              |
| Agnos AI                  |     NA | fuori ambito                                                                                                         |
| Voice                     |     NA | fuori ambito                                                                                                         |
| OCR                       |     NA | l'anagrafica non è stata reimportata                                                                                 |
| Security/privacy          |   PASS | le query verso `/farmaci/cerca` portano solo il testo digitato; nessuna chiamata dei test raggiunge il backend reale |

## Runtime Evidence

- `screenshots/01-cruscotto.png` … `10-anagrafica-giu.png`
- `screenshots/verifiche.json` — esito per asserzione, elenco delle richieste di rete osservate
  (prova di AC11) e corpo dei POST terapia (prova di persistenza)

## Logs

Nessun log applicativo: la funzione non scrive lato server oltre al salvataggio della terapia, che
usa la rotta esistente. Console del browser verificata pulita nello scenario.

## Residual Risks

- **Copertura parziale del segnale di reparto.** `/therapy-slots?date=` restituisce solo le terapie
  **attive e valide oggi**, esclusi i «al bisogno»: lista pazienti, testa della cartella e cruscotto
  non vedono anomalie su terapie sospese, future o al bisogno. La scheda terapia le vede tutte,
  perché legge l'intera lista del paziente. I due ambiti sono **dichiarati in interfaccia**
  («terapie attive di oggi» contro «tutte le terapie in cartella») proprio perché i conteggi possono
  differire; senza quella dicitura sembrerebbe un'incoerenza.
- **Il galenico legittimo resta un'anomalia** finché non esiste un flag persistito. Un reparto che
  usa molti galenici vedrebbe un allarme permanente, che è il modo classico per far ignorare gli
  allarmi. Vale un task successivo con una migrazione di schema.
- **Le terapie preesistenti non sono state bonificate**: la ricerca vincola gli inserimenti nuovi,
  non riscrive lo storico. È l'intento — le anomalie servono appunto a farle emergere.
- **Autocertificazione**: codice e test scritti nella stessa sessione, senza QA indipendente.
- Nessun commit, nessun push, nessun deploy.

## Final Decision

CLOSED — VERIFIED
