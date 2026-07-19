HOTFIX URGENTE — NON processare la coda GitHub Issues.

Problema:
Nel programma i dati pazienti sembrano spariti, ma il backend contiene ancora i dati.

Verifica già effettuata:
curl -k https://clinicos-backend-production-df88.up.railway.app/patients
restituisce correttamente i dati.

Quindi:

- il database NON è vuoto
- NON fare restore DB
- NON eseguire seed
- NON eseguire prisma migrate reset
- NON eseguire db push --force-reset
- NON modificare Prisma
- NON modificare backend salvo evidenza precisa

Obiettivo:
Ripristinare la visualizzazione dei dati reali nel frontend ClinicOS.

Controlli obbligatori:

1. Verifica quale endpoint usa il frontend per caricare i pazienti.
2. Verifica VITE_API_URL.
3. Verifica se il frontend chiama:
   - /patients
   - /api/patients
   - endpoint errato
4. Verifica mapping della response backend.
5. Verifica se dopo ultimi REQ è stato introdotto mock/local state al posto dei dati reali.
6. Verifica console/network handling e gestione errori.
7. Verifica pagina Pazienti, Scheda Paziente, Diario, Consegne, Parametri.

Comandi utili:
grep -R "VITE_API" frontend/src -n
grep -R "/patients" frontend/src -n
grep -R "api/patients" frontend/src -n
grep -R "mock" frontend/src -n
grep -R "localStorage" frontend/src -n
grep -R "fetch(" frontend/src -n

Regole:

- Il frontend deve usare il backend reale:
  https://clinicos-backend-production-df88.up.railway.app
- I pazienti devono essere caricati da /patients se questo è l’endpoint funzionante.
- Non usare mock come fonte dati.
- Non mascherare errori API con lista vuota.
- Se l’API restituisce dati, la UI deve mostrarli.
- Se l’API fallisce, mostrare errore chiaro.

Test obbligatori:

1. curl backend /patients restituisce dati.
2. frontend mostra lista pazienti.
3. aprendo una scheda paziente i dati sono presenti.
4. refresh pagina mantiene i dati.
5. npm run build passa.

Commit:
HOTFIX: restore frontend patient data loading

Push e deploy:
Dopo build positiva:
git status
git add .
git commit -m "HOTFIX: restore frontend patient data loading"
git push origin HEAD

Non chiudere nessuna GitHub Issue REQ in questo hotfix.
