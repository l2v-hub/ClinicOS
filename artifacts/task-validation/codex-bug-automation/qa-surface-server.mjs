// Local QA-only report surface. Never imported by the application.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
if(process.env.CLINICOS_QA_SURFACE!=='1')throw new Error('Explicit QA flag required');
const root=new URL('./',import.meta.url);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
createServer(async(req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 if(req.url!=='/'){res.writeHead(404);return res.end();}
 const output=await readFile(new URL('test-results/qa-final-scoped.txt',root),'utf8');
 const count=label=>Number(output.match(new RegExp('ℹ '+label+' (\\d+)'))?.[1]??-1);
 const tests=output.split('\n').filter(s=>s.startsWith('✔')).map(s=>s.replace(/ \([0-9.]+ms\)$/,''));
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"});
 res.end(`<!doctype html><html lang="it"><meta charset="utf-8"><title>QA pipeline bug</title><style>body{font:17px system-ui;margin:32px auto;max-width:1200px;background:#f4f8fb;color:#17334b}article{background:white;border:1px solid #bdd1df;padding:20px;border-radius:12px}h1{font-size:30px}li{padding:3px}.stats{display:flex;gap:40px}strong{color:#145c43}</style><h1>QA locale — GitHub → Codex → esecutore → Claude</h1><p>Risultati reali dei test indipendenti. Git temporaneo e adattatori modello/GitHub simulati; nessuna esecuzione pagata.</p><article><div class="stats"><p>Passati: <strong id="passed">${count('pass')}</strong></p><p>Falliti: <strong id="failed">${count('fail')}</strong></p></div><ul>${tests.map(s=>`<li>${escape(s)}</li>`).join('')}</ul></article><p id="operational">Attivazione live bloccata: autenticazione Claude e sandbox da configurare; workflow da integrare in main.</p><small>Solo dati sintetici. Superficie QA su 127.0.0.1 con flag esplicito, esclusa dall'applicazione.</small></html>`);
}).listen(4392,'127.0.0.1');
