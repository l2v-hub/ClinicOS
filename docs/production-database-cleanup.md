# Pulizia del database di produzione e del sito pubblico

Il database Railway **`production`** è stato pulito il **15 ottobre 2026**, conservando accessi e configurazione della RSA. Il sito pubblico, però, usa il backend di un ambiente **`demo` distinto**, che contiene ancora pazienti. La pulizia della versione online non è completata: il token disponibile rifiuta l'accesso a `demo`. Risultati, backup, riscontro sul sito e collegamento mancante sono in [production-patient-cleanup-2026-10-15.md](production-patient-cleanup-2026-10-15.md).

È stato utilizzato il token Railway di progetto già presente nei workflow GitHub, avviando un job isolato nella rete privata. Non occorre copiare credenziali in chat, Git o nell'ambiente locale. L'API nativa ha consentito la manutenzione con il token esistente; `railway link` richiedeva invece un'autorizzazione diversa. Il rifiuto TLS del collegamento pubblico non è stato aggirato disabilitando la verifica.

## Inventario disponibile

Lo script seguente è pronto e verificato su PostgreSQL locale sintetico:

```bash
node scripts/maintenance/production-db-inventory.mjs \
  --expected-host=HOST_VERIFICATO \
  --expected-database=DATABASE_VERIFICATO
```

Legge soltanto `CLINICOS_PRODUCTION_DATABASE_URL`, confronta host e database, verifica l'identità con PostgreSQL ed esegue i conteggi in una transazione `REPEATABLE READ READ ONLY`. Non stampa credenziali, pazienti o documenti. Non effettua eliminazioni. Rifiuta identità inattese e argomenti non supportati; gli errori del driver sono ridotti al codice per evitare URL nei log.

## Controlli per una futura manutenzione richiesta

1. Verificare destinazione e conteggi reali con l'inventario; collegare il target al backend distribuito, senza inferirlo dalla sola distribuzione frontend Vercel.
2. Definire l'elenco esatto di record/tabelle da eliminare e quelli da preservare. Per soli dati di prova servono identificativi o un criterio verificabile; i nomi dei pazienti non bastano.
3. Preparare un nuovo backup PostgreSQL consistente in archivio riservato e durevole, comprendendo blob/documenti esterni eventualmente referenziati. Verificarne il ripristino in un ambiente isolato e conservare un riferimento utilizzabile per il recupero. Verificare il montaggio del volume e l'accessibilità dei file da un nuovo container; un percorso nel filesystem effimero non attesta la persistenza.
4. Sospendere nuove scritture e worker di importazione per la finestra di manutenzione. Verificare vincoli, tabelle dipendenti e stato delle migrazioni; non usare indiscriminatamente `TRUNCATE ... CASCADE` o il seed locale.
5. Applicare in transazione soltanto la selezione concordata, registrando conteggi senza contenuti clinici. Per un reset totale preservare schema e storia migrazioni; pianificare il ripristino degli accessi prima dell'apertura del sistema.
6. Ripetere inventario e controlli dei vincoli, verificare conteggi zero delle entità selezionate e corrispondenza dei dati preservati. Verificare readiness, login e configurazione della struttura; non inserire pazienti sintetici nel database appena pulito.

Il risultato va attestato con target, perimetro, riferimento backup, conteggi prima/dopo e controlli di accesso. In assenza di questi elementi non dichiarare la produzione pulita.

La procedura del 15 ottobre ha anche verificato il rollback dopo un errore simulato e la pulizia completa sul clone ripristinato. Ha bloccato le scritture durante la transazione, confrontato il contenuto dei dati preservati e mantenuto attivi i foreign key. I servizi temporanei sono stati rimossi conservando il volume privato del backup scollegato. Non ripetere automaticamente una cancellazione già completata; installazione e avvio locali non devono effettuare manutenzione produttiva.

Per completare la richiesta già autorizzata, usare un collegamento all'ambiente `demo` che espone `clinicos-backend-demo.up.railway.app`, ad esempio un token di progetto limitato a `demo` nel segreto GitHub `RAILWAY_DEMO_TOKEN`. Verificare nuovamente target e backup prima della cancellazione. Non sostituire il token `production`, non cambiare il backend del frontend per nascondere i dati e non chiedere nuovamente il consenso alla pulizia già richiesta: manca il collegamento tecnico al database corretto.
