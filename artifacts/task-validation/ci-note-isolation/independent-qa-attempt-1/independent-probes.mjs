import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const out = path.dirname(fileURLToPath(import.meta.url));
const packet = path.dirname(out);
export const root = path.resolve(packet, '../../..');
const candidate = path.join(root, 'scripts/run-node-tests.mjs');
const original = path.join(packet, 'baseline/run-node-tests.mjs');
export const sourceHash = createHash('sha256').update(readFileSync(candidate)).digest('hex');
const baseEnv = { PATH: process.env.PATH, CI: 'true', FORCE_COLOR: '0', NODE_OPTIONS: '--test-reporter=tap' };
// Node's runner alone accepts --test-reporter; keep options explicit in test package metadata instead.
delete baseEnv.NODE_OPTIONS;
const prelude = `import {test} from 'node:test';import assert from 'node:assert/strict';import {appendFileSync,existsSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';import {setTimeout as delay} from 'node:timers/promises';const event=(kind)=>appendFileSync('events.jsonl',JSON.stringify({kind,pid:process.pid})+'\\n');`;
function makeFixture(label, workspace = 'backend') {
  const temp = mkdtempSync(path.join(tmpdir(), `clinicos-independent-notes-${label}-`));
  const cwd = path.join(temp, workspace);
  mkdirSync(path.join(cwd, 'src'), { recursive: true });
  symlinkSync('/workspace/ClinicOS/node_modules', path.join(cwd, 'node_modules'), 'dir');
  writeFileSync(path.join(cwd, 'tsconfig.app.json'), '{"compilerOptions":{"jsx":"react-jsx"}}\n');
  return { temp, cwd };
}
function add(fixture, rel, body) {
  const target = path.join(fixture.cwd, rel); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, body);
}
function invoke(fixture, runner, label, expectedCount, expectedExit = 0, overrides = {}) {
  const run = spawnSync(process.execPath, [runner], { cwd: fixture.cwd, env: { ...baseEnv, ...overrides }, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
  writeFileSync(path.join(out, `${label}.log`), (run.stdout ?? '') + (run.stderr ?? ''));
  assert.equal(run.error, undefined, 'runner completed before outer 20s timeout');
  assert.equal(run.status, expectedExit, `${label} preserves actual child test outcome`);
  const count = [...run.stdout.matchAll(/^(?:#|ℹ) tests (\d+)$/gm)].reduce((sum, m) => sum + Number(m[1]), 0);
  assert.equal(count, expectedCount, `${label}: every expected child test actually executed`);
  const events = existsSync(path.join(fixture.cwd, 'events.jsonl')) ? readFileSync(path.join(fixture.cwd, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [];
  return { label, exit: run.status, executedTests: count, events, isolatedSuites: Number(run.stdout.match(/isolated pass for (\d+)/)?.[1] ?? 0) };
}
function withFixture(label, fn, workspace) {
  const f = makeFixture(label, workspace); try { return fn(f); } finally { rmSync(f.temp, { recursive: true, force: true }); assert.equal(existsSync(f.temp), false); }
}
const originalSource = readFileSync(original, 'utf8');
const existingNine = [...originalSource.matchAll(/^  '(src\/[^']+\.test\.ts)',/gm)].map(m => m[1]);
assert.equal(existingNine.length, 9);
const newSuite = 'src/routes/__tests__/notes-privacy.test.ts';
const removed = readFileSync(candidate, 'utf8').replace("  // Broadcast notes are shared across actors; mailbox totals require completed writers.\n  'src/routes/__tests__/notes-privacy.test.ts',\n", '');
assert.equal(removed, originalSource, 'all bytes outside authorized two lines remain identical');
export function browserProbe() {
  return withFixture('browser', f => {
    add(f, 'src/producer.test.ts', prelude + `test('producer commits synthetic shared broadcast',{timeout:3000},async()=>{event('writer-start');await delay(120);writeFileSync('writer-done','yes');event('writer-end');});`);
    add(f, newSuite, prelude + `test('mailbox reads after producer completion',{timeout:3000},()=>{assert.equal(existsSync('writer-done'),true);event('reader-verified');});`);
    const result = invoke(f, candidate, 'browser-live-runner', 2);
    assert.deepEqual(result.events.map(e => e.kind), ['writer-start', 'writer-end', 'reader-verified']);
    assert.equal(result.isolatedSuites, 1);
    return { ...result, sourceHash, realProductionRunner: true, fixtureCleanupCompleted: true };
  });
}
export function runAll() {
  const results = [];
  const writerBody = prelude + `test('shared writer finishes',{timeout:4000},async()=>{writeFileSync('started','yes');event('writer-start');const deadline=Date.now()+450;while(!existsSync('reader-start')&&Date.now()<deadline)await delay(5);writeFileSync('done','yes');event('writer-end');});`;
  const readerBody = prelude + `test('shared reader requires completed writer',{timeout:4000},async()=>{const deadline=Date.now()+2000;while(!existsSync('started')&&Date.now()<deadline)await delay(5);const complete=existsSync('done');writeFileSync('reader-start','yes');event('reader-check');assert.equal(complete,true);});`;
  for (const [label, runner, exit] of [['independent-old-red', original, 1], ['independent-new-green', candidate, 0]]) {
    results.push(withFixture(label, f => { add(f, 'src/producer.test.ts', writerBody); add(f, newSuite, readerBody); return invoke(f, runner, label, 2, exit); }));
  }
  results.push(withFixture('ten-isolated', f => {
    for (let i=0;i<3;i++) add(f, `src/deep/writer-${i}.test.ts`, prelude + `test('concurrent producer ${i}',{timeout:4000},async()=>{assert.equal(process.env.AUTH_MODE,'demo');assert.equal(process.env.NODE_ENV,'test');event('writer-${i}-start');await delay(180);writeFileSync('writer-${i}-done','yes');event('writer-${i}-end');});`);
    for (const [i, rel] of [...existingNine, newSuite].entries()) add(f, rel, prelude + `test('serial global suite ${i}',{timeout:4000},async()=>{for(let j=0;j<3;j++)assert.equal(existsSync('writer-'+j+'-done'),true);assert.equal(existsSync('global-active'),false);writeFileSync('global-active','yes');event('global-${i}-start');await delay(25);event('global-${i}-end');unlinkSync('global-active');});`);
    add(f, 'src/not-a-test.ts', 'throw new Error("must not discover helper");'); add(f, 'src/ignored.test.js', 'throw new Error("must not discover JS");');
    const r = invoke(f, candidate, 'all-original-nine-plus-notes', 13); assert.equal(r.isolatedSuites,10);
    const kinds=r.events.map(e=>e.kind); const firstGlobal=kinds.findIndex(k=>k.startsWith('global-'));
    assert.equal(kinds.slice(0,firstGlobal).filter(k=>k.endsWith('-end')).length,3);
    assert.ok(kinds.slice(0,kinds.findIndex(k=>k.endsWith('-end'))).filter(k=>k.endsWith('-start')).length>1,'unrelated writers retain actual overlap');
    assert.equal(new Set(r.events.map(e=>e.pid)).size,13,'every test file ran in a real isolated Node child');
    return r;
  }));
  for (const [label, runner] of [['frontend-original', original], ['frontend-candidate', candidate]]) results.push(withFixture(label, f => {
    add(f,'src/asset.css','body{color:blue}');
    for(let i=0;i<2;i++)add(f,`src/nested/component-${i}.test.ts`,prelude+`import '../asset.css';test('frontend ${i} retains defaults',{timeout:4000},async()=>{assert.equal(process.env.AUTH_MODE,undefined);assert.equal(process.env.NODE_ENV,undefined);assert.equal(process.env.TSX_TSCONFIG_PATH,${JSON.stringify(path.join(f.cwd,'tsconfig.app.json'))});writeFileSync('frontend-${i}-started','yes');event('frontend-${i}-start');const deadline=Date.now()+2500;while(!existsSync('frontend-${1-i}-started')&&Date.now()<deadline)await delay(5);assert.equal(existsSync('frontend-${1-i}-started'),true);event('frontend-${i}-end');});`);
    const r=invoke(f,runner,label,2);assert.equal(r.isolatedSuites,0);assert.equal(r.events.slice(0,2).filter(e=>e.kind.endsWith('-start')).length,2);return r;
  },'frontend'));
  results.push(withFixture('explicit-env',f=>{const custom=path.join(f.cwd,'custom-tsconfig.json');writeFileSync(custom,'{}');add(f,'src/environment.test.ts',prelude+`test('explicit environment preserved',()=>{assert.equal(process.env.AUTH_MODE,'explicit-synthetic');assert.equal(process.env.NODE_ENV,'explicit-test');assert.equal(process.env.TSX_TSCONFIG_PATH,${JSON.stringify(custom)});event('explicit-preserved');});`);return invoke(f,candidate,'explicit-environment-retained',1,0,{AUTH_MODE:'explicit-synthetic',NODE_ENV:'explicit-test',TSX_TSCONFIG_PATH:custom});}));
  results.push(withFixture('first-fail',f=>{add(f,'src/failure.test.ts',prelude+`test('intentional concurrent failure',()=>{event('concurrent-failure');assert.fail('synthetic expected failure');});`);add(f,newSuite,prelude+`test('serial still executes',()=>event('serial-executed'));`);const r=invoke(f,candidate,'concurrent-failure-exit-propagation',2,1);assert.ok(r.events.some(e=>e.kind==='serial-executed'));return r;}));
  results.push(withFixture('second-fail',f=>{add(f,'src/pass.test.ts',prelude+`test('concurrent passes',()=>event('concurrent-passed'));`);add(f,newSuite,prelude+`test('intentional serial failure',()=>{event('serial-failure');process.exit(7);});`);const r=invoke(f,candidate,'serial-failure-exit-propagation',2,1);assert.ok(r.events.some(e=>e.kind==='serial-failure'));return r;}));
  results.push(withFixture('nonbackend-old-isolation',f=>{add(f,existingNine[0],prelude+`test('existing isolation remains outside backend',()=>event('existing-isolation'));`);const r=invoke(f,candidate,'existing-nonbackend-isolation-retained',1);assert.equal(r.isolatedSuites,1);return r;},'utility'));
  results.push(withFixture('empty',f=>{const r=invoke(f,candidate,'empty-discovery-explicit-no-tests',0);const log=readFileSync(path.join(out,'empty-discovery-explicit-no-tests.log'),'utf8');assert.match(log,/no \*\.test\.ts files found/);return {...r,acceptedAsTestCoverage:false};}));
  results.push(withFixture('missing',f=>{rmSync(path.join(f.cwd,'src'),{recursive:true});return invoke(f,candidate,'missing-source-directory-fails',0,1);}));
  const report={status:'PASS',sourceHash,independentRealRunnerProbes:results.length,totalExecutedChildTests:results.reduce((n,r)=>n+r.executedTests,0),existingNinePreserved:existingNine,globalReaderAdded:newSuite,fixtureBodiesIdenticalAcrossOldRedAndNewGreen:true,fixtureCleanupCompleted:true,networkOrDatabaseAccess:false,results};
  writeFileSync(path.join(out,'independent-probe-results.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(runAll(),null,2));
