// Evidenza browser: giro terapia per ora reale e per paziente. Stub :3001; le fasce della terapia
// sono simulate con page.route (ore reali 07:00, 08:00, 12:00, 16:00, 18:00, 20:00 dentro le fasce
// del server mattina/pranzo/pomeriggio/sera).
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/terapia-fasce-dalle-ore-reali-e-giro-raggruppato-per-paziente';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const roster = await (await fetch('http://localhost:3001/patients/page?limit=50')).json();
const byName = (last, first) =>
  roster.items.find((p) => p.lastName === last && p.firstName === first);
const A = byName('Moretti', 'Davide');
const B = byName('Moretti', 'Luca');
const C = byName('Rossi', 'Anna');
if (!A || !B || !C) throw new Error('pazienti dello stub cambiati');
const pt = (p) => ({
  patientId: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  codiceFiscale: p.codiceFiscale ?? null,
  dateOfBirth: p.dateOfBirth ?? null,
  location: { status: 'assigned', room: '10' + (roster.items.indexOf(p) % 9), bed: 'A' },
  room: '',
  bed: '',
});
const adm = (id, drug, time, status = 'pending', extra = {}) => ({
  administrationId: status === 'pending' ? null : `x-${id}`,
  therapyId: id,
  drugName: drug,
  dosage: '1 cp',
  quantityLabel: null,
  route: 'orale',
  scheduledTime: time,
  status,
  administeredAt: status === 'administered' ? new Date().toISOString() : null,
  administeredBy: status === 'administered' ? 'L. Conti' : null,
  notAdministeredReason: null,
  ...extra,
});
const sum = (patients) => {
  const all = patients.flatMap((p) => p.administrations);
  return {
    total: all.length,
    administered: all.filter((a) => a.status === 'administered').length,
    notAdministered: all.filter((a) => a.status === 'not_administered').length,
    pending: all.filter((a) => a.status === 'pending').length,
  };
};
const slot = (fascia, ora, label, patients) => ({
  id: fascia,
  fascia,
  ora,
  label,
  summary: sum(patients),
  patients,
});
function page({ partial = false } = {}) {
  const mattina = [
    {
      ...pt(A),
      administrations: [
        adm('a1', 'Levotiroxina 50 mcg', '07:00'),
        adm('a2', 'Cardioaspirin 100 mg', '08:00', 'administered'),
        adm('a3', 'Ramipril 5 mg', '08:00'),
      ],
    },
    {
      ...pt(B),
      administrations: [
        adm('b1', 'Pantoprazolo 20 mg', '07:00'),
        adm('b2', 'Metformina 500 mg', '08:00'),
      ],
    },
  ];
  const slots = [
    slot('mattina', '07:00', 'Terapia Mattina', mattina),
    slot('pranzo', '12:00', 'Terapia Pranzo', [
      { ...pt(A), administrations: [adm('a4', 'Metformina 500 mg', '12:00')] },
      { ...pt(C), administrations: [adm('c1', 'Furosemide 25 mg', '12:00')] },
    ]),
    slot('pomeriggio', '16:00', 'Terapia Pomeriggio', [
      { ...pt(C), administrations: [adm('c2', 'Paracetamolo 1 g', '16:00')] },
    ]),
    slot('sera', '18:00', 'Terapia Sera', [
      {
        ...pt(A),
        administrations: [
          adm('a5', 'Enoxaparina 4000 UI', '18:00'),
          adm('a6', 'Atorvastatina 20 mg', '20:00'),
        ],
      },
      { ...pt(C), administrations: [adm('c3', 'Bisoprololo 2,5 mg', '20:00')] },
    ]),
  ];
  return {
    slots,
    pageInfo: {
      hasMore: partial,
      nextCursor: partial ? 'c2' : null,
      loadedTherapies: 11,
      completeness: partial ? 'partial' : 'complete',
      summaryExact: true,
    },
  };
}

