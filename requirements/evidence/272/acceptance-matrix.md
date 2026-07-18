# Acceptance Matrix — Issue #272 (Diario: fetch a base-URL errata)

REQ: la tab Diario della scheda paziente deve caricare le voci dal backend (`:3001`)
usando la stessa base-URL API degli altri tab, invece di puntare a `:5173` (dev server → HTML → parse error).

| # | Criterio | Metodo verifica | Pagina/route | Test | Stato iniziale | Stato finale | Evidenza |
|---|---|---|---|---|---|---|---|
| AC1 | La fetch del diario usa la base-URL API corretta (non `:5173`) | Ispezione codice + network capture | Scheda paziente → tab Diario | manuale/rete | FAIL (`API_URL = import.meta.env.VITE_API_URL || ''` → `''` in dev → `:5173`) | PASS (`import { API_URL } from '../../../config'`) | commit `2aab472`; `network-diary.log` |
| AC2 | La tab Diario carica le voci e NON mostra "Errore nel caricamento del diario" | Playwright runtime | tab Diario | Playwright | FAIL (banner rosso) | PASS (voci renderizzate a card, nessun banner) | `after-desktop.png` |
| AC3 | Le mutazioni (add/edit/delete) usano la stessa base-URL | Network capture | tab Diario | manuale/rete | FAIL | PASS (POST `:3001/…/diary` 201) | `network-diary.log` |
| AC4 | Persistenza dopo reload | Playwright reload | tab Diario | Playwright | n/a | PASS (voci ancora presenti) | `after-desktop-reload.png` |

## Note

- Fix già committato in `2aab472` (sessione corrente) e deployato in produzione.
- Backend smoke test (`data-smoke-before/after.txt`): `/patients` HTTP 200, 18 pazienti — nessuna regressione dati.
- Verifica runtime eseguita avviando Vite **senza** `VITE_API_URL` (fallback dev `:3001` da `config.ts`):
  `GET :3001/patients/<id>/diary` → 200, `POST` → 201.
