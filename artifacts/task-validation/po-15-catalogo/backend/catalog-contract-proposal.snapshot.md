# PO15 — contratto aggregato da fissare al GO

Proposta preparatoria root, nessuna API implementata. Prima di scrivere client/server, i worker confermano o correggono questo DTO nello stesso file di contratto. Il task-contract resta autorevole.

`GET /patients/:patientId/assessments/catalog`, senza parametri query. Una sola richiesta, controllo patientScope esistente, risposta privata/no-store. Route registrata prima del parametro assessmentId.

Risposta proposta `{items:[...]}` in ordine painad, postural_transfers, tinetti, mna, gds15. Ogni elemento:

- `type`, `formVersion` correnti implementati;
- `latestFinal`: null oppure `{id, formVersion, assessedAt, createdAt, finalizedAt}`;
- `ownDraftCount`: intero esatto prima di qualsiasi limite;
- `latestOwnDraft`: null oppure `{id, formVersion, assessedAt, createdAt, updatedAt}`.

Nessuna risposta, snapshot, punteggio, contenuto documento o PDF. Lo stato finale/bozza è dato dal campo contenitore; non inferire che una bozza sia una valutazione completata. Le tre schede legacy leggono la Cartella già caricata.

Il finale è la testa terminale più recente per assessedAt/createdAt/id, come currentAssessment; solo una figlia finale esclude il predecessore. La bozza è soltanto dell'operatore corrente, più recente per updatedAt/createdAt/id. I conteggi non espongono bozze di colleghi. Lettura dei metadati in una query SQL con selezione esplicita, oltre alle verifiche di accesso.

Controlli di integrazione previsti: cinque tipi esatti, payload minimale, caso vuoto, sola bozza propria, bozza altrui invisibile, terminale contro rettifica tardiva, ricaricamento dopo finale, scope e query extra rifiutata. UI può mostrare subito nomi/azioni mentre i metadati sono in caricamento; un errore richiede stato e Riprova, senza mostrare 'nessuna compilazione'.
