# Revisione delle vie di somministrazione ambigue (#406)

“Al bisogno”, “periodica” e “una tantum” descrivono il tipo di terapia, non la via.
L'app non converte automaticamente le prescrizioni già registrate.

Per un dato preesistente o importato con un regime nel campo Via:

1. Il medico confronta la terapia con la prescrizione originale.
2. Nella modifica seleziona la via effettivamente prescritta e verifica esplicitamente il Tipo terapia.
3. Controlla dosaggio, note e programmazione nel riepilogo prima del salvataggio.
4. Se la prescrizione non chiarisce la via, non inventarla: richiedere il chiarimento clinico.

Il campo Via mostra “da verificare”; il valore originale resta nei dati finché non viene corretto.
L'API rifiuta modifiche parziali che lasciano questa ambiguità. Per sicurezza consente una
richiesta contenente soltanto `stato: sospesa` o `stato: conclusa`, senza riscrivere
via, tipo, schema glicemico o dose. La riattivazione richiede la revisione esplicita.
Permessi e perimetro paziente restano invariati. Nessuna migrazione o scansione dei pazienti
reali è stata eseguita per questa correzione.
