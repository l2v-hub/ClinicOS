# Task Contract

## Task
- Title: Loop UX ciclo 7 - Terapia Farmacologica flusso piu usato
- Slug: loop-ux-ciclo-7-terapia-farmacologica-flusso-piu-usato
- Type: refactor
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

## Current Behaviour

`TerapiaFarmacologicaTab.tsx` (1276 righe, il secondo tab piu' grande della cartella paziente
dopo Dimissione) e' il flusso a piu' alta frequenza d'uso: la somministrazione farmaci avviene
piu' volte per paziente per turno, per ogni operatore. E' un'azione clinica ripetuta, non
occasionale come Dimissione (una volta per ricovero) o Presa in Carico (una volta per ricovero).
Loop-ux-ciclo-2 aveva gia' toccato la coerenza dei tab della cartella a livello di navigazione;
questo ciclo entra nel contenuto del tab piu' usato: ricerca farmaco, campo posologia, avviso
anomalie, azioni di somministrazione.

Swarm di 5 agenti Ruflo (ux-simplicity, ui-consistency, frontend-performance,
frontend-implementation, qa-reviewer) analizza e interviene chirurgicamente su questo flusso,
in loop analizza -> semplifica -> implementa -> misura -> verifica.

## Expected Behaviour

Meno passaggi per completare una somministrazione, coerenza visiva con il resto della cartella
(palette, componenti condivisi), nessuna regressione di performance o di comportamento clinico
(nessuna somministrazione erronea resa piu' probabile da un cambio di UI). Ogni AC concreto verra'
definito dallo swarm nella fase di analisi, prima di modificare codice, e riportato qui o nel
validation-report prima della chiusura.

## Acceptance Criteria

Definiti dopo la fase di analisi dello swarm (ux-simplicity, ui-consistency, frontend-performance).
Ogni AC indica come e' stato verificato. **Nessun AC e' stato verificato a browser**: su questa
macchina non ci sono Podman/Docker ne' un Postgres in ascolto, quindi non esistono runtime,
screenshot o Playwright. Gli AC sotto sono verificabili staticamente; quelli che richiedono un
runtime sono elencati a parte e restano APERTI.

### Verificati staticamente

- AC1 — Righe della tabella «Somministrazioni giornaliere» univoche. `patientDailyAdmins` produce
  una riga per fascia, quindi una terapia bigiornaliera generava due righe con lo stesso
  `therapyId`, usato come chiave React (`ClinicalTable.tsx:235`). Aggiunta `rowKey`
  (`therapyId|fascia|scheduledTime`) e `keyField="rowKey"`.
  *Verifica: lettura del codice + `tsc` pulito. Da riverificare a runtime.*
- AC2 — `npx tsc --noEmit` esce 0 dopo **ogni** modifica, e `npm run build` completa senza errori.
  *Verifica: eseguiti; build `✓ built in 6.96s`.*
- AC3 — I 132 test preesistenti passano invariati e se ne aggiungono 8 (`npm test`: 140 pass,
  0 fail).
- AC4 — Il salvataggio di una terapia incompleta non fallisce piu' in silenzio: il pulsante e'
  disabilitato e una riga dice quale campo manca. *Verifica: lettura del codice.*
- AC5 — Un errore di salvataggio non resta appeso passando a un'altra sotto-scheda.
  *Verifica: lettura del codice.*
- AC6 — «Sospendi» chiede conferma (`ConfirmDialog`, `tone="primary"`) e non e' piu' colorato come
  «Elimina», da cui dista 4px. Sospendere ferma le somministrazioni future senza lasciare traccia
  visibile, ed era l'unica delle due azioni adiacenti non protetta. *Verifica: lettura del codice.*
- AC7 — Il ripiego per nome di `trovaRisoluzione` funziona. Era codice morto: le chiavi usano un
  byte NUL come separatore, il ripiego cercava per prefisso «NOME » con **uno spazio**, e non
  corrispondeva mai. Sostituita la scansione O(N×M) con un indice per nome; separatore reso
  esplicito (`'\u0000'`) invece che byte invisibile nel sorgente.
  *Verifica: **test unitario**, `__tests__/farmacoRiferimento.test.ts`, 8 casi (chiave esatta,
  ripiego senza dosaggio, dosaggio non combaciante, nomi con spazi interni, normalizzazione,
  farmaco assente, stabilita' del ripiego, mappa vuota).*
  *I test sono stati validati contro il difetto: rimettendo temporaneamente l'implementazione
  rotta, i 5 casi che esercitano il ripiego falliscono e i 3 che non lo toccano restano verdi.
  Non sono quindi test che passano comunque.*
  **Questo AC cambia cio' che l'operatore vede** (vedi Rischi): la verifica visiva resta aperta.
- AC8 — Le tabelle Storico e Giornaliere sono paginate a 25 righe (`pageSize`, gia' supportato da
  `ClinicalTable`) invece di renderizzarne fino a 200.
- AC9 — Il pulsante del documento AIFA non manda piu' a capo la cella del farmaco. `.icon-btn` e'
  `display: flex`, quindi in mezzo al testo apriva una riga nuova; nuovo modificatore
  `.icon-btn--inline`. Riguarda tutte e cinque le tabelle della scheda.
- AC10 — Bersagli di tocco a 44px per `.qty-chip`, `.frac-toggle` e `.tf-subtab`; la pillola
  «non in anagrafica» passa da 10px a 11px con padding maggiore.
- AC11 — `al_bisogno` non e' piu' `badge--amber`: in Programmazione stava accanto alla colonna
  Stato, dove ambra significa «sospesa». Ora `badge--teal`.
- AC12 — Nessuna regressione di lint introdotta: 4 errori `react-hooks/set-state-in-effect`,
  tutti preesistenti in codice non toccato (i tre `useEffect` dei loader e `useRisoluzioniFarmaco`).
- AC13 — I quattro stati distinti di `renderFarmaco` (trovato / non-trovato / senza-documento /
  fonte-non-disponibile), il `ConfirmDialog` di eliminazione, l'`AvvisoAnomalieFarmaci` e il
  guard sugli orari in `handleSave` sono intatti. AC7 li **ripristina** dove erano soppressi.
- AC14 — `.form-hint` ha finalmente una definizione: era usata dalle maschere della terapia ma
  non esisteva in nessun foglio di stile, quindi restava un `<small>` non stilato. Dentro
  `.form-actions` (flex, senza `align-items`) riceve `align-self: center` e `margin-right: auto`,
  altrimenti si stirerebbe a tutta altezza allineando il testo in alto rispetto ai pulsanti.
  Segnalata da qa-reviewer; preesistente, non introdotta da questo ciclo.

### Verificati a runtime (round 3)

Il frontend dev server era attivo su `localhost:5173` senza backend/Postgres/Podman disponibili.
Seguendo la tecnica documentata (mock fallback + `page.route` stubbing, nessun cambiamento al
codice applicativo), `e2e/loop-ux-ciclo-7-terapia-farmacologica.mjs` guida un browser reale contro
il componente vero, con richieste HTTP intercettate. 20/20 verifiche superate.

- AC-R1 — nessuna regressione funzionale nel flusso di somministrazione: verificata a browser.
  Sospensione con conferma, validazione campo mancante, errore di salvataggio e sua pulizia al
  cambio scheda, ricerca farmaco, tutte esercitate end-to-end su DOM reale.
- AC-R2 — evidenza visiva di AC9/AC10/AC11 e del cambio di resa AC7: screenshot in `screenshots/`
  piu' asserzioni sul DOM reso (bounding box, classi CSS effettive).

Vedi `validation-report.md` per il dettaglio completo (Round 3).

### Resta aperto — richiede un vero Postgres

- Persistenza dopo refresh: fuori scope per questo ciclo (nessuna modifica al modello dati), non
  verificata e non richiesta dal Test Plan.

Il ciclo puo' ora essere chiuso come CLOSED — VERIFIED: vedi Final Decision in validation-report.md.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `trovaRisoluzione` e' logica pura e il suo ripiego era rotto: 8 casi in `__tests__/farmacoRiferimento.test.ts`, validati contro il difetto |
| Integration | no | nessun modulo backend toccato |
| API | no | nessuna modifica API prevista |
| Playwright | yes | flusso clinico ad alta frequenza: va verificato a browser reale |
| Persistence after refresh | no | nessuna modifica al modello dati prevista |
| Agnos action registry | no | non toccato |
| Voice simulation | no | non toccato |
| OCR/import test | no | non toccato |
| Security/privacy scan | yes | il tab mostra dati farmaco/paziente: verificare nessuna nuova esposizione nei log |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

**R1 — AC7 cambia cio' che l'operatore vede, ed e' il rischio principale di questo ciclo.**
Riparando il ripiego per nome, nelle tabelle Programmazione / Storico / Giornaliere le celle
farmaco che prima non mostravano **nulla** ora mostrano l'icona del documento AIFA oppure la
pillola «non in anagrafica». Prima il ripiego non corrispondeva mai e `trovaRisoluzione`
restituiva `undefined`, quindi nessuno dei quattro stati veniva reso.
*Direzione del cambiamento:* da «nessun segnale» a «segnale». Un farmaco fuori anagrafica in
Storico prima passava muto. *Mitigazione:* la semantica del ripiego non e' stata toccata — resta
«una qualunque risoluzione dello stesso farmaco», come gia' documentato — e il visore continua a
chiedere la formulazione all'operatore invece di indovinarla quando l'abbinamento e' incerto.
*Da verificare per primo appena esiste un ambiente.*

**R2 — Le modifiche CSS non hanno avuto una verifica visiva.** AC9/AC10/AC11 sono ragionate sul
codice: `.icon-btn--inline` perche' `.icon-btn` e' `display: flex`; `min-height` su `.qty-chip` e
`.tf-subtab` (contenuto centrato) ma **padding** su `.frac-toggle`, che allinea a `baseline` e con
un'altezza minima si ritroverebbe il contenuto in alto. Nessuna di queste e' stata vista a schermo.
*Mitigazione:* sono modifiche isolate e reversibili, nessuna tocca il layout di stampa/modulo.
Scartati di proposito i suggerimenti che espandevano l'area di tocco con pseudo-elementi
invisibili (`::after` con `inset` negativo): in una tabella densa possono sovrapporsi alle righe
vicine e rubare clic, esattamente il contrario dell'obiettivo, e non e' verificabile senza browser.

**R3 — `farmacoRiferimento.ts` appariva come binario a git e a ripgrep**, perche' conteneva un
byte NUL letterale. Il file ora e' testo (`'\u0000'` come sequenza di escape) e il diff e'
leggibile; il confronto con la versione precedente richiede pero' `git diff --text`, dato che il
blob vecchio contiene ancora il NUL. E' questo il motivo per cui il bug di AC7 e' rimasto
invisibile: la ricerca per prefisso confrontava con uno spazio e nessuno poteva vederlo nel diff.

**R4 — Fuori ambito, deliberatamente.** Non implementati: le azioni «Erogata / Non erogata» nella
sotto-scheda giornaliera (due POST che scrivono somministrazioni cliniche, non collaudabili qui);
il precompilamento del dosaggio da AIFA (inferenza su un campo di dose); la cache su
`loadHistory` (invalidata da una schermata diversa, staleness non verificabile); la memoizzazione
delle cinque colonne (diff ampio su file clinico); il caricamento pigro del PDF.

## Gate Status

CLOSED — VERIFIED (round 3, runtime evidence added; vedi validation-report.md)
