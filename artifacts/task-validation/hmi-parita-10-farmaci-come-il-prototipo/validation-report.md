# Task Validation Report

## Task

- Title: HMI parità 10: farmaci come il prototipo
- Slug: hmi-parita-10-farmaci-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`AnagraficaFarmaciPage.tsx`**: il titolo diventa "Farmaci" con il sottotitolo "Anagrafica AIFA". Aggiunto il nuovo foglio di stile della pagina.
- **`AnagraficaFarmaciPage.css`** (nuovo), valido solo nella pagina:
  - card da 16 px;
  - campo di ricerca e chip del criterio da 48 px, con testo a 16 px;
  - righe come elenco con separatori;
  - pulsanti "Apri foglietto/RCP" e "Continua ricerca" secondari da 48 px.
- **`RicercaFarmaco.tsx`**, corpo condiviso con la modale della terapia:
  - icona pillola a sinistra di ogni riga;
  - dettagli su una riga "confezione · forma · AIC", senza ripetere il nome;
  - a campo vuoto compare l'indicazione "Scrivi almeno tre lettere…".
  - Logica di ricerca, criteri, paginazione, stati ed evidenziazione del farmaco revocato restano invariati.
- **`RicercaFarmaco.css`**: stili base per l'icona e il testo della riga.

## Files Changed

- frontend/src/components/operator/AnagraficaFarmaciPage.tsx, AnagraficaFarmaciPage.css (nuovo)
- frontend/src/components/operator/cartella/RicercaFarmaco.tsx, RicercaFarmaco.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                               |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | "Farmaci · Anagrafica AIFA"; campo da 48 px, chip da 48 px, indicazione a campo vuoto                                                                                                                                                                                                                                                  |
| AC2 |   PASS | Righe con icona, "TACHIPIRINA", "1000 MG COMPRESSE · Compressa · AIC 012745", "paracetamolo 1000 mg", "Apri foglietto" da 48 px                                                                                                                                                                                                        |
| AC3 |   PASS | Con meno di 3 caratteri compare "Almeno tre caratteri" e nessuna query parte. La query contiene `q=tachipirina`. "Continua ricerca" porta i risultati da 3 a 5, con "Revocata" e "Nessun documento ufficiale". Il criterio principio attivo invia `pa=1`. Nessun risultato: compare il suggerimento. Errore: compare "Riprova ricerca" |
| AC4 |   PASS | Nessun overflow a 390, 768, 1024, 1180 e 1440                                                                                                                                                                                                                                                                                          |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 865/874, con solo i 9 fallimenti della baseline                                                                                                                                                                                                                                                        |

## Test Results

| Test                                                       | Result | Evidence                  |
| ---------------------------------------------------------- | -----: | ------------------------- |
| Unit                                                       |   PASS | suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 21/21        |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | stessa API                |

## QA indipendente (clinicos-qa)

- Giro 1, **FAILED VALIDATION**. Sotto i 600 px le righe spezzavano le parole a metà ("TACHIPIRI|NA", AIC), sia nella pagina sia nella modale: `flex:1; min-width:0` impediva al pulsante di andare a capo.
  - Correzione: `flex: 1 1 200px` con `overflow-wrap: break-word`; sotto i 600 px la riga va a capo in entrambi i contorni e le chip sono più compatte.
  - Aggiunti i casi QA1 a 390/600/768/1024/1180/1440: testo largo almeno 200 px e nome su una riga.
- Giro 2, **READY FOR QA**. Nessuna parola spezzata a 390 e 600 px, né nella pagina né nella modale; badge interi; overflow 0; il visore si apre anche dalla modale.
  - Dopo il giro, AIC e numero sono uniti da uno spazio non separabile.

## Runtime Evidence

- screenshots/farmaci-1180.png (accanto a hmi-parity/proto/farmaci.png), farmaci-vuoto-1180.png,
  farmaci-390/768/1024/1440.png

## Residual Risks

- Il prototipo mostra un elenco senza ricerca. L'anagrafica AIFA si consulta solo cercando, quindi a campo vuoto compare l'indicazione e non un elenco inventato.
- Il prototipo indica la classe di rimborsabilità (A/C), ma la ricerca non la restituisce e non viene mostrata.
- Il pulsante resta "Apri foglietto/RCP", non "Scheda": dice quale documento si apre.

## Final Decision

CLOSED — VERIFIED