const browser = await chromium.launch();
async function open(width, { role = 'Operatore', partial = false } = {}) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  const posts = [];
  // risposta reale dello stub (metadati del giro validi), con le fasce sostituite dai dati di prova
  await p.route(/\/therapy-slots\/page(\?.*)?$/, async (route) => {
    const real = await (await route.fetch()).json();
    const fake = page({ partial });
    route.fulfill({
      json: { ...real, slots: fake.slots, pageInfo: { ...real.pageInfo, ...fake.pageInfo } },
    });
  });
  await p.route(/\/therapy-slots\/(confirm|not-administered)$/, (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    route.fulfill({ json: { ok: true } });
  });
  await p.goto(BASE);
  await p.getByText(role, { exact: true }).first().click();
  await p.waitForTimeout(1200);
  if (width < 1024) await p.getByRole('button', { name: 'Apri menu' }).click();
  await p.locator('.teams-sidebar__item[title="Terapia"]').click();
  await p.waitForSelector('.giro-slots', { timeout: 15000 }).catch(async (e) => {
    await p.screenshot({ path: `${DIR}/screenshots/debug.png` });
    console.log('DEBUG', (await p.locator('main').innerText()).slice(0, 400));
    throw e;
  });
  await p.waitForTimeout(400);
  return { p, posts };
}
const chips = (p) => p.locator('.giro-slot').allTextContents();

