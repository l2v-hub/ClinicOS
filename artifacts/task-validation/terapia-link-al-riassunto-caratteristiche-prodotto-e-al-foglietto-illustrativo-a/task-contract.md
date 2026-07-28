# Task Contract

## Task

- Title: Terapia: link al Riassunto Caratteristiche Prodotto e al Foglietto Illustrativo AIFA
- Slug: terapia-link-al-riassunto-caratteristiche-prodotto-e-al-foglietto-illustrativo-a
- Type: feature
- Date: 2026-07-28

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

Frontend/UI: `TerapiaFarmacologicaTab.tsx` (colonna Farmaco) più un piccolo modulo di risoluzione
nome→farmaco. Backend/API: **nessuna modifica** — `GET /farmaci/cerca?q=` restituisce già `aic`,
`denominazione`, `forma`, `principiAttivi`, `linkFi`, `linkRcp`. Privacy/Security: si aprono link
verso un dominio esterno (AIFA); va garantito che nessun dato di paziente finisca nell'URL e che
l'apertura in nuova scheda non esponga la sessione.

## Current Behaviour

La scheda terapia del paziente mostra per ogni riga farmaco, dosaggio, via, tipo e programmazione.
Per verificare la posologia ufficiale di un farmaco l'operatore deve uscire dall'applicazione e
cercare il prodotto a mano sul sito AIFA.

L'anagrafica farmaci AIFA è già importata (tabella `Farmaco`, chiave `aic`) e contiene per ogni
confezione i campi `linkRcp` e `linkFi` — i link ufficiali AIFA al Riassunto delle Caratteristiche
del Prodotto e al Foglietto Illustrativo. Sono popolati e **oggi non usati da nessuna schermata**.

L'endpoint `GET /farmaci/cerca?q=<nome>` (protetto da `requireOperator`) espone già quei campi, con
ricerca per nome commerciale e recupero dei nomi storpiati. Manca solo il collegamento in interfaccia.

## Expected Behaviour

1. Nella colonna "Farmaco" della scheda terapia, accanto al nome, compare un'icona-link che apre in
   una nuova scheda l'RCP AIFA del farmaco corrispondente.
2. Il farmaco viene risolto per nome tramite `GET /farmaci/cerca?q=<farmacoNome>&limite=1`. Le
   richieste sono **deduplicate per nome** e tenute in cache per la durata della sessione: una
   scheda con 10 terapie di 6 farmaci distinti effettua 6 richieste, non 10, e nessuna al ritorno
   sulla stessa scheda.
3. Quando il farmaco **non** viene trovato in anagrafica, o quando l'anagrafica non è stata
   caricata, non compare alcuna icona: nessun link rotto, nessun messaggio d'errore, nessun degrado
   della tabella. La riga resta esattamente com'è oggi.
4. Se esiste solo `linkFi` e non `linkRcp`, si apre il foglietto illustrativo; l'etichetta
   accessibile distingue i due casi.
5. Il link si apre con `target="_blank"` e `rel="noopener noreferrer"`.
6. Nessun identificativo di paziente compare nell'URL chiamato: la query contiene solo il nome
   commerciale del farmaco.

## Acceptance Criteria

- AC1: in una scheda paziente con una terapia il cui farmaco esiste in anagrafica, accanto al nome
  compare l'icona-link, e il suo `href` è il valore `linkRcp` restituito dall'API.
- AC2: l'icona apre in nuova scheda (`target="_blank"`) con `rel` contenente `noopener`.
- AC3: per un farmaco assente dall'anagrafica non viene reso alcun link e la tabella resta invariata
  (nessun errore in console, nessun placeholder).
- AC4: con più righe che citano lo stesso farmaco viene effettuata **una sola** richiesta di ricerca
  per nome distinto (deduplicazione verificata sulle chiamate di rete).
- AC5: nessuna richiesta di rete generata dalla funzionalità contiene l'id o il nome del paziente.
- AC6: `cd frontend && npm run build` passa (`tsc -b && vite build`), zero errori TypeScript.
- AC7: nessun errore in console e nessuna risposta HTTP 4xx/5xx rilevante durante il flusso.

## Test Plan

| Test type                 | Required | Reason                                                                                          |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------- |
| Unit                      |      yes | La risoluzione nome→farmaco (deduplicazione, cache, assenza di match) è logica pura e testabile |
| Integration               |       no | Nessun servizio backend modificato                                                              |
| API                       |       no | Nessuna rotta creata o modificata: si consuma `GET /farmaci/cerca` esistente                    |
| Playwright                |      yes | È una modifica di UI: servono screenshot del link reso, trace e assenza di errori console       |
| Persistence after refresh |       no | La funzionalità è di sola lettura: non crea né modifica dati                                    |
| Agnos action registry     |       no | Non toccato                                                                                     |
| Voice simulation          |       no | Non toccato                                                                                     |
| OCR/import test           |       no | Non toccato                                                                                     |
| Security/privacy scan     |      yes | Verificare `rel="noopener"` e che nessun dato di paziente compaia nelle richieste generate      |

## Evidence Plan

Required evidence:

- validation-report.md con l'esito reale dei comandi
- test unitari sulla risoluzione nome→farmaco (output in `logs/`)
- output di `npm run build` del frontend in `logs/`
- **screenshot Playwright** della scheda terapia con l'icona-link visibile (`screenshots/`)
- **trace** Playwright del flusso (`trace/`)
- elenco delle richieste di rete generate, a prova di AC4 (deduplicazione) e AC5 (nessun dato paziente)

## Risks

- **Omonimia commerciale**: la ricerca per nome può agganciare una confezione diversa dello stesso
  farmaco (dosaggio differente). L'RCP è però il medesimo documento per l'intera famiglia di
  confezioni del prodotto, quindi l'impatto è nullo nella maggior parte dei casi. Dichiarato: il
  link è materiale di consultazione, non una conferma d'identità della confezione prescritta.
- **Nome non trovato**: farmaci galenici, esteri o scritti in modo non standard non hanno match.
  Degrado previsto e accettato: nessuna icona, comportamento identico a oggi (AC3).
- **N richieste all'apertura della scheda**: mitigato da deduplicazione + cache di sessione (AC4).
  Non introduco un endpoint batch per non toccare il backend, che questo contratto esclude.
- **Anagrafica non caricata** in un ambiente: nessuna icona da nessuna parte, nessun errore (AC3).

## Gate Status

READY FOR IMPLEMENTATION
