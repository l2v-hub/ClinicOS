# ClinicOS — Specifiche dei moduli allegati

Documento collegato al [piano PO del 22 settembre](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/docs/product/piano-po-feedback-2026-09-22.md>). È una specifica preparatoria: punteggi e diciture sono ricavati dagli allegati, non costituiscono una convalida clinica indipendente.

## 1. Inventario e destinazione

| Modulo | Fonte | Stato attuale | Destinazione proposta |
|---|---|---|---|
| Medicazioni | Già nell’app | Presente | Conservare |
| Contenzioni | Già nell’app | Presente | Conservare |
| Braden | Già nell’app | Presente | Conservare |
| PAINAD | [PDF, 1 pagina](<C:/Users/Claudio/Downloads/Nuova cartella/scala PAINAD.pdf>) | Non individuato nel catalogo/codice corrente | Nuovo modulo |
| Trasferimenti posturali | [DOCX, 4 tabelle](<C:/Users/Claudio/Downloads/Nuova cartella/scheda trasferimenti 1.1-- NEW.docx>) | Non individuato | Nuovo modulo di mobilizzazione |
| Tinetti | [PDF, 2 pagine](<C:/Users/Claudio/Downloads/Nuova cartella/scala di TINETTI.pdf>) | Scala, storico e stampa presenti | Aggiornare dopo chiarimento item 11 |
| MNA | [PDF, 1 pagina](<C:/Users/Claudio/Downloads/Nuova cartella/MNA.pdf>) | Non individuato | Nuovo modulo completo A–R |
| GDS-15 | [PDF, 1 pagina](<C:/Users/Claudio/Downloads/Nuova cartella/scala GDS.pdf>) | Non individuato | Nuova scala a 15 item |
| NRS | Già nell’app | Presente | Ritirare dal catalogo delle nuove compilazioni, conservare storico |
| Dimissione | Già nell’app | Presente dentro Moduli | Spostare al livello di Documenti |

L’audio chiede di togliere Tinetti/NRS e inserire gli allegati. Poiché è allegata una nuova Tinetti, l’interpretazione proposta è sostituire la versione Tinetti e ritirare NRS dal catalogo operativo. Non significa cancellare valutazioni pregresse né convertire NRS in PAINAD.

I quattro PDF sono stati letti e verificati visivamente. Il DOCX è stato letto come contenuto e struttura delle tabelle; l’impaginazione Word non è stata verificata tramite rendering.

## 2. Comportamento comune dei moduli

### Apertura e compilazione

La pagina Moduli mostra l’elenco disponibile e l’ultima compilazione. Aprendo un modulo, l’operatore vede identità del paziente, titolo e data, quindi la scheda e lo storico espandibile. Il form digitale segue l’ordine del modello, ma non replica necessariamente una tabella A4 su uno schermo piccolo.

- Nome, cognome, data di nascita e camera/reparto provengono dalla cartella; i mancanti sono espliciti. Non richiedere di reinserire la stessa anagrafica a ogni valutazione.
- Distinguere data/ora della valutazione da data/ora di registrazione. Una registrazione differita deve conservarle entrambe.
- Mostrare descrizioni delle risposte, non soltanto numeri da selezionare. Nessuna risposta clinica preselezionata per risparmiare clic.
- Una risposta per item quando le alternative sono esclusive; caselle multiple solo per gruppi realmente multipli, come gli ausili.
- Consentire bozza incompleta e ripresa; indicare “3 di 5 risposte”, evitando di presentare un rischio definitivo prima del completamento.
- Il valore zero è una risposta valida e distinta da assente/non valutato. Un elemento non applicabile, quando previsto dal modello, non viene trasformato in zero.
- Conservare le risposte se il server non salva; il messaggio di successo compare solo dopo conferma del salvataggio. Un reinvio non duplica la valutazione.
- Su tablet/mobile disporre gli item in verticale con opzioni leggibili e area di tocco ampia. Aiuto esteso apribile vicino all’item, senza nascondere il testo necessario per rispondere.

### Conferma, storico e archivio

Ogni valutazione conserva identificativo del paziente, tipo e versione del modulo, risposte, data/ora della valutazione, autore autenticato, data/ora di registrazione e stato. Le revisioni restano tracciabili; una nuova versione del modello non ricalcola silenziosamente gli esiti già registrati.