{
  const { p, posts } = await open(1180);
  const c = await chips(p);
  check(
    'AC1 sei fasce dalle ore reali, in ordine, con fatte/totale calcolato per ora',
    JSON.stringify(c) ===
      JSON.stringify([
        '07:00 · 0/2',
        '08:00 · 1/3',
        '12:00 · 0/2',
        '16:00 · 0/1',
        '18:00 · 0/1',
        '20:00 · 0/2',
      ]),
    JSON.stringify(c),
  );
  const pressed = await p.locator('.giro-slot[aria-pressed="true"]').textContent();
  check('AC1 ora iniziale: la prima con farmaci da fare (07:00)', /^07:00/.test(pressed), pressed);
  await p.locator('.giro-slot', { hasText: '08:00' }).click();
  await p.waitForTimeout(300);
  const groups = await p.evaluate(() =>
    [...document.querySelectorAll('.giro-patient')].map((g) => ({
      name: g.querySelector('.giro-patient__head .giro-row__name')?.textContent,
      drugs: [...g.querySelectorAll('.giro-drug__name')].map((d) => d.textContent),
      nameFont: getComputedStyle(g.querySelector('.giro-row__name')).font,
      drugFont: getComputedStyle(g.querySelector('.giro-drug__name')).font,
    })),
  );
  check(
    "AC2 alle 08:00 un gruppo per paziente con tutti i suoi farmaci di quell'ora",
    groups.length === 2 &&
      groups[0].name === `${A.lastName}, ${A.firstName}` &&
      JSON.stringify(groups[0].drugs) ===
        JSON.stringify(['Cardioaspirin 100 mg 1 cp', 'Ramipril 5 mg 1 cp']) &&
      JSON.stringify(groups[1].drugs) === JSON.stringify(['Metformina 500 mg 1 cp']),
    JSON.stringify(groups.map((g) => [g.name, g.drugs])),
  );
  check(
    'AC2 nome del paziente con il carattere di prima (600 16px), farmaco con carattere diverso e più piccolo',
    /^600 16px/.test(groups[0].nameFont) && /^500 14px/.test(groups[0].drugFont),
    JSON.stringify({ name: groups[0].nameFont, drug: groups[0].drugFont }),
  );
  await p.screenshot({ path: `${DIR}/screenshots/giro-per-paziente-1180.png` });
  // azione: Somministra Ramipril (08:00, fascia server mattina)
  await p.getByRole('button', { name: /^Erogata: .*Ramipril/ }).click();
  await p.waitForTimeout(600);
  const focus = await p.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.className,
  );
  // non somministrata: Enoxaparina alle 18:00 (fascia server sera)
  await p.locator('.giro-slot', { hasText: '18:00' }).click();
  await p.getByRole('button', { name: /^Non erogata: .*Enoxaparina/ }).click();
  await p.getByRole('button', { name: /^Rifiutata dal paziente: .*Enoxaparina/ }).click();
  await p.getByRole('button', { name: /^Conferma non erogata: .*Enoxaparina/ }).click();
  await p.waitForTimeout(600);
  const [c1, c2] = posts;
  check(
    'AC3 le azioni inviano le stesse richieste: fascia del server (mattina / sera), therapyId, data, ora reale',
    posts.length === 2 &&
      /\/confirm$/.test(c1.url) &&
      c1.body.therapyId === 'a3' &&
      c1.body.fascia === 'mattina' &&
      c1.body.ora === '08:00' &&
      /\/not-administered$/.test(c2.url) &&
      c2.body.therapyId === 'a5' &&
      c2.body.fascia === 'sera' &&
      c2.body.ora === '18:00' &&
      c2.body.motivo === 'rifiutata_paziente',
    JSON.stringify(
      posts.map((x) => ({
        u: x.url.split('/').pop(),
        t: x.body.therapyId,
        f: x.body.fascia,
        o: x.body.ora,
        m: x.body.motivo,
      })),
    ),
  );
  check(
    'AC3 dopo "Somministra" il fuoco resta sul farmaco',
    /Ramipril|giro-drug/.test(focus ?? ''),
    focus,
  );
  // filtro per stato sui farmaci
  await p.locator('.giro-slot', { hasText: '08:00' }).click();
  await p.locator('.giro-filters .ds-chip', { hasText: /^Erogate/ }).click();
  await p.waitForTimeout(300);
  const onlyDone = await p.locator('.giro-drug__name').allTextContents();
  check(
    'AC3 il filtro "Erogate" mostra solo i farmaci erogati, raggruppati',
    JSON.stringify(onlyDone) === JSON.stringify(['Cardioaspirin 100 mg 1 cp']),
    JSON.stringify(onlyDone),
  );
  await p.close();
}
{
  const { p } = await open(1180, { role: 'Amministratore' });
  const sign = await p.getByRole('button', { name: /^(Erogata|Non erogata):/ }).count();
  const due = await p.locator('.giro-badge--due').count();
  check(
    'AC3 amministratore in sola lettura: nessuna firma, farmaci "Da erogare"',
    sign === 0 && due > 0,
    JSON.stringify({ sign, due }),
  );
  await p.close();
}
{
  const { p } = await open(1180, { partial: true });
  const note = await p.locator('.giro-note-box').textContent();
  check(
    'AC4 caricamento parziale dichiarato: conteggi sulle terapie caricate, non esatti',
    /Visualizzazione parziale/.test(note) && /terapie caricate/.test(note) && !/esatti/.test(note),
    note.slice(0, 140),
  );
  await p.close();
}
{
  // calendario → giro: la fascia "sera" apre la prima ora reale (18:00)
  const { p } = await open(1180);
  await p.getByRole('button', { name: /Calendario/ }).click();
  await p.waitForTimeout(1500);
  // la cella di oggi (lo stub accetta solo la data odierna)
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const cell = p.locator(`.tcal__btn[aria-label^="${today}, ore 18:00"]`).first();
  if (await cell.count()) {
    await cell.click();
    await p.waitForTimeout(800);
    const pressed = await p.locator('.giro-slot[aria-pressed="true"]').textContent();
    check(
      'AC4 dal calendario la fascia della sera apre il giro sulla prima ora reale (18:00)',
      /^18:00/.test(pressed),
      pressed,
    );
  } else
    check(
      'AC4 dal calendario la fascia della sera apre il giro sulla prima ora reale (18:00)',
      false,
      'cella non trovata',
    );
  await p.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const { p } = await open(width);
  await p.locator('.giro-slot', { hasText: '08:00' }).click();
  await p.waitForTimeout(300);
  const s = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    clipped: [...document.querySelectorAll('.giro-drug .ds-btn')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.right > innerWidth + 1 || r.left < -1;
    }).length,
  }));
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, azioni dei farmaci dentro lo schermo`,
    s.overflow <= 0 && s.clipped === 0,
    JSON.stringify(s),
  );
  await p.screenshot({ path: `${DIR}/screenshots/giro-per-paziente-${width}.png` });
  await p.close();
}
await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
