import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const own='artifacts/task-validation/425-chart-scroll/independent-qa';
const failed=JSON.parse(readFileSync(own+'/browser03/failure.json'));
const clipping=failed.results[0].clipping;
const summary={decision:'FAILED VALIDATION',application:'796f5b4b1e32c43a15f5875a8bea79dd4f4fc61e',successfulBrowserGroups:13,viewport:failed.results[0].viewport,modalFocusCount:clipping.length,clipped:clipping.filter(f=>f.clipped.length),transport:failed.states.map(s=>({unknown:s.unexpected.length,external:s.external.length,writes:s.writes.length,pageErrors:s.pageErrors.length,consoleErrors:s.consoleErrors.length,httpErrors:s.httpErrors.length}))};
writeFileSync(own+'/failure-summary.json',JSON.stringify(summary,null,2));
mkdirSync(own+'/playwright-report',{recursive:true});
writeFileSync(own+'/playwright-report/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>425 independent FAILED VALIDATION</title><h1>Issue 425: modal keyboard focus clipped</h1><pre>'+JSON.stringify(summary,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre></html>');
console.log(JSON.stringify({clipped:summary.clipped.length,transport:summary.transport}));
