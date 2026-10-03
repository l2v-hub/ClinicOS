#!/usr/bin/env bash
# QA gate runner: fresh synthetic DB qauxb before each suite, QA stack 3105/5205 only.
SP="C:/Users/Claudio/AppData/Local/Temp/claude/C--Workspace-ClinicOSHouse/f84014ec-eb79-4a59-b38b-751a95f0fbeb/scratchpad"
ROOT=/c/Workspace/ClinicOSHouse-worktrees/qa-ux
OUT=${OUT:-$ROOT/artifacts/task-validation/ux-direct-access-cycle/qa/e2e}
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54339/qauxb
export FRONT=http://127.0.0.1:5205 API=http://127.0.0.1:3105
mkdir -p "$OUT"
reset() {
  (cd "$SP/pg" && node mkdb.mjs qauxb >/dev/null)
  (cd $ROOT/backend && ../node_modules/.bin/prisma migrate deploy --config=../prisma.config.ts >/dev/null 2>&1)
  (cd $ROOT && node_modules/.bin/tsx scripts/assistant/seed-assistant-demo.mts >/dev/null && node_modules/.bin/tsx scripts/e2e/seed-phase10-demo.mts >/dev/null)
}
for s in "$@"; do
  reset
  if [ "$s" = ux-w4-misc ] || [ "$s" = qa-adversarial ]; then (cd $ROOT && node_modules/.bin/tsx scripts/e2e/seed-ux-w4.mts >/dev/null); fi
  echo "=== $s"
  if [ "$s" = qa-adversarial ]; then
    (cd $ROOT && node artifacts/task-validation/ux-direct-access-cycle/qa/qa-adversarial.mjs "$OUT/$s" > "$OUT/$s.log" 2>&1; echo "exit=$?")
  else
    (cd $ROOT && MODULI=/c/Workspace/ClinicOSHouse/Moduli node scripts/e2e/$s.mjs "$OUT/$s" > "$OUT/$s.log" 2>&1; echo "exit=$?")
  fi
  grep -E "^(PASS|FAIL|PENDING|BLOCKED)" "$OUT/$s.log" | cut -c1-6 | sort | uniq -c
  grep -E "^(FAIL|BLOCKED)" "$OUT/$s.log" | cut -c1-400 | head -12
done
