# PO12 — Contratto backend preparatorio

Worktree `C:/Workspace/ClinicOSHouse-worktrees/po12-tinetti-backend`, branch `codex/po12-tinetti-backend`, baseline `470a5fe7a7eee4a9b0a0b219947432049b9de977`. Il contratto root è copiato integralmente in `task-contract.snapshot.md`. Runtime e documenti soltanto fino al GO esplicito dopo PO11 verificata. Questo contratto DTO è stato concordato con il frontend; il contratto root prevale.

## Risposte, completezza e risultato

`type: 'tinetti'`, `formVersion: 'tinetti-it-2026-09-22-v1'`.

`answers` è un oggetto piatto con tutte le venti chiavi sotto e `notes: string`. Le risposte richiedono `null` oppure un intero nel dominio della propria voce: zero è una risposta, null è assenza. Chiavi mancanti/sconosciute, -1, stringhe numeriche, frazioni e fuori dominio vengono rifiutati. Nessuna preselezione. `notes` è facoltativo all'ingresso e normalizzato a stringa vuota soltanto quando omesso; nei DTO/snapshot è sempre presente. Massimo 4000 codepoint Unicode, testo e a capo conservati, nessun trim; rifiutare controlli non ammessi e surrogate isolate come PO11.

| Gruppo | Chiave | Massimo |
|---|---|---:|
| balance | equilibrioSeduto | 1 |
| balance | alzarsi | 2 |
| balance | tentativiAlzarsi | 2 |
| balance | equilibrioImmediato | 2 |
| balance | equilibrioProlungato | 2 |
| balance | rombergSpinta | 2 |
| balance | occhiChiusi | 1 |
| balance | girarsi360Passi | 1 |
| balance | girarsi360Stabilita | 1 |
| balance | sedersi | 2 |
| gait | iniziazione | 1 |
| gait | lunghezzaPassoDx | 1 |
| gait | altezzaPassoDx | 1 |
| gait | lunghezzaPassoSx | 1 |
| gait | altezzaPassoSx | 1 |
| gait | simmetria | 1 |
| gait | continuita | 1 |
| gait | traiettoria | 2 |
| gait | tronco | 2 |
| gait | cammino | 1 |

History e dettaglio Tinetti aggiungono `answeredCount: 0..20` e `completion: { complete: boolean, missingPaths: string[] }`; percorsi mancanti nell'ordine della tabella, chiavi nude senza prefisso `answers.`. `result` resta null fino a venti risposte valide; nessun subtotale o rischio clinico parziale nei DTO.

Risultato completo: `{ balance: number, gait: number, total: number, riskBand: 'high'|'moderate'|'low', label: string }`. Massimi 16, 12, 28. Soglie esistenti, incluse le etichette letterali:

| Totale | riskBand | label |
|---|---|---|
| 0–18 | high | Alto rischio cadute |
| 19–23 | moderate | Rischio moderato |
| 24–28 | low | Basso rischio |

## Snapshot e fonte

Campi comuni PO10/11: `snapshotVersion: 1`, `patient`, `author`, `assessedAt`, `createdAt`, `finalizedAt`, `predecessorId`, `predecessor`, `correctionReason`. Campo `form`:

```ts
{
  type: 'tinetti',
  version: 'tinetti-it-2026-09-22-v1',
  sourceSha256: '7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09',
  referenceSha256: 'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6'
}
```

La fonte normativa è la definizione corrente di `ScalaTinettiTab.tsx` al baseline approvato; l'allegato è il riferimento distinto. Nessuna nuova convalida clinica. `definition-snapshot.json` contiene tutte le etichette e le 48 opzioni estratte dal sorgente approvato, più le descrizioni da congelare. `description` è il testo dell'opzione dopo il prefisso numerico e ` — `; nessun'altra riscrittura.

Snapshot Tinetti: `items: [{ id, label, score, description, group: 'balance'|'gait' }]` con venti voci nell'ordine sopra, `result` completo, `notes: string`, `provenance: string`. Niente `sections`/`signatureLabels`/`interpretation` Tinetti. Il PDF rende esclusivamente questi dati congelati, due gruppi, tutti gli item/descrizioni, subtotali/totale/rischio, note e fonte/versione con gli altri metadati comuni.

`provenance` letterale concordata:

