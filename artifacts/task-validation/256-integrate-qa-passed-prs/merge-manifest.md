# Merge manifest — Integrazione #256

Branch: `integration/issue-256-qa-closure` da `origin/main` @ `7063f5904969`.
Ogni head integrato verificato **identico** alla tabella SHA richiesta (Phase 0, `logs/source-heads.txt`).

| Issue | PR | Head SHA integrato (QA-passed) | Commit di merge `--no-ff` |
|---|---:|---|---|
| #225 Azure config principles | #251 | `b353115370796d225e23a614df5511434d45c8b1` | `603098f8a263` |
| #242 diagnosis/therapy separation | #247 | `e6853b33c1213b4dd1dbc94a48674cb7f252917d` | `2e17eaad461a` |
| #241 therapy weekdays (+ migration) | #250 | `cce880c199abfec8bf2593ee9e9eaba784687708` | `aa66c03b87a2` |
| #243 operational modules | #248 | `6f730bbe77d25e5dfc0b7cfef5800d3ed38337cc` | `2d6484ea9481` |
| #244 allergy state | #249 | `d51ffdbedc415bba991a337437b653472ca3c6e2` | `3bc39442c052` |
| #245 anamnesis deduplication | #252 | `fc8e2ccdc7c2bcf0e1d45196360a691810f1955c` | `5f8445cefd75` |

Ordine di merge: 225 -> 242 -> 241 -> 243 -> 244 -> 245.

## Conflitti risolti (semantici, mai --ours/--theirs)
- `frontend/src/App.css` (merge #243, #244): tenuti tutti i blocchi (#241 weekday, #243 module card, #244 allergy status).
- `frontend/src/components/operator/PatientDetail.tsx` (merge #245): import composto deriveAllergySummary(#244)+LegacyAnamnesisView(#245), rimosso AnamnesisEditor (tab editabile eliminato da #245); TabId ESPORTATO(#243) SENZA 'anamnesi'(#245). Verificato: nessun riferimento residuo, tsc pulito.
- `frontend/src/types.ts`, `frontend/src/App.tsx`: auto-merge pulito (giorniSettimana + AllergyStatus + navigazione moduli coesistono).

## Escluso
**#246 / PR #253** NON integrato — SECURITY ARCHITECTURE BLOCK: nessuna identita' server-verificabile (i document endpoint sarebbero protetti solo da header X-Operator-* falsificabili). Vedi commento su #246 e #253.
