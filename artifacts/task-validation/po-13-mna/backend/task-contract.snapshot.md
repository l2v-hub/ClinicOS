# PO13 — MNA, screening e valutazione completa

Preparazione soltanto; GO dopo PO12 pubblicata/verificata. Utente ha approvato piano e delivery senza altre domande. Root integra/pubblica, worker isolati. Fonte già analizzata: source-text/mna.txt e provenance.md; allegato SHA25667964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa. Tipo `mna`, versione `mna-it-2026-09-22-q-corrected-v1`.

## Contenuto e punteggi

Testo italiano dell'allegato e ordine A–R. Correzioni editoriali soltanto: acuteo→acute o, Oni giorne→Ogni giorno. E mantiene demenza moderata; K mantiene una o due volte la settimana uova o legumi. Q corregge esplicitamente refuso italiano secondo riscontro ufficiale inglese2023: CB<21=0;21≤CB≤22=0,5;CB>22=1. Nessuna convalida clinica indipendente o licenza commerciale inventata; nessun accordo da accettare o contatto terzi.

| Item | Alternative e punti |
|---|---|
| A | Assunzione cibo: grave riduzione0/moderata1/nessuna2 |
| B | Perdita peso>3kg0/non sa1/1–3kg2/nessuna3; non dedurre dal peso attuale |
| C | Letto-poltrona0/autonomo a domicilio1/esce di casa2 |
| D | Malattie acute o stress ultimi3mesi: Sì0/No2 |
| E | Demenza o depressione grave0/demenza moderata1/nessun problema psicologico2 |
| F | IMC<19=0;19≤IMC<21=1;21≤IMC<23=2;IMC≥23=3 |
| G | Vive autonomamente a domicilio: Sì1/No0 |
| H | Più di3medicinali/die: Sì0/No1 |
| I | Decubiti/ulcere: Sì0/No1 |
| J | Pasti completi1=0/2=1/3=2, nessuna categoria aggiunta |
| K | Tre booleani distinti null/Sì/No;0o1Sì=0;2Sì=0,5;3Sì=1 |
| L | Frutta/verdura almeno2volte/die: No0/Sì1 |
| M | Bicchieri/die<3=0;3–5=0,5;>5=1 |
| N | Necessita assistenza0/autonomo con difficoltà1/autonomo senza difficoltà2 |
| O | Malnutrizione grave0/moderata o non sa1/nessun problema2 |
| P | Salute rispetto coetanei: meno buona0/non sa0,5/uguale1/migliore2 |
| Q | CB<21cm0;21–22inclusi0,5;>22cm1 |
| R | CP<31cm0;≥31cm1 |

K conserva risposte a lattiero-caseari almeno1volta/die; uova o legumi una o due volte/settimana; carne/pesce/pollame ogni giorno. Anche se lo score è già prevedibile, una risposta K mancante lascia K incompleto. Server valida alternative e deriva punti, non accetta punteggio finale client. Null distinto da No/zero/non sa, nessuna preselezione clinica; note facoltative massimo4000caratteri. Mezzi punti esatti, preferibilmente aritmetica intera in mezzi punti.

## Antropometria coerente

Misure canoniche nullable: weightKg, heightCm, armCircumferenceCm, calfCircumferenceCm. Valori finiti positivi, unità esplicite, zero/negativi/malformati rifiutati sul campo. Nessuna misura inventata o media sostitutiva. Misure inserite manualmente identificate come dati della valutazione; eventuale data di rilevazione facoltativa distinta dalla registrazione, sconosciuta resta null. Nessun prefill automatico da cartella: se proposto richiede accettazione esplicita e provenienza conservata.

F/Q/R prevedono metodo misurato oppure categoria dichiarata; modalità non contiene una seconda categoria concorrente quando derivata dalle misure. F misurato calcola realmente pesoKg/(altezzaCm/100)^2 e mostra kg/m²; se uno manca, nessun IMC numerico. Categoria F ammessa senza misure o con solo peso/sola altezza; Q/R categoria ammessa senza circonferenza numerica. Non inventare valori rappresentativi degli intervalli.

