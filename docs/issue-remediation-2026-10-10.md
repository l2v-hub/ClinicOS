# Correzioni delle issue aperte — 10 ottobre 2026

Inventario verificato tramite GitHub: #303, #405, #408, #410, #416 e #429. Le etichette `status-blocked` erano riferite a verifiche manuali e a decisioni di priorità, non all'impossibilità di implementare le correzioni software.

| Issue | Risultato software                                                                                                                                                                                                                                       | Evidenza                                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #405  | Nomi accessibili e associazioni label/controllo su tutti i dieci campi, ID univoci per istanza, errore descritto dal dialogo e dal salvataggio.                                                                                                          | SSR, accessibility tree Chromium, click delle label, ciclo Tab/Shift+Tab, Escape e ritorno al pulsante di apertura.                                                                            |
| #408  | Stati con simboli e testo persistente, dettaglio degli esiti misti, significato del conteggio, limiti dei risultati parziali e indicatore «Oggi» sulla data della struttura.                                                                             | Test dei cinque stati, zero parziale, calendario in scala di grigi e selezione del giorno/orario esatti.                                                                                       |
| #410  | Dosi raggruppate per ID paziente/giorno/fascia/stato, dettagli espandibili e azioni originali conservate. Sezioni distinte per scadute, imminenti, consegne urgenti e verifiche; tutte raggiungibili con «Mostra altri gruppi». Card vuote più compatte. | 22 dosi sintetiche, una nuova consegna urgente visibile anche con molti ritardi/anomalie, conteggi e destinazioni esatti, espansione da tastiera, viewport 390 px senza overflow della pagina. |
| #416  | Controlli frequenti da almeno 44 px nel contesto cartella/lista pazienti/posti letto, segnalazioni incluse. Azioni di stampa/PS/moduli con testo, focus visibile, ricerca e cancellazione separate. Altezza del topbar misurata per lo scroll su mobile. | Misure nel browser delle schermate reali: roster 21 controlli, cartella 10, catalogo moduli 21, cancellazione ricerca 1, posti letto 9; cartella anche a 390 px.                               |
| #429  | Indice dell'audit: le quattro issue software rimaste sono coperte da questa modifica; le altre 23 risultavano già chiuse nell'indice.                                                                                                                    | Mappatura precedente e artefatti browser.                                                                                                                                                      |
| #303  | Riferimento alla knowledge base, senza difetto applicativo né requisito di nuova funzionalità.                                                                                                                                                           | Lettura di `docs/nhw/README.md`, precedenza delle fonti, contesti di programmazione/terapie e componenti interessati; comportamento confrontato con sorgenti e test correnti.                  |

## Regole operative e verifiche manuali

Le consegne urgenti, incluse quelle già scadute o imminenti, hanno una sezione indipendente dal backlog delle terapie. L'ordinamento delle voci e le soglie esistenti restano in `buildAdessoQueue`. Il raggruppamento conserva l'ordine dei membri; ogni categoria ha un proprio limite di anteprima. La GUI dichiara che il ritardo è una scadenza superata e non una priorità clinica. Nessuna nuova regola di triage è introdotta. L'accordo con il reparto sulle priorità non è attestato da questi test.

La prova con screen reader reale (#405), dispositivi touch/guanti (#416) e luce intensa sul dispositivo (#408) richiede una sessione fisica: non è stata eseguita nel cloud. Il browser verifica nomi accessibili, tastiera, dimensioni e resa in scala di grigi; questi risultati non sono una certificazione WCAG dell'intera applicazione. I font esterni non raggiungibili nel cloud usano il fallback locale nelle immagini.

## Regressioni e ripetibilità

- Il runner frontend sceglie il tsconfig JSX corretto; lo stub Node gestisce gli import Vite `?url` e l'auth Entra può essere importata senza `import.meta.env` in Node.
- Il collegamento «Apri nella GUI classica» dell'assistente atterra sulla terapia del paziente noto. Le viste settimana/mese dell'agenda spiegano come aprire le somministrazioni del giorno esatto.
- I test della precedente tabella multipaziente verificano ora il picker e il modulo condiviso: limiti di pagina, scarto delle risposte obsolete, associazione al paziente selezionato, preservazione della bozza, nomi accessibili e layout mobile.
- Il runner backend esegue separatamente i file che confrontano conteggi globali del database. Il test di scope del diario ripristina la configurazione anche dopo un'asserzione fallita; la fixture di import ha un'identità univoca per run. La fixture MNA v1 già archiviata viene riletta e confrontata integralmente con il dump originale, senza cancellare o riscrivere documenti immutabili.
- Le modifiche locali preesistenti dei due script PowerShell sono incluse su richiesta dell'utente: normalizzano i terminatori di riga nel repository senza cambiare le istruzioni degli script; il checkout Windows resta CRLF secondo `.gitattributes`.

Comandi dalla root del repository:

```sh
npm run build
npm test --workspace frontend
# DATABASE_URL deve puntare al database di test isolato su 127.0.0.1,
# non al database di sviluppo o a un database remoto.
AUTH_MODE=demo NODE_ENV=test npm test --workspace backend
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
  node e2e/open-issues-ux.mjs http://localhost:5173 /tmp/clinicos-ux-evidence
node scripts/security/scan-frontend-secrets.mjs frontend/src frontend/index.html
```

Il test browser richiede Vite e backend demo locale con seed; le verifiche sintetiche del form/coda/calendario non scrivono nel database. La variabile Chromium è facoltativa quando Playwright ha già un browser installato. Risultati frontend: 1.321 test passati, zero falliti/saltati. Backend completo: 1.836 test scoperti, 1.831 passati, zero falliti, cinque saltati. I cinque saltati richiedono i harness dedicati `ARCHIVE_DOCUMENT_DB_TEST` (database `clinicos_sorting`) e `BUG428_SYNTHETIC_CLUSTER` (cluster nativo separato); non sono dichiarati eseguiti. Build frontend e backend e scansione segreti passate; browser senza errori JavaScript. Il lint frontend globale rileva 105 errori e 16 avvisi preesistenti: nei 23 file TypeScript modificati il confronto con `30f0b14d` mantiene le stesse 19 segnalazioni, senza nuove regole in errore. Risultati e confronto sono salvati negli artefatti.

Gli artefatti dell'esecuzione cloud sono in `artifacts/task-validation/open-issues-ux/`.

## Verifica del push e CI

La CI del push `a9e05053` ha superato build, suite backend e integrazioni API, ma il test browser di importazione cercava il pulsante anagrafico rimosso dal flusso corrente. Il test verifica ora i quattro valori dell'identità trasferiti nella bozza, la prontezza alla creazione, la persistenza API e la riapertura della cartella. Le identità sintetiche variano a ogni esecuzione, evitando di cancellare pazienti per liberare codici fiscali fissi. Le prove desktop e tablet sono passate senza errori JavaScript/console o risposte API inattese; nel cloud i font Google non disponibili sono sostituiti dal fallback locale con un'opzione esplicita limitata a localhost. La CI mantiene le proprie richieste font e le asserzioni sugli errori.

La CI aggiornata sul commit `155810e3` è passata integralmente: [run 38070838690](https://github.com/l2v-hub/ClinicOS/actions/runs/38070838690). L’audit funzionale successivo, inclusi runtime AI, harness DB opt-in e casi limite su cinque ruoli, è documentato in [qa-functional-audit-2026-10-10.md](qa-functional-audit-2026-10-10.md); conserva sei nuovi difetti applicativi e due lacune di copertura nelle issue #433–#440.
