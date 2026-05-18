# Quickstart: Terapia Farmacologica e Agenda

## Prerequisiti

- Node.js ≥ 20, npm ≥ 10
- Docker / Podman con PostgreSQL su `localhost:5432` (sviluppo locale)
- Variabile `DATABASE_URL` nel file `backend/.env`
- Variabile `VITE_API_URL` nel file `frontend/.env` (es. `http://localhost:3001`)

## Avvio in sviluppo

```bash
# Root del monorepo
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Verifica API terapie

```bash
# Lista terapie di un paziente
curl http://localhost:3001/patients/<PATIENT_ID>/therapies

# Crea terapia (esempio)
curl -X POST http://localhost:3001/patients/<PATIENT_ID>/therapies \
  -H "Content-Type: application/json" \
  -d '{"farmacoNome":"Paracetamolo","dosaggio":"500mg","dataInizio":"2026-05-18","fasceMattina":true}'

# Slot agenda per oggi
curl "http://localhost:3001/therapy-slots?date=2026-05-18"
```

## Verifica build

```bash
npm run build
# Deve completare senza errori TypeScript in frontend/ e backend/
```

## Verifica Deploy (Railway)

```bash
# Usa VITE_API_URL puntato al backend Railway
# NON usare localhost per verifiche su Railway/Vercel
VITE_API_URL=https://<railway-backend>.railway.app curl $VITE_API_URL/health
```

## Workflow test manuale (golden path)

1. Aprire `http://localhost:5173`
2. Selezionare un paziente esistente
3. Navigare al tab **Clinica → Terapia Farmacologica**
4. Verificare che esista UNA SOLA sezione "Terapia Farmacologica" (no duplicati)
5. Aggiungere un farmaco con fascia "Mattina" e stato "Attiva"
6. Ricaricare la pagina → il farmaco deve essere ancora presente
7. Aprire l'Agenda
8. Cliccare sullo slot "Terapia Mattina"
9. Verificare che la popup mostri il paziente con il farmaco appena inserito
10. Cliccare "Erogata" → confermare
11. Ricaricare la pagina → riaprire la popup → lo stato deve essere "Erogata"
12. Verificare che un paziente senza terapia "Mattina" non appaia nella popup
