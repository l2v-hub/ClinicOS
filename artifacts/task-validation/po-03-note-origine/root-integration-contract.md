# PO-03 — Prova integrata

Decisione ALLOW nell'autorizzazione al piano PO. Root scrive esclusivamente test/evidenze nel worktree principale; worker unico scrivente nel worktree po03-therapy-notes. Nessuna modifica di dati storici, nessuna scrittura su pazienti live.

Baseline b405c8ff: il test isolato intake-notes-origin.test.mts fallisce perché una clausola di controllo PA alle 22:00 diventa un secondo orario di somministrazione. Candidato atteso: solo 08:00 programmato; istruzione di controllo nelle note, fonte originale conservata separatamente.

Test con PGlite locale prima dell'importazione Prisma: parser → mapper frontend → bozza revisionata → conferma → DB/feed → archivio PDF → reinvio. Verificare fonte immutata, riferimento alla terapia, una sola prescrizione e un solo documento dopo retry. Il PDF sintetico verifica conservazione byte, non fedeltà tipografica.

Nessuna variazione alla UI di revisione o ai permessi; mantenere diagnostiche e salvaguardie di PO-01/02. Build frontend/backend e test focalizzati prima della pubblicazione della sorgente identificata, backend prima del frontend.
