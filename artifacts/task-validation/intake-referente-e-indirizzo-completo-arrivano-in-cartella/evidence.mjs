// Evidenza browser del ciclo 2 (referente e indirizzo).
//   W — wizard "Nuovo paziente" vero: compila anagrafica, indirizzo spezzato e referente,
//       arriva a "Crea paziente" e intercetta il payload di POST /intake/drafts/:id/confirm.
//   C — tab Contatti di un paziente con referente in cartella (patient della lista = riepilogo).
//   N — tab Contatti di un paziente senza referente: "Non indicato", niente dati inventati.
// Richiede: stub API su :3001 e preview su :4173 buildata con VITE_API_URL=http://localhost:3001.
// Le bozze di intake non esistono nello stub: le simula page.route (in memoria).
//   node artifacts/task-validation/intake-referente-e-indirizzo-completo-arrivano-in-cartella/evidence.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/intake-referente-e-indirizzo-completo-arrivano-in-cartella';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (name, ok, detail = '') =>
  log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });

// ── bozza di intake simulata ─────────────────────────────────────────────────
let draft = { id: 'draft-e2e', status: 'draft', data: {}, version: 1 };
let confirmPayload = null;
await page.route(/\/intake\/drafts(\/.*)?$/, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const body = req.postData() ? JSON.parse(req.postData()) : {};
  if (req.method() === 'GET' && url.pathname.endsWith('/intake/drafts'))
    return route.fulfill({ json: [] });
  if (req.method() === 'POST' && url.pathname.endsWith('/confirm')) {
    confirmPayload = body;
    return route.fulfill({ json: { status: 'created', patient: { id: 'p001' } } });
  }
  if (req.method() === 'POST') return route.fulfill({ status: 201, json: draft });
  if (req.method() === 'PATCH') {
    const { expectedDraftVersion: _v, ...patch } = body;
    draft = {
      ...draft,
      data: { ...draft.data, ...(patch.data ?? patch) },
      version: draft.version + 1,
    };
    return route.fulfill({ json: draft });
  }
  return route.fulfill({ json: draft });
});

// ── backend simulato come quello reale ───────────────────────────────────────
// Il riepilogo di /patients/page non porta indirizzo e referente (identity-page.ts): li tolgo.
// withRef: colonne del paziente aggiornate (come dopo un comando vocale) + copia VECCHIA in
// cartella (cartelle importate prima) → deve vincere il paziente. noRef: nulla da nessuna parte.
const roster = await (await fetch('http://localhost:3001/patients/page?limit=5')).json();
const [withRef, noRef] = roster.items;
const detailFetches = [];
await page.route(/\/patients\/page(\/search)?(\?.*)?$/, async (route) => {
  const res = await route.fetch();
  const body = await res.json();
  for (const it of body.items ?? []) delete it.address;
  await route.fulfill({ response: res, json: body });
});
await page.route(/\/patients\/[^/?]+$/, async (route) => {
  const req = route.request();
  if (req.method() !== 'GET' || /\/patients\/(page|settings)$/.test(req.url())) return route.continue();
  const res = await route.fetch();
  const body = await res.json();
  detailFetches.push(body.id);
  delete body.emergencyContactName;
  delete body.emergencyContactPhone;
  if (body.id === withRef.id)
    Object.assign(body, {
      address: 'Via Roma 1, 24100 Bergamo (BG)',
      emergencyContactName: 'Chiara Galli',
      emergencyContactPhone: '340 555 0126',
    });
  else body.address = null;
  await route.fulfill({ response: res, json: body });
});
await page.route(/\/patients\/[^/]+\/cartella$/, async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  const res = await route.fetch();
  const body = await res.json();
  for (const k of ['contattoEmergenzaNome', 'contattoEmergenzaTel', 'contattoEmergenzaRel', 'contattoEmergenzaAltro', 'indirizzo']) delete body.data[k];
  if (body.patientId === withRef.id)
    Object.assign(body.data, {
      contattoEmergenzaNome: 'Referente Vecchio',
      contattoEmergenzaTel: '000 000 0000',
      contattoEmergenzaRel: 'Figlio / Figlia',
      contattoEmergenzaAltro: 'Marco Galli, 339 555 0101',
    });
  await route.fulfill({ response: res, json: body });
});

async function step(label) {
  await page.getByRole('button', { name: label, exact: true }).last().click();
  await page.waitForTimeout(500);
}
async function fill(label, value) {
  // I campi obbligatori hanno nome accessibile "Nome *".
  await page
    .getByLabel(new RegExp('^' + label + '\\s*\\*?$'))
    .first()
    .fill(value);
}

// W — wizard
await page.goto(BASE);
await page.getByText('Operatore', { exact: true }).first().click();
await page.getByRole('button', { name: 'Pazienti' }).first().click();
await page
  .getByRole('button', { name: /Nuovo paziente/ })
  .first()
  .click();
await page
  .getByText(/Passaggio 1 di 5/)
  .first()
  .waitFor();
