# ClinicOS — Piano di prodotto dai feedback del 22 settembre 2026

**Stato: analisi e piano di lavoro; attività applicative da eseguire.**

La direzione proposta è fare di ClinicOS uno strumento affidabile per il giro reparto: riconoscere subito il paziente, trovare la prossima azione, registrarla con pochi passaggi e sapere se è stata salvata. La complessità clinica deve rimanere disponibile senza occupare tutta la schermata contemporaneamente.

Questo piano copre le due registrazioni del 22 settembre e i cinque moduli allegati. Confronta le richieste con il codice corrente e con verifiche mirate sul sito. Le richieste precedenti sono considerate come vincoli di continuità, senza riaprire indistintamente tutto il progetto.

## 1. Come leggere e usare il piano

- **Prima lettura:** sezioni 2–5 per decisioni, priorità e ordine di lavoro.
- **Prima di sviluppare un’attività:** relativa scheda nella sezione 6, con risultato atteso, accettazione e prove.
- **Per i moduli clinici:** [specifiche dei moduli e questioni da validare](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/docs/product/specifiche-moduli-2026-09-22.md>).
- **Per valutare l’usabilità:** sezioni 7–8, con euristiche Nielsen e scenari osservabili.

Gli identificativi `PO-01`…`PO-16` sono riferimenti locali del piano, non numeri di issue GitHub. Ogni attività diventerà un requisito distinto, riutilizzando l’eventuale issue esistente. Si lavora su una sola attività applicativa alla volta.

## 2. Risultati principali dell’analisi

**I due problemi da affrontare per primi sono l’ingresso con dati mancanti e la conferma dopo aver corretto gli orari.** Il primo è imposto da controlli espliciti in frontend e backend. Il secondo è segnalato dall’audio: l’editor degli orari esiste già, ma serve riprodurre il percorso completo per identificare il controllo che blocca la creazione.

**Tachipirina 1000 mg compresse è già nel catalogo.** Nella verifica sul sito, cercando “Tachipirina 1000”, le confezioni da 8 e 16 compresse risultano al 13º e 14º posto. Il selettore terapia richiede al massimo 12 risultati. La stessa ricerca restituisce anche 500 mg e altre forme: il dosaggio non restringe correttamente i risultati. Occorre correggere ricerca e selezione, senza aggiungere duplicati al catalogo. La riproduzione completa nel selettore terapia rimane una prova di PO-04.

**Il limite delle scansioni è un limite di file della sessione**, configurato a 10 per impostazione predefinita; ogni foto produce un elemento. Non è corretto descriverlo come un limite universale di dieci pagine PDF. Serve gestire un documento multipagina e più lettere con avanzamento e recupero degli errori.

**Le Consegne hanno già un form di creazione**, ma il selettore richiede di digitare almeno due caratteri. Manca l’elenco dei pazienti su cui lavorare senza ricordarne i nomi.

**Moduli e archivio esistono già.** Conservare Medicazioni, Contenzioni e Braden; aggiornare Tinetti; introdurre PAINAD, MNA, GDS-15 e Trasferimenti posturali. Dimissione va spostata accanto a Documenti, riutilizzando il modulo presente. NRS va ritirata dal catalogo delle nuove compilazioni, preservandone lo storico.

**Il PDF Tinetti contiene una discrepanza sostanziale:** dichiara 12 punti per l’andatura, ma le opzioni dell’item 11 accorpano lunghezza e altezza del passo e portano il massimo dell’andatura a 10. Il codice attuale distingue le quattro voci DX/SX e arriva a 12. La nuova versione deve essere convalidata prima del rilascio; non si copierà il calcolo incoerente del PDF.

## 3. Tracciabilità delle richieste

I tempi sono indicativi, arrotondati dalla trascrizione locale. “Presente” indica una funzione individuata nel codice o nell’interfaccia, non una certificazione completa del suo funzionamento.

