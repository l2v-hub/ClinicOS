import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
const own='artifacts/task-validation/425-chart-scroll/independent-qa2';
const source=JSON.parse(readFileSync(own+'/source-before.json'));
const commands=JSON.parse(readFileSync(own+'/commands01/command-results.json'));
const primary=JSON.parse(readFileSync(own+'/browser01/results.json'));
const denial=JSON.parse(readFileSync(own+'/browser02/results.json'));
const fixed=JSON.parse(readFileSync(own+'/browser03/results.json'));
const security=JSON.parse(readFileSync(own+'/security01/comparison.json'));
assert.equal(primary.results.length,10);assert.equal(denial.results.length,3);assert.equal(fixed.results.length,3);
assert.deepEqual(commands.newFailures,[]);assert.deepEqual(commands.focusedNewFailures,[]);
assert.equal(commands.records.find(r=>r.name==='focused').tests,44);
assert.equal(commands.records.find(r=>r.name==='full-regression').tests,1257);
assert.equal(commands.records.find(r=>r.name==='full-regression').fail,12);
assert.equal(security.newFindings.length,0);
for(const run of [primary,denial,fixed])for(const state of run.states)for(const key of ['unexpected','external','writes','pageErrors','consoleErrors','httpErrors'])assert.deepEqual(state[key],[]);
for(const group of fixed.results){assert.equal(group.clipping.length,110);assert.deepEqual(group.clipping.filter(f=>f.clipped.length||!f.hit||f.fixedContainingBlock!=='viewport'),[]);assert.equal(group.saveBounds.hit,true);assert.ok(group.saveBounds.top>=0&&group.saveBounds.bottom<=group.viewport.height);}
const summary={decision:'READY FOR CODEX QA',application:source.head,primary:primary.results.map(r=>({role:r.role,viewport:r.viewport,focusControls:r.focus.length,modalControls:r.modal.focus.length,horizontal:r.horizontal})),denied:denial.results.map(r=>({role:r.role,viewport:r.viewport,pointer:r.pointer})),fixedModal:fixed.results.map(r=>({role:r.role,viewport:r.viewport,containingBlock:'viewport',controlsTested:r.clipping.length,saveBounds:r.saveBounds})),newTestFailures:commands.newFailures,physicalTablet:false};
const videos=['browser01','browser02','browser03'].flatMap(dir=>readdirSync(own+'/'+dir).filter(n=>n.endsWith('.webm')).map(n=>dir+'/'+n));assert.equal(videos.length,16);
writeFileSync(own+'/qa-summary.json',JSON.stringify(summary,null,2));
writeFileSync(own+'/validation-report.md',`# Issue425 independent QA iteration2

QA Verdict: READY FOR CODEX QA

Application ${source.head}; accepted baseline67d21c3e9257a5acb8c9b25130c9417fb92185fb. Dedicated tester, source readonly, isolated C:/w-425-qa2. Root must rerun byte-identical recipes and decide release/deployment/closure; this is not a production or CI verdict.

| Phase / criterion | Result | Evidence |
| --- | --- | --- |
| Contract/original issue/comments | PASS original wording, zero comments, AC4 viewport-dimensions interpretation explicit | recipes/task-contract.md, recipes/original-issue.json |
| Diff scope/hygiene | PASS exact3 frontend files, one import,55-line scoped screen CSS,5 focused tests; no backend/schema/API/auth/env/config/deps/lock changes | diff.patch |
| Types/build | PASS FE/BE noEmit,tsc-b,actual Vite/React compiler | commands01/frontend-types.log,commands01/backend-types.log,commands01/frontend-tsc-build.log,commands01/vite-build.log |
| Focused |44 total43 PASS1 exact accepted classic fallback baseline failure; no new failures, not global green | commands01/focused.log,commands01/command-results.json |
| Full regression |1257 total1245 PASS12 exact named baseline failures0 new; not global green | commands01/full-regression.log,commands01/command-results.json |
| Security | PASS scoped changed-file baseline/candidate0 findings; new files honestly absent from baseline; frontend source/dist secrets scan PASS | security01/comparison.json,commands01/security-scan.log |
| AC1 predictable vertical path | PASS actual computed single owner, long calendar/Clinica/form,wheel | browser01/results.json,browser01/doctor-1280-before-wheel.png,browser01/doctor-1280-after-wheel.png,browser01/doctor-1280-clinical.png,browser01/doctor-1280-trace.zip |
| AC2 calendar no scroll trap | PASS wheel reaches after-grid PRN region, gridYtop0, horizontal week rail preserved | browser01/results.json,browser01/doctor-1280-after-wheel.png,browser01/doctor-390-week-rail.png |
| AC3 keyboard focus visible | PASS110 form Tab/ShiftTab per10 groups,110 modal per10 groups plus330 adversarial modal focus controls all effectiveClip0/hittrue/CBviewport; Save focus via ShiftTab/Tab fully in viewport and hittrue on3 sizes | browser01/results.json,browser03/results.json,browser03/doctor-1280-modal-save.png,browser03/doctor-768-modal-save.png,browser03/doctor-390-modal-save.png,browser03/doctor-1280-trace.zip |
| AC4 desktop/tablet dimensions | PASS actual measured Chromium1150x1004,1280x720,1024x768,768x1024,390x844; not physical hardware/touch certification | browser01/results.json,browser02/results.json,browser03/results.json |

16 successful browser groups:10 nurse/doctor primary groups,3 denied/coarse groups,3 strong fixed-modal groups. Denied nurse therapy.create exposes neither Nuova terapia tab nor slot creation buttons. Coarse-pointer media is actually true on3 emulated contexts, not a real tablet claim. Browser02 inherited console suffix mentions modal, but its assertions are wheel/week/denied gating only; modal evidence belongs to browser01/03.

Previously failed796 QA remains IMMUTABLE in C:/w-425-qa/.../independent-qa manifest a69b2123ffa5765005099a494ed66aa030561836b748fdec15ad93798885e22f. New candidate disables retained transform animation only on chart panel. Real fixed containing block is now viewport; DOM overflow ancestors above that fixed viewport are not effective clipping ancestors. Hit tests and full bounds verify actual pixels rather than merely DOM visibility. Desktop/modal-save PNG visually inspected: focused Save visible, overlay covers entire page, no y239 clipping. All330 adversarial focused controls have matching elementFromPoint. No QA2 failed attempts.

All16 groups:0 unknown/external/clinicalwrites/pageerror/consoleerror/HTTPerror. API/auth/catalog/provider requests intercepted before wire, synthetic fixtures only. No durable clinical writes; no DB persistence claim. Background modal scrolling recorded independently; no nonexistent body-lock claim. No app AuthZ logic altered; UI denied-capability gate tested, server authorization unchanged and not newly certified. No new logs,rawHTML/SQL,dependencies or configuration. Scanner is scoped code validation, not global CVE certification.

Source-before/after bind1534 tracked frontend/backend/scripts/manifests exactly; dependency junction readonly and native launchers untouched. server-stop-policy/verified receipts record identity-bound scoped shutdown. Raw artifact manifest seals recipes, logs, result JSON, real PNG, traces, video and report; only generated runtime-cache excluded. playwright-report/index.html is generated from asserted result JSON, not an application substitute.

Codex must now re-run the QA Gate.
`);
writeFileSync(own+'/validation-report.md',readFileSync(own+'/validation-report.md','utf8')+'\n## Actual video artifacts\n\n'+videos.map(p=>'- '+p).join('\n')+'\n');
mkdirSync(own+'/playwright-report',{recursive:true});
writeFileSync(own+'/playwright-report/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>425 independent QA iteration2</title><h1>Issue425: actual SPA geometry, scroll and keyboard assertions</h1><p>16 guarded synthetic viewport/role groups. No physical hardware certification.</p><pre>'+JSON.stringify(summary,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre></html>');
console.log('16 browser groups verified; generated evidence report, no added app surface');
