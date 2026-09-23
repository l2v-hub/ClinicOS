# Baseline PO12

Sorgente applicativo PO11 `470a5fe7a7eee4a9b0a0b219947432049b9de977`, root HEAD `9e9f41e6` contiene soltanto la ricevuta successiva. Due prove HTTP su PostgreSQL nativo loopback falliscono come previsto prima dell'integrazione PO12:

1. Creazione `type=tinetti` risponde 400, tipo/versione non supportati.
2. PUT Cartella senza `valutazioniTinetti` rimuove lo storico sintetico esistente; manca la preservazione atomica del ramo.

Log `baseline-tests.log`. Nessun dato del sito coinvolto; cluster della fixture chiuso. Il candidato deve superare le medesime due prove, mantenendo il JSON precedente e archiviando il PDF del nuovo tipo.
