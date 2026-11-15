# Task Contract

## Task

- Title: Bozze ingresso uniche, coerenza grafica e API dati sintetici
- Slug: bozze-ingresso-uniche-coerenza-grafica-e-api-dati-sintetici
- Type: feature
- Date: 2026-11-15

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: nessuna modifica allo schema Prisma né a `VITE_API_URL`. Il backend è toccato perché
richiesto esplicitamente (API dati sintetici) e perché l'unicità delle bozze va garantita lato
server. "OCR / Import" = solo il ciclo di vita della bozza nata da un import, non l'estrazione.

## Current Behaviour

1. **Bozze d'ingresso duplicate.** Ogni sessione d'import documenti genera una bozza propria
   (`PatientIntakeDraft` è unica per `importJobId`, non per paziente). Riaprendo "Nuovo ingresso /
   Importa dimissione" da un altro browser/dispositivo, o dopo la scadenza della sessione, lo stesso
   operatore ottiene una seconda bozza per lo stesso paziente: nell'elenco compaiono due voci
   "Riprendi bozza · Cognome Nome" identiche. Riprodotto in locale (2 righe `draft` con stessa
   anagrafica e stesso `createdById`). Non esiste alcun modo di eliminare una bozza. Le bozze
   manuali non compaiono nell'elenco e restano orfane quando cambia la sessione del browser.
   L'elenco bozze non si aggiorna alla chiusura del flusso "Importa dimissione".
2. **Incoerenze grafiche.** Titolo pagina in due posizioni diverse (topbar su quasi tutte le
   pagine; nel contenuto su Operatori, Posti Letto, Orari). I controlli della topbar cambiano
   dimensione fra una pagina e l'altra (36px ↔ 44px). Card con raggi 8/12/16px, ombre presenti
   solo su alcune pagine admin. Titoli di sezione con pesi 500/600/700 e `h3` non stilizzati.
   Consegne mostra elenchi e stati vuoti fuori da qualsiasi card. Larghezza del contenuto limitata
   solo su Posti Letto e Orari.
3. **Dati di prova.** Esistono solo lo script CLI `seed.ts`, `POST /patients/seed` (2 pazienti) e
   `POST /patients/demo-setup` (1 paziente, 650 righe inline in `routes/patients.ts`), tutti
   rifiutati con `NODE_ENV=production` (quindi anche sulla demo sintetica ospitata). Non esiste
   alcuna API per svuotare il sistema.

## Expected Behaviour

0. (Aggiunta dopo il primo rilascio) La scheda in bozza è sempre e solo una finché l'ingresso
   non si conclude: riaprirla e modificarla più volte aggiorna la stessa bozza.
1. Una sola voce in bozza per paziente e operatore: le bozze con la stessa identità forte (codice
   fiscale, oppure cognome+nome+data di nascita) sono raggruppate, la più recente è quella
   proposta, le precedenti restano raggiungibili ed eliminabili. Le bozze (manuali comprese) sono
   visibili, riprendibili ed eliminabili. Alla conferma del paziente le bozze doppie vengono
   archiviate. Nessuna fusione automatica di dati clinici fra bozze.
2. Un unico modo di presentare titolo pagina, topbar, card, titoli di sezione e stati vuoti su
   tutte le pagine operatore e amministratore, tramite i token del design system esistente.
3. `POST /admin/synthetic-data/seed` crea un dataset sintetico che copre le funzioni dell'app;
   `POST /admin/synthetic-data/wipe` svuota tutti i dati operativi lasciando il sistema pulito e
   accessibile; `GET /admin/synthetic-data` riporta stato e conteggi. Mai disponibili su una
   produzione reale.

## Acceptance Criteria

- AC1: due import dello stesso paziente (stessa identità forte, stesso operatore) producono
  nell'elenco "Ingressi in bozza" UNA sola voce principale; la bozza precedente è indicata come
  tale e resta riprendibile/eliminabile.
- AC2: `GET /intake/drafts` restituisce per ogni bozza `duplicateOfId` (null sulla più recente del
  gruppo); identità deboli (solo nome, senza data di nascita né CF) non vengono mai raggruppate.
- AC3: `POST /intake/drafts/:id/abandon` archivia la bozza (stato `abandoned`, non cancellata),
  la toglie dall'elenco, chiude la sessione documenti collegata se ancora aperta; rifiuta bozze
  già confermate e bozze di altri operatori (404).
- AC4: le bozze manuali con contenuto compaiono nell'elenco e si riprendono (anche dopo un
  ricaricamento); una bozza ancora vuota non è elencata e resta quella della scheda, così aprire
  due volte "Nuovo ingresso a mano" senza scrivere nulla non accumula bozze. Dopo "Salva bozza e
  chiudi" un nuovo ingresso a mano parte da una scheda vuota. Nessun riuso lato server di una
  bozza fra schede diverse (rischio di mescolare due pazienti).
