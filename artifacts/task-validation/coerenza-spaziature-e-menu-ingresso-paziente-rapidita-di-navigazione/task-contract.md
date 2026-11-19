# Task Contract

## Task

- Title: Coerenza spaziature e menu, ingresso paziente, rapidità di navigazione
- Slug: coerenza-spaziature-e-menu-ingresso-paziente-rapidita-di-navigazione
- Type: change
- Date: 2026-11-18

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

Note: solo frontend (`frontend/src`). Nessuna modifica a backend, schema Prisma, rotte API o
`VITE_API_URL`. La sidebar (L1) resta com'è: l'utente l'ha approvata. "OCR / Import" non è
impattato: della pagina d'ingresso cambia solo la presentazione (spaziature, titoli, controlli),
non il flusso né i dati.

## Current Behaviour

Misure oggettive a 1366×900 su 17 pagine (operatore e amministratore), prima del task
(`logs/spacing-before.txt`, `logs/intake-metrics-before.txt`):

1. **Ritmo verticale diverso per pagina.** La distanza fra i blocchi di pagina vale 0, 12, 16, 20,
   24, 28 o 32px a seconda della pagina (Turno 32, Pazienti 24, Terapia 28, Parametri 32,
   Consegne 16, Agenda 12/0, Dashboard 20, Operatori 12/16, Posti Letto 12/20/16, Orari 20,
   Ruoli 28). Farmaci ha un doppio rientro (49px invece di 24px su tre lati).
2. **Padding delle card diverso per pagina.** Nove combinazioni: 24/24, 16/16, 12/16, 12/12, 10/16,
   18/22, 32/20, 18/20, 16/20.
3. **Menu e filtri in quattro forme.** `ds-chip`, `filter-chip` (Farmaci), `agt-view-btn` (Agenda)
   e `top-nav--level3` (Ruoli) svolgono lo stesso compito con misure e stati attivi diversi.
4. **Ingresso paziente** (pagina più importante per il tempo di lavoro): sei stili di titolo
   (20/600, 18/700, 18/600, 14/600, 13/700, 12/700), due griglie di campi (gap 10/14 e 12/12),
   pulsanti di cinque famiglie (`ds-btn`, `btn-sm`, `btn-secondary`, `btn-link`, `link-btn`) e
   controlli di altezze diverse (73, 44, 40, 36, 27px).
5. **Rapidità.** Bundle iniziale `index` 644 kB, un chunk condiviso `patientDemographics` da 428 kB,
   CSS iniziale 284 kB; nessuna misura sistematica di richieste duplicate o ricaricamenti alla
   navigazione fra pagine.

## Expected Behaviour

1. Una sola regola di spaziatura valida su tutte le pagine, espressa con i token del design system
   (`--ds-layout-gap` fra i blocchi di pagina, `--ds-card-padding` dentro le card, rientro di
   pagina unico), documentata in `frontend/src/design-system/README.md`.
2. Un solo aspetto per menu secondari e filtri (stessa altezza, raggio, tipografia e stato attivo),
   qualunque sia la classe storica usata dalla pagina.
3. Ingresso paziente allineato alla stessa regola: una gerarchia di titoli a due livelli, una sola
   griglia di campi, pulsanti di una sola famiglia, controlli della stessa altezza del resto
   dell'app.
4. Navigazione più rapida: meno codice scaricato all'avvio e nessuna richiesta inutile ripetuta
   passando da una pagina all'altra, senza cambiare il comportamento funzionale.
5. Codice toccato più semplice (meno regole CSS duplicate e meno righe), a comportamento invariato.

## Acceptance Criteria

- AC1: sulle 17 pagine misurate la distanza fra i blocchi di pagina è un unico valore
  (`--ds-layout-gap`, 16px) e il rientro del contenuto è 24px su tutte (Farmaci compresa). Le
  eccezioni volute (blocchi incollati per costruzione, es. barra + tabella dello stesso pannello)
  sono elencate nel report.
