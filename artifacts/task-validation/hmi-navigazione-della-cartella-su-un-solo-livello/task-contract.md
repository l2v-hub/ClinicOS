# Task Contract

## Task

- Title: HMI: navigazione della cartella su un solo livello
- Slug: hmi-navigazione-della-cartella-su-un-solo-livello
- Type: feature
- Date: 2026-09-27

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

## Current Behaviour

- La cartella paziente ha due livelli di navigazione:
  - L2: 6 aree (Raccolta dati ingresso, Clinica, Diario, Moduli, Documenti, Dimissione);
  - L3: le sezioni dell'area attiva.
- Per arrivare, ad esempio, a "Terapia Farmacologica" servono due tocchi (Clinica → Terapia), e
  l'operatore deve ricordare in quale area sta ogni sezione.

## Expected Behaviour

- Una sola barra di sezioni con tutti i tab di oggi, ciascuno raggiungibile con un tocco:
  - Ingresso: Anagrafica, Contatti, Presa in carico;
  - Clinica: Diagnosi, Terapia Farmacologica, Consegne, Parametri Vitali, Esami e consulenze,
    Note e visite;
  - Diario, Moduli, Documenti, Dimissione.
- I gruppi restano solo come etichette e separatori visivi.
- **Invariati:** contenuto di ogni sezione, TabId, etichette, badge, collegamenti diretti,
  cronologia e caricamento lazy.
- Moduli resta una voce sola: il catalogo, da cui si aprono le singole scale.
- Il filtro per autore del Diario resta un filtro di contenuto.
- Si usa sempre il `TopNav` condiviso, esteso con etichette di gruppo opzionali: nessun nuovo
  componente di navigazione.
- Sul tablet nessuno scorrimento orizzontale: la barra va a capo.

## Acceptance Criteria

- AC1: nel browser la cartella mostra una sola barra (nessun secondo livello) con le 13 voci e
  le etichette "Ingresso" e "Clinica". Ogni sezione si apre con un tocco e mostra lo stesso
  contenuto di prima.
- AC2: Moduli apre il catalogo. Aprendo una scala, "Moduli" resta attiva e "← Tutti i moduli"
  riporta al catalogo.
- AC3: i collegamenti diretti esistenti (avviso anomalie → Terapia, collegamenti Agnos, freccia
  indietro con "Nome · Sezione") funzionano e attivano la voce giusta.
- AC4: nessuno scorrimento orizzontale della barra né della pagina a 1024, 1280 e 390 px.
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline; i test di contratto sulla
  navigazione (patientDetailWorkspace, patientChartNavigation) passano.

## Test Plan

| Test type                 | Required | Reason                                                             |
| ------------------------- | -------: | ------------------------------------------------------------------ |
| Unit                      |      yes | test di contratto sulla navigazione della cartella                 |
| Integration               |       no |                                                                    |
| API                       |       no |                                                                    |
| Playwright                |      yes | barra unica, un tocco per sezione, moduli, collegamenti, larghezze |
| Persistence after refresh |       no |                                                                    |
| Agnos action registry     |       no |                                                                    |
| Voice simulation          |       no |                                                                    |
| OCR/import test           |       no |                                                                    |
| Security/privacy scan     |       no |                                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt, screenshots a 1024 e 390 px

## Risks

- Alcuni script e2e storici cliccano "Clinica" come tab di L2. Alcuni erano già obsoleti (tab
  rinominati o rimossi); non girano in CI (il job browser-e2e è saltato). Vanno elencati.
- La documentazione del contratto di navigazione (CLAUDE.md, CLINICOS_NAVIGATION_CONTRACT.md)
  descrive L2/L3: va aggiornata.

## Gate Status

READY FOR IMPLEMENTATION
