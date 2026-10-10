# Preparazione della pulizia del database di produzione

L'utente ha richiesto esplicitamente la pulizia della **produzione**. Questo ambiente dispone di database locali sintetici e accesso GitHub; non dispone ancora del collegamento al database produttivo. `CLINICOS_PRODUCTION_DATABASE_URL` è dichiarata nella bozza delle impostazioni dell'ambiente: il valore va inserito privatamente, mai in chat, Git o log. La bozza salvata non applica da sola credenziali o modifiche alla produzione.

È inoltre pendente la scelta dei dati da conservare: soli dati clinici di prova, tutti i dati clinici mantenendo accessi/configurazione/cataloghi, oppure intero contenuto compresi accessi e configurazione. Il database produttivo è stato indicato; questa scelta riguarda il contenuto dell'eliminazione, non una nuova autorizzazione generale.

## Inventario disponibile

Lo script seguente è pronto e verificato su PostgreSQL locale sintetico:

```bash
node scripts/maintenance/production-db-inventory.mjs \
  --expected-host=HOST_VERIFICATO \
  --expected-database=DATABASE_VERIFICATO
```

Legge soltanto `CLINICOS_PRODUCTION_DATABASE_URL`, confronta host e database, verifica l'identità con PostgreSQL ed esegue i conteggi in una transazione `REPEATABLE READ READ ONLY`. Non stampa credenziali, pazienti o documenti. Non effettua eliminazioni. Rifiuta identità inattese e argomenti non supportati; gli errori del driver sono ridotti al codice per evitare URL nei log.

## Operazione da completare dopo i prerequisiti

1. Verificare destinazione e conteggi reali con l'inventario; collegare il target al backend distribuito, senza inferirlo dalla sola distribuzione frontend Vercel.
2. Definire l'elenco esatto di record/tabelle da eliminare e quelli da preservare. Per soli dati di prova servono identificativi o un criterio verificabile; i nomi dei pazienti non bastano.
3. Preparare un backup PostgreSQL consistente in archivio riservato e durevole, comprendendo blob/documenti esterni eventualmente referenziati. Verificarne il ripristino in un ambiente isolato e conservare un riferimento utilizzabile per il recupero. Nessun backup produttivo è stato ancora creato o attestato.
4. Sospendere nuove scritture e worker di importazione per la finestra di manutenzione. Verificare vincoli, tabelle dipendenti e stato delle migrazioni; non usare indiscriminatamente `TRUNCATE ... CASCADE` o il seed locale.
5. Applicare in transazione soltanto la selezione concordata, registrando conteggi senza contenuti clinici. Per un reset totale preservare schema e storia migrazioni; pianificare il ripristino degli accessi prima dell'apertura del sistema.
6. Ripetere inventario e controlli dei vincoli, verificare conteggi zero delle entità selezionate e corrispondenza dei dati preservati. Verificare readiness, login e configurazione della struttura; non inserire pazienti sintetici nel database appena pulito.

Il risultato va attestato con target, perimetro, riferimento backup, conteggi prima/dopo e controlli di accesso. In assenza di questi elementi non dichiarare la produzione pulita.
