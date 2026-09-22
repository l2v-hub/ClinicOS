# PO-02 — Correzione degli orari e recupero degli errori

Baseline applicativa: 6095ce3975fa32dcc49e235f99e5b9dd9a3353ec. Decisione ALLOW: piano approvato dall'utente, implementazione frontend isolata e integrazione/test a cura di root. Nessuna mutazione di pazienti live, nessun cambiamento dei permessi clinici.

La revisione iniziale non dimostra un difetto residuo di persistenza dell'orario: PO-01 serializza i salvataggi e conferma lo snapshot corrente. Dimostra invece errori piatti senza destinazioni di correzione.

Accettazione: modificare nella UI una Lasix sintetica da 16:00 a 20:00; verificare esplicitamente OCR e accettazioni; confermare mantenendo dose, via, quantità, giorni e decorrenza. Il DB e il feed devono contenere solo il nuovo orario. Ripetere con 08:00 invariato. Conservare bozza dopo ricarica e durante autosalvataggio/conferma immediata.

Gli errori devono essere accanto ai campi, associati accessibilmente e raggiungibili dal riepilogo. Destinazione stabile per origine import/manuale, indice sorgente, campo e fascia; righe escluse non devono spostare le destinazioni. Modificare un orario non equivale a verificare OCR.

Ownership: agente frontend unico writer in worktree po02-intake-feedback; root unico writer in subtle-dashboard-notifications per fixture, integrazione e prove. Porta locale 4184 per dati sintetici; nessuna scrittura sul sito. Test pertinenti e build prima del rilascio autorizzato.
