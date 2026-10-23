import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=n=>readFileSync(new URL(n,import.meta.url),'utf8');
const stepScript=(workflow,name)=>{const start=workflow.indexOf('      - name: '+name+'\n');assert(start>=0);const tail=workflow.slice(start);const step=tail.slice(0,tail.indexOf('\n      - ',1)<0?tail.length:tail.indexOf('\n      - ',1));assert(step.includes('shell: bash'));const block=step.split('        run: |\n')[1];assert(block);return block.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');};
test('dedicated workflow fixes main identity/environment/sha and isolates the only secret step',()=>{
 const w=read('../../.github/workflows/inspect-demo-storage.yml');const live=w.slice(w.indexOf('  inspect:\n'));
 for(const text of ["github.event_name == 'workflow_dispatch'","github.repository == 'l2v-hub/ClinicOS'","github.ref == 'refs/heads/main'","github.ref_name == 'main'","github.workflow_ref == 'l2v-hub/ClinicOS/.github/workflows/inspect-demo-storage.yml@refs/heads/main'","github.actor == 'l2v-hub'",'github.triggering_actor == github.actor','github.sha == github.workflow_sha','inputs.reviewed_sha == github.sha',"environment: 'glistening-friendship / demo'",'contents: read','ref: ${{ github.sha }}','persist-credentials: false','timeout-minutes: 10','group: demo-storage-inspect','cancel-in-progress: false','options: [project-token, account-bearer]'])assert(w.includes(text),text);
 assert(w.includes('pull_request:'));assert(w.includes('needs: test'));assert(!w.includes('pull_request_target'));assert(!w.includes('workflow_call:'));assert(!/^\s+(?:contents|actions|issues|pull-requests):\s*write\s*$/m.test(w));
 assert.equal((w.match(/secrets\./g)??[]).length,2);const secretStep=live.slice(live.indexOf('      - name: Inspect only'));
 assert.equal((secretStep.match(/secrets.RAILWAY_DEMO_TOKEN/g)??[]).length,2);assert(secretStep.includes("inputs.auth_mode == 'project-token' && secrets.RAILWAY_DEMO_TOKEN || ''"));assert(secretStep.includes("inputs.auth_mode == 'account-bearer' && secrets.RAILWAY_DEMO_TOKEN || ''"));
 assert(!live.includes('npm install -g @railway/cli'));assert(live.indexOf('sha256sum --check --status')<live.indexOf('secrets.'));assert(!live.slice(0,live.indexOf('      - name: Inspect only')).includes('secrets.'));
 for(const pin of ['actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683','actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'])assert(w.includes(pin));
 for(const text of ['--erase','demo-cleanup','demo-storage-backups','demo-patient-inventory','configure-demo-source','secrets.RAILWAY_TOKEN','production'])assert(!w.includes(text),text);
});
test('live import graph contains only builtins and the pure extracted binding module',()=>{
 const s=read('./demo-storage-inspect.mjs'),b=read('./demo-storage-binding-readonly.mjs');
 const imports=[...s.matchAll(/from '([^']+)'/g)].map(m=>m[1]);assert.deepEqual(imports.filter(x=>!x.startsWith('node:')),['./demo-storage-binding-readonly.mjs']);assert([...b.matchAll(/from '([^']+)'/g)].every(m=>m[1].startsWith('node:')));
 for(const text of ['demo-storage-backups','demo-patient-inventory','configure-demo-source','eraseVerifiedSnapshots','runStorageMaintenance','purgeTemporarySources','serviceCreate','serviceDelete','deploymentRedeploy','volumeInstanceBackupDelete','SQL','shell: true','SAFE_REPLACEMENT_ERRORS','REDEPLOY','REPLACEMENT'])assert(!s.includes(text)&&!b.includes(text),text);
 assert(!b.includes('spawn'));assert(!b.includes('fetch'));assert(!b.includes('process.env'));assert(!b.includes('node:fs'));assert(!b.includes('node:child_process'));
});

test('safe receipt artifact is an exact separate pinned upload, never raw streams or credentials',()=>{
 const w=read('../../.github/workflows/inspect-demo-storage.yml'),live=w.slice(w.indexOf('  inspect:\n'));
 const receiptStep=live.slice(live.indexOf('      - name: Inspect only'),live.indexOf('      - name: Retain only'));
 assert(receiptStep.includes('shell: bash'));assert(receiptStep.includes('set -euo pipefail'));
 assert(receiptStep.includes('node scripts/maintenance/demo-storage-inspect.mjs | tee "$RUNNER_TEMP/demo-storage-receipt.txt"'));
 const upload=live.slice(live.indexOf('      - name: Retain only'));
 for(const field of ['if: ${{ always() }}','uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02','name: demo-storage-receipt-${{ github.run_id }}-${{ github.run_attempt }}','path: ${{ runner.temp }}/demo-storage-receipt.txt','retention-days: 7','if-no-files-found: warn'])assert(upload.includes(field),field);
 for(const forbidden of ['env:','secrets.','RAILWAY_','GITHUB_TOKEN','*','2>&1','|&','continue-on-error','overwrite:'])assert(!upload.includes(forbidden),forbidden);
 for(const forbidden of ['2>&1','|&','continue-on-error','set +e','|| true'])assert(!receiptStep.includes(forbidden),forbidden);
 assert.equal((live.match(/actions\/upload-artifact@/g)??[]).length,1);
});

