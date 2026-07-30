# Task Contract

## Task

- Title: Foglio farmaco AIFA in-app con sezioni evidenziate e ricerca farmaco quando non trovato
- Slug: foglio-farmaco-aifa-in-app-con-sezioni-evidenziate-e-ricerca-farmaco-quando-non
- Type: change
- Date: 2026-07-29

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
| Privacy / Security   |      yes |
| Config / Env         |       no |

Backend intatto: `GET /farmaci/cerca` espone già sia la ricerca per nome commerciale sia quella per
principio attivo (`pa=1`), e `api.aifa.gov.it` risponde con `access-control-allow-origin: *`, quindi
il PDF è scaricabile dal browser senza proxy. Nessuna modifica a route, schema o env.

Privacy toccata in senso stretto: il visore scarica un documento da un dominio terzo. Vale la regola
già in vigore su questa funzione — nell'URL viaggia il solo nome commerciale, **mai** un
identificativo di paziente.

## Current Behaviour

Nella scheda terapia, accanto al farmaco presente in anagrafica, compare un'icona che è un
`<a href={linkRcp} target="_blank">` verso `api.aifa.gov.it/.../stampati?ts=RCP`.

Misurato sulla fonte reale (Tachipirina, AIC 012745):

```
content-disposition: attachment; filename=RCP_000219_012745.pdf
content-type: application/octet-stream
x-content-type-options: nosniff
```

Conseguenze osservate:

1. **Il browser scarica il file invece di aprirlo.** I tre header insieme impongono il download in
   ogni browser: `target="_blank"` non ha effetto. Non è un difetto del nostro codice, è come AIFA
   dichiara la risorsa.
2. **Nessuna evidenziazione**: l'operatore riceve un PDF di ~800 KB e deve cercare a mano posologia
   e controindicazioni.
3. **Farmaco non in anagrafica → nessun segnale.** `useDocumentiFarmaco` degrada in silenzio
   (`farmacoRiferimento.ts:65-69`): la cella resta identica e l'operatore non distingue "farmaco
   senza documento" da "non l'abbiamo cercato".
4. **AIFA indisponibile → stesso silenzio.** L'endpoint ha restituito `503` per ~10 minuti durante
   l'analisi, poi `200` su 12 richieste su 12: la fonte è saltuariamente giù, e oggi il caso non è
   distinguibile dal farmaco non trovato.

## Expected Behaviour

1. L'icona apre il documento **dentro ClinicOS**, in un visore modale. Nessun file scaricato.
2. All'apertura sono evidenziate le sezioni **4.1 Indicazioni terapeutiche**, **4.2 Posologia e modo
   di somministrazione**, **4.3 Controindicazioni**, con salto diretto alla prima.
3. Farmaco non trovato in anagrafica: la riga lo **segnala** e offre una ricerca per nome commerciale
   o principio attivo, sia in modale dalla terapia sia in pagina dedicata.
4. AIFA irraggiungibile: messaggio esplicito che distingue il guasto della fonte dal farmaco assente,
   con link diretto come ripiego.

## Acceptance Criteria

- AC1: cliccando l'icona di un farmaco in anagrafica si apre un visore in ClinicOS che mostra il PDF;
  non viene scaricato alcun file (nessuna voce nei download del browser).
- AC2: all'apertura le sezioni 4.1, 4.2 e 4.3 risultano evidenziate e la vista è posizionata sulla
  prima di esse.
- AC3: un farmaco assente dall'anagrafica mostra un indicatore distinguibile dall'icona del
  documento, che apre la ricerca.
- AC4: la ricerca trova un farmaco sia per nome commerciale sia per principio attivo, ed è
  raggiungibile sia in modale dalla riga di terapia sia dalla pagina dedicata.
- AC5: con la fonte AIFA irraggiungibile il visore mostra l'errore della fonte — testo diverso da
  quello del farmaco non trovato — e offre il link diretto.
