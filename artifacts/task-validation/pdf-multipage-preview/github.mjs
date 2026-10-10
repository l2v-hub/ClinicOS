import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = 'artifacts/task-validation/pdf-multipage-preview';
const configured = JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json', 'utf8')).env;
export function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 40e6, env: { ...process.env, GH_TOKEN: configured.GITHUB_TOKEN || configured.GH_TOKEN } });
  assert.equal(result.status, 0, 'GitHub operation failed safely'); return result.stdout.trim();
}
if (process.argv[2] === 'create') {
  assert.equal(existsSync(root + '/issue.json'), false, 'Do not duplicate issue');
  const title = '[Bug] Anteprima PDF multipagina: scansioni successive alla prima bianche';
  const matches = JSON.parse(gh(['issue', 'list', '--repo', 'l2v-hub/ClinicOS', '--state', 'all', '--search', title, '--limit', '50', '--json', 'number,title']));
  assert.equal(matches.filter(i => i.title === title).length, 0);
  const body = `Segnalazione diretta dell'utente: l'importazione conta correttamente 4 pagine del PDF, ma solo la prima anteprima è valorizzata; le successive appaiono bianche. Nessun documento o screenshot contenente dati reali viene pubblicato.

Scope: anteprime miniature e ingrandite del PDF importato, senza modificare originali, pagina di origine, ordinamento, estrazione/OCR, autorizzazioni o sessioni reali.

Acceptance criteria:
- [ ] Riprodurre il difetto su baseline con un PDF sintetico di quattro pagine, prima pagina vettoriale e tre scansioni CCITT, verificato anche con renderer indipendente.
- [ ] Visualizzare tutte e quattro le miniature con contenuto distinto e fedele su desktop e mobile.
- [ ] Aprire le pagine 2, 3, 4 con corretto contenuto di origine, anche dopo riordino e ricaricamento/ripresa della sessione sintetica.
- [ ] Servire decoder dependency-bound dallo stesso origin con bytes/MIME corretti; mantenere CSP e fallback, senza PHI o richieste cliniche reali.
- [ ] Test mirati, tipi/build, sicurezza scoped, QA indipendente e prova del deployment esatto online; documentare separatamente eventuali errori preesistenti della suite.

Correzione candidata: 30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6. Non ancora dichiarata risolta o pubblicata; chiusura solo dopo tutte le prove.`;
  const url = gh(['issue', 'create', '--repo', 'l2v-hub/ClinicOS', '--title', title, '--body', body]);
  const number = Number(url.split('/').pop()); assert.ok(number > 0);
  const issue = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/' + number]));
  assert.equal(issue.body, body); assert.equal(issue.state, 'open');
  writeFileSync(root + '/issue.json', JSON.stringify({ issue: { number, title: issue.title, body: issue.body, state: issue.state, url: issue.html_url }, comments: [], at: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ number, url }));
}