| Fonte | Problema o richiesta | Esito dell’analisi | Attività |
|---|---|---|---|
| Audio principale 00:00–00:17 | Non trova Tachipirina 1000 compresse | Confezioni presenti online; ricerca e limite del selettore da correggere | PO-04 |
| 00:17–00:35 | Blocco dopo dieci fotografie/pagine | Limite file confermato nel codice; scanner già presente | PO-05 |
| 00:35–00:54 | Orari duplicati nelle note terapia | Il testo originale viene aggiunto alle note durante la conferma dell’import | PO-03 |
| 00:54–01:18 | Spostamento Lasix 16:00 → 20:00 blocca “Crea paziente” | Modifica supportata; causa esatta del blocco da riprodurre | PO-02 |
| 01:18–01:53 | Camera/letto e scelta fra ordine alfabetico e camera | Dati disponibili in alcuni contesti; ordinamento per camera assente nell’elenco | PO-06, PO-07 |
| 01:53–02:20 | Consegne da elenco pazienti cliccabile | Creazione presente; selettore online richiede ricerca testuale | PO-08 |
| 02:20–02:36 | Nomi poco distinti dai farmaci in somministrazione | Gerarchia visiva debole nei gruppi paziente | PO-06 |
| 02:36–03:06 | Creare paziente senza tutti i dati, soprattutto CF | CF e telefono richiesti anche dal backend | PO-01 |
| Audio breve 00:00–00:12 | Conservare Medicazioni, Contenzioni, Braden | Già presenti | PO-10, PO-15: preservare |
| 00:12–00:19 | Sostituire Tinetti/NRS e introdurre gli allegati | Tinetti/NRS presenti; i quattro nuovi moduli non risultano implementati | PO-10–PO-15 |
| 00:19–00:21 | Dimissione sopra, accanto a Documenti | Modulo presente dentro Moduli | PO-09 |

## 4. Decisioni di prodotto

### Ingresso progressivo, stato clinico esplicito

L’assenza del codice fiscale non deve costringere a inventarlo. Si propone un ingresso **“Anagrafica da completare”**, distinto dalla bozza ancora non confermata. Il paziente compare nel reparto e la scheda indica esattamente quali dati mancano.

Minimo proposto per questo percorso: nome, cognome e contesto di presa in carico. CF, telefono e altri dati anagrafici non disponibili restano mancanti, senza date fittizie o valori riempitivi. Il telefono rimane necessario per dichiarare completa la scheda, coerentemente con il requisito precedente. Il caso di una persona senza identità anagrafica conosciuta richiede un percorso specifico e non viene risolto inventando nome o cognome.

La completezza anagrafica e la validità di una terapia sono due stati distinti. Una terapia ambigua resta da verificare e non diventa eseguibile solo perché il paziente viene registrato. Le terapie escluse dalla conferma restano nella bozza, con un elenco chiaro di ciò che è stato importato e ciò che rimane da verificare.

### Una sola identità del paziente in tutti i percorsi

Usare una presentazione coerente: **Cognome Nome**, camera/letto, un ulteriore elemento identificativo quando disponibile. Camera e letto aiutano il giro reparto ma non sostituiscono l’identità. “Camera non assegnata” è preferibile a un campo vuoto; non assegnare automaticamente un letto.

### Una sola sede per ogni informazione

Programmazione per gli orari, note per le istruzioni cliniche, origine per il testo OCR e il documento. Lo stesso principio vale per i moduli: dati strutturati nella cartella e copie finalizzate nell’archivio Documenti, senza un secondo archivio indipendente.

### Progressività della schermata

Mostrare prima la decisione corrente e i dati necessari. Dettagli, fonte OCR, istruzioni estese e storico si aprono quando servono. Non trasformare ogni filtro in un tab e non aggiungere otto nuovi pulsanti orizzontali per i moduli.

### Controllo dell’operatore

Separare chiaramente “Salva bozza” e “Conferma”. Mostrare il risultato del salvataggio e mantenere i dati in caso di errore. Nessuna modifica automatica di prescrizioni, conversione fra scale o fusione di pazienti.

## 5. Ordine di esecuzione

P0 = blocca un percorso fondamentale; P1 = affidabilità o uso quotidiano; P2 = accessibilità della funzione e riordino. L’ordine sotto è la sequenza proposta, tenendo conto delle dipendenze. Non è una promessa di durata.

