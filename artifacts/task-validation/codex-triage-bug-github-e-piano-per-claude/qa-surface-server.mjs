// QA-only rendering of recorded local test results. Never part of the application.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
if(process.env.CLINICOS_QA_SURFACE!=='1') throw new Error('QA surface requires explicit local flag');
const root=new URL('./',import.meta.url);
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
createServer(async(req,res)=>{
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(req.url!=='/'){res.writeHead(404);res.end();return;}
  const output=await readFile(new URL('test-results/qa-review-loop.txt',root),'utf8');
  const count=label=>Number(output.match(new RegExp('ℹ '+label+' (\\d+)'))?.[1]??-1);
  const tests=output.split('\n').filter(line=>line.startsWith('✔')).map(line=>line.replace(/ \([0-9.]+ms\)$/,''));
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"});
  res.end(`<!doctype html><html lang="it"><meta charset="utf-8"><title>QA locale: Codex e Claude</title><style>body{font:18px system-ui;margin:42px auto;max-width:1150px;color:#17334b;background:#f4f8fb}h1{font-size:32px}article{background:white;border:1px solid #bdd1df;padding:24px;border-radius:12px}li{padding:4px}strong{color:#145c43}.stats{display:flex;gap:36px}small{color:#516373}</style><h1>QA locale — Codex sviluppa, Claude revisiona</h1><p>Risultati reali del runner con Git temporaneo e Claude simulato. Nessuna chiamata a un modello reale.</p><article><div class="stats"><p>Test passati: <strong id="passed">${count('pass')}</strong></p><p>Test falliti: <strong id="failed">${count('fail')}</strong></p></div><ul>${tests.map(test=>`<li>${escape(test)}</li>`).join('')}</ul></article><p><strong>Integrazione GitHub automatica: non attivata</strong></p><small>Superficie QA statica, servita soltanto su 127.0.0.1 con flag esplicito. Dati sintetici; nessun dato paziente o credenziale.</small></html>`);
}).listen(4391,'127.0.0.1');