- AC5: nessuna bozza viene archiviata senza un gesto esplicito dell'operatore. (Stesura
  iniziale: archiviazione automatica dei doppioni alla conferma del paziente — ritirata dopo la
  revisione indipendente perché scartava in silenzio i documenti caricati nelle altre bozze.)
- AC6: l'elenco bozze si aggiorna alla chiusura di entrambi i flussi d'ingresso.
- AC7: su tutte le pagine L1 operatore e amministratore il titolo pagina è nella topbar e i
  controlli della topbar hanno la stessa dimensione (misurata) su ogni pagina.
- AC8: card di pagina con un solo raggio/bordo/ombra; titoli di sezione `h2` con un solo
  peso/dimensione; nessun `h3` con stile di default del browser nelle pagine L1.
- AC9: Consegne mostra elenco e stato vuoto dentro card; Posti Letto e Orari usano la piena
  larghezza come le altre pagine.
- AC10: `POST /admin/synthetic-data/seed` (admin/manager) è idempotente e crea: operatori,
  pazienti con cartella, camere/letti/assegnazioni, terapie con somministrazioni di oggi,
  appuntamenti, consegne, diario, parametri, note, una bozza d'ingresso. Risposta con conteggi.
- AC11: `POST /admin/synthetic-data/wipe` richiede `{"confirm":"CANCELLA TUTTO"}`, elimina tutti
  i dati operativi (pazienti e dati collegati, bozze, import, agenda, consegne, note, camere),
  conserva identità di accesso, policy autorizzativa, anagrafica farmaci e audit; dopo il wipe
  l'app si apre senza errori con elenchi vuoti e un nuovo seed funziona.
- AC12: entrambe le API rispondono 403 dove l'ambiente non è dichiarato esplicitamente di prova
  (chiuso per default: produzione reale, `NODE_ENV` assente o errato, demo solo dedotta), 403 a
  ruoli non amministratore, 400 senza conferma esplicita per il wipe; sono catalogate nel registro
  capability e ogni invocazione è tracciata nell'audit.
- AC13: `npm run build`, lint e test backend/frontend passano; nessuna regressione sui test
  esistenti di intake/import.

- AC14: (richiesta successiva dell'utente) riaprire e modificare più volte la stessa scheda in
  bozza lascia sempre UNA sola bozza con le ultime modifiche, anche dopo la scadenza della sessione
  documenti (60 minuti di inattività): la sessione di una bozza aperta non scade, i documenti
  seguono la bozza e vengono rimossi alla conferma o con «Elimina bozza».
- AC15: una bozza già rimasta senza documenti non genera una seconda bozza: «Riprendi bozza» lo
  spiega e la nuova importazione la sostituisce con un gesto esplicito dell'operatore.

## Test Plan

| Test type                 | Required | Reason                                                                          |
| ------------------------- | -------: | ------------------------------------------------------------------------------- |
| Unit                      |      yes | chiave d'identità bozza, raggruppamento duplicati, guardie dell'API sintetica   |
| Integration               |      yes | servizi bozze e seed/wipe contro Postgres reale (trigger append-only compresi)  |
| API                       |      yes | chiamate HTTP reali: ruoli, conferma, idempotenza, tier di deployment           |
| Playwright                |      yes | elenco bozze (prima/dopo), giro pagine per coerenza grafica, app dopo wipe/seed |
| Persistence after refresh |      yes | bozza archiviata non ricompare; dati seed visibili dopo reload                  |
| Agnos action registry     |       no | nessuna azione Agnos modificata                                                 |
| Voice simulation          |       no | non toccato                                                                     |
| OCR/import test           |      yes | flusso import mock end-to-end usato per riprodurre e verificare le bozze        |
| Security/privacy scan     |      yes | API distruttiva: guardie tier/ruolo/conferma, scan segreti frontend             |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (`test-results/`)
- screenshots prima/dopo (`screenshots/`) per bozze e coerenza grafica
- Playwright trace del flusso bozze (`trace/`)
- misure oggettive degli stili per pagina prima/dopo (`logs/style-audit-*.txt`)
- output API sanitizzato di seed/wipe e delle guardie (`logs/`)
- prova di persistenza: conteggi DB prima/dopo seed e wipe

## Risks

- **API distruttiva (wipe).** Mitigazioni: rifiuto su produzione reale, solo admin/manager,
  frase di conferma obbligatoria, capability catalogata (dominio `dev`, negata ai ruoli clinici),
  audit; l'audit e la policy non vengono mai cancellati.
- **Trigger append-only** (valutazioni, ricevute di lettura, prese in carico): il wipe li
  sospende solo dentro la propria transazione e li riattiva prima del commit.
- **Sicurezza clinica bozze**: nessuna fusione automatica; il raggruppamento usa solo identità
  forte; l'eliminazione è un'archiviazione reversibile a DB.
- **Regressioni grafiche**: modifiche concentrate nei token/regole canoniche del design system;
  verifica con screenshot di tutte le pagine L1.
- **Registro capability**: rigenerato dal catalogo sorgente con lo script esistente; i test di
  coerenza del registro fanno da rete.

## Gate Status

READY FOR IMPLEMENTATION
