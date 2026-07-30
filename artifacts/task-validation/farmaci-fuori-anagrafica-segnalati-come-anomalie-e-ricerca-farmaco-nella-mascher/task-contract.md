# Task Contract

## Task

- Title: Farmaci fuori anagrafica segnalati come anomalie e ricerca farmaco nella maschera terapia
- Slug: farmaci-fuori-anagrafica-segnalati-come-anomalie-e-ricerca-farmaco-nella-mascher
- Type: change
- Date: 2026-07-30

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
| Privacy / Security   |       no |
| Config / Env         |       no |

Backend intatto. Le anomalie di reparto si ricavano da `GET /therapy-slots?date=`, che già
restituisce le terapie attive di tutti i pazienti con `drugName` e `patientId` in una sola
richiesta; il riconoscimento contro l'anagrafica usa `GET /farmaci/cerca`, già esistente.

## Current Behaviour

**Causa a monte.** Nella maschera di inserimento/modifica terapia il farmaco è un campo di testo
libero senza alcun controllo (`TherapyFormFields.tsx:141-146`, placeholder «es. Kanrenol»). Chi
compila può scrivere qualunque cosa: un nome storpiato, un prodotto inesistente, un'abbreviazione.
Nulla lo verifica contro l'anagrafica AIFA al momento dell'inserimento.

**Effetto a valle.** Il farmaco non riconosciuto è segnalato solo sulla singola riga della scheda
Terapia farmacologica, con l'indicatore introdotto dal task precedente. Chi apre la cartella del
paziente non lo sa, chi guarda la lista pazienti non lo sa, chi apre il cruscotto operatore non lo
sa. Un errore di battitura in terapia resta quindi invisibile fino a quando qualcuno non apre
quella specifica scheda e guarda quella specifica riga.

Non esiste in ClinicOS alcun concetto di «anomalia da sanare» sul paziente: la ricerca su tutto il
frontend non trova nulla.

## Expected Behaviour

1. La maschera terapia offre una **ricerca del farmaco per nome commerciale o principio attivo**:
   si cerca, si seleziona una confezione reale, e nome e forma arrivano dalla selezione.
2. Un farmaco fuori anagrafica è **un'anomalia del paziente**, segnalata in quattro punti:
   testa della cartella, riga in lista pazienti, testa della scheda Terapia farmacologica,
   cruscotto operatore.
3. La segnalazione dice quanti farmaci non sono riconosciuti e porta dove si correggono.
4. Resta possibile prescrivere un preparato **galenico o estero**, che legittimamente non è in
   anagrafica, ma solo con un'azione deliberata e distinguibile da un errore di battitura.

## Acceptance Criteria

- AC1: nella maschera terapia si cerca un farmaco per nome commerciale e lo si seleziona; il campo
  nome viene compilato dalla selezione, non digitato a mano.
- AC2: la stessa maschera trova il farmaco anche cercando per **principio attivo**.
- AC3: selezionando una confezione, la forma farmaceutica è valorizzata di conseguenza.
- AC4: un nome non presente in anagrafica si può salvare solo tramite un'azione esplicita
  («usa comunque questo nome»), non digitandolo e passando avanti; il valore digitato resta.
  Il farmaco continua però a comparire fra le anomalie: **marcarlo come galenico legittimo
  richiederebbe di persistere un flag, cioè una modifica di schema, fuori dall'ambito di questo
  task.** L'azione esplicita evita l'errore di battitura involontario, non esenta dalla revisione.
- AC5: la testa della cartella di un paziente con farmaci fuori anagrafica mostra un avviso con il
  conteggio, e il collegamento porta alla scheda Terapia farmacologica.
- AC6: la riga del paziente in lista pazienti espone un indicatore quando ha anomalie.
- AC7: la testa della scheda Terapia farmacologica riepiloga quanti farmaci non sono riconosciuti,
  elencandoli.
- AC8: il cruscotto operatore elenca i pazienti con farmaci fuori anagrafica.
- AC9: un paziente senza anomalie non mostra alcun avviso in nessuno dei quattro punti — l'assenza
  di segnale deve significare «nessuna anomalia», non «non verificato».
- AC10: quando l'anagrafica non risponde, nessun punto dichiara anomalie: uno stato indeterminato
  non è un'anomalia, e affermarlo sarebbe un falso allarme su dati clinici.
- AC11: `tsc -b` e `npm run build` passano; nessuna nuova chiamata al backend per paziente in lista
  (le anomalie di reparto derivano da una sola richiesta `/therapy-slots`).

## Test Plan

| Test type                 | Required | Reason                                                                                                                              |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | Calcolo delle anomalie da terapie + risoluzioni: logica pura, e AC9/AC10 sono casi limite (nessuna anomalia vs stato indeterminato) |
| Integration               |       no | Nessuna composizione nuova fra moduli applicativi                                                                                   |
| API                       |       no | Backend non toccato                                                                                                                 |
| Playwright                |      yes | AC1-AC9 sono comportamenti d'interfaccia su quattro schermate diverse                                                               |
| Persistence after refresh |      yes | AC1/AC3: il farmaco selezionato dalla ricerca deve risultare salvato sulla terapia                                                  |
| Agnos action registry     |       no | Fuori ambito                                                                                                                        |
| Voice simulation          |       no | Fuori ambito                                                                                                                        |
| OCR/import test           |       no | L'anagrafica non viene reimportata                                                                                                  |
| Security/privacy scan     |      yes | La ricerca viaggia verso il backend: verificare che non porti identificativi di paziente                                            |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unit
- screenshot dei quattro punti di segnalazione, con e senza anomalie
- screenshot della ricerca nella maschera terapia (per nome e per principio attivo)
- screenshot della selezione che compila nome e forma
- trace Playwright
- prova di persistenza dopo ricaricamento
- conteggio delle richieste di rete sulla lista pazienti (AC11)

## Risks

- **Falsi allarmi.** Segnalare come anomalia un farmaco che l'anagrafica non trova per un limite
  della ricerca — non perché il farmaco non esista — trasformerebbe la funzione in rumore, e il
  rumore in ambito clinico si impara a ignorare. Mitigazione: AC10 (anagrafica muta ⇒ nessuna
  anomalia) e AC4 (i galenici legittimi si dichiarano, e non ricadono fra gli errori).
- **Coprire i galenici come errori.** Un preparato galenico o un farmaco estero non è un'anomalia.
  Senza AC4 la funzione spingerebbe a «sanare» prescrizioni corrette.
- **Copertura parziale del segnale di reparto.** `GET /therapy-slots?date=` restituisce solo le
  terapie **attive e valide oggi**, esclusi i `al_bisogno`. Lista pazienti e cruscotto quindi non
  vedono anomalie su terapie sospese, future o al bisogno; quelle restano visibili dentro la
  cartella del paziente, che legge le sue terapie per intero. È un limite accettato per non
  aggiungere una rotta di backend, e va scritto in interfaccia, non nascosto.
- **Costo in rete sulla lista.** Una risoluzione per paziente moltiplicherebbe le richieste.
  Mitigazione: AC11 — una sola `/therapy-slots` più le ricerche per nome distinto, deduplicate e
  cachate 12 h.

## Gate Status

READY FOR IMPLEMENTATION
