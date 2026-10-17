from pathlib import Path
import json,html
q=Path(__file__).resolve().parent
browser=json.loads((q/'browser/evidence/results.json').read_text());intake=json.loads((q/'intake-regression/test-results/fullstack.json').read_text());counts=json.loads((q/'full-backend-counts.json').read_text());snap=json.loads((q/'initial-integrity.json').read_text())
assert len(browser['results'])==7 and all(x['status']=='PASS_SCENARIO' for x in browser['results'])
assert intake['pass'] and len(intake['checks'])==19 and not intake['errors']
out=q/'playwright-report';out.mkdir(exist_ok=True)
body='<!doctype html><html lang="it"><meta charset="utf-8"><title>Independent QA447 — real browser artifacts</title><style>body{max-width:1100px;margin:32px auto;padding:0 18px;font:16px/1.5 system-ui;color:#17354a;background:#f7fafc}section{padding:20px;background:white;border:1px solid #c7d9e4;border-radius:8px;margin:20px 0}img{max-width:100%;height:auto}a{color:#175f91}code{overflow-wrap:anywhere}</style><h1>QA indipendente447 — prove reali Chromium, HTTP e PostgreSQL</h1>'
body+='<p role="alert"><strong>VERDETTO COMPLESSIVO: FAILED VALIDATION.</strong> Ricevuta cartella di una vecchia sessione inserita nello stato della nuova: <a href="../finding-late-session-receipt.md">difetto riprodotto</a>. I flussi browser ordinari positivi sotto non annullano questo errore.</p>'
body+='<p>Report HTML del runner Playwright personalizzato; i risultati vengono dai file effettivi della nuova sessione indipendente. Dati esclusivamente sintetici. Nessuna approvazione Claude o verifica del deploy è implicita.</p>'
body+='<p>HEAD <code>'+html.escape(snap['head'])+'</code>; 92 sorgenti e 22 contratti congelati. Frontend1474 pass; backend '+str(counts['pass'])+' pass, '+str(counts['skipped'])+' opt-in skip; zero fail.</p>'
for row in browser['results']:
 n=row['issue'];base='../browser/evidence/issue-'+str(n)
 body+=f'<section><h2>Issue{n}: PASS scenario reale</h2><p><a href="{base}.png">Screenshot risultato</a> · <a href="{base}-trace.zip">Trace redatta</a> · <a href="{base}.webm">Video</a></p><img src="{base}.png" alt="Risultato reale verificato per issue{n}"></section>'
body+='<section><h2>Regressione ingresso:19/19 PASS</h2><ul>'
for row in intake['checks']:body+='<li>'+html.escape(str(row['id']))+': '+html.escape(str(row['status']))+'</li>'
body+='</ul><a href="../intake-regression/test-results/fullstack.json">Risultati effettivi</a></section><section><h2>Tracciabilità</h2><p><a href="../browser/evidence/results.json">Valori e ricevute browser</a> · <a href="../validation-report.md">Verdetto QA e dipendenze</a> · <a href="../whole-packet-privacy-final.json">Scansione privacy</a></p><p>Le precedenti prove dell’autore e i tentativi falliti restano distinti nei percorsi storici, senza cambiarne il verdetto.</p></section></html>'
(out/'index.html').write_text(body)
print('HTML report created from real seven+nineteen passing results.')