await fill('Nome', 'Teresa');
await fill('Cognome', 'Galli');
await fill('Indirizzo', 'Via Roma 1');
await fill('Comune', 'Bergamo');
await fill('Provincia', 'BG');
await fill('CAP', '24100');
// La sezione Referente è un <details> chiuso: si apre dal suo <summary>.
const refSection = page.locator('details.npm-card--collapsible', { has: page.getByText('Nome e cognome referente') }).first();
if (!(await refSection.evaluate((d) => d.open))) await refSection.locator('summary').click();
await fill('Nome e cognome referente', 'Chiara Galli');
const rel = page.getByLabel(/^Relazione con il paziente$/).first();
if ((await rel.evaluate((e) => e.tagName)) === 'SELECT') {
  const opts = await rel.locator('option').allTextContents();
  await rel.selectOption({ label: opts.find((o) => /figli/i.test(o)) ?? opts[1] });
} else await rel.fill('Figlia');
await fill('Telefono referente', '340 555 0126');
await fill('Contatto emergenza', 'Marco Galli, 339 555 0101');
await page.waitForTimeout(800);
await page.screenshot({ path: `${DIR}/screenshots/W1-anagrafica-compilata.png` });
for (let i = 0; i < 4; i++) {
  // Passaggi 2–4: le caselle obbligatorie (terapia rivista/nessuna terapia) vanno spuntate.
  for (const cb of await page.getByRole('checkbox').all()) {
    const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
    if (/confermo|accetta|nessuna terapia/.test(txt) && !(await cb.isChecked())) await cb.check();
  }
  if (await page.getByText(/Passaggio 5 di 5/).count()) break;
  await step('Avanti →').catch(async () => step('Avanti'));
}
for (const cb of await page.getByRole('checkbox').all()) {
  const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
  if (/confermo|accetta/.test(txt) && !(await cb.isChecked())) await cb.check();
}
await page.screenshot({ path: `${DIR}/screenshots/W2-verifica.png` });
await page
  .getByRole('button', { name: /Crea paziente|Conferma/ })
  .last()
  .click();
await page.waitForTimeout(1500);
check('W: payload di conferma inviato', !!confirmPayload);
const pp = confirmPayload?.patient ?? {};
const pc = confirmPayload?.cartella ?? {};
check(
  'W: indirizzo completo nel paziente',
  pp.address === 'Via Roma 1, 24100 Bergamo (BG)',
  `address=${JSON.stringify(pp.address)}`,
);
check(
  'W: referente nelle colonne del paziente',
  pp.emergencyContactName === 'Chiara Galli' && pp.emergencyContactPhone === '340 555 0126',
);
check(
  'W: relazione in chiaro nella cartella',
  pc.contattoEmergenzaRel === 'Figlio / Figlia',
  `rel=${JSON.stringify(pc.contattoEmergenzaRel)}`,
);
check(
  'W: nessuna copia di indirizzo o referente nella cartella (fonte unica = paziente)',
  !('indirizzo' in pc) && !('contattoEmergenzaNome' in pc) && !('contattoEmergenzaTel' in pc),
  JSON.stringify(Object.keys(pc)),
);
check(
  'W: altro contatto di emergenza nella cartella',
  pc.contattoEmergenzaAltro === 'Marco Galli, 339 555 0101',
);
writeFileSync(
  `${DIR}/logs/confirm-payload-keys.json`,
  JSON.stringify({ patient: Object.keys(pp), cartella: Object.keys(pc) }, null, 2),
);

// C / N — tab Contatti
async function openContatti(p) {
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Pazienti' }).first().click();
  await page.getByPlaceholder(/Cerca/).first().fill(p.lastName);
  await page.waitForTimeout(600);
  await page.getByText(`${p.lastName}, ${p.firstName}`).first().click();
  await page
    .locator('.patient-compact-header', { hasText: `${p.lastName}, ${p.firstName}` })
    .first()
    .waitFor();
  await page
    .getByRole('tab', { name: /Raccolta dati ingresso/ })
    .first()
    .click();
  await page
    .getByRole('tab', { name: /^Contatti$/ })
    .first()
    .click();
  await page.getByText('Telefono referente').first().waitFor();
  await page.waitForTimeout(300);
  return page.locator('.cr-profilo-group', { hasText: 'Telefono referente' }).first().innerText();
}
const c = await openContatti(withRef);
check('C: la scheda ha letto il paziente completo (GET /patients/:id)', detailFetches.includes(withRef.id));
check('C: referente aggiornato del paziente, non la copia vecchia in cartella', c.includes('Chiara Galli') && !c.includes('Referente Vecchio') && c.includes('Figlio / Figlia'));
check('C: telefono aggiornato del referente', c.includes('340 555 0126') && !c.includes('000 000 0000'));
check('C: indirizzo completo visibile', c.includes('Via Roma 1, 24100 Bergamo (BG)'));
check('C: altro contatto di emergenza visibile', c.includes('Marco Galli, 339 555 0101'));
await page.screenshot({ path: `${DIR}/screenshots/C-contatti-con-referente.png` });
const n = await openContatti(noRef);
check('N: aperto un paziente diverso', !n.includes('Chiara Galli'));
check(
  'N: referente "Non indicato", nessun dato inventato',
  /Referente\s*\n?\s*Non indicato/.test(n) && !n.includes('Altro contatto'),
);
await page.screenshot({ path: `${DIR}/screenshots/N-contatti-senza-referente.png` });

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
