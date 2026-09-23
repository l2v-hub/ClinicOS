# PO-06 — verifica prima della pubblicazione

Baseline applicativa 0418463a; baseline integratore f75f19b3. L'utente ha autorizzato piano completo, push e deploy. Backend e frontend integrati soltanto dopo rilascio dei claim e verifica SHA dei manifest. Root source set: `25a758abc777de2a774c7d0651a2f142b4e66fdcac2e56243cd6ba2431fe0dcb` (32 file, incluse le fixture root).

## Esito

Identità condivisa nelle viste Pazienti, Parametri, Terapia e Consegne, inclusa la selezione per nuova consegna. CF preferito; in assenza, nascita e CF da completare; nessun MRN opaco mostrato. Camera/letto derivano dalla relazione autorevole alla data richiesta. Fallback Cartella solo senza storia relazionale e per oggi, con provenienza visibile. Posizione non assegnata e dato indisponibile distinti; nessuna resurrezione delle vecchie camere. Consegna fuori patientScope conserva il solo nome già autorizzato senza link cartella.

## Prove

- Worker backend: 19 test PostgreSQL/HTTP e 10 contratti terapia passati; typecheck e whitespace check passati. Scope combinato patientIds AND registeredById coperto su dettagli e totali. Matrice date/assegnazioni attive, concluse, duplicate, incoerenti, legacy/parziali/non-stringa e query bounded.
- Root: 7/7 prove integrate via HTTP con PostgreSQL nativo loopback. I quattro reader concordano su CF/nascita/posizione; ricerca camera autorevole; storia, omonimi e accesso fuori scope verificati. `root-integration-tests.log`.
- Worker frontend: 74/74 test mirati/regressioni e build finale passati. Un guard Agenda e due errori/due warning ESLint MultiPatientParametri sono dimostrati preesistenti tramite `po06-identity-ui/baseline-comparison.json`; non sono contati come verdi.
- Root build frontend finale e typecheck backend passati; secret scan frontend: zero findings. L'unica rifinitura root applicativa è il padding superiore del corpo del dialogo Terapia, per impedire che una striscia di farmaco appaia sopra l'intestazione sticky.
- Browser locale con API reali e pazienti sintetici: desktop1280, mobile390×844 e reflow640×720. Omonimi distinti per CF/nascita/camera; nome lungo va a capo; nessun overflow orizzontale o MRN. Primo e secondo header Terapia restano al limite superiore del corpo, controlli minimo44px. Shift+Tab mantiene il focus nel dialogo; Escape dal dialogo chiude e ripristina il comando di apertura.
- Evento di somministrazione sintetico: esattamente `po06-alba-2` / `po06-alba-2-therapy-4`, fascia mattina,08:00. Il collaudo registra il payload del comando senza firmare somministrazioni. Un salvataggio Parametri reale nella DBfixture conserva FC72 e nota, con autore del server. Retry riepilogo fallito mantiene FC73 e nota ancora in bozza. Consegna fuori scope non offre link; combobox cercato/selezionato da tastiera conserva identità e posizione.
- `qa-evidence/` e `preview/synthetic-state.json` contengono screenshot, geometria, bozza e richieste. Console browser: nessun errore.

## Prestazioni

Stesso scenario baseline/candidate con202pazienti autorizzati,200legacy e testo cartella voluminoso escluso dal payload; PostgreSQL locale,10letture calde dopo1fredda. Identità50: mediana1,987→10,591ms, p902,609→12,337ms,9.777→14.501bytes. Parametri25: mediana1,905→7,616ms, p902,113→8,308ms,7.125→10.504bytes. Il costo additivo della proiezione è esplicito; nessun miglioramento prestazionale percentuale dichiarato. Niente N+1, fetch amministrativi o intere cartelle aggiunti. Le fonti sono legate nei JSONbaseline/candidate, incluso il nuovo helper.

## Limiti e decisione

Prove tecniche sintetiche: nessun paziente live modificato. Il reflow640 non è una prova di zoom nativo200%, né certifica dispositivi fisici o osservazione con operatori. Restano warning di dimensione bundle e problemi baseline dichiarati. Sorting/preferenze PO-07 e roster Consegne PO-08 restano attività successive.

ALLOW_RELEASE: sorgenti applicative verificate, hash dei worker corrispondenti salvo rifinitura CSS root documentata, nessuna migrazione o runtimeAI modificato. Pubblicazione autorizzata dal commit immutabile: backend demo poi frontend/alias. Launcher PowerShell e task board preesistenti esclusi dal commit.
