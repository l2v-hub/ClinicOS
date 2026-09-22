# Esecuzione del piano approvato

Approvazione: 23 settembre 2026. L'utente conferma l'intero piano, l'esecuzione autonoma senza domande e il deploy delle modifiche verificate.

Baseline: af48e322d3ba99561949f4a7901290e3cace09db. Repository ClinicOS, branch codex/subtle-dashboard-notifications. Le correzioni Parametri e navigazione Terapia sono già pubblicate e vanno preservate.

| Attività | Stato | Evidenza / decisione |
|---|---|---|
| PO-01 Ingresso progressivo | Pubblicato e verificato | Nome/cognome e operatore di presa in carico obbligatori; CF, nascita e telefono mancanti ammessi all'ingresso, necessari alla completezza; valori forniti validati. Migrazione DOB nullable, nessun valore fittizio. |
| PO-02 Correzione orari | Pubblicato e verificato | b405c8ff: 53 test, build, focus desktop/mobile; 16→20 e doppia fascia concordi in bozza/payload/DB/feed. |
| PO-03 Note e origine | In corso | Riprodotta estrazione errata di un orario di controllo nelle somministrazioni; mapper note e parser in correzione. |
| PO-04 Ricerca farmaci | Da eseguire | Catalogo esistente, nessun duplicato |
| PO-05 Scansioni lunghe | Da eseguire | Obiettivo di prova 30 pagine |
| PO-06 Identità e posto letto | Da eseguire | Componente condiviso |
| PO-07 Ordine del reparto | Da eseguire | Ordinamento prima della paginazione |
| PO-08 Consegne dal giro | Da eseguire | Riutilizzare flusso esistente |
| PO-09 Dimissione | Da eseguire | Spostamento della destinazione |
| PO-10 PAINAD e infrastruttura moduli | Da eseguire | Versione, storico e PDF |
| PO-11 Trasferimenti posturali | Da eseguire | Fedeltà al DOCX |
| PO-12 Tinetti | Da eseguire | Verifica fonti; nessun nuovo scoring incerto |
| PO-13 MNA | Da eseguire | Verifica fonte dell'item Q |
| PO-14 GDS-15 | Da eseguire | Scoring delle domande inverse |
| PO-15 Catalogo e storico NRS | Da eseguire | Nessuna conversione delle scale |
| PO-16 Giro completo | Da eseguire | Collaudo tecnico sintetico; distinguere prove effettuabili da osservazione clinica e dispositivi reali |

Una sola attività applicativa attiva; analisi indipendenti possono procedere in parallelo. Ogni worker scrivente usa un worktree isolato. Root integra, valida e pubblica; nessun test scrive su pazienti del sito. Le ricevute di rilascio identificano commit, sorgenti e deploy. Le convalide cliniche richieste dal piano non vengono inventate né attribuite all'utente.
