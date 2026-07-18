# Visual Verification — Issue #272 (Diario)

Requisito funzionale (non pixel): la tab Diario deve caricare i dati dal backend, senza il
banner d'errore "Errore nel caricamento del diario".

## Iterazione unica (fix già applicato in `2aab472`)

- **PASS** — La tab Diario renderizza le voci come card (una per voce, con badge ruolo, autore, ora,
  testo). **Nessun banner rosso "Errore nel caricamento del diario".**
- Differenze residue: nessuna.
- Elemento verificato: fetch `GET :3001/patients/<id>/diary` → 200 JSON (prima: `:5173` → HTML → parse error).
- Criterio issue coperto: sì (la tab carica i dati dalla stessa base-URL degli altri tab).

Prova runtime prodotta avviando Vite **senza** `VITE_API_URL` (per dimostrare che il fallback dev
`:3001` di `config.ts` è quello che risolve il bug, non un workaround d'ambiente).

Evidenze:
- `after-desktop.png` — tab Diario con voci a card, nessun errore.
- `after-desktop-reload.png` — persistenza dopo reload.
- `network-diary.log` — `GET :3001/…/diary` 200, `POST` 201.

Verdetto visual reviewer: **PASS**.
