-- Indici additivi per i due filtri a colonna singola oggi non coperti: le terapie attive
-- (GET /therapy-slots filtra sul solo "stato") e gli appuntamenti di giornata (filtri sul solo
-- "scheduledAt", che gli indici compositi esistenti non possono servire come leading column).
-- Solo CREATE INDEX: nessuna riga esistente viene modificata.

CREATE INDEX "PatientTherapy_stato_idx" ON "PatientTherapy"("stato");

CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