| Ordine | Attività | Priorità | Dipendenza | Risultato dimostrabile |
|---|---|---|---|---|
| 1 | PO-01 · Ingresso con dati da completare | P0 | Nessuna | Creazione senza CF, completamento successivo |
| 2 | PO-02 · Correzione orari durante l’ingresso | P0 | PO-01 per prova integrata | 16:00 → 20:00 conservato dopo conferma |
| 3 | PO-03 · Note, orari e origine separati | P1 | PO-02 | Note operative leggibili senza duplicazioni |
| 4 | PO-04 · Ricerca della confezione corretta | P1 | Nessuna | Tachipirina 1000 compresse selezionabile |
| 5 | PO-05 · Importazione oltre dieci scansioni | P1 | Percorso di conferma PO-01/02 | Documento lungo acquisito e archiviato |
| 6 | PO-06 · Identità e camera/letto ben visibili | P1 | Nessuna | Paziente distinguibile da farmaci e azioni |
| 7 | PO-07 · Ordinamento per nome o camera | P1 | PO-06 | Stesso ordine coerente nelle viste operative |
| 8 | PO-08 · Consegne dal giro pazienti | P1 | PO-06/07 | Seleziona paziente, scrivi, salva, prosegui |
| 9 | PO-09 · Dimissione accanto a Documenti | P2 | Nessuna | Accesso diretto al modulo esistente |
| 10 | PO-10 · PAINAD e comportamento comune dei moduli | P1 | Specifica del modulo | Prima nuova scala completa e archiviabile |
| 11 | PO-11 · Trasferimenti posturali | P1 | PO-10 per componenti comuni | Scheda operativa fedele al DOCX |
| 12 | PO-12 · Tinetti aggiornata e punteggio completo | P1 | Chiarimento clinico Tinetti | Versione coerente e storico preservato |
| 13 | PO-13 · MNA completa | P1 | PO-10; verifica item Q | Screening e valutazione globale |
| 14 | PO-14 · GDS-15 | P1 | PO-10 | Questionario leggibile e punteggio corretto |
| 15 | PO-15 · Catalogo Moduli e storico NRS | P2 | Nuovi moduli disponibili | Elenco semplice, senza perdere dati pregressi |
| 16 | PO-16 · Prova del giro reparto completo | P1 | Attività precedenti | Verifica di usabilità e integrazione |

Se una convalida clinica esterna impedisce PO-12 o PO-13, l’attività resta aperta e si passa alla successiva indipendente. Non si pubblica una versione clinicamente incerta per rispettare l’ordine della tabella.

## 6. Schede delle attività

### PO-01 — Registrare un ingresso con anagrafica da completare

**Risultato:** l’operatore registra il paziente con i dati disponibili e completa la stessa scheda successivamente.

- **Intervento:** allineare wizard, import OCR, validazione backend e completezza del profilo. Definire la matrice dei dati necessari all’ingresso e alla scheda completa prima di cambiare i controlli.
- **Accettazione:** CF assente non impedisce l’ingresso; nessun CF inventato; avviso compatto con dati mancanti e collegamenti ai campi; completare il profilo mantiene lo stesso paziente, documenti e terapie.
- **Accettazione:** CF fornito deve essere valido e non duplicato; possibili omonimie evidenziate senza unione automatica; doppio clic e nuovo invio dopo timeout non creano un secondo paziente.
- **Accettazione:** terapie non verificate restano riconoscibili e non eseguibili; l’operatore vede cosa viene confermato e cosa rimane in bozza.
- **Prove:** ingresso manuale/OCR senza CF e telefono; data di nascita non disponibile; aggiunta successiva di CF già esistente; errore di rete; ripresa della bozza; controlli di accesso al reparto.
- **Ambito:** frontend, servizi di conferma, regole di identità e schema solo se necessario. Non basta togliere un asterisco dal form.

### PO-02 — Modificare l’orario importato senza perdere la possibilità di confermare

**Risultato:** una correzione valida viene conservata e la conferma spiega ogni eventuale problema residuo.

