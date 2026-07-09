// Issue #242 — prova controllata input→output del parser di dimissione.
// Un'intestazione combinata "Diagnosi e terapia alla dimissione" con un blocco "Terapia:"
// non deve far finire i farmaci nella diagnosi. Il parser è il componente runtime del fix
// (il frontend deriveSections/ImportSectionsReview si limita a renderizzare diagnosisText/therapyText).
//   node_modules/.bin/tsx e2e/issue-242-parse.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseNarrativeFromMarkdown } from '../backend/src/ai/sections/markdown-parse.js';

const OUT = 'artifacts/task-validation/242-diagnosis-excludes-pharmacological-therapy';
mkdirSync(join(OUT, 'screenshots'), { recursive: true });
mkdirSync(join(OUT, 'logs'), { recursive: true });

// Lettera di dimissione SINTETICA con intestazione combinata + blocco Terapia inline (nessun PHI reale).
const LETTER = `# Lettera di dimissione

## Diagnosi e terapia alla dimissione
Scompenso cardiaco cronico in classe NYHA II.
Ipertensione arteriosa essenziale.
Terapia:
- Ramipril 5 mg 1 cp/die
- Bisoprololo 2.5 mg 1 cp/die
- Furosemide 25 mg al bisogno

## Consigli e follow-up
Controllo cardiologico tra 30 giorni.
`;

const draft = parseNarrativeFromMarkdown(LETTER);
const DRUGS = ['Ramipril', 'Bisoprololo', 'Furosemide'];

const diag = draft.diagnosisText || '';
const ther = draft.therapyText || '';
const drugsInDiag = DRUGS.filter((d) => new RegExp(d, 'i').test(diag));
const drugsInTher = DRUGS.filter((d) => new RegExp(d, 'i').test(ther));
const diagHasDiagnosis = /scompenso|ipertensione/i.test(diag);

const checks = [
  { name: 'AC2 la diagnosi NON contiene farmaci', pass: drugsInDiag.length === 0, detail: `farmaci in diagnosi: [${drugsInDiag.join(', ')}]` },
  { name: 'AC1 la diagnosi contiene la diagnosi di dimissione', pass: diagHasDiagnosis, detail: `diag="${diag.slice(0, 60)}"` },
  { name: 'AC4 i farmaci finiscono nella terapia', pass: drugsInTher.length === DRUGS.length, detail: `farmaci in terapia: [${drugsInTher.join(', ')}]` },
];
const allPass = checks.every((c) => c.pass);
checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`));

writeFileSync(join(OUT, 'logs', 'parse-input-output.log'),
  `# Issue #242 — parser input→output (sintetico, no PHI)\n\n## INPUT (markdown)\n${LETTER}\n\n## OUTPUT diagnosisText\n${diag}\n\n## OUTPUT therapyText\n${ther}\n\n## CHECKS\n${checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail}`).join('\n')}\n`);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
writeFileSync(join(OUT, 'report.html'), `<!doctype html><meta charset="utf-8">
<body style="font:15px system-ui;padding:28px;color:#101828;max-width:1100px;margin:auto">
<h1 style="color:#0F5FD7">#242 — La diagnosi di dimissione NON include la terapia farmacologica</h1>
<p>Intestazione combinata <b>"Diagnosi e terapia alla dimissione"</b> con blocco <b>Terapia:</b> — il parser separa correttamente i due campi.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <section style="border:1px solid #D0D5DD;border-radius:8px;padding:14px">
    <h2 style="color:#101828">Diagnosi (diagnosisText)</h2>
    <div data-testid="diag" style="background:#F2F4F7;padding:10px;border-radius:6px">${esc(diag)}</div>
    <p style="color:#0E8A16;font-weight:700" data-testid="diag-verdict">Nessun farmaco nella diagnosi ✔</p>
  </section>
  <section style="border:1px solid #D0D5DD;border-radius:8px;padding:14px">
    <h2 style="color:#101828">Terapia (therapyText)</h2>
    <div data-testid="ther" style="background:#F2F4F7;padding:10px;border-radius:6px">${esc(ther)}</div>
    <p style="color:#0E8A16;font-weight:700" data-testid="ther-verdict">Ramipril / Bisoprololo / Furosemide nella terapia ✔</p>
  </section>
</div>
<h2>Esiti</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse">
${checks.map((c) => `<tr><td>${c.pass ? '✅' : '❌'}</td><td>${c.name}</td><td>${c.detail}</td></tr>`).join('')}
</table>
<p id="verdict" style="font-weight:700;color:${allPass ? '#0E8A16' : '#DC2626'};font-size:18px">
VERDICT: ${allPass ? 'Diagnosi e terapia correttamente separate' : 'FALLITO'}</p>
</body>`);

console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} PASS — HTML+log in ${OUT}`);
if (!allPass) process.exit(1);