Quando l'operatore inserisce tutte le misure necessarie, la modalità passa visibilmente al calcolo da misure e la categoria manuale concorrente è rimossa dal payload. Non eliminare misure per far combaciare una categoria; modifica/rimozione input è esplicita. Rifiutare payload che mantengono modalità categoria insieme a un set completo di misure canoniche concorrente. UI spiega che la fascia deriva dalle misure presenti; categoria manuale torna disponibile soltanto quando le misure richieste non sono complete. Soglie su IMC non arrotondato, visualizzazione con precisione sufficiente vicino ai confini. Tutti i valori accettati, modalità e risultati derivati fanno parte dello snapshot/hash.

## Completezza ed esiti

Estensione esplicita `screening|full`, distinta da bozza/finale. Default UI presenta Screening A–F e invito a proseguire; nessuna finalizzazione automatica. Screening massimo14, G–R massimo16, totale massimo30. Ogni risultato incompleto resta null. A–F completi possono mostrare screening anche quando G–R è incompleto, senza un totale a30.

Screening:0–7 malnutrito;8–11 a rischio di malnutrizione;12–14 stato nutrizionale normale. ≤11 invita chiaramente al completamento globale, sempre disponibile anche con12–14. G–R è soltanto subtotale, senza soglie di rischio del totale. Totale A–R completo:<17 cattivo stato nutrizionale;17–23,5 rischio di malnutrizione;24–30 stato nutrizionale normale. Fasce sono interpretazione dello strumento, nessuna diagnosi/trattamento automatico.

Finalizzazione screening richiede A–F completi, titolo Screening MNA e nessun totale a30. Finalizzazione full richiede tuttiA–R inclusi trecampiK. Non eliminare risposte G–R già inserite se si decide di finalizzare solo screening: restano snapshot chiaramente parziali/non incluse nel totale. Successiva valutazione completa è nuovo record o rettifica tracciata, mai modifica del finale precedente.

## Flusso, fonte e PDF

Riutilizzare PO10–12: store per paziente/tipo/sessione, bozze private/CAS/replay, finali immutabili e rettifiche, PDF recuperabile e archivio/deep-link tipato. Non alterare snapshot già pubblicati. Ricalcolo server sulla revisione corrente al finale. Fingerprint comprende risposte effettive, K, misure/metodo/date/estensione, non solo score.

UI progressiva in una scheda con gruppi Screening, Valutazione globale e Misure vicine alle domande pertinenti; identità/focus visibili, nessuna griglia A4 obbligata su mobile. Snapshot/PDF riporta paziente, nascita e sesso da dati autorevoli (mancanti espliciti), età alla data quando calcolabile, misure/unità/provenienza/data disponibile, risposte/score, esiti distinti screening/globale/totale, compilatore e date, versione e Qcorretto.

Conservare MNA®, riferimenti bibliografici della fonte e footer: ® Société des Produits Nestlé, S.A., Vevey, Switzerland, Trademark Owners; © Nestlé,1994, Revision2006.N6720012/9910M; www.mna-elderly.com. Documentare correzioni senza attribuire revisione clinica all'utente.

## Prove

Produzione importata: massimi14/16/30; soglie7/8/11/12 e16,5/17/23,5/24; tutte8combinazioniK e ogni sottorisposta mancante; IMC19/21/23 e lati, altezza/peso mancanti o zero;Q21/22=.5,R31=1; mezzi puntiM/P/Q. Categoria senza misure, solo peso/altezza, inserimento misure dopo categoria/anteprima e rifiuto contraddizioni. Screening parziale/completo, fullparziale/completo e finali distinti senza perditaG–R. Test snapshot/PDF/CAS/replay/scope e regressioni altri moduli. Browser desktop/tablet/mobile e PDF lungo renderizzato/ispezionato, copyright/E/K/Qcorretto visibili. Build/secret scan, manifest/claim release, deploy backend prima frontend e verifica primaPO14.
