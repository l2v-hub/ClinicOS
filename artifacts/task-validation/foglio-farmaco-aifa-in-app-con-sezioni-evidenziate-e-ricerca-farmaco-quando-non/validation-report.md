# Task Validation Report

## Task

- Title: Foglio farmaco AIFA in-app con sezioni evidenziate e ricerca farmaco quando non trovato
- Slug: foglio-farmaco-aifa-in-app-con-sezioni-evidenziate-e-ricerca-farmaco-quando-non
- Commit: non committato (lavoro in working tree)
- Date: 2026-07-30

## Implementation Summary

Il documento ufficiale AIFA si apre dentro ClinicOS invece di essere scaricato, con le sezioni
4.1 / 4.2 / 4.3 evidenziate, e il farmaco non presente in anagrafica è segnalato con una ricerca
per nome commerciale o principio attivo.

**Perché il link scaricava.** Misurato sulla fonte reale: AIFA serve il PDF con
`content-disposition: attachment`, `content-type: application/octet-stream` e
`x-content-type-options: nosniff`. Quei tre header insieme impongono il download in ogni browser,
e nessun `target="_blank"` lo evita. Il visore scarica il PDF come blob e lo rende su canvas, così
l'intestazione di AIFA diventa irrilevante: non è più il browser a seguire il link. `api.aifa.gov.it`
risponde `access-control-allow-origin: *`, quindi non serve nessun proxy e **il backend non è stato
toccato**.

**Il problema clinico trovato durante il lavoro.** Il link AIFA è per AIC6, che identifica il
farmaco; l'anagrafica ha un record per confezione. Un solo PDF contiene quindi tutti gli RCP delle
confezioni: quello della Tachipirina ne contiene **sei** in 48 pagine, con posologie inconciliabili
(1000 mg compresse, 500 mg compresse, 10 mg/ml soluzione per infusione, due sciroppi 120 mg/5 ml,
una sospensione orale). Evidenziare il blocco sbagliato indicherebbe all'operatore un dosaggio
errato — un danno che la versione precedente, costringendolo a scorrere il documento, non produceva.
Da qui le regole AC8/AC9/AC10: la formulazione mostrata è dichiarata in chiaro, le altre sono sempre
elencate, e **quando l'abbinamento è incerto non si evidenzia nulla e si chiede di scegliere**.

**Difetto preesistente corretto (AC10).** `useDocumentiFarmaco` cercava con `limite=1` e prendeva
`esiti[0]`: per "Tachipirina" l'anagrafica restituisce lo sciroppo prima delle compresse, quindi la
confezione era scelta di fatto a caso. Ora si cercano fino a 25 confezioni e si riconosce quella
prescritta da dosaggio e forma.

**Tre difetti trovati eseguendo, non leggendo:**

1. `convertToViewportRectangle` **non esiste più in pdf.js 6** (restano `convertToViewportPoint` /
   `convertToPdfPoint`). La chiamata lanciava un `TypeError` che azzerava le evidenziazioni: il PDF
   si vedeva, le sezioni erano individuate, e zero rettangoli venivano disegnati.
2. Le modali erano montate dentro la scheda terapia, che vive in un **contesto di impilamento
   locale**: il loro `z-index: 1000` valeva solo lì dentro e la navigazione L2 finiva sopra il
   visore intercettandone i clic. Risolto con `createPortal` su `document.body`.
3. Gli array di evidenziazione ricreati a ogni render rilanciavano l'effetto di rendering, la cui
   pulizia annullava il lavoro asincrono prima che finisse. Risolto con `useMemo` e un riferimento
   stabile per le pagine senza evidenziazioni.

**Due errori nel documento AIFA originale**, che hanno cambiato il progetto: a pagina 40 l'apertura
del sesto RCP è numerata `2. DENOMINAZIONE DEL MEDICINALE` invece di `1.`, e la posologia è
`4.3 Posologia e modo di somministrazione` invece di `4.2` — con una vera `4.3 Controindicazioni`
tre pagine dopo. Il riconoscimento si basa quindi sul **titolo**, standardizzato dal modello EMA,
usando il numero stampato solo come ripiego.

## Files Changed

| File                                                                            | Natura                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `frontend/src/components/operator/cartella/farmacoCorrispondenza.ts`            | nuovo — abbinamento dosaggio/forma, condiviso fra scelta della confezione e scelta del blocco RCP |
| `frontend/src/components/operator/cartella/rcpStruttura.ts`                     | nuovo — blocchi RCP e sezioni cliniche dal testo estratto                                         |
| `frontend/src/components/operator/cartella/VisoreDocumentoFarmaco.tsx` + `.css` | nuovo — visore con pdf.js in import dinamico, evidenziazione, selettore di formulazione           |
| `frontend/src/components/operator/cartella/RicercaFarmaco.tsx` + `.css`         | nuovo — ricerca per nome o principio attivo; corpo riusato da modale e pagina                     |
| `frontend/src/components/operator/AnagraficaFarmaciPage.tsx`                    | nuovo — pagina dedicata                                                                           |
| `frontend/src/components/operator/cartella/farmacoDocumento.ts`                 | risoluzione della confezione e quattro stati espliciti                                            |
| `frontend/src/components/operator/cartella/farmacoRiferimento.ts`               | hook riscritto: chiave per riga, non per nome; fallimenti non più silenziosi                      |
| `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`         | icona → visore; indicatori per farmaco assente / senza documento / anagrafica giù                 |
| `frontend/src/types.ts`, `App.tsx`, `components/shared/TeamsLikeSidebar.tsx`    | NavKey `anagrafica-farmaci`, voce di sidebar, ramo di render                                      |
| `frontend/src/components/operator/cartella/__tests__/rcpStruttura.test.ts`      | nuovo — 12 test                                                                                   |
| `e2e/foglio-farmaco-aifa.mjs`                                                   | nuovo — 22 verifiche Playwright                                                                   |
| `frontend/package.json`                                                         | `pdfjs-dist@^6.2.108`                                                                             |

