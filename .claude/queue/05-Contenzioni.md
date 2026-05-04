Implementa la Fase 4: Scheda parametri multipaziente.

Obiettivo:
L’operatore deve poter aprire una scheda parametri che mostri tutti i pazienti in righe, così da inserire rapidamente i parametri vitali per tutti.

Non modificare backend o Prisma.
Usa stato locale frontend.
Mantieni tutto in italiano.
Esegui npm run build.

Requisiti:

1. Nuova vista “Parametri”
Dalla sezione operatore deve essere possibile aprire una vista:
“Parametri pazienti”.

Questa vista deve mostrare tutti i pazienti in elenco.

Ogni riga paziente deve mostrare:
- nome paziente
- camera / letto
- pressione arteriosa
- saturazione
- frequenza cardiaca
- temperatura
- glicemia / DTX
- evacuazione
- note rapide
- ora rilevazione
- operatore

2. Compilazione rapida
L’operatore deve poter compilare i parametri direttamente nella tabella.

Campi principali:
- pressione
- saturazione
- frequenza
- temperatura
- evacuazione
- glicemia/DTX

3. Righe più larghe e touch-friendly
Le righe devono essere più alte rispetto a una tabella normale.
Gli input devono essere comodi da usare su tablet.

4. Salvataggio
Prevedi:
- salva riga
- salva tutto
- annulla modifiche
- evidenzia righe modificate

5. Collegamento scheda paziente
Cliccando sul nome paziente si deve aprire la scheda paziente.
Cliccando su un parametro si deve poter vedere o modificare il dettaglio se previsto.

UX:
- niente scroll orizzontale globale
- se la tabella è larga, usa layout responsive o griglia a card su tablet
- intestazione chiara
- colonne leggibili
- colori sobri