test('actual receipt shell preserves failing helper status and excludes stderr from the file',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
 const {join}=await import('node:path');const{tmpdir}=await import('node:os');const{spawnSync}=await import('node:child_process');
 const root=mkdtempSync(join(process.env.TMPDIR??tmpdir(),'receipt-shell-'));
 try{
  const bin=join(root,'bin');mkdirSync(bin);writeFileSync(join(bin,'node'),'#!/bin/bash\nprintf \'CLINICOS_DEMO_STORAGE_INSPECT {"outcome":"blocked"}\\n\'\nprintf \'private-synthetic-stderr\\n\' >&2\nexit 17\n',{mode:0o700});
  const w=read('../../.github/workflows/inspect-demo-storage.yml');const script=stepScript(w,'Inspect only fixed demo binding and descriptive snapshot counts');
  const r=spawnSync('/bin/bash',['-c',script],{env:{PATH:bin+':/usr/bin:/bin',RUNNER_TEMP:root},encoding:'utf8'});
  assert.equal(r.status,17);const content=readFileSync(join(root,'demo-storage-receipt.txt'),'utf8');assert.equal(content,'CLINICOS_DEMO_STORAGE_INSPECT {"outcome":"blocked"}\n');assert(!content.includes('private-synthetic-stderr'));assert(r.stderr.includes('private-synthetic-stderr'));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('installer fixes official GNU archive checksum and version before any secrets',()=>{
 const w=read('../../.github/workflows/inspect-demo-storage.yml');const s=stepScript(w,'Install fixed read-only CLI without credentials');
 for(const text of ["https://github.com/railwayapp/cli/releases/download/v5.66.0/railway-v5.66.0-x86_64-unknown-linux-gnu.tar.gz",'5b3f4e77ddf986161fb760842d718b23ab587a59f9badf610c1fb7b80bcbcb3e','sha256sum --check --status','verifiedRailwayPath(process.env.RUNNER_TEMP)','test -x "$executable"',"grep -Eq '^railway 5\\.66\\.0$'",'tar -xzf "$archive" -C "$(dirname "$executable")" railway'])assert(s.includes(text),text);
 assert(s.indexOf('sha256sum --check --status')<s.indexOf('tar -xzf'));assert(s.indexOf('tar -xzf')<s.indexOf('"$executable" --version'));assert(!s.includes('secrets.'));assert(!s.includes('npm '));
 const source=read('./demo-storage-inspect.mjs');assert(source.includes('spawnImpl(context.cliPath, args'));assert(!source.includes("spawnImpl('railway'"));
});
test('genuine installer shell rejects checksum mismatch before extraction or execution',async(t)=>{
 const {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync}=await import('node:fs');const{join,dirname}=await import('node:path');const{tmpdir}=await import('node:os');const{spawnSync}=await import('node:child_process');
 const root=mkdtempSync(join(process.env.TMPDIR??tmpdir(),'installer-checksum-'));
 try{
  const bin=join(root,'bin'),sentinel=join(root,'extracted-or-executed');mkdirSync(bin);
  writeFileSync(join(bin,'curl'),'#!/bin/bash\nset -eu\nwhile [ "$#" -gt 0 ]; do if [ "$1" = --output ]; then printf invalid-archive-bytes > "$2"; exit 0; fi; shift; done\nexit 91\n',{mode:0o700});
  writeFileSync(join(bin,'tar'),'#!/bin/bash\nprintf unexpected > "'+sentinel+'"\nexit 92\n',{mode:0o700});
  const script=stepScript(read('../../.github/workflows/inspect-demo-storage.yml'),'Install fixed read-only CLI without credentials');
  const cwd=new URL('../../',import.meta.url).pathname;const r=spawnSync('/bin/bash',['-c',script],{cwd,env:{PATH:bin+':'+dirname(process.execPath)+':/usr/bin:/bin',RUNNER_TEMP:root},encoding:'utf8'});
  assert.equal(r.status,1);assert(!existsSync(sentinel));assert(!existsSync(join(root,'clinicos-railway-5.66.0')));assert(existsSync(join(root,'clinicos-railway-5.66.0.tar.gz')));assert(!r.stderr.includes('ERR_MODULE_NOT_FOUND'));assert(!r.stderr.includes('not found'));
  // Checksum diagnostics are safe here: the entire archive is a synthetic fixture.
  assert.equal(r.stdout,'');assert.equal(r.stderr,'');
  t.diagnostic(JSON.stringify({case:'actual-installer-checksum-mismatch',exit:r.status,stdout:r.stdout,stderr:r.stderr,extractionOrExecution:false,syntheticArchiveOnly:true}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