- **Primo passo:** riprodurre “Lasix 16:00 → 20:00 → Crea paziente” con dati sintetici; confrontare bozza, stato di verifica OCR, accettazioni, richiesta inviata e validazione del server. La causa unica non è ancora dimostrata.
- **Accettazione:** dopo verifica dell’operatore la terapia viene creata alle 20:00; nessuna somministrazione residua alle 16:00; dose, quantità, via, giorni e decorrenza restano invariati.
- **Accettazione:** se manca un altro dato, messaggio vicino al campo e riepilogo cliccabile; nessun “creazione impossibile” senza spiegazione. La correzione dell’orario non certifica automaticamente tutto il testo OCR.
- **Prove:** una e più fasce, orari duplicati/non validi, terapia al bisogno, cambio step, ricarica della bozza e autosalvataggio in corso. Le modifiche dipendono dai permessi dell’operatore.

### PO-03 — Separare le note della terapia dal testo di origine

**Risultato:** l’operatore non deve cancellare ogni volta gli orari copiati nelle note.

- **Intervento:** conservare programmazione, istruzioni cliniche e provenienza in campi distinti; il testo originale resta consultabile nella revisione e nel documento archiviato.
- **Accettazione:** una terapia importata con orari strutturati non riporta automaticamente l’intera riga di origine nelle note; “dopo cena”, condizioni al bisogno e altre istruzioni mantengono il significato originale.
- **Prove:** orario puro, note con un orario clinicamente significativo, testo ambiguo, modifica manuale e nuova importazione. Nessuna pulizia indiscriminata tramite espressione regolare e nessuna riscrittura massiva delle note storiche.

### PO-04 — Trovare e conservare la confezione scelta

**Risultato:** nome, dosaggio e forma portano alla confezione desiderata senza confondere formulazioni diverse.

- **Intervento:** ricerca che considera dosaggio e forma, ordine stabile, accesso ai risultati oltre i primi 12; mostrare chiaramente denominazione, dosaggio, forma e confezione. Riutilizzare il catalogo esistente.
- **Accettazione:** “Tachipirina 1000 compresse” rende trovabili le confezioni presenti; 500 mg e compresse effervescenti non vengono presentate come equivalenti esatti. Ricerca per principio attivo ancora utilizzabile.
- **Accettazione:** la scelta conserva l’identità della confezione/AIC quando disponibile, senza perdere la formulazione al salvataggio; non stabilisce automaticamente la dose da somministrare.
- **Prove:** query dell’audio nel selettore terapia e nel catalogo, ricarica del form, dosaggi simili, errori di battitura, risultato assente e servizio non raggiungibile. L’eventuale inserimento libero resta una scelta esplicita e riconoscibile.

### PO-05 — Scansionare documenti lunghi e più lettere

**Risultato:** l’operatore può superare dieci foto senza perdere il lavoro e riconosce quali pagine appartengono a ogni documento.

- **Intervento:** sessione multipagina con miniature, numero pagina, riordino, anteprima e possibilità di rifare una pagina; gruppi distinti per lettere diverse; elaborazione a lotti compatibile con i limiti effettivi di OCR, memoria e caricamento.
- **Accettazione:** caso di collaudo con 30 pagine acquisite, ordinamento mantenuto, PDF consultabile e originale archiviato per paziente; il limite operativo finale, in pagine e MB, viene misurato e mostrato prima del blocco.
- **Accettazione:** errore su una pagina non cancella le altre; avanzamento comprensibile; recupero o reinvio senza duplicati; cambiando lettera non si sovrascrive automaticamente una terapia discordante.
- **Prove:** iOS/Safari e Android/Chrome su dispositivo, permesso fotocamera negato, PDF multipagina, JPEG/PNG, più lettere, pagina illeggibile, rete interrotta e dimensione eccessiva. Trenta pagine è un obiettivo di collaudo, non una capacità già verificata.

### PO-06 — Rendere immediati identità del paziente e posto letto

**Risultato:** nome e contesto del paziente emergono prima dei farmaci e dei comandi.

- **Intervento:** componente/presentazione condivisa in Pazienti, Consegne, Parametri e Terapia; nome con peso e dimensione maggiori del dettaglio farmaco; separazione dei gruppi; camera e letto vicini al nome.
- **Accettazione:** in somministrazione è sempre chiaro a quale paziente appartiene l’azione, anche scorrendo; “Non assegnato” per dati mancanti; nessuna confusione fra camera e identità.
- **Prove:** due omonimi, cognome lungo, camera assente, molte terapie, tastiera, zoom 200% e larghezze mobile/tablet. Il solo aumento del grassetto non esaurisce il requisito.

