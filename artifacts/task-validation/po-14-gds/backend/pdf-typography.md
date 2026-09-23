# PO14 — Integrità del testo nei PDF

Il renderer GDS-15 usa istruzione, quindici voci, risposte, punti, risultato, note, avviso sullo screening, provenienza e riferimento bibliografico dello snapshot finalizzato. Non introduce sostituzioni globali o traslitterazione dei dati liberi. Il comportamento tipografico editoriale già pubblicato per MNA rimane invariato.

I font Noto già distribuiti e le dipendenze PDF sono invariati. Non coprono ogni carattere Unicode: un glifo non supportato nei dati liberi produce l'errore esplicito `assessment_pdf_unsupported_glyph`. Finalizzazione, snapshot e relativo hash restano intatti; non viene archiviato un PDF alterato o parziale. Il caso negativo è verificato nel test GDS PDF.

I due PDF GDS di QA contengono tutte le domande e i riferimenti congelati, totale 10 con tutte risposte Sì e totale 5 con tutte No; la versione lunga conserva rettifica e 4000 codepoint di note con accenti, Unicode supportato e a-capo. Sono state ispezionate tutte le 39 pagine degli 11 PDF GDS/MNA/PAINAD/Trasferimenti/Tinetti, senza tagli o sovrapposizioni. La verifica UTF-8 e gli hash dei 66 file sono in `pdf-qa/visual-qa.json`.
