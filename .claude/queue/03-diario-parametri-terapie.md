Implementa la Fase 3: Diario infermieristico, Diario medico, Parametri vitali e Terapia medica.
Deve sembrare un modulo dichiarativo.

Layout:
- titolo centrale: Liberatoria di uscita
- sezione dati:
  - sottoscritto/a
  - nato/a
  - referente dell’ospite
  - ospite/paziente
- testo dichiarativo generico, non copiato letteralmente dal modulo
- firma ospite/referente
- tabella registro uscite con colonne:
  - Data uscita
  - Ora
  - Firma ospite/referente
- molte righe vuote per stampa
- nota: modulo da usare solo in caso di uscita con parenti / referente

Questi moduli devono evolvere la cartella clinica già presente in ClinicOS.
Tutto deve essere in italiano.
Non riscrivere l’app.

Deve sembrare un registro a righe.

Layout:
- titolo: Diario medico
- intestazione:
  - paziente
- tabella/registro con:
  - data
  - nota medica
  - prescrizione/indicazione
  - firma medico

La nota deve essere ampia.
La stampa deve sembrare un diario medico cartaceo ordinato.

1. Diario infermieristico / Consegne
Questa è una sezione centrale per l’operatore.

Campi:
- data
- turno:
  - mattina
  - pomeriggio
  - notte
- nota/consegna
- priorità:
  - normale
  - alta
  - urgente
- stato:
  - aperta
  - in corso
  - completata
- collegamento a:
  - terapia
  - medicazione
  - parametro
  - evento
  - appuntamento
- operatore
- sigla/firma
- filtri:
  - data
  - turno
  - priorità
  - operatore
- stampa diario

2. Diario medico
Campi:
- data
- nota medica
- prescrizione/indicazione
- evoluzione clinica
- medico
- firma medico
- allegati/referti collegati
- stampa diario medico

3. Parametri vitali
Crea una griglia mensile digitale.

Campi:
- mese/anno
- giorni 1-31
- pressione arteriosa
- frequenza cardiaca
- SpO2
- evacuazione
- catetere
- DTX 08:00
- DTX 12:00
- DTX 18:00
- temperatura
- firma IP mattina
- firma IP pomeriggio
- note
- stampa scheda mensile parametri

4. Terapia medica
Crea una sezione terapia chiara e centrale.

Sezioni:
- dati paziente
- camera
- patologia d’ingresso
- allergie
- diabetico sì/no
- ipertensione sì/no
- terapia triturata sì/no

Tabelle:
- terapia orale
- terapia IM/SC
- terapia insulinica
- terapia al bisogno

Ogni riga terapia:
- data inizio
- farmaco/terapia
- dosaggio
- via di somministrazione
- medico
- orari 08:00 / 12:00 / 16:00 / 18:00 / 20:00
- data fine
- note
- stato:
  - attiva
  - sospesa
  - completata
- stampa scheda terapia

UX:
- Diario infermieristico e Terapie devono essere molto visibili.
- Le terapie attive devono essere subito riconoscibili.
- Le terapie concluse devono rimanere nello storico.
- Tutto deve essere editabile, espandibile e stampabile.

Usa stato locale frontend.
Non modificare backend.
Non modificare Prisma.
Esegui npm run build e correggi errori.

