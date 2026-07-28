# Prontuario farmaceutico — richiesta di preventivo

Bozza da inviare a **Farmadati Italia** e a **Codifa (Elsevier)**, per confronto.
Adattare l'intestazione al destinatario; il corpo è identico per entrambi.

## Perché due fornitori

Farmadati nasce in ambito **farmacia** (è il fornitore della banca dati Federfarma): eccelle su
anagrafica, prezzi, tracciabilità. Codifa è tarata su **consultazione clinica**. ClinicOS è un
applicativo assistenziale: il contenuto che conta è la posologia, non il listino. Vanno confrontati
sul contenuto prima che sul prezzo.

## Cosa NON serve comprare

L'anagrafica di base è già coperta gratuitamente dagli open data AIFA (licenza CC-BY 4.0), già
importati in ClinicOS: denominazione, AIC, ditta, principio attivo con quantità e unità, ATC, forma
farmaceutica, regime di fornitura, stato amministrativo, link a RCP e Foglietto Illustrativo.

**Non pagare due volte per questi dati.** L'oggetto dell'acquisto è ciò che AIFA non pubblica in
forma strutturata: posologia interrogabile e — se servirà — interazioni e controindicazioni.

---

## Testo della richiesta

> Oggetto: richiesta di preventivo — licenza banca dati farmaci per integrazione in applicativo
> assistenziale
>
> Buongiorno,
>
> sviluppiamo ClinicOS, un applicativo per la gestione clinico-assistenziale di strutture
> residenziali. Vorremmo integrare una banca dati farmaci per mettere a disposizione degli operatori
> la posologia di riferimento durante la somministrazione.
>
> **Cosa ci serve**
>
> - Posologia strutturata e interrogabile per principio attivo e per confezione (non il documento
>   PDF: quello lo abbiamo già dagli open data AIFA).
> - Vie di somministrazione ammesse per confezione.
> - Erogazione via **API / web-service** per integrazione back-end in software verticale. Non ci
>   serve un'interfaccia di consultazione: abbiamo la nostra.
> - Aggiornamento periodico automatizzabile.
>
> **Cosa NON ci serve**
>
> Anagrafica, prezzi e listini: già coperti dagli open data AIFA che abbiamo importato. Vi chiediamo
> di scorporare queste voci dal preventivo, se possibile.
>
> **Informazioni necessarie per dimensionare la licenza**
>
> 1. **Modello di distribuzione.** ClinicOS è erogato in SaaS e serve più strutture da una singola
>    installazione. È il punto che ci preme chiarire per primo: la licenza consente questo modello,
>    o è prevista solo per installazione presso singolo cliente? Esiste una licenza OEM / per
>    software house?
> 2. **Base di calcolo del canone.** Per postazione, per operatore, per struttura servita, o a
>    volume di chiamate API?
> 3. **Contenuti disponibili in fasce**, con il rispettivo prezzo: la sola posologia; posologia più
>    interazioni; il pacchetto completo. Vorremmo poter partire dal minimo indispensabile.
>
> **Domande tecniche**
>
> - Protocollo e formato (REST/JSON, SOAP, download di dataset?).
> - Frequenza di aggiornamento e modalità di distribuzione degli aggiornamenti.
> - Chiave di aggancio: possiamo interrogare per **codice AIC**? È la chiave che già usiamo.
> - Ambiente di test/sandbox disponibile prima della firma.
> - Vincoli contrattuali sulla conservazione locale dei dati (possiamo tenere una copia in cache?).
> - SLA di disponibilità del servizio.
>
> **Contesto d'uso, per correttezza**
>
> L'informazione è mostrata all'operatore come materiale di consultazione: è l'operatore a decidere.
> ClinicOS non calcola dosi né valida prescrizioni in automatico. Segnalatecelo se questo cambia
> l'inquadramento della licenza.
>
> Restiamo in attesa di un preventivo e della documentazione tecnica di integrazione.
>
> Cordiali saluti,

---

## Da chiedere a Farmadati in particolare

Dalla documentazione pubblica, la configurazione per l'integrazione back-end in software di terzi è
**BDF2.0 Professional + BDF2.0 Documentary**, erogati via web-service. Citarli per nome accorcia il
giro: _Gallery_ è l'applicativo web di consultazione e a noi non serve. Aggiornamenti rilasciati
quotidianamente dal lunedì al venerdì e nei prefestivi.

## Come valutare le risposte

| Criterio                                 | Perché pesa                                                           |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Licenza SaaS/multi-struttura ammessa     | Se non lo è, il resto non conta: è un no                              |
| Posologia strutturata per AIC            | È l'unico dato che stiamo davvero comprando                           |
| Sandbox prima della firma                | Permette di misurare la copertura reale sui farmaci dei vostri ospiti |
| Canone scalabile col numero di strutture | Evita che il costo esploda alla seconda struttura                     |
| Possibilità di cache locale              | Determina la resilienza se il servizio è indisponibile                |

**Prima di firmare:** misurare sulla sandbox quanti dei farmaci realmente presenti nelle terapie dei
vostri ospiti hanno posologia strutturata. Una copertura bassa proprio sui farmaci che usate davvero
rende la licenza un costo senza beneficio, per quanto il catalogo sia ampio.
