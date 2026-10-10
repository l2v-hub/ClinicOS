import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
export function gh(args) {
  const configured = JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json', 'utf8')).env;
  const run = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 40e6,
    env: { ...process.env, GH_TOKEN: configured.GITHUB_TOKEN || configured.GH_TOKEN } });
  assert.equal(run.status, 0, 'GitHub operation failed safely'); return run.stdout.trim();
}
if (process.argv[2] !== 'create') process.exitCode = 0;
else {
const path = 'artifacts/task-validation/therapy-completeness/issue.json';
const title = '[Bug] Completezza farmaci: prescrizioni assegnate e importate non devono scomparire';
assert.equal(existsSync(path), false, 'Issue receipt already exists');
const matches=JSON.parse(gh(['issue','list','--repo','l2v-hub/ClinicOS','--state','all','--search','in:title completezza farmaci','--limit','100','--json','number,title']));
assert.equal(matches.filter(i=>i.title===title).length,0,'Do not duplicate issue');
const body=`Segnalazione diretta utente: «Non vedo tutti i farmaci assegnati per la terapia; tutti i farmaci devono essere riportati».
Nessuna immagine, lettera, identità o terapia reale viene pubblicata. Usare solo evidenze sintetiche.

Acceptance criteria:
- [ ] Inventario completo delle prescrizioni salvate, incluse quelle oltre la prima pagina; inattive consultabili come tali, indipendentemente dai filtri del calendario.
- [ ] Farmaci al bisogno consultabili nelle viste giorno e settimana; nessuna somministrazione autorizzata fuori dal periodo della prescrizione.
- [ ] Prescrizioni mancanti nel feed del giro visibili in sola lettura, senza inventare identità di dose, quantità o permessi.
- [ ] Risposte paginate corte/incoerenti o di altro paziente non considerate complete; errori, retry, cambio paziente e stampa verificati.
- [ ] Audit e riconciliazione importazione → revisione → conferma → elenco salvato: nessun farmaco perso silenziosamente, esclusioni e ambiguità esplicite. Non dedurre terapie/dosi da prosa ambigua.
- [ ] QA indipendente, test/regressioni, browser responsive con valori effettivi, prova immutabile al commit e deployment verificato prima della chiusura.

Stato iniziale: candidato frontend14a03038 in QA, NON pubblicato. Audit importazione ha trovato ulteriori lacune; l'issue e l'obiettivo complessivo restano aperti anche se la parte di visualizzazione passa. Nessun cambiamento su pazienti reali.`;
const url=gh(['issue','create','--repo','l2v-hub/ClinicOS','--title',title,'--body',body]);
const number=Number(url.split('/').pop()); assert.ok(number>0);
const issue=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/'+number]));
assert.equal(issue.body,body); assert.equal(issue.state,'open');
writeFileSync(path,JSON.stringify({number,url,title,body,comments:[],at:new Date().toISOString()},null,2));
console.log(JSON.stringify({number,url}));
}
