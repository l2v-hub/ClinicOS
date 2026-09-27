# Task Validation Report

## Task

- Title: HMI: coda Adesso ordinata per urgenza nella dashboard operatore
- Slug: hmi-coda-adesso-ordinata-per-urgenza-nella-dashboard-operatore
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`lib/adessoQueue.ts` (nuovo):** funzione pura `buildAdessoQueue` che unisce terapie in ritardo,
  terapie imminenti (≤ 30 min), consegne urgenti (scadute, entro 60 min, altre) e pazienti con
  farmaci da verificare in un solo elenco, ordinato per gruppo di urgenza e, dentro il gruppo, per
  urgenza decrescente. Le etichette di tempo dicono solo ciò che si sa: una consegna senza ora usa
  la sola data ("Entro oggi", "Scaduta ieri"), una senza data resta ultima con "Scadenza non
  indicata".
- **`components/operator/AdessoQueue.tsx` / `.css` (nuovi):** blocco "Da fare subito": al massimo
  6 righe (tipo, paziente che apre la cartella, dettaglio, tempo; in rosso solo ciò che è
  scaduto), contatore, "Altre N in coda" con "Apri terapia" e "Vedi consegne". Ogni fonte in
  caricamento o in errore è dichiarata; "Niente in sospeso adesso" compare solo con tutte le fonti
  pronte e vuote. Righe ≥ 48 px; sotto i 420 px di card il tempo va a capo (container query).
- **`OperatorDashboard.tsx`:** la coda è il primo blocco della colonna "Adesso". Tutto il resto
  (notifiche, indicatori, "Prossime terapie", consegne urgenti, "Oggi") è invariato.
- Nessuna nuova chiamata: la coda usa gli stessi dati già caricati dai blocchi esistenti.

## Files Changed

- frontend/src/lib/adessoQueue.ts (nuovo)
- frontend/src/lib/**tests**/adessoQueue.test.ts (nuovo)
- frontend/src/components/operator/AdessoQueue.tsx (nuovo)
- frontend/src/components/operator/AdessoQueue.css (nuovo)
- frontend/src/components/operator/OperatorDashboard.tsx

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | unit-adesso.txt 4/4: ordine dei gruppi, ordine dentro il gruppo (ritardi decrescenti, "scaduta ieri" prima di "scaduta 30 min fa", "Adesso" prima di "Tra 20 min", anomalie per numero), soglie (45 min di terapia esclusa), etichette di tempo, consegna senza ora e senza data, terapie senza orario escluse          |
| AC2 |   PASS | playwright-evidence.txt: a 1280/1024/768/390 la coda è il primo blocco di "Adesso" prima di "Prossime terapie"; 6 righe su 77, contatore 77, "Altre 71 in coda"; le righe visibili sono terapie in ritardo (320 min) in rosso; nello scenario senza terapie le consegne seguono l'ordine scadute → entro 60 min → altre |
| AC3 |   PASS | 1280: il paziente della prima riga è un pulsante e apre la cartella "Moretti, Andrea"                                                                                                                                                                                                                                   |
| AC4 |   PASS | therapy-slots in errore: avviso "Scadenze terapia non disponibili" (e "Verifica farmaci non riuscita", perché le anomalie derivano dagli stessi dati), consegne ancora in coda; fonti pronte e vuote: "Niente in sospeso adesso" senza avvisi                                                                           |
| AC5 |   PASS | test di contratto della dashboard verdi (first-view, anomaly-layout, clinicalOverviewResilience, consegneReadModelGuard); overflow 0 a 390/768/1024/1280; righe 48 px (74 px a 390/768 con il tempo a capo)                                                                                                             |
| AC6 |   PASS | build.txt exit 0; unit-full.txt 838/847, stessi 9 fallimenti della baseline                                                                                                                                                                                                                                             |

## Test Results

| Test             | Result | Evidence            |
| ---------------- | -----: | ------------------- |
| Unit             |   PASS | unit-adesso.txt 4/4 |
| Integration      |     NA |                     |
| API              |     NA |                     |
| Playwright       |   PASS | evidence.mjs 20/20  |
| Persistence      |     NA |                     |
| Agnos AI         |     NA |                     |
| Voice            |     NA |                     |
| OCR              |     NA |                     |
| Security/privacy |     NA |                     |

## Runtime Evidence

- screenshots/adesso-1280.png, adesso-1024.png, adesso-768.png, adesso-390.png,
  adesso-apre-cartella.png, adesso-terapie-non-disponibili.png, adesso-vuoto.png

## Independent QA

- READY FOR QA: build, tipi, lint, suite 837/846 (baseline), evidence 20/20 riprodotta; probe
  propria con `page.route` su terapie e consegne: etichette verificate ramo per ramo (scaduta da
  N giorni, ieri, alle HH:MM; entro le/oggi/domani/il gg/mm; data o ora non valide), ordine dentro
  e fra i gruppi, stati di caricamento ed errore, tastiera, 390/768/1024/1280; apertura della
  cartella da riga terapia e da riga consegna (App usa l'id, non il nome).
- Due note corrette dopo la QA, poi rieseguiti unit 4/4, lint, build, suite 838/847 ed evidence
  20/20:
  - avviso "Verifica farmaci in corso" mentre le anomalie sono in caricamento (prima il blocco
    poteva restare con il solo titolo);
  - consegna in scadenza entro l'ora ma dopo mezzanotte etichettata "Domani alle HH:MM".

## Residual Risks

- `urgentPreview` del backend porta al massimo le 5 consegne urgenti più recenti: la coda e
  "Altre N" riflettono quelle, non `summary.urgentOpen`. Limite preesistente, condiviso con il
  blocco "Consegne urgenti".

- Con molte terapie in ritardo le 6 righe visibili sono tutte terapie e le consegne urgenti
  scadute compaiono solo tramite "Altre N": è la regola scelta (le terapie in ritardo sono il
  gruppo più urgente). Il blocco consegne urgenti resta comunque visibile sotto.
- Le soglie (60 min consegne, 30 min terapie) e l'ordine dei gruppi sono scelte di HMI, da
  confermare con la direzione sanitaria.
- Le terapie in ritardo compaiono sia nella coda sia nella card "Prossime terapie" (voluto).

## Final Decision

CLOSED — VERIFIED
