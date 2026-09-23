import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const directory = 'artifacts/task-validation/po-15-catalogo/frontend';
const baseline = 'f445260a4ca4de872c1361ff19fc215179b097fe';
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, {encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
const paths = [...new Set([...git('diff','--name-only',baseline,'--','frontend/src').split('\n'), ...git('ls-files','--others','--exclude-standard','frontend/src').split('\n')])].filter(Boolean).sort();
const files = paths.map(path => {
  const bytes = readFileSync(path); let before;
  try { before = execFileSync('git',['show',`${baseline}:${path}`],{stdio:['ignore','pipe','ignore']}); } catch { /* Added source. */ }
  const lines = bytes.toString().trimEnd().split('\n').length;
  if (!before && lines >= 500) throw new Error(`New source exceeds line cap: ${path}`);
  return {path,bytes:bytes.length,lines,sha256:hash(bytes),baselineSha256:before?hash(before):null};
});
const identity = rows => hash(JSON.stringify(rows.map(({path,sha256})=>({path,sha256}))));
const manifest = {task:'PO-15-frontend',baseline,generatedAtUtc:new Date().toISOString(),worktree:process.cwd(),sourceStateId:identity(files),runtimeSourceId:identity(files.filter(row=>!row.path.includes('/__tests__/'))),files};
writeFileSync(`${directory}/source-at-validation.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({sourceStateId:manifest.sourceStateId,runtimeSourceId:manifest.runtimeSourceId,files:files.length}));

