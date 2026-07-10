# Validation report — Issue #256 (integrazione QA-passed PRs)

**Final Decision: READY FOR CODEX QA**

Branch `integration/issue-256-qa-closure` da `origin/main` @ `7063f59`. 6 PR QA-passed integrate con merge `--no-ff`, head verificati identici alla tabella SHA. **#246 escluso** (SECURITY ARCHITECTURE BLOCK). Dati sintetici, nessun PHI/secret.

## Esito AC

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 head integrati senza estranei | PASS | `merge-manifest.md`, `logs/source-heads.txt` (7/7 MATCH) |
| AC2 PatientDetail: comportamenti coesistono | PASS | merge semantico + `tsc -b` No errors + A–E 5/5 |
| AC3 migration #241 empty + upgrade | PASS | `logs/migration-241.txt` (rigenerato 2026-07-11): DB da `TEMPLATE template0`, **PRE=0 tabelle → POST=19 migration applicate + 25 tabelle** (19 nomi elencati, incl. `20260708120000_therapy_giorni_settimana`); `giorniSettimana` NULLABLE; upgrade pre-#241 (18→19) → terapia storica intatta con `giorniSettimana=NULL` (ogni giorno). NB: la summary CLI di prisma `"N migration(s) deployed"` è fuorviante su questo runner — la prova è lo stato reale del DB, non lo stdout. |
| AC4 build/test integrati | PASS | `logs/build.txt` (BE+FE exit 0); `logs/tests.txt` (backend 316/316 + giorni 3/3 + parse 20/20 + allergy 13/13 + legacy 6/6) |
| AC5 Playwright A–E | PASS | **5/5** su stack integrato; `test-results/` (trace+video+screenshot), `playwright-report/` |
| AC6 CI risolta o blocco esterno | PASS (blocco esterno documentato) | `logs/ci-disposition.md`: GitHub Actions **billing block** (steps=0), esterno, non repo-fixable; NON dichiarato verde |
| AC7 #246 escluso senza authn/authz | PASS | escluso; SECURITY ARCHITECTURE BLOCK su #246/#253 |
| AC8 nessun secret/PHI | PASS | `logs/privacy-secret-scan.txt`: solo seed sintetici |
| AC9 PR integrata READY FOR CODEX QA | PASS | PR aperta; nessuna chiusura/merge/label Codex |

## Scenari Playwright integrati (una sola stack)
- A #241: terapia periodica Lun/Mar/Gio/Dom → PUT canonicalizzato → pill persiste dopo reload. **PASS**
- B #242: diagnosi + terapia salvate → reload → farmaco assente dalla diagnosi, diagnosi assente dalla terapia. **PASS**
- C #243: intake → Scala Braden allo step 4 → creazione → scheda su gruppo Moduli, tab Scala Braden, contenuto reale. **PASS**
- D #244: `paziente_nega`/`assenti` coerenti nel riepilogo, stati contraddittori bloccati, nessun lost-update. **PASS**
- E #245: anamnesi legacy read-only raggiungibile dopo rimozione tab duplicato, persiste dopo reload. **PASS**

## Note
- La spec #242 è stata resa robusta all'accumulo dati nel DB condiviso (nomi sintetici unici per run + `.first()`); nessuna modifica al prodotto.
- Migration #241 additiva/nullable: un rollback (`git revert` del merge) non fa auto-`down`; la colonna `giorniSettimana` resterebbe (innocua) — nessuna perdita di dati clinici.
- `CLOSED — VERIFIED` è timbro di Codex post-verifica indipendente (handoff #239): non scritto da Claude.

Claude non chiude, non mergia, non deploya, non applica label Codex. Codex resta l'unico QA Gatekeeper.