- Riepilogo prima della conferma con risposte e totale, se applicabile. La scala non crea terapie, diagnosi, prescrizioni di contenzione o ordini operativi in automatico.
- Una valutazione finalizzata ha una copia PDF leggibile con paziente, data, autore, versione, risposte e risultato; bozza eventualmente esportata chiaramente marcata come tale.
- Usare l’archivio Documenti già esistente. Alberatura proposta: `Moduli e valutazioni → Tipo modulo → Anno/data`; per le lettere mantenere la tipologia documentale e la provenienza della scansione.
- Ricerca per tipo/data; anteprima immediata; compatibilità con selezione e stampa multipla esistenti. Il documento e il record strutturato si rimandano a vicenda.
- Un errore nella generazione del PDF non deve far credere che la valutazione non esista né crearla due volte: mostrare lo stato dell’archiviazione e consentire di riprovare.
- Conservare accessi limitati al perimetro del paziente. Nessuna condivisione esterna automatica dei moduli.

### Stampa

Layout A4 con intestazione paziente, titolo/versione, data/ora e autore; domande e risposte senza tagli; intestazioni ripetute nelle tabelle su più pagine. Per il DOCX conservare le aree firma previste. Registrare il nome dell’operatore non equivale a implementare una firma digitale.

La fedeltà clinica riguarda domande, opzioni, punteggi e istruzioni. Migliorare spaziatura, gerarchia e impaginazione è consentito; modificare il significato di una risposta richiede una decisione sul modello di riferimento.

## 3. PAINAD — PO-10

**Scopo del modello:** valutazione osservazionale del dolore nel paziente non verbale.

| Item | Campo | Punteggi consentiti |
|---|---|---|
| 1 | Respirazione | 0 / 1 / 2 |
| 2 | Vocalizzazione negativa | 0 / 1 / 2 |
| 3 | Espressione facciale | 0 / 1 / 2 |
| 4 | Linguaggio del corpo | 0 / 1 / 2 |
| 5 | Consolabilità | 0 / 1 / 2 |

Riprodurre le descrizioni delle tre alternative del PDF in corrispondenza di ciascun item. Il totale è la somma delle cinque risposte, da 0 a 10. Prima di tutte e cinque le risposte mostrare lo stato incompleto, non “nessun dolore”.

Fasce riportate dall’allegato: 0 nessun dolore rilevato; 1–3 lieve; 4–6 moderato; 7–10 severo. Le indicazioni del modello devono essere contestualizzate come informazioni cliniche da valutare, senza eseguire automaticamente trattamenti.

**Accettazione specifica:** tutte le 243 combinazioni di punteggi validi producono la somma corretta; confini 0/1, 3/4 e 6/7; un valore mancante impedisce il risultato definitivo. Zero su tutti gli item, compilazione parziale e assenza di valutazioni devono apparire come tre stati diversi.

## 4. Trasferimenti posturali — PO-11

**Scopo del modello:** indicazioni per trasferimenti posturali, deambulazione e assistenza. Non è il modulo di trasferimento amministrativo del paziente.

| Gruppo del DOCX | Campi da rappresentare | Comportamento |
|---|---|---|
| Identità e contesto | Cognome, nome, nascita, ingresso, diagnosi | Prefill dalla cartella; diagnosi da verificare dal compilatore |
| Carico arto operato | DX/SX; non concesso/sfiorato/totale | Lato e livello distinti; non assumere lato o permesso di carico |
| Deambulazione | Autonoma/con assistenza/non possibile | Scelta esclusiva |
| Letto → carrozzina | Autonomo; 1 o 2 operatori; 1 op. + desk/ascellare/rollator; sollevatore + 1 o 2 operatori | Una modalità coerente per questo trasferimento |
| Carrozzina → letto | Stesse opzioni del gruppo precedente | Compilazione indipendente dall’andata |
| WC | Autonomo; 1 o 2 operatori; 1 op. + desk/ascellare/rollator | Non aggiungere opzioni del sollevatore assenti in questa tabella del modello |
| Igiene | Bagno a letto/doccia | Scelta secondo modello |
| Dolore alla movimentazione | Sì/No | Nessun valore presunto |
| Deterioramento cognitivo | No/lieve/grave | Scelta esclusiva |
| Ausili | Elenco sotto | Più ausili possibili, con proprietà quando prevista |
| Note | Testo libero | Area leggibile, righe conservate in stampa |
| Responsabilità | Firma fisioterapista e firma operatori | Ruoli e modalità di attestazione da esplicitare |

