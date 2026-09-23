# ClinicOS — Guida di verifica del delivery

Apri [ClinicOS](https://clinicos-eosin.vercel.app/#/operator-dashboard). I rilasci e le prove sono tracciati nel [registro del piano](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/docs/product/stato-esecuzione-piano-2026-09-22.md>). Per le prove con salvataggio usa una persona sintetica riconoscibile: il sito demo conserva le modifiche. Gli agenti hanno eseguito le scritture di collaudo soltanto in database locali separati.

## Giro breve

1. **Ingresso:** registra nome/cognome e presa in carico lasciando i dati non disponibili vuoti. La scheda segnala cosa manca e consente il completamento successivo sullo stesso paziente.
2. **Importa dimissione:** carica una lettera sintetica multipagina. Controlla anteprime, ordine e avanzamento; correggi un orario terapia prima della conferma. Nella terapia e nell'agenda deve apparire l'orario corretto; le indicazioni accessorie restano nelle note, gli originali in Documenti.
3. **Farmaco:** cerca “Tachipirina 1000 compresse” e verifica forma/confezione. La scelta conserva il riferimento del prodotto senza cambiare autonomamente dose o orari.
4. **Giro reparto:** passa dall'ordine per cognome a camera/letto; registra un parametro con ora e nota. Riapri lo storico del paziente. Da Consegne seleziona i pazienti dall'elenco e controlla l'esito di ogni salvataggio.
5. **Moduli:** apri il catalogo e scegli PAINAD, Trasferimenti, Tinetti, MNA o GDS-15. Medicazioni, Contenzioni e Braden restano disponibili. Usa “Salva bozza” per riprendere; controlla l'anteprima prima di finalizzare. Una risposta mancante non vale zero.
6. **Rettifica e documenti:** rettifica una valutazione sintetica finalizzata. L'originale deve restare consultabile. Apri il PDF da Documenti e torna alla valutazione; seleziona più file per prepararne una sola stampa.
7. **Storico e chiusura:** “Storico NRS precedente” conserva i vecchi dati in sola lettura. Dimissione è accanto a Documenti: aprire o compilare localmente non equivale a salvare.

## Cosa controllare nei moduli

| Modulo | Controllo riconoscibile |
|---|---|
| PAINAD | Cinque risposte esplicite; bozza incompleta distinta dal totale0; massimo10 |
| Trasferimenti posturali | Andata e ritorno indipendenti, assistenza/ausili riconoscibili; conferma contenuto e presa visione distinte |
| Tinetti | Equilibrio16 e andatura12, totale28; vecchio storico conservato, nessuna fascia sui dati incompleti |
| MNA | Screening e valutazione completa distinti; tre risposte perK; mezzi punti e misure con date/provenienza |
| GDS-15 | Quindici risposte riferite all'ultima settimana; risultato di screening, senza creazione automatica di diagnosi |

Le discrepanze Tinetti e MNA dell'allegato sono documentate nelle [specifiche](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/docs/product/specifiche-moduli-2026-09-22.md>). I nuovi PDF conservano dati, autore, data clinica, data di registrazione e versione; una rettifica non sostituisce l'originale. Le conferme dei trasferimenti non sono firme digitali.

## Verifica sul campo da completare

Il collaudo tecnico ha usato dati sintetici, test automatici e browser a390/768/1262px. Per validare l'esperienza quotidiana serve osservare personale rappresentativo e dispositivi reali: scansione da telefono, rete di reparto, tastiera/zoom200% e stampa fisica. Annotare soprattutto paziente non riconosciuto, incertezza sul salvataggio, comandi difficili da trovare o dati persi. Queste prove non sono state attribuite a operatori che non hanno partecipato.

Le ricevute dichiarano anche i limiti tecnici preesistenti: sei guardie statiche baseline non superate e diagnostiche lint già presenti. Non è dichiarata verde l'intera suite del repository, né una convalida clinica indipendente.
