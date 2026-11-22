# Task Contract

## Task

- Title: Milo fase 4 giro visita a voce
- Slug: milo-fase-4-giro-visita-a-voce
- Type: change
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |      yes |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-22): procedere con le fasi del piano
`docs/architecture/milo-ai-first.md` (§4, Fase 4). Nessuna modifica a backend, Prisma o rotte: le
rilevazioni confermate passano dalla rotta già esistente e validata della pagina Parametri
(`POST /patients/:id/parameter-readings`, idempotente per `requestId`). Persistenza = la stessa
tabella `PatientParameterReading`, solo dopo conferma.

## Current Behaviour

La voce di Milo registra un parametro alla volta, di un paziente alla volta, nel JSON storico della
cartella (non nella pagina Parametri) e chiede l'orario esplicito. Un giro visita richiede decine di
comandi separati.

## Expected Behaviour

Nel pannello di Milo, «Giro visita»: l'operatore detta (o scrive) di seguito più pazienti e più
parametri («Rossi pressione 140 su 85 saturazione 95, letto 4 temperatura 37 e 8 vigile…»). Un
parser deterministico divide la dettatura per paziente (cognome, nome, stanza/letto fra i pazienti
del perimetro) e riconosce i parametri della pagina Parametri (PA, SpO₂, FC, FR, temperatura,
glicemia, ossigeno, coscienza). Per ogni paziente nasce una bozza, modificabile; nulla è scritto
finché l'operatore non conferma quel paziente. A fine giro un riepilogo dice chi è stato registrato,
chi è rimasto in bozza e cosa non è stato attribuito.

## Acceptance Criteria

- AC1: una dettatura di 5 pazienti in una sola sessione produce 5 bozze con tutti i valori giusti
  (test sul parser con dettatura realistica, anche spezzata in più frammenti).
- AC2: nessuna scrittura prima della conferma; la conferma di un paziente invia una sola
  rilevazione con i suoi valori alla rotta della pagina Parametri; un nuovo tentativo riusa lo
  stesso `requestId`.
- AC3: cognome ambiguo, paziente non riconosciuto, valore impossibile o testo senza paziente
  diventano avvisi visibili, mai valori indovinati; i valori fuori formato bloccano la conferma con
  lo stesso controllo della pagina Parametri.
- AC4: il riepilogo di fine giro elenca registrati, bozze e frammenti non attribuiti.
- AC5: le bozze restano solo nella memoria della pagina (nessun dato clinico nell'archivio del
  browser) e si chiudono con il giro.
- AC6: test nuovi, suite frontend, typecheck e build senza errori.

## Test Plan

| Test type                 | Required | Reason                                                     |
| ------------------------- | -------: | ---------------------------------------------------------- |
| Unit                      |      yes | parser della dettatura, stato del giro                     |
| Integration               |      yes | conferma → richiesta alla rotta dei parametri (simulata)   |
| API                       |       no | rotta esistente, invariata                                 |
| Playwright                |      yes | dopo il rilascio: giro dettato a testo sulla demo          |
| Persistence after refresh |      yes | dopo il rilascio: valori confermati nella pagina Parametri |
| Agnos action registry     |       no | nessuna azione nuova del registro                          |
| Voice simulation          |      yes | frammenti di trascrizione come dal riconoscimento vocale   |
| OCR/import test           |       no |                                                            |
| Security/privacy scan     |      yes | nessun dato nel browser, solo pazienti del perimetro       |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test, suite, build; render del pannello del giro

## Risks

- Il riconoscimento vocale del browser trascrive i numeri in modi diversi («trentasette e otto»):
  il parser gestisce cifre e le forme comuni; il resto diventa avviso.
- Le bozze si perdono ricaricando la pagina (scelta di privacy: niente dati clinici nel browser
  senza una tabella dedicata, che richiede una modifica allo schema da decidere con l'utente).

## Gate Status

READY FOR IMPLEMENTATION