- AC2: le card di pagina usano `--ds-card-padding` (16px); le eccezioni volute (tabelle a filo,
  righe dense di elenco) sono elencate nel report con il motivo.
- AC3: `ds-chip`, `filter-chip`, `agt-view-btn` e le voci `top-nav--level3` hanno la stessa
  altezza, lo stesso raggio, la stessa dimensione/peso del testo e lo stesso stato attivo (misura
  degli stili calcolati).
- AC4: pagina «Nuovo ingresso»: al massimo due stili di titolo (sezione, sottosezione), una sola
  misura di gap per le griglie di campi, tutti i pulsanti d'azione alti come i controlli del resto
  dell'app; nessun campo o azione rimossi o spostati di sezione; la compilazione di un ingresso a
  mano e «Salva bozza e chiudi» funzionano come prima.
- AC5: la sidebar è identica a prima (confronto dello screenshot della sola sidebar: 0 pixel
  diversi a parità di pagina attiva).
- AC6: il JavaScript scaricato per aprire la prima pagina dell'operatore diminuisce rispetto alla
  misura di partenza, e la navigazione fra le pagine principali non ripete richieste identiche già
  soddisfatte nella stessa visita di pagina; i numeri prima/dopo sono nel report.
- AC7: `cd frontend && npm run build` passa; la suite frontend (`npm test`) passa; il lint non
  introduce nuovi errori rispetto alla base.
- AC8: nessun file fuori da `frontend/`, `artifacts/task-validation/<slug>/`, `CLAUDE.md` e
  documentazione viene modificato; nessuna modifica a backend, Prisma, `VITE_API_URL`,
  `frontend/vercel.json`.
- AC9: le righe di codice applicativo toccato non aumentano al netto (diff `--shortstat` su
  `frontend/src`, esclusi i test), salvo motivo scritto nel report.

## Test Plan

| Test type                 | Required | Reason                                                                         |
| ------------------------- | -------: | ------------------------------------------------------------------------------ |
| Unit                      |      yes | suite frontend esistente (test che vincolano CSS/TSX) + eventuali nuovi test   |
| Integration               |       no | nessuna logica di integrazione nuova                                           |
| API                       |       no | backend non toccato                                                            |
| Playwright                |      yes | misure di spaziatura prima/dopo, screenshot per pagina, flusso ingresso a mano |
| Persistence after refresh |      yes | la bozza d'ingresso salvata si riapre dopo il ricaricamento (flusso invariato) |
| Agnos action registry     |       no | non toccato                                                                    |
| Voice simulation          |       no | non toccato                                                                    |
| OCR/import test           |       no | non toccato                                                                    |
| Security/privacy scan     |       no | nessun dato, permesso o rete nuovi                                             |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (build, suite frontend, lint) in `logs/`
- misure di spaziatura e stili prima/dopo in `logs/`
- screenshot prima/dopo delle pagine e dell'ingresso paziente in `screenshots/`
- misure di rapidità prima/dopo (dimensioni dei bundle, richieste alla navigazione) in `logs/`

## Risks

- Molti test vincolano il testo di CSS/TSX (regex sui sorgenti, budget di righe): ogni modifica va
  verificata con la suite completa.
- Uniformare le spaziature a livello globale può toccare stati funzionali (stria di priorità delle
  consegne, alone di fuoco, bersagli tattili da 44px): le regole globali non toccano bordi né
  ombre di stato e si verificano con screenshot per pagina.
- La divisione del codice in chunk può introdurre lampi di caricamento alla navigazione: si
  verifica nel browser che il passaggio fra pagine non peggiori.
- La skill «impeccable» non è installata in questa sessione: si seguono le sue guide pubbliche
  (layout, polish, optimize) come riferimento; i suoi script non vengono eseguiti.

## Gate Status

READY FOR IMPLEMENTATION