### PO-07 — Ordinare il reparto per cognome o camera

**Risultato:** il reparto può adottare il proprio ordine di lavoro senza reimpostarlo in ogni schermata.

- **Intervento:** scelta visibile “Cognome / Camera e letto”, crescente/decrescente; default del reparto e preferenza personale per reparto, senza cambiare l’impostazione degli altri operatori.
- **Accettazione:** ordine naturale `1A, 1B, 2A, 2B, 10A`; non assegnati in fondo in entrambe le direzioni; spareggio stabile per nome e identificativo; stesso criterio nelle viste Pazienti/Consegne/Parametri/Terapia.
- **Accettazione:** ordinamento sull’intero insieme autorizzato e filtrato, prima della paginazione. Non limitarsi alle prime 50 righe caricate.
- **Prove:** oltre 50 pazienti sintetici, nomi accentati/omonimi, più reparti, camera modificata durante il turno, ricerca attiva, ricarica e preferenza non ancora impostata.

### PO-08 — Scrivere consegne partendo dall’elenco pazienti

**Risultato:** l’operatore scorre il reparto e scrive per il paziente scelto senza ricordarne il nome né aprirne ogni volta la cartella.

- **Intervento:** elenco pazienti disponibile all’apertura, ricerca facoltativa, selezione con identità evidente e compositore accanto/sotto; conservare accesso al feed di consegne esistente.
- **Accettazione:** un clic sul paziente apre il contesto di scrittura; salvataggio esplicito; messaggio “Consegna salvata per …”; possibilità “Salva e prossimo” solo dopo successo e senza segnare eseguita la consegna.
- **Accettazione:** distinguere “nessuna consegna”, “consegne aperte” ed eventuale consegna appena registrata; cambiare paziente non trasferisce il testo della bozza a un’altra persona.
- **Prove:** giro di cinque pazienti senza digitare nomi, filtro camera, omonimi, bozza non salvata, errore/reinvio, paziente dimesso mentre la pagina è aperta. Riutilizzare form, autorizzazioni e servizi presenti.

### PO-09 — Dimissione nella navigazione principale della cartella

**Risultato:** “Dimissione” compare al livello di “Documenti”, immediatamente accanto.

- **Intervento:** spostare la destinazione esistente nella tassonomia comune; mantenere collegamenti diretti e navigazione dell’assistente verso il modulo.
- **Accettazione:** modulo, dati, stampa e permessi invariati; l’apertura della sezione non dimette il paziente; nessun doppione nel catalogo Moduli.
- **Prove:** apertura da navigazione e vecchio collegamento, ritorno alla cartella, tablet/mobile e tastiera. Non ricostruire il processo di dimissione.

### PO-10 — Introdurre PAINAD con un comportamento riutilizzabile

**Risultato:** prima nuova scala completa, dal questionario alla riapertura del documento archiviato.

- **Intervento:** cinque item descrittivi del PDF; componenti comuni per identità, data/ora, operatore, stato bozza/completo, conteggio risposte, riepilogo, storico e stampa. Riutilizzare quanto già disponibile nelle scale e nell’archivio.
- **Accettazione:** ogni item 0–2, totale 0–10 solo a compilazione completa; “non compilato” distinto da 0; bozze riprendibili; risultato finale con versione e dati dell’operatore; PDF ritrovabile in Documenti.
- **Prove:** tutte le combinazioni di punteggio della PAINAD, confini delle fasce, un item mancante, errore di salvataggio, riapertura e stampa. Dettagli nel documento moduli.

### PO-11 — Aggiungere Trasferimenti posturali

**Risultato:** indicazioni operative di mobilizzazione consultabili e aggiornabili nella cartella.

- **Intervento:** tradurre i gruppi del DOCX in campi chiari: carico/deambulazione, tre trasferimenti, igiene, dolore, cognizione, ausili e note; compilatore e validatori riconoscibili.
- **Accettazione:** tutte le voci del modello sono rappresentate; per ogni trasferimento una scelta coerente di assistenza, senza combinazioni contraddittorie; ultima scheda valida subito disponibile con storico delle revisioni.
- **Prove:** autonomia e assistenza con ausili, DX/SX, compilazione parziale, nuova revisione, stampa con firme previste e dati lunghi. Questa scheda non sposta il paziente di reparto e non modifica prescrizioni di contenzione.