> Modello a 20 voci già in uso in ClinicOS: equilibrio 16 punti, andatura 12 punti, totale 28. Conservate quattro risposte distinte per lunghezza e altezza del passo destro e sinistro. Allegato del 22/09/2026 come riferimento; non costituisce trascrizione letterale o convalida clinica indipendente.

Snapshot/versioni PAINAD e Trasferimenti invariati. Eventi di conferma restano riservati a Trasferimenti: Tinetti non acquisisce attestazioni.

## Endpoint e ciclo comune

Base `/patients/:patientId/assessments`. Stessi envelope POST/create, GET/detail, PATCH/CAS, POST/finalize e POST/pdf/retry PO10/11, stessi controlli autore/perimetro/lock, ricevute create/finalize e finali immutabili. Tipo e versione controllati all'ingresso; PATCH dal tipo persistito. Finalizzazione incompleta: HTTP422, codice `assessment_incomplete`, `missingPaths` al livello principale.

`GET base?type=tinetti` filtra prima di cursor/limit; default storico PAINAD invariato, frontend sempre esplicito. History contiene metadati/answeredCount/completion/result ma non answers/finalSnapshot/hash. `GET /current?type=tinetti` mantiene `{assessment: final|null}` e la selezione delle foglie finali ordinata per istante clinico; una bozza di rettifica non sostituisce current. La rettifica è un nuovo record, non riusa ID legacy; inizializza l'istante clinico del predecessore. Archivio/deep-link e metadati PDF discriminati per tipo.

## Storico precedente e PUT cartella

Nessuna migrazione/backfill/conversione dei JSON `Cartella.valutazioniTinetti`. Adattatore frontend di sola lettura, con dati/orari/operatore testuale effettivamente esistenti. Non inventare autore autenticato, versione o finalizzazione retroattiva. Completi validi: medesimi totali; -1, missing o fuori dominio: risultato/fascia null e stato non valido/incompleto. Visualizzazione, stampa e nuove valutazioni non riscrivono il JSON precedente.

Il servizio PUT conserva la semantica autorizzata degli altri campi e la rimozione di `codiceFiscale` già vigente, ma protegge `valutazioniTinetti` sotto lock nella stessa transazione dell'upsert. Il lock sul paziente serializza anche la cartella inizialmente assente; rilettura cartella sotto lock e controllo corrente del perimetro prima della scrittura. Omissione del ramo: conserva esattamente il ramo memorizzato (anche assente/null/non-array). Ramo presente: confronta semanticamente JSON con il ramo memorizzato, ignorando solo l'ordine delle chiavi degli oggetti; ordine array e tipi restano significativi. Se uguale permette gli altri aggiornamenti; se diverso rifiuta l'intero PUT con HTTP409, `code: 'tinetti_legacy_read_only'`, messaggio esplicito e nessuna scrittura. Assenza, null e array vuoto sono stati distinti: il client aggiornato può omettere sempre il ramo protetto negli aggiornamenti della cartella. Il frontend conserva i campi in caso di errore.

Nessuna nuova tabella o dipendenza prevista: migrazione di CHECK/validatori SQL per il nuovo tipo. Root mantiene package/lockfile, fixture HTTP, integrazione/build e release.

Estensione autorizzata da root durante la review: anche `confirmJob`/`confirmDraft` proteggono lo storico nella transazione di import. Paziente già bloccato e perimetro riletto, Cartella letta `FOR UPDATE`, guard condiviso prima del merge; il ramo incoming viene escluso dal merge. Differenza: HTTP409 `tinetti_legacy_read_only`, rollback e job/bozza confermabili al retry. Nuovo paziente: storico non-vuoto rifiutato, creazione rollback. Soltanto per il flusso import, un default `[]` con ramo DB assente viene scartato senza introdurre un ramo. Importazione ordinaria e replay già confermato conservati.

## Handoff

Dopo GO e implementazione: `source-manifest.json` con `sourcePaths: [{path,bytes,sha256}]` per soli backend/prisma cambiati, hash input completo e sorgente congelato; `implementation-receipt.json`, `artifact-manifest.json`, `artifactCopyAllowlist` e rilascio claim prima della consegna. Forma compatibile con `artifacts/task-validation/po-10-painad/integrate-worker.mjs` invocato da root con task `po-12-tinetti`. Escludere runtime privato, cluster PostgreSQL, cache, schema privato e PowerShell preesistenti.
