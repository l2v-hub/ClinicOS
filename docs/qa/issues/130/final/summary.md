# Issue #130 — Evidenze E2E (voce operativa via Agnos)

Eseguito: 2026-07-04T12:31:33.534Z — **22/22 PASS**

Provider vocale SIMULATO (stub SpeechRecognition, stesso pattern di e2e/agnos-cru.mjs);
la trascrizione appare nel campo testo (modificabile) e il comando viaggia con channel=voce.

| Check | Esito | Dettaglio |
|---|---|---|
| setup: paziente pilota Moretti, Elena presente | PASS |  |
| AC1a. voce: trascrizione visibile e modificabile nel campo | PASS | Aggiungi una consegna per Elena Moretti: controllare la pressione dopo cena |
| AC1b. preview leggibile: titolo, paziente e testo consegna | PASS |  |
| AC1c. consegna salvata nel backend (stesso service della UI) | PASS | cmr6ccl8n0000dsei3afk0ogj |
| AC1d. consegna collegata al paziente giusto | PASS |  |
| AC1e. consegna visibile nella UI consegne senza reload | PASS |  |
| AC1f. consegna persistente dopo refresh | PASS |  |
| AC2a. voce: trascrizione diario nel campo | PASS | Scrivi nel diario di Elena Moretti: paziente tranquillo, nessun dolore riferito |
| AC2b. nota diario salvata e visibile nella sezione Diario | PASS |  |
| AC3a. voce: trascrizione parametri nel campo | PASS | registra per Elena Moretti la pressione 120 su 80 alle 17 |
| AC3b. parametro 120/80 salvato nella cartella (persistito) | PASS |  |
| AC3c. parametro visibile nella sezione corretta senza reload | PASS |  |
| AC4a. voce: trascrizione appuntamento nel campo | PASS | crea appuntamento fisioterapia domani alle 09:30 per Elena Moretti |
| AC4b. appuntamento creato e persistito in agenda | PASS |  |
| AC5. senza conferma esplicita non viene salvato nulla | PASS | 7 → 7 |
| AC6a. delete via VOCE rifiutato | PASS |  |
| AC6b. delete via CHAT rifiutato | PASS |  |
| AC6c. nessun dato cancellato dai tentativi | PASS |  |
| AC7a. catalogo: 0 azioni delete su 8 | PASS | read:read, create_vital_sign:create, update_patient_demographics:update, update_narrative_section:update, add_diary_note:create, create_appointment:create, update_appointment:update, create_consegna:create |
| AC7b. create_consegna presente nel catalogo (kind create) | PASS |  |
| AC7c. audit: create_consegna eseguita con channel=voce | PASS |  |
| AC7d. audit: rifiuti delete tracciati (refused_delete) | PASS |  |

## Screenshot
- `before.png` — PRIMA del fix: comando consegna mal interpretato (create_vital_sign ambiguo)
- `after-consegna-preview.png` / `after-consegna-salvata.png` / `after-refresh.png` — AC1
- `ac2-diario-preview.png` / `ac2-diario-salvato.png` — AC2
- `ac3-parametri-preview.png` / `ac3-parametri-salvato.png` — AC3
- `ac4-appuntamento-preview.png` / `ac4-appuntamento-salvato.png` — AC4
- `ac5-conferma-obbligatoria.png` — AC5 (Annulla → nessuna scrittura)
- `ac6-delete-voce.png` / `ac6-delete-chat.png` — AC6