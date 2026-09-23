# PO16 backend — presentazione PDF MNA

Preparazione soltanto sulla baseline 53e57d694850775b85ad1d22904e7bb1e6e84618. Root deve emettere il GO dopo PO15 pubblicata/verificata. Il worker non pubblica e non modifica sorgenti applicativi prima di quel GO.

## Comportamento concordato

- Punteggi MNA nel PDF: valore esattamente 1 → «1 punto»; altri valori → decimale italiano e «punti». Totale 27.5 → «27,5». Il formatter totale già usa la virgola: preservare il comportamento e verificarlo.
- BMI leggibile con la semantica corrente di frontend `displayMnaBmi`: massimo due decimali italiani se la rappresentazione arrotondata resta nella stessa fascia; valore originale con virgola se `Number(value.toFixed(2))` è zero o attraversa 19, 21 o 23. Esempio 64 kg / 160 cm → «25»; 18.999 → «18,999».
- Nessuna modifica a risposte, misure, snapshot, hash dello snapshot, sourceSha256 del modulo, algoritmo o soglie. Nessuna modifica ai testi liberi.
- Nuovi PDF MNA: renderer `mna-a4-v2` in Producer e nel sourceManifest del documento archiviato. Gli altri renderer restano alle versioni correnti.
- Retry di PDF MNA v1 già `ready`: zero chiamate al renderer, stesso documento, bytes, SHA256, sourceManifest, stato assessment e snapshot. Non rigenerare documenti archiviati.

## Fonti e prova DB reale

Usare il PDF MNA v1 e lo stato sintetico PO15 provenienti dalla root, copiati con hash e provenienza. Il documento selezionato è `ce59b368-17d9-48c2-bec2-cbf47f621496`, assessment `9df3410f-ddc4-4da6-bc27-888d79e36bff`, paziente sintetico `vitals-qa-anna`. Preservare il JSON originale dello snapshot e tutti i riferimenti; non fabbricare un v1 invocando il renderer nuovo.

Dopo GO, ripristinare il record sintetico su PostgreSQL nativo loopback con le migrazioni esistenti. Eseguire il servizio reale `retryAssessmentPdf` con renderer-spia che fallirebbe se chiamato. Confrontare prima/dopo ogni campo persistito, bytes e hash. Verificare Producer v1 prima e dopo; finalizzazione di un record nuovo deve produrre v2. Chiudere il database e associare le prove agli input esatti.

## Verifiche dopo GO

Test mirati di presentazione su punteggi 0/0.5/1/1.5/2, totale 27.5, BMI null/tipico/adiacente a 19/21/23, confronto diretto con la funzione frontend corrente. Test DB di immutabilità v1 e registrazione v2. Regressioni MNA, ciclo PDF comune e gli altri moduli; build/typecheck/font/schema/diff. Render e ispezione visiva dei nuovi PDF MNA. Root completa HTTP/browser e decide la pubblicazione.
