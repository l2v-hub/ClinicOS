Continua l’evoluzione di ClinicOS.

ClinicOS è un software italiano per gestione socio-sanitaria / clinica.
Gran parte dell’app è già stata implementata: login, ruoli, pazienti, scheda paziente, agenda, operatori, camere, cartella clinica e prime sezioni cliniche.

Questa richiesta NON è una riscrittura completa.
È una evoluzione incrementale della sezione Operatore e della Cartella Clinica Paziente.

Lingua:
Tutta l’interfaccia deve restare in italiano.

Obiettivo generale:
Rendere ClinicOS realmente utilizzabile da operatori sanitari in struttura, soprattutto su tablet, con flussi rapidi per:
- presa in carico paziente
- terapia
- somministrazione farmaci
- parametri vitali
- diario consegne
- area infermieristica
- area fisioterapica
- area medica
- documenti
- scale di valutazione
- contenzioni
- invio in pronto soccorso
- agenda visite

Regole:
- Non riscrivere l’app da zero.
- Non rompere funzionalità esistenti.
- Non modificare backend o Prisma schema se non espressamente richiesto.
- Usa stato locale frontend se le API non esistono ancora.
- Mantieni VITE_API_URL.
- Non reintrodurre localhost hardcoded.
- Mantieni UI tablet-first.
- Ogni sezione deve essere chiara, compilabile, salvabile, stampabile dove necessario.
- Esegui npm run build dopo ogni fase.
- Correggi eventuali errori.