### PO-12 — Aggiornare Tinetti senza introdurre un punteggio incoerente

**Risultato:** modello validato, compilazione leggibile e totale attendibile.

- **Intervento:** concordare la versione corretta dell’item 11 del PDF; preservare il modello esistente fino alla sostituzione. Correggere anche l’anteprima attuale: il valore sentinella `-1` non deve entrare nel totale e una compilazione parziale non deve produrre una classe di rischio definitiva.
- **Accettazione:** modello approvato con equilibrio 16 e andatura 12, totale 28; lunghezza e altezza DX/SX distinte se confermate dal referente; dati storici riconoscibili per versione e non ricalcolati silenziosamente.
- **Prove:** ogni opzione, massimi, soglie 18/19 e 23/24, campi mancanti, PDF e vecchi record. La verifica clinica riguarda il contenuto; i test verificano che il software lo implementi fedelmente.

### PO-13 — Introdurre MNA completa

**Risultato:** screening A–F e valutazione G–R in un flusso progressivo coerente con l’allegato.

- **Intervento:** dati antropometrici e domande raggruppate; suggerire il completamento globale quando screening ≤11, mantenendolo disponibile per approfondimento; preservare mezzi punti.
- **Accettazione:** massimi 14 + 16 = 30; IMC da peso/altezza con unità visibili; storico con valori e data della rilevazione; nessun totale globale su domande mancanti.
- **Prove:** punteggi 0,5, soglie screening 7/8 e 11/12, totale 16,5/17 e 23,5/24, limiti IMC/CB/CP, altezza mancante/zero e valori non validi. Verificare l’ambigua dicitura dell’item Q del modello prima di fissare il calcolo.

### PO-14 — Introdurre GDS-15

**Risultato:** quindici domande leggibili, riferite all’ultima settimana, con Sì/No sempre coerenti.

- **Intervento:** risposte senza preselezione; scoring delle domande inverse; riepilogo finale, fonte/versione, storico e PDF.
- **Accettazione:** NO vale 1 per 1/5/7/11/13; SÌ vale 1 per le altre; totale 0–15 solo completo; mantenere le note del modello sull’uso come screening e sul deficit cognitivo.
- **Prove:** tutte le risposte Sì/No e singole inversioni, soglie 5/6 e 9/10, risposta mancante, riapertura e PDF. Il punteggio non crea automaticamente una diagnosi.

### PO-15 — Rendere semplice il catalogo Moduli e conservare lo storico

**Risultato:** l’operatore trova rapidamente il modulo corretto e l’ultima compilazione.

- **Intervento:** elenco compatto con raggruppamento “Assistenza e mobilizzazione” / “Scale di valutazione”, nome, ultima data e azioni “Apri” / “Nuova compilazione”; usare i componenti comuni, senza una seconda navigazione concorrente.
- **Accettazione:** presenti Medicazioni, Contenzioni, Braden, PAINAD, Trasferimenti posturali, Tinetti validata, MNA, GDS-15; nessun modulo annunciato prima che sia funzionante.
- **Accettazione:** NRS non proposta per nuove compilazioni nel catalogo; storico precedente raggiungibile e stampabile; nessuna conversione NRS → PAINAD. Gli eventuali campi dolore NRS in altri flussi non sono eliminati implicitamente da questo requisito.
- **Prove:** individuare e riaprire ogni modulo, paziente senza compilazioni, storico NRS, vecchi collegamenti, filtri condivisi, archivio e stampa multipla. Il ritiro avviene quando il nuovo percorso dolore è disponibile.

### PO-16 — Verificare un intero giro reparto

**Risultato:** i singoli miglioramenti funzionano insieme sul percorso quotidiano.

- **Scenario:** ingresso incompleto → lettura documento lungo → correzione terapia → assegnazione camera → ordine del giro → somministrazione → consegna → modulo → archivio → dimissione.
- **Accettazione:** nessun cambio involontario di paziente, perdita di dati o duplicazione; ogni azione esplicita ha esito comprensibile; storico e documenti restano raggiungibili; i ruoli mantengono il proprio perimetro.
- **Prove:** sessione osservata con personale rappresentativo di almeno due reparti/ordini di lavoro e dispositivi reali; stessi scenari sintetici prima/dopo; criteri della sezione 8. Non usare dati personali per produrre screenshot o registrazioni di collaudo.

