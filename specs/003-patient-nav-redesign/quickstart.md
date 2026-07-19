# Quickstart: Redesign Navigazione Scheda Paziente Tablet-First

## Avvio

```bash
npm run dev
# Frontend: http://localhost:5173
```

## Verifica build

```bash
npm run build
# Deve completare senza errori TypeScript
```

## Test manuale viewport

Aprire DevTools → Responsive mode:

| Viewport | Descrizione              |
| -------- | ------------------------ |
| 1024×768 | Tablet landscape minimum |
| 1180×820 | iPad Pro portrait        |
| 1440×900 | Desktop                  |

## Workflow test manuale — Gerarchia visiva

### Sidebar L1 (nav-rail)

1. Aprire http://localhost:5173
2. Login
3. Verificare: sidebar sinistra ≤ 64px di larghezza
4. Verificare: icone centrate, label breve sotto
5. Verificare: item attivo ha active state forte e distinguibile dagli altri
6. Verificare: nessun overflow orizzontale globale

### Header paziente

7. Selezionare un paziente
8. Verificare: altezza header paziente ≤ 80px
9. Verificare: back button integrato nell'header, non in riga separata
10. Verificare: nessun breadcrumb "Pazienti › Nome" duplicato visibile

### Navigazione L2 (PageTabs)

11. Nella Scheda Paziente — verificare: la barra L2 (Panoramica / Clinica / ...) è visivamente dominante
12. Verificare: tab L2 più grandi e più pesanti di L3
13. Verificare: tab attivo L2 ha active state forte (card bianca con shadow o fill solido)
14. Cliccare ogni tab L2 → contenuto cambia correttamente
15. Verificare: tutti i 5 tab visibili senza scroll su 1024px

### Navigazione L3 (SectionTabs)

16. Cliccare "Clinica"
17. Verificare: SectionTabs L3 appaiono — dimensione visivamente più piccola e leggera di L2
18. Verificare: active state L3 meno vivace/più subordinato di L2
19. Cliccare ogni sotto-tab L3 → contenuto cambia correttamente
20. Cliccare "Diario" → verificare che L3 NON appaia (gruppo con 1 solo tab)
21. Su 1024px con Clinica aperta → verificare scroll orizzontale L3 se non entra, ma NESSUN overflow globale

### Spazio contenuto

22. Verificare: il primo blocco di contenuto clinico inizia più in alto rispetto al layout pre-feature
23. Verificare: meno spazio vuoto tra navigazione e contenuto

### Regressioni

24. Verificare: tutti i tab L2 e L3 navigano al contenuto corretto
25. Verificare: form di aggiunta/modifica (diagnosi, terapia, parametri) si aprono e salvano
26. Verificare: sidebar L1 naviga correttamente tra macro-aree (Agenda, Consegne, etc.)

## Criteri di successo rapido

- [ ] Sidebar ≤ 64px, active state forte
- [ ] Header paziente ≤ 80px, back integrato, nessuna duplicazione breadcrumb
- [ ] L2 visivamente dominante rispetto a L3
- [ ] L3 visivamente subordinato rispetto a L2
- [ ] Nessun overflow orizzontale su 1024×768
- [ ] npm run build senza errori TypeScript
- [ ] Tab L2 e L3 navigano correttamente
