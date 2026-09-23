# PO16 — Copertura del giro tecnico

Il test integrato gira su codice applicativo identico al commit36fb9675, con estrazione sintetica e PostgreSQL loopback. La ricevuta integrated-round-inputs.json lega test, log e risultato agli input. Le sole modifiche applicative PO16 riguardano presentazione MNA e area dei comandi: hanno prove separate, senza cambi di calcolo o schema.

| Ambito | Prova PO16 | Evidenza precedente pertinente riutilizzata |
|---|---|---|
| Ingresso incompleto e completamento | Un paziente con CF/nascita/telefono mancanti reali, completato sullo stessoID | PO01:validazione/duplicati,manuale/OCR,scope e browser |
| Import lungo, orari e note | PDF30pagine,2gruppi,ordine verificato con marcatori,3documenti15/15/30; correzione16→20; notaPA22conservata; retry conferma senza doppioni | PO02/03:orari e provenienza; PO05:errori/restart/concorrenza e browser30pagine |
| Ricerca confezione | Confezione Tachipirina/AIC conservata nell'import e terapia | PO04:ranking/paginazione/UI,riscontro catalogo reale; il testPO16 non misura tempo di ricerca umano |
| Identità/camera/ordine | Assegnazione e proiezione camera/letto, preferenza nome↔camera | PO06/07:scope,più collocazioni,ordinamento naturale globale,cursori,pagine e bozze. PO16 con una collocazione non dimostra da solo l'ordinamento multipaziente |
| Somministrazione e parametri | Slot20:00,registrazione,duplicato409; data/ora/note parametri persistite e reinvio idempotente | PO07 e precedenti:parametri/terapie con bozze,cambio ordine e risposte tardive |
| Consegne | Cinque pazienti,una consegna per paziente e replay stessoID | PO08:giroUI senza digitare nomi,concorrenza,scope,bozze. PO16 usa richieste sequenziali, non prova da solo il cambio rapido |
| Moduli e rettifica | PAINAD incompleta422,finale10,rettifica8,originale/snapshot invariati,2PDF archiviati | PO10–14:cicli completi di ogni modulo,confini/fonti/PDF; PO15:tutti8moduli,catalogo/storico,NRS,Tinetti |
| Archivio e stampa | HTTPcontenuti/hash e cinque documenti del giro | PO15:5tipi,anteprimainline/ritorno al modulo,multiprint5documenti10pagine; NRS2stampe isolate e cleanup |
| Dimissione | PUT esplicito,documenti/parametri/terapia preservati | PO09:apertura/navigazione senza salvataggio; browserPO16ricontrolla compilazione locale senzawrite |
| Presentazione MNA | Prove workerPDFv1 immutabile/v2,decimali/singolare/BMIvicino19/21/23 | PO13:scoring e snapshot invariati,misure e mezzi punti; browserPO16 verifica27,5/1punto/IMC25 |
| Mobile e tastiera | BrowserPO16 misura target44px a390/768 e desktop,focus/overflow | PO01–15:responsive e focus dei percorsi modificati; nessuna certificazione integrale WCAG dichiarata |

ProvePO16 concluse: [giro integrato](integrated-round-receipt.json), [stato browser](browser-state-receipt.json), [PDF compilato](compiled-pdf-receipt.json), [controllo visivo PDF](pdf-visual-receipt.json), [geometria browser](qa-evidence/geometry.json), [rapporto complessivo](validation-report.md). Il pacchetto backend conserva la prova indipendente PDFv1/v2. Le misure44px sono riferite a390/768; desktop conserva le dimensioni precedenti.

La catena di15rilasci precedenti è verificata contro commit e blobGit esatti; non è un nuovo test di ogni funzione sul sito. Smoke online esclusivamente in lettura. Mancano osservazione con operatori, fotocamere/dispositivi fisici Safari/iOS/Android, stampante e zoom nativo200%: non vengono dichiarati eseguiti. Le sei guardie statiche patientRosterGuard identiche in baseline restano note, non trasformate in PASS.