Ausili da includere: carrozzina, cuscino antidecubito, contenzione in carrozzina, un antibrachiale, due antibrachiali, bastone, tetrapode, deambulatore rollator, deambulatore ascellare, deambulatore con tavolo/desk, busto e ginocchiera. Distinguere personale/struttura nelle voci che lo prevedono; il modello usa “Sollievo” come riferimento della struttura.

**Usabilità:** anteprima delle indicazioni correnti per i tre trasferimenti; aprire i dettagli solo quando si modifica la scheda. Non copiare automaticamente una modalità dall’andata al ritorno. In caso di nuova revisione mostrare da quando valgono le nuove indicazioni e mantenere la precedente consultabile.

**Questioni circoscritte:** mantenere “desk” con spiegazione “deambulatore con tavolo”; concordare chi compila/valida e come gli operatori attestano la presa visione. Non creare un sistema di firma digitale o un nuovo workflow di contenzione senza un requisito distinto.

**Prove:** ogni modalità, aux personali/struttura, testo lungo, campi mancanti, cambio revisione, PDF su più pagine senza tagliare firme e identità.

## 5. Tinetti — PO-12

### Discrepanza nel PDF allegato

Il PDF indica **equilibrio massimo 16, andatura massima 12, totale 28**. Tuttavia nell’item 11 della seconda pagina assegna al massimo 1 punto al piede DX e 1 al piede SX, accorpando lunghezza e altezza del passo. Le opzioni esplicite portano l’andatura a **10**, quindi il totale a **26**. Inoltre la risposta DX da 1 punto include “non si stacca completamente da terra”, mentre la SX parla di distacco completo.

La versione applicativa attuale distingue quattro risposte: lunghezza DX, altezza DX, lunghezza SX, altezza SX. È compatibile con un massimo dell’andatura di 12. Non eliminare queste distinzioni per riprodurre una scheda incoerente.

**Decisione necessaria:** referente clinico conferma il modello corretto, le descrizioni dell’item 11 e la versione di riferimento. L’adattamento grafico può essere preparato; il nuovo calcolo non va pubblicato prima della risoluzione.

### Struttura proposta, soggetta alla convalida dell’item 11

| Sezione | Item | Massimo |
|---|---|---|
| Equilibrio | Seduto | 1 |
| Equilibrio | Alzarsi | 2 |
| Equilibrio | Tentativi di alzarsi | 2 |
| Equilibrio | Equilibrio immediato | 2 |
| Equilibrio | Equilibrio prolungato | 2 |
| Equilibrio | Spinta | 2 |
| Equilibrio | Occhi chiusi | 1 |
| Equilibrio | Giro 360°: continuità + stabilità | 1 + 1 |
| Equilibrio | Sedersi | 2 |
| Andatura | Inizio deambulazione | 1 |
| Andatura | Lunghezza e altezza del passo DX e SX, quattro risposte | 1 + 1 + 1 + 1 |
| Andatura | Simmetria | 1 |
| Andatura | Continuità | 1 |
| Andatura | Traiettoria | 2 |
| Andatura | Tronco | 2 |
| Andatura | Base d’appoggio | 1 |

Fasce dell’allegato: meno di 19 elevato; 19–23 moderato; 24–28 basso. Mostrarle solo per un risultato completo secondo la versione convalidata.

### Problema aggiuntivo individuato nel codice

Il form inizializza le risposte mancanti a `-1`, mentre le funzioni di somma sostituiscono solo valori nulli/assenti con zero. Il riepilogo del rischio appare quando almeno una risposta è compilata. Ciò può produrre un totale spurio e una classificazione prematura durante la compilazione. Il salvataggio richiede già tutti gli item: non è stata dimostrata la persistenza di questi totali parziali.

**Accettazione:** nessun punteggio negativo o rischio definitivo su questionario incompleto; subtotali chiaramente identificati; soglie 18/19 e 23/24 verificate; storico e stampe associate alla versione originale. Un’eventuale correzione storica deve essere una rettifica tracciata, mai un ricalcolo invisibile.

