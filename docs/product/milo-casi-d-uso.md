# Milo — casi d'uso e dati di prova

Come provare Milo sui dati sintetici. I dati si creano con `POST /admin/synthetic-data/seed`
(amministratore, solo dove l'ambiente è dichiarato di prova: vedi `docs/synthetic-data-api.md`).
Il seed è ripetibile: rilanciarlo non crea doppioni e riporta le date «all'ultima settimana».

## Dati creati (`backend/src/synthetic/milo-scenarios.ts`)

| Che cosa                   | Dove                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Una settimana di parametri | Bassi (peggiora: febbre, SpO₂ in calo), Ferrioli (pressione in salita), Martini (stabile)   |
| Chi ha registrato          | Mattina: infermiera Laura Bianchi · sera: OSS Marco Rinaldi (entrambi con orario di lavoro) |
| Visita medica e nota       | Dott. Stefano Galli, ieri, a Bassi (visita conclusa + nota del medico nel diario)           |
| Camere                     | Singole 103 e 104, doppia 202, con dimissioni previste nei prossimi giorni                  |
| Terapia appena conclusa    | Ferrioli: Furosemide 25 mg ore 6, 14 e 22 per 5 giorni, finita ieri, inserita da «Medico 1» |

## I cinque casi

1. **«Come va il paziente Bassi, mi dai i valori dell'ultima settimana? Cosa devo controllare?»**
   Andamento della settimana, NEWS2 e il blocco «Da controllare (promemoria da protocollo)»: i
   parametri che pesano sul punteggio, come è cambiato, le misure mancanti. I punti li calcola il
   sistema dal protocollo NEWS2 (RCP 2017), non il modello; non sono una diagnosi.
2. **«Chi ha fatto l'ultima visita e la registrazione dei parametri del paziente Bassi, quali sono
   stati i suoi turni?»** Autore dell'ultima rilevazione, ultima visita, ultima nota del medico e
   gli orari settimanali di quelle persone (gli orari solo a chi può vedere i dati di struttura).
3. **«Quante camere sono occupate e quando si libererà una singola e una doppia?»** Occupazione per
   tipo di camera e prossime liberazioni dalle dimissioni previste.
4. **«Registra del paziente Bassi pressione 130 su 80, ha evacuato, stato vigile, battito 78»**
   Un'unica rilevazione nella pagina Parametri: anteprima con tutti i valori e l'orario, poi
   conferma. Un parametro nominato senza valore («pressione» e basta) o un valore impossibile
   bloccano la conferma. Orario: adesso, oppure «alle 8:30» (oggi).
5. **«Va aggiunto un diuretico ogni 8 ore per 5 giorni e avvisami quando ha completato la terapia»**
   (profilo medico). Milo non prescrive e non sceglie il farmaco: «un diuretico» è una classe, quindi
   chiede farmaco e dose. Con «prescrivi a Ferrioli furosemide 25 mg 1 cpr ogni 8 ore per 5 giorni»
   prepara il testo (orari proposti 06:00, 14:00, 22:00 — configurabili con `MILO_EVERY_8H` — e
   periodo) e il pulsante **Prepara la prescrizione** apre il flusso del medico: anteprima
   strutturata e conferma solo sua. L'avviso è automatico: quando la terapia arriva alla data di
   fine compare il segnale **Terapia completata** fra le novità di Milo, con priorità alta per chi
   l'ha prescritta (segnale `therapy.completed`, finestra `PROACTIVE_THERAPY_COMPLETED_DAYS`, 3 giorni).
   Con i dati di prova il segnale è già visibile al profilo «Medico 1» (terapia di Ferrioli).

## Competenze degli specialisti

Le competenze del team stanno in file con versione, uno per specialista:
`clinicos-ai-runtime/clinicos_ai/skills/{coordinatore,clinico,sorveglianza,struttura}.md`
(`id`, `name`, `version`, `role`, `tools`, istruzioni). La versione usata compare nella risposta
(`team.skills`). Una modifica alle istruzioni è una modifica di versione, verificata sui cinque casi.