- AC6: nessun identificativo di paziente compare negli URL verso domini terzi.
- AC8: quando il PDF contiene più RCP (uno per forma farmaceutica), il visore dichiara quale
  formulazione sta mostrando ed elenca le altre; l'evidenziazione riguarda solo il blocco mostrato.
- AC9: se la formulazione prescritta non è riconducibile con certezza a un blocco, il visore **non**
  evidenzia nulla e chiede di scegliere: nessuna ipotesi silenziosa su un dosaggio.
- AC10: la confezione da cui si ricava il documento è scelta usando forma e dosaggio della riga di
  terapia, non il primo risultato della ricerca.
- AC7: `npx tsc --noEmit` e `npm run build` passano senza errori; pdf.js non entra nel bundle
  iniziale (chunk separato, caricato all'apertura del visore).

## Test Plan

| Test type                 | Required | Reason                                                                                                                                         |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | Localizzazione delle sezioni 4.1/4.2/4.3 nel testo estratto: logica pura, casi limite reali (numerazione assente, sezione a cavallo di pagina) |
| Integration               |       no | Nessuna composizione nuova fra moduli applicativi                                                                                              |
| API                       |       no | Backend non toccato                                                                                                                            |
| Playwright                |      yes | AC1-AC5 sono comportamenti di interfaccia: servono evidenze oggettive                                                                          |
| Persistence after refresh |       no | La funzione non scrive dati                                                                                                                    |
| Agnos action registry     |       no | Fuori ambito                                                                                                                                   |
| Voice simulation          |       no | Fuori ambito                                                                                                                                   |
| OCR/import test           |       no | L'anagrafica non viene reimportata                                                                                                             |
| Security/privacy scan     |      yes | AC6: verifica che negli URL verso AIFA non finiscano dati di paziente                                                                          |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unit
- screenshot del visore aperto con le sezioni evidenziate
- screenshot dell'indicatore "farmaco non trovato" e della ricerca
- trace Playwright
- prova che nessun download è stato avviato (elenco download del contesto Playwright vuoto)
- prova che gli URL verso AIFA non contengono identificativi di paziente

## Risks

- **La fonte AIFA cade durante i test.** Osservato: ~10 minuti di `503`. Mitigazione: i test
  Playwright intercettano la rete e servono un PDF di riferimento, così l'esito non dipende
  dalla disponibilità di un servizio terzo; la disponibilità reale è verificata a parte.
- **La struttura dell'RCP non è garantita.** La numerazione 4.1/4.2/4.3 è convenzione EMA seguita
  dalla quasi totalità degli RCP italiani, ma non da tutti. Mitigazione: se una sezione non si
  trova, il visore apre comunque il documento senza evidenziazione, senza errori.
- **RISCHIO CLINICO — un PDF contiene più RCP.** Verificato sulla Tachipirina: 48 pagine, **5 RCP**
  concatenati (1000 mg compresse, 500 mg compresse, 10 mg/ml soluzione per infusione, 120 mg/5 ml
  sciroppo, sciroppo senza zucchero), quindi cinque sezioni 4.2 con posologie inconciliabili. La
  causa è strutturale: il link AIFA è per AIC6 (il farmaco), l'anagrafica per confezione.
  Evidenziare il blocco sbagliato indicherebbe all'operatore un dosaggio errato — un danno che la
  versione attuale, che lo costringe a scorrere il documento, non produce. Mitigazione: AC8/AC9/AC10
  — auto-match dichiarato in chiaro, selettore sempre visibile, e in caso di incertezza nessuna
  evidenziazione. L'assenza di evidenziazione è un esito accettabile; un'evidenziazione sbagliata no.
- **Peso di pdf.js (~350 KB gzip).** Mitigazione: import dinamico, chunk separato; verificato in
  AC7. Precedente in progetto: `tesseract.js`.
- **Il livello testo può mancare** (RCP prodotti come scansione). Mitigazione: nessuna
  evidenziazione, documento comunque leggibile; il caso va segnalato, non nascosto.

## Gate Status

READY FOR IMPLEMENTATION
