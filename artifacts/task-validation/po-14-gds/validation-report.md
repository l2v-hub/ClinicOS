# PO14 — GDS-15

Il modulo GDS-15 conserva quindici risposte esplicite riferite all'ultima settimana. Il punteggio segue le domande inverse della fonte; il risultato è presentato come screening e non genera diagnosi o terapie. Bozza, anteprima, finalizzazione, rettifica, PDF e archivio riutilizzano il flusso dei moduli pubblicati.

- Backend: 61/61 test in20file, incluse32768 combinazioni, lifecycle/SQL/PDF e regressioni;48migrazioni, build/typecheck/schema/diff superati. Frontend:138 test,32793scenari di parità BE/FE, build, lint18→18 senza nuovi errori e scansione132input senza firme di segreti.
- Root:2/2HTTP/PostgreSQL sulla stessa prova che in baseline rifiutava il tipo; buildBE/FE, font compilati e secret scan superati. Incompletezza bloccante, scope, rettifica, hash dei PDF e Cartella invariata verificati.
- Browser sintetico:30radio inizialmente non selezionati, bozza2/15 salvata con perdita della risposta e ripresa dopo reload; tutteSì10/15, anteprima e finale con retry identico. Rettifica tutteNo5/15, motivo esplicito e data clinica originale conservata. PDF aperto inline, archivio con due documenti e ritorno al record GDS corretto. Salvataggio rallentato di Bruno rimasto su Bruno mentre Anna conserva il finale.
- Stato esportato:2finali,1bozza,2documenti,0attestazioni, tutteCartelle identiche prima/dopo; richieste perse ripetute identiche senza doppioni. Console senza errori/warning.
- Layout390/768/1262 verificato con dimensioni effettive:nessun overflow orizzontale; identità visibile e focus sotto di essa. Screenshot conservati. Rettifica/anteprima/finalizzazione esercitate da tastiera a desktop.
- Renderer compilato:2PDF e4pagine renderizzate/ispezionate integralmente, con15domande, totale, fonti, autore e date leggibili, senza tagli o sovrapposizioni. Font/licenza compilati identici ai sorgenti. Il worker ha verificato11PDF/39pagine anche con note lunghe e moduli precedenti.

Rifiniture incluse: validazione Unicode delle note coerente tra client e server; nome accessibile delle risposte separa Sì/No e punti. L'editor usa un'istruzione contestuale breve; il testo fonte originale resta congelato negli snapshot e nei PDF.

Limiti: collaudo tecnico su dati sintetici e PostgreSQL loopback; nessuna scrittura su pazienti online, prova con operatori clinici o stampa fisica. I caratteri non coperti dai font producono errore PDF esplicito preservando dati/snapshot; nessuna traslitterazione dei campi liberi. Le sei guardie statiche baseline già note non sono dichiarate verdi. Nessuna convalida clinica indipendente attribuita all'utente.

Pubblicazione autorizzata: backend e migrazione prima del frontend, runtime IA invariato. I manifest e il gate identificano gli input verificati.

Controllo whitespace di rilascio limitato ai file non-log, tollerando la sola riga vuota finale della migrazione. I log grezzi conservano spazi dell'output originale per mantenere gli hash delle evidenze; non sono stati riscritti per pulizia estetica. Launcher e board locali restano esclusi dal commit.