## 7. Nielsen tradotto in regole verificabili

| Euristica | Regola per ClinicOS | Come verificarla |
|---|---|---|
| 1. Visibilità dello stato del sistema | Stato di salvataggio, scansioni elaborate, risposte mancanti e paziente attivo sempre chiari | Interrompere la rete: distinguere “in corso”, “salvato”, “errore” senza chiedere spiegazioni |
| 2. Corrispondenza con il mondo reale | Camera/letto, giro reparto, somministrazione, nomi dei moduli riconoscibili | Operatore trova la destinazione senza interpretare sigle interne o “job” |
| 3. Controllo e libertà | Annulla, riprendi bozza, torna alla pagina; conferma prima della registrazione clinica | Uscire da un form non perde lavoro senza avviso e non salva di nascosto |
| 4. Coerenza e standard | Identità paziente, filtri, campi e azioni uguali nei percorsi equivalenti | Stessa azione ha stesso nome e comportamento fra Consegne, Terapia e Moduli |
| 5. Prevenzione degli errori | Omonimi distinguibili, dosaggi espliciti, dati mancanti separati da zero | Casi omonimi/formulazioni simili/non compilato non producono selezioni o punteggi impliciti |
| 6. Riconoscimento anziché memoria | Elenco pazienti e ultima compilazione visibili | Scrivere consegne a cinque pazienti senza ricordare o digitare nomi |
| 7. Flessibilità ed efficienza | Ordine per reparto, preferenze personali, tastiera, “Salva e prossimo” | Giro per camera e giro alfabetico entrambi completabili senza cambiare pagina a ogni paziente |
| 8. Design essenziale | Una decisione principale per area; dettagli progressivi; fonte separata dalle note | Nei primi secondi sono chiari paziente, compito e azione primaria; nessun tab usato come filtro |
| 9. Riconoscimento e recupero dagli errori | Problema vicino al campo, riepilogo cliccabile, dati conservati | “Orario duplicato nella seconda fascia” porta alla fascia senza azzerare il form |
| 10. Aiuto e documentazione | Istruzioni brevi accanto al dato, criteri estesi su richiesta | L’operatore comprende come rispondere alla scala senza consultare un manuale esterno |

Ulteriori criteri trasversali: testo con contrasto almeno 4,5:1 (3:1 per testo grande), componenti/focus percepibili, stato espresso anche a parole, obiettivo di area toccabile 44×44 px nei flussi da tablet/mobile, uso con tastiera, ordine del focus sensato e nessun taglio delle azioni a zoom 200%. Le griglie cliniche larghe possono scorrere dentro il proprio contenitore, senza rendere irraggiungibili nome e comandi. Sono obiettivi di verifica, non una dichiarazione di conformità già ottenuta.

## 8. Criteri di riuscita e modalità di delivery

### Metriche proposte per il collaudo

| Obiettivo | Criterio di accettazione proposto |
|---|---|
| Ingresso senza CF | Tutti i casi sintetici previsti arrivano allo stato “da completare” senza dati inventati |
| Correzione orari | 100% degli orari confermati persistono; zero vecchi orari rimasti per errore |
| Scelta farmaco | Confezione dell’audio trovata entro 30 secondi; zero sostituzioni involontarie di dosaggio/forma |
| Consegne | Cinque pazienti consecutivi, nessun nome digitato, nessuna consegna sul paziente sbagliato |
| Moduli | 100% dei casi di calcolo e confine concordati; bozze mai presentate come risultati completi |
| Recupero | Nessuna perdita delle risposte nei casi di errore previsti; niente doppioni dopo reinvio |
| Usabilità | Compiti critici completati senza aiuto; difficoltà residua annotata, non nascosta dietro un test tecnico |

Prima di implementare si registrano tempi, passaggi e punti di esitazione dello scenario corrente. I numeri sopra sono obiettivi, non misure già raccolte. Una piccola prova con 3–5 operatori rappresentativi serve a trovare ostacoli, non a dimostrare statisticamente l’assenza di problemi.

