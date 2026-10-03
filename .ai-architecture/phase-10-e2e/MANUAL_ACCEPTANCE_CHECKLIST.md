# Phase 10 — Manual acceptance checklist (owner, on a real tablet)

Automated browser checks ran in Chromium with touch emulation (1180×820 and 820×1180). These items
need a human on the real device or a service that is not available locally.

| #   | Check                                                                                                            | Why manual                                       | How                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| M1  | «Vedi documento» next to an imported therapy opens the photo of that letter page                                 | needs the AI document runtime (photo/PDF import) | Nuovo ingresso → Documenti → carica foto lettera → Terapia → «Vedi documento L1» |
| M2  | Document import with a deliberately incomplete page shows the row/field to fix                                   | AI extraction runtime                            | as M1 with a page without the drug dose                                          |
| M3  | Conflicting letters → the drug stays «Dati diversi tra le lettere · resta in bozza», «Crea paziente» still works | real multi-letter conflict                       | two letters with different doses for the same drug                               |
| M4  | Calendar slot tap targets and «Somministra / Non somm.» comfortable with a finger, portrait and landscape        | physical touch                                   | Paziente → Terapia → Calendario                                                  |
| M5  | On-screen keyboard does not hide the diary «Salva» or the therapy form errors                                    | virtual keyboard                                 | Diario → Aggiungi voce; Terapia → Aggiungi farmaco                               |
| M6  | Pull-to-refresh / reload signs the simulator out (known, P10-UX-R2) — decide if acceptable                       | owner decision                                   | reload during a session                                                          |
| M7  | Monthly parameters print (A4) without IP signature columns, DTX 20 present and readable                          | printer                                          | Parametri → scheda mensile → Stampa                                              |
| M8  | Assistant «Apri …» fallback lands on the right section with the real Agno runtime                                | real LLM                                         | Assistente → «apri la terapia di Nanni»                                          |
| M9  | Supervisor reaches the patient list from the KPI tiles and back                                                  | admin shell journey                              | Supervisore → Dashboard → Totale pazienti                                        |
