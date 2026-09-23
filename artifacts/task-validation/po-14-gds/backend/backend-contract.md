# PO14 — DTO preparatorio GDS-15

Preparazione soltanto su richiesta root durante il collaudo PO13; nessun codice applicativo o test PO14 prima del GO dopo PO13 pubblicata e verificata. Il task-contract root prevale. Tipo gds15, formVersion gds15-it-2026-09-22-v1, sourceSha256 f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709.

Answers: oggetto stretto q1..q15, ciascuno boolean|null, più notes:string. true=Sì, false=No, null=non risposto. Tutte le quindici chiavi richieste; notes omessa normalizzata a ''. Zero, uno, stringhe, chiavi mancanti/sconosciute rifiutati. Note massimo4000 codepoint Unicode, spazi/a-capo conservati, stessi controlli PO11–13. Parse canonico q1..q15, notes per replay; nessuna risposta dedotta da altri moduli.

History/detail mantengono metadati comuni e aggiungono answeredCount 0..15, completion {complete:boolean,missingPaths:string[]} con q1..q15 nudi e ordinati. Result=null fino a quindici risposte valide; risultato completo:
- total:number (0..15)
- maximum:15
- band:'none'|'mild_moderate'|'severe'
- label:string

Mappa band/label:0–5 none, «Assente / Nella norma»;6–9 mild_moderate, «Depressione lieve–moderata»;10–15 severe, «Depressione grave». Sempre interpretazione dello screening, nessuna diagnosi o terapia automatica. NO=1 per q1/q5/q7/q11/q13; SÌ=1 per le altre. TutteSì=10, tutteNo=5.

Detail bozza: finalSnapshot=null e snapshotSha256=null. Detail finale: snapshot immutabile e SHA256 64hex minuscoli. History omette answers/finalSnapshot/snapshotSha256. Stesse route/create/PATCH/CAS/finalize/replay/current/rettifica/PDF PO10–13; nessuna attestazione.

Snapshot dedicato senza cambiare i vecchi:
- Campi comuni snapshotVersion1, patient, author, assessedAt/createdAt/finalizedAt, predecessorId/predecessor/correctionReason.
- form {type:'gds15',version:'gds15-it-2026-09-22-v1',sourceSha256}.
- instruction:string, contenente risposte del paziente riferite all'ultima settimana, sempre visibile anche in UI prima delle domande.
- items:15 voci in ordine {id:'q1'..'q15',label:string,answer:boolean,score:0|1,description:'Sì'|'No'}.
- result completo della forma sopra.
- notes:string, screeningNote:string, provenance:string, reference:string.

Domande e avvisi congelati dalla fonte, normalizzazione dei soli spazi. screeningNote conserva limite di screening/non diagnosi e indicazione della fonte su deficit cognitivo moderato-severo (es.MMSE<15) e scale etero-somministrate (es.Cornell), senza aggiungere moduli/decisioni automatiche. reference conserva Sheikh/Yesavage1986. Il PDF usa i testi congelati. Hash riproducibile sullo snapshot, indipendente dall'ordine chiavi JSONB per il nuovo tipo; nessun digest già pubblicato viene reinterpretato.

Prove dopo GO:32768 combinazioni, singole inversioni, tutteSì10/tutteNo5, estremi0/15, soglie5/6/9/10, ogni risposta null e domini; lifecycle/scope/CAS/replay/rettifica/PDF e regressioni. Questo documento non afferma implementazione, test o pubblicazione PO14.