### Una attività, una verifica concreta

1. Collegare la scheda PO al requisito esistente o crearne la specifica; definire un Task Contract con criteri ed evidenze prima del codice.
2. Registrare il comportamento iniziale con dati sintetici, implementare solo quell’attività e verificare i casi di errore.
3. Eseguire controlli di tipi/build e test pertinenti; per la UI verificare il percorso nel browser; per le scale confrontare calcolo e stampa con il modello validato.
4. Preparare una dimostrazione breve con prima/dopo, passi ripetibili e commit identificato. Un build riuscito da solo non dimostra usabilità.
5. Pubblicare la versione verificata nel delivery concordato e controllare la stessa versione sul sito; mostrare all’operatore come ripetere la verifica. Il frontend Vercel richiede un deploy esplicito: il solo push non lo aggiorna.
6. Registrare l’esito e passare all’attività successiva. Se fallisce un criterio, la voce resta aperta con il problema preciso.

Ogni consegna applicativa include: comportamento cambiato, prove eseguite, versione pubblicata e limiti rimasti. Il presente lavoro consegna il piano: non modifica l’app, non chiude requisiti e non pubblica una nuova versione.

## 9. Decisioni da chiudere al momento opportuno

| Decisione | Proposta nel piano | Quando serve |
|---|---|---|
| Dati minimi dell’ingresso | Nome/cognome e presa in carico; altri dati mancanti espliciti; telefono necessario per completezza | Prima di implementare PO-01 |
| Modifica orari e ruoli | Correzione consentita ai ruoli già abilitati, con autore tracciato e conferma | PO-02 |
| Tinetti | Convalidare item 11 e versione da 28 punti con referente clinico | Prima di rilasciare PO-12 |
| MNA item Q | Chiarire l’intervallo della circonferenza brachiale, evitando sovrapposizioni | Prima di fissare lo scoring in PO-13 |
| NRS | Ritirare nuove compilazioni dal catalogo; conservare storico e altri campi dolore finché non diversamente richiesto | PO-15 |
| Firme trasferimenti | Identità autenticata e validazione tracciata; firme previste nel PDF, senza spacciare il nome digitato per firma digitale | PO-11 |

Queste decisioni non impediscono di usare il piano. Le convalide cliniche sono circoscritte ai relativi moduli, senza introdurre approvazioni ripetute su correzioni ordinarie già autorizzate.

## 10. Base dell’analisi e limiti

- Codice analizzato: commit `393e8b4ae909d66d945d474c01bb7669b0d8be3d`, branch `codex/subtle-dashboard-notifications`.
- Alias verificato: [ClinicOS](https://clinicos-eosin.vercel.app), deployment `dpl_45LJxzRzDBvKdUaC3rA7AnxpLvFc`; metadata del frontend corrispondenti al commit. Questo non certifica separatamente la versione del backend Railway.
- Due audio trascritti localmente: durata circa 3:06 e 0:21. Quattro PDF letti e ispezionati visivamente, per cinque pagine totali. DOCX analizzato tramite testo e tabelle; nessuna verifica di resa grafica DOCX dichiarata.
- Verifiche online in lettura: ricerca “Tachipirina 1000”, risultati del catalogo, Nuova consegna e ricerca pazienti. Nessun paziente, terapia o consegna creato/modificato.
- Il blocco dopo modifica degli orari non è stato riprodotto con scrittura; resta una segnalazione prioritaria con piano diagnostico.
- Questo non è un audit completo di sicurezza o una convalida clinica delle scale. Il contenuto clinico finale richiede il riferimento concordato.
- La lista issue remote non è stata riconciliata: il client GitHub locale non risulta autenticato. Non sono state create issue o attribuiti stati di completamento remoti.

Fonti originali: [audio principale](<C:/Users/Claudio/Downloads/Nuova cartella/WhatsApp Audio 2026-09-22 at 16.05.10.mp4>) · [audio breve](<C:/Users/Claudio/Downloads/Nuova cartella/WhatsApp Ptt 2026-09-22 at 15.58.49.ogg>). Le specifiche dei moduli riportano i collegamenti ai cinque allegati e i riferimenti al codice.
