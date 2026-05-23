# Quickstart: Navigazione Tablet-First

## Avvio

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001 (non coinvolto in questa feature)
```

## Verifica build

```bash
npm run build
# Deve completare senza errori TypeScript
```

## Test manuale viewport (golden path)

Aprire DevTools → Responsive mode e testare questi viewport:

| Viewport | Descrizione |
|----------|-------------|
| 1024×768 | Tablet landscape minimum |
| 1180×820 | iPad Pro portrait |
| 1366×1024 | Tablet grande |

## Workflow test manuale

### Scheda Paziente (priorità massima)

1. Aprire http://localhost:5173
2. Login → selezionare un paziente
3. Verificare: la pagina mostra **tab orizzontali** (Panoramica, Clinica, Diario, Moduli, Documenti) **sotto l'header** — non una sidebar a sinistra
4. Verificare: nessuna seconda colonna sidebar a sinistra del contenuto
5. Cliccare "Clinica" → i tab interni (Presa in Carico, Anamnesi, Diagnosi…) appaiono come sotto-tab orizzontali compatti
6. Verificare: il contenuto occupa tutta la larghezza disponibile dopo la sidebar L1
7. Ridimensionare a 1024px → verificare che i tab siano scrollabili orizzontalmente se non ci stanno tutti

### Agenda

8. Navigare a Agenda
9. Verificare: nessuna second sidebar — il contenuto è full-width dopo la sidebar L1

### Admin

10. Login come admin → Dashboard
11. Verificare: navigazione admin usa lo stesso pattern (tab orizzontali se ci sono sotto-sezioni)

## Criterio di successo rapido

- [ ] Nessuna `.cr-sidebar-nav` visibile in PatientDetail
- [ ] Tab orizzontali visibili in PatientDetail su tutti i viewport target
- [ ] Build senza errori TypeScript
- [ ] Funzionalità esistenti non rotte (dati, form, CRUD)