## 6. MNA — PO-13

Il modello allegato è la **MNA completa**, con screening A–F (14 punti) e valutazione G–R (16 punti), totale 30. Non sostituirla con la sola versione breve.

### Campi e punteggi del modello

| Item | Contenuto | Punti |
|---|---|---|
| A | Riduzione dell’assunzione di cibo | 0 / 1 / 2 |
| B | Perdita di peso recente | 0 / 1 / 2 / 3, con “non sa” esplicito |
| C | Motricità | 0 / 1 / 2 |
| D | Malattie acute o stress psicologico negli ultimi tre mesi | Sì 0; No 2 |
| E | Problemi neuropsicologici | 0 / 1 / 2 |
| F | IMC | <19: 0; 19–<21: 1; 21–<23: 2; ≥23: 3 |
| G | Vive autonomamente a domicilio | Sì 1; No 0 |
| H | Più di tre medicinali al giorno | Sì 0; No 1 |
| I | Decubiti/ulcere cutanee | Sì 0; No 1 |
| J | Pasti completi al giorno | 1 pasto: 0; 2: 1; 3: 2 |
| K | Tre domande su fonti proteiche | 0 o 1 Sì: 0; 2 Sì: 0,5; 3 Sì: 1 |
| L | Frutta/verdura almeno due volte al giorno | No 0; Sì 1 |
| M | Bicchieri di liquidi al giorno | <3: 0; 3–5: 0,5; >5: 1 |
| N | Modalità di alimentazione | 0 / 1 / 2 |
| O | Autovalutazione dello stato nutrizionale | 0 / 1 / 2 |
| P | Salute rispetto ai coetanei | 0 / 0,5 / 1 / 2 |
| Q | Circonferenza brachiale | <21: 0; fascia intermedia da chiarire: 0,5; >22: 1 |
| R | Circonferenza polpaccio | <31: 0; ≥31: 1 |

Le descrizioni complete restano quelle del PDF. “Non sa” è una risposta prevista in alcune domande, con un punteggio proprio; non è equivalente a domanda non compilata.

**IMC:** peso in kg diviso il quadrato dell’altezza in metri. Mostrare misura, unità e data. Un dato recente della cartella può essere proposto con provenienza, ma deve essere verificato per la valutazione corrente. Non inferire automaticamente risposte cognitive, nutrizionali o terapeutiche dai dati della cartella.

**Flusso:** compilare screening; se ≤11 proporre chiaramente di completare G–R. Consentire approfondimento anche con screening 12–14, come indicato nel file. Se si salva solo lo screening, denominare il risultato “Screening MNA”, senza inventare il totale globale.

Fasce screening del modello: 12–14 normale; 8–11 a rischio; 0–7 malnutrito. Fasce globali: 24–30 normale; 17–23,5 rischio; <17 cattivo stato nutrizionale. Riportare fonte e revisione del modello, conservando i riferimenti presenti nell’allegato.

### Refuso da chiarire

L’item Q del PDF riporta visivamente **“0.5 = CB ≤ 21 CB ≤ 22”**, in conflitto con la prima alternativa `CB < 21`. L’intervallo presumibilmente inteso è `21 ≤ CB ≤ 22`, ma va confermato sul modello concordato, non assunto silenziosamente dal codice.

**Prove:** somma massima 14/16/30; mezzi punti conservati; confini IMC 19/21/23, CB 21/22, CP 31; tutte le combinazioni dei tre Sì/No dell’item K; un sottoitem di K mancante; altezza zero/assente; dati fuori formato; screening incompleto e solo screening completato. Testare funzioni realmente utilizzate dall’app con risultati attesi indipendenti, senza copiare l’implementazione nei test.

## 7. GDS-15 — PO-14

Usare le quindici domande del PDF nello stesso ordine. L’istruzione temporale è **come il paziente si è sentito nell’ultima settimana**. Sì/No non devono cambiare posizione fra le domande per seguire il punteggio.

| Risposta che assegna 1 punto | Domande |
|---|---|
| NO | 1, 5, 7, 11, 13 |
| SÌ | 2, 3, 4, 6, 8, 9, 10, 12, 14, 15 |

