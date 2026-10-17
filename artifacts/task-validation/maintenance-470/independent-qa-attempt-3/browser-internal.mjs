import {readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync} from 'node:fs';
import {createServer} from 'node:http';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const directory=import.meta.dirname;
const runtime=JSON.parse(readFileSync(join(directory,'runtime-outcomes.json')));
const negatives=JSON.parse(readFileSync(join(directory,'negative-outcomes.json')));
const units=readFileSync(join(directory,'unit-results.txt'),'utf8');
assert.match(units,/pass 30/);assert.match(units,/fail 0/);
assert.equal(runtime.cleanup.committed,true);assert.equal(runtime.independentPatientDataEmpty,true);
const values=[
 ['Verdict','FAILED VALIDATION — candidate not authorized for live execution'],
 ['Live Railway writes or browser logins','0 — synthetic QA only'],
 ['PostgreSQL actual version',runtime.postgresVersion],
 ['Actual inventory catalog count',String(runtime.independentCatalogCount)],
 ['Clinical/import/mixed targets actually truncated',String(runtime.cleanup.tables.length)],
 ['Preserved content tables actually verified',String(runtime.cleanup.preservedTableCount)],
 ['Rollback restores selected and preserved rows',String(runtime.rollbackAll43Verified)],
 ['Preserved content unchanged',String(runtime.cleanup.preservedContentUnchanged)],
 ['Trigger states restored',String(runtime.cleanup.triggerStatesUnchanged)],
 ['Independent fresh-connection patient data empty',String(runtime.independentPatientDataEmpty)],
 ['Existing unit suite independently run','30 passed / 0 failed / 0 skipped'],
 ...negatives.outcomes.map(n=>[n.name,n.finding?`${n.finding}: expected ${n.expected}; observed ${n.observed}`:n.observed]),
 ...runtime.actualAfterCounts.filter(x=>runtime.cleanup.tables.some(t=>t.table===x.table)).map(x=>['Actual '+x.table+' count',x.rows]),
];
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Independent maintenance 470 QA3</title><style>body{font:17px system-ui;background:#edf5fa;color:#143650;margin:30px}main{background:white;border-radius:14px;padding:25px;max-width:1250px}h1{color:#19639b}td{padding:9px 12px;border-bottom:1px solid #d6e3ec;vertical-align:top}td:last-child{font-weight:600}tr:first-child{background:#fff0ce}small{color:#405b6d}</style><main><h1>Demo cleanup · independent candidate 3 QA</h1><p>Synthetic disposable PostgreSQL + actual maintenance functions. No remote data changed.</p><table><thead><tr><th>Observed assertion</th><th>Actual result</th></tr></thead><tbody>${values.map(([n,v],i)=>`<tr><td>${esc(n)}</td><td id="value-${i}">${esc(v)}</td></tr>`).join('')}</tbody></table><p><small>F1 stale process health; F2 unrelated volume mount; F3 precheck media survives hard termination. These are reproduced defects, not successful acceptance criteria.</small></p></main></html>`;
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}if(req.url!=='/'){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':'text/html;charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"});res.end(html);});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
process.env.PLAYWRIGHT_BROWSERS_PATH='/workspace/.cache/clinicos-maint470-qa3-playwright';
mkdirSync(join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-1011'),{recursive:true});
const ffmpeg=join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-1011/ffmpeg-linux');if(!existsSync(ffmpeg))symlinkSync('/usr/bin/ffmpeg',ffmpeg);
const {chromium}=await import('/workspace/ClinicOS/node_modules/playwright/index.mjs');
let browser;const errors={console:[],page:[],http:[]};
try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
 const context=await browser.newContext({viewport:{width:1400,height:1050},recordVideo:{dir:join(directory,'video')}});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')errors.console.push(m.text())});page.on('pageerror',e=>errors.page.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.http.push(r.status())});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const verify=async()=>{assert.equal(await page.locator('tbody tr').count(),values.length);for(let i=0;i<values.length;i++){const cell=page.locator('#value-'+i);assert.equal(await cell.innerText(),values[i][1]);}};
 await verify();await page.reload();await verify();
 assert.deepEqual(errors,{console:[],page:[],http:[]});
 await page.screenshot({path:join(directory,'internal-result.png'),fullPage:true});
 await context.tracing.stop({path:join(directory,'trace.zip')});await context.close();
 const result={surfaceAssertionsPassed:true,assertedValueCount:values.length*2,reloadVerified:true,errors,clinicalAcceptance:'FAILED VALIDATION',liveOperations:0,ffmpegSource:'/usr/bin/ffmpeg',chromiumSource:'/usr/bin/chromium'};
 writeFileSync(join(directory,'browser-results.json'),JSON.stringify(result,null,2));mkdirSync(join(directory,'test-results'),{recursive:true});writeFileSync(join(directory,'test-results/browser-results.json'),JSON.stringify(result,null,2));mkdirSync(join(directory,'playwright-report'),{recursive:true});writeFileSync(join(directory,'playwright-report/index.html'),html.replace('</main>','<p>Custom Playwright report. Concrete values asserted twice with reload. <a href="../trace.zip">Trace</a> · <a href="../browser-results.json">Machine results</a></p></main>'));
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