## Acceptance Criteria Result

| AC                                                       | Result | Evidence                                                                                                                      |
| -------------------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------- |
| AC1 apertura in-app, nessun download                     |   PASS | `screenshots/02-visore-aperto.png`; `verifiche.json`: nessun download, 38.225 pixel di testo disegnati                        |
| AC2 sezioni 4.1/4.2/4.3 evidenziate + salto              |   PASS | 30 rettangoli; pill di salto per le tre sezioni; `02-visore-aperto.png`                                                       |
| AC3 farmaco assente segnalato                            |   PASS | indicatore «non in anagrafica» sulla riga; `01-scheda-terapia.png`                                                            |
| AC4 ricerca per nome e principio attivo, modale + pagina |   PASS | `03-ricerca-aperta.png`, `04-ricerca-principio-attivo.png`, `08-pagina-dedicata.png`                                          |
| AC5 fonte irraggiungibile, messaggio distinto + link     |   PASS | `07-aifa-irraggiungibile.png`; 503 iniettato nello scenario                                                                   |
| AC6 nessun identificativo di paziente verso terzi        |   PASS | URL verso AIFA ispezionati a runtime: 1 richiesta, 0 sospette                                                                 |
| AC7 build verde, pdf.js fuori dal bundle iniziale        |   PASS | `tsc -b` + `vite build` verdi; chunk `pdf-*.js` 427 kB separato; `index-*.js` 1.525,03 kB contro 1.524,96 kB prima (+70 byte) |
| AC8 formulazione dichiarata e altre elencate             |   PASS | «Formulazione riconosciuta dalla prescrizione: TACHIPIRINA 1000 mg compresse» + selettore                                     |
| AC9 ambiguità → nessuna evidenziazione, si chiede        |   PASS | `05-formulazione-ambigua.png`: 6 formulazioni elencate, 0 rettangoli; dopo la scelta, 30                                      |
| AC10 confezione da dosaggio e forma, non `esiti[0]`      |   PASS | il primo esito di ricerca è lo Sciroppo, la formulazione riconosciuta è «1000 mg compresse»                                   |

## Test Results

| Test             | Result | Evidence                                                                       |
| ---------------- | -----: | ------------------------------------------------------------------------------ |
| Unit             |   PASS | `npm test`: 118/118 (12 nuovi su `rcpStruttura`)                               |
| Integration      |     NA | nessuna composizione nuova fra moduli applicativi                              |
| API              |     NA | backend non toccato                                                            |
| Playwright       |   PASS | `node e2e/foglio-farmaco-aifa.mjs`: **22/22**                                  |
| Persistence      |     NA | la funzione non scrive dati                                                    |
| Agnos AI         |     NA | fuori ambito                                                                   |
| Voice            |     NA | fuori ambito                                                                   |
| OCR              |     NA | l'anagrafica non è stata reimportata                                           |
| Security/privacy |   PASS | AC6 verificato a runtime; nessuna chiamata dei test raggiunge il backend reale |

## Runtime Evidence

- `screenshots/01-scheda-terapia.png` … `08-pagina-dedicata.png`
- `screenshots/verifiche.json` — esito per singola asserzione
- `fixtures/rcp-tachipirina.pdf` — RCP reale (48 pagine, 6 RCP) servito ai test via intercettazione

Verifica indipendente della fonte reale: `GET .../stampati?ts=RCP` ha restituito **200 su 12
richieste su 12**, con gli header sopra. Lo stesso endpoint aveva restituito `503` per circa dieci
minuti poco prima: la fonte funziona ma è saltuariamente indisponibile, ed è il motivo per cui i
test non dipendono da essa e per cui AC5 esiste.

## Logs

Nessun log applicativo raccolto: la funzione non scrive nulla lato server. La console del browser
è verificata pulita nello scenario (a parte il 503 iniettato di proposito per AC5).

## Residual Risks

- **La numerazione degli RCP non è garantita.** Su questo documento AIFA sbaglia due volte; il
  riconoscimento per titolo lo assorbe, ma un RCP con titoli non standard non verrà evidenziato.
  L'esito è nessuna evidenziazione, non un'evidenziazione sbagliata.
- **RCP prodotti come scansione** non hanno livello testo: il documento si apre, senza evidenziazioni.
- **Due confezioni indistinguibili** (i due sciroppi 120 mg/5 ml) restano ambigue per costruzione:
  l'operatore scegli. È voluto, non un limite da rimuovere.
- **Verificato solo su un documento reale** (Tachipirina, 6 RCP). Un campione più ampio di RCP
  darebbe più confidenza sulla generalità del riconoscimento delle sezioni.
- **Autocertificazione**: codice e test sono stati scritti nella stessa sessione, senza una sessione
  QA indipendente. Le evidenze sono oggettive e riproducibili, ma non certificate da terzi.
- Nessun commit, nessun push, nessun deploy: la funzione non è in produzione.

## Final Decision

CLOSED — VERIFIED