La risposta opposta vale 0. Totale 0–15; nessuna classificazione definitiva prima di tutte le risposte. Fasce riportate dall’allegato: 0–5, 6–9, 10–15. Presentare le categorie come esito dello screening, senza trasformarle automaticamente in diagnosi.

Conservare la nota del modello: GDS non sostituisce la diagnosi clinica; il file segnala limiti in presenza di deficit cognitivo moderato-severo. L’eventuale scelta di un’altra scala resta clinica; Cornell non viene aggiunta al perimetro di questo piano.

**Prove:** tutte Sì = 10; tutte No = 5; profilo con tutte le risposte da 0 = 0; profilo con tutte le risposte da 1 = 15; inversione di ciascuna domanda; soglie 5/6 e 9/10; risposta mancante; storico e PDF corrispondenti al record.

## 8. Riferimenti tecnici per evitare duplicazioni

Percorsi riferiti al commit `393e8b4ae909d66d945d474c01bb7669b0d8be3d`. Indicano dove iniziare l’implementazione, non file da riscrivere interamente.

| Ambito | Evidenza nel codice |
|---|---|
| Navigazione Moduli/Dimissione | [tabGroups.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/tabGroups.ts:75>) |
| Tinetti, calcolo | [ScalaTinettiTab.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:16>) |
| Tinetti, inizializzazione incompleta | [ScalaTinettiTab.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:83>) |
| Tinetti, visibilità del rischio parziale | [ScalaTinettiTab.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:619>) |
| Archivio esistente | [DocumentiTab.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/DocumentiTab.tsx>) |
| Dimissione esistente | [DimissioneTab.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/DimissioneTab.tsx>) |
| Ingresso: blocchi frontend | [StepVerifica.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/shared/intake/StepVerifica.tsx:68>) |
| Ingresso: CF/telefono anche nel server | [confirm-service.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/backend/src/ai/upload/confirm-service.ts:27>) |
| Identità: CF nullable, nascita obbligatoria nello schema corrente | [schema.prisma](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/prisma/schema.prisma:67>) |
| Orari corretti e origine nelle note | [dischargeTherapy.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/shared/intake/dischargeTherapy.ts:119>) |
| Conferma terapie importate | [confirm-therapies.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/backend/src/intake/confirm-therapies.ts>) |
| Limite di dieci file | [config.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/backend/src/ai/config.ts:118>) e [job-service.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/backend/src/ai/upload/job-service.ts:545>) |
| Ricerca farmaci: limite selettore e informazioni conservate | [CampoFarmaco.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/cartella/CampoFarmaco.tsx:19>) |
| Ricerca farmaci: ritorno per nome prima di filtrare la confezione | [ricerca.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/backend/src/services/farmaci/ricerca.ts:139>) |
| Ordinamento corrente sulle righe caricate | [patientRosterSort.ts](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/lib/patientRosterSort.ts:46>) |
| Consegne e selettore esistenti | [ConsegnePage.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/ConsegnePage.tsx>) e [PatientCombobox.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/shared/PatientCombobox.tsx>) |
| Gruppi paziente in somministrazione | [TherapySlotModal.tsx](<C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/frontend/src/components/operator/TherapySlotModal.tsx>) |

Per PO-01, il CF è già nullable nel database, ma la conferma applicativa lo richiede. La data di nascita è invece obbligatoria nel modello persistente: estendere l’ingresso a nascita sconosciuta richiede una modifica coerente di schema, API e schermate che calcolano l’età, non una data fittizia. Questa differenza deve comparire nel contratto dell’attività.

Prima di sviluppare ogni modulo verificare il percorso reale di persistenza delle scale esistenti: non assumere che basti aggiungere un tab o salvare solo nel browser. Eventuali estensioni backend/schema vanno incluse nello stesso requisito e nelle prove di riapertura.

## 9. Identità dei modelli sorgente

Hash SHA-256 rilevati sui file allegati, utili per distinguere successive revisioni. I documenti originali non sono stati copiati nel repository.

| File | SHA-256 |
|---|---|
| scala PAINAD.pdf | `2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1` |
| MNA.pdf | `67964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa` |
| scala di TINETTI.pdf | `feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6` |
| scala GDS.pdf | `f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709` |
| scheda trasferimenti 1.1-- NEW.docx | `5d5c25cfc322b4f12a6eeba4ac2cf8d4476b15e95c9152cbe09889f0cc75d49f` |
