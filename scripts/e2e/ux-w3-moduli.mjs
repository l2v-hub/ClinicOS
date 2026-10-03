// UX W3 — scales identical to the paper modules (Moduli/*.pdf). LOCAL synthetic stack only.
// Prereq: backend :3113 (AUTH_MODE=demo, simulator on), vite :5213, DB seeded with
// scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts.
// For each of the 6 scales: compile → preview → finalize → PDF, screenshot of the form at
// 1180x820 and 820x1180 next to the paper page, PDF page next to the paper page, total/band asserted.
// Usage: DATABASE_URL=<local DB> node scripts/e2e/ux-w3-moduli.mjs [outDir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';
import { pdfToPngs } from './lib/pdf-to-png.mjs';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5213';
const API = process.env.API ?? 'http://127.0.0.1:3113';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux-direct-access-cycle/w3';
const MODULI = process.env.MODULI ?? 'Moduli';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
for (const dir of ['screens', 'pdf', 'paper', 'compare'])
  mkdirSync(`${OUT}/${dir}`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');

const results = [];
const consoleErrors = [];
const httpErrors = [];
function check(id, name, ok, detail = '') {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}
const browser = await chromium.launch();

async function login(role, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500 || (r.status() >= 400 && !/\/auth\/|favicon/.test(r.url())))
      httpErrors.push(`${role} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(1000);
  return { context, page };
}
async function openModuli(page, patientId = NANNI) {
  await page.goto(`${FRONT}/#/dettaglio-paziente/${patientId}`);
  await page.waitForTimeout(1500);
  await page.locator('.top-nav__item', { hasText: 'Moduli' }).first().click();
  await page.locator('.assessment-catalog-row').first().waitFor({ timeout: 20000 });
}
/** Paper page images (rendered once from Moduli/*.pdf). */
const paperPages = {};
async function paperImages(scale) {
  if (!paperPages[scale.key]) {
    const bytes = readFileSync(`${MODULI}/${scale.paper}`);
    paperPages[scale.key] = await pdfToPngs(browser, bytes, `${OUT}/paper/${scale.key}`, {
      scale: 1.4,
    });
  }
  return paperPages[scale.key];
}
/** Side-by-side composition: app image(s) on the left, paper page(s) on the right. */
async function compose(name, left, right, caption) {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const img = (file) =>
    `<img src="data:image/png;base64,${readFileSync(file).toString('base64')}" style="width:100%;border:1px solid #ccc;margin-bottom:8px">`;
  await page.setContent(`<!doctype html><body style="margin:12px;font:14px system-ui;background:#fff">
    <h2 style="margin:0 0 8px">${caption}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
      <div><h3>ClinicOS</h3>${left.map(img).join('')}</div>
      <div><h3>Modulo cartaceo (Moduli/)</h3>${right.map(img).join('')}</div>
    </div></body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/compare/${name}.png`, fullPage: true });
  await page.close();
}
const sheet = (page, type) => page.locator(`.paper-sheet--${type}`).first();
/** Element screenshots of a tall sheet: unclip scroll containers and sticky bars for the capture only. */
async function shotOf(page, locator, path) {
  const handle = await locator.elementHandle();
  await page.evaluate((el) => {
    const saved = [];
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      saved.push([node, node.getAttribute('style')]);
      node.style.overflow = 'visible';
      node.style.height = 'auto';
      node.style.maxHeight = 'none';
    }
    for (const sticky of document.querySelectorAll('.assessment-patient, .compact-topbar, .chart-sections')) {
      saved.push([sticky, sticky.getAttribute('style')]);
      sticky.style.position = 'static';
    }
    window.__w3undo = saved;
  }, handle);
  await page.waitForTimeout(200);
  await locator.screenshot({ path });
  await page.evaluate(() => {
    for (const [node, style] of (window.__w3undo ?? []).reverse()) {
      if (style === null) node.removeAttribute('style');
      else node.setAttribute('style', style);
    }
  });
}
/** Picks the option with the given value for an item (clicking the paper row, as on a tablet). */
async function pick(page, type, key, value) {
  const radios = sheet(page, type).locator(`input[data-field-path="${key}"]`);
  const count = await radios.count();
  for (let i = 0; i < count; i++) {
    const label = await radios.nth(i).getAttribute('aria-label');
    if (label && label.endsWith(`: ${value}`)) {
      await radios.nth(i).click();
      return;
    }
  }
  throw new Error(`${type}.${key}: option «${value}» not found`);
}

const SCALES = [
  {
    key: 'barthel',
    type: 'barthel',
    label: 'Indice di Barthel',
    paper: 'scala_barthel_260818_130119.pdf',
    answers: {
      alimentazione: 'Autonomo (capace di mangiare cibo preparato nel piatto)',
      igiene: 'Dipendente',
      curaPersona: 'Autonomo (lavare viso, pettinarsi, lavare i denti, radersi)',
      abbigliamento:
        'Necessita di aiuto (es. allacciare scarpe, cerniere, ecc.) ma svolge almeno metà del lavoro',
      intestino: "Continente (autonomo nell'uso di supposte/clisteri se necessari)",
      vescica: 'Occasionali incidenti (massimo 1 nelle 24 ore)',
      gabinetto: "Necessita di aiuto per l'equilibrio, pulirsi, svestirsi o vestirsi",
      trasferimenti: 'Piccolo aiuto (supervisione verbale o leggero supporto)',
      deambulazione: "Cammina con l'aiuto di una persona per oltre 50 metri",
      scale: 'Necessita di aiuto o supervisione',
    },
    total: 65,
    maximum: 100,
    band: 'Dipendenza moderata',
  },
  {
    key: 'tinetti',
    type: 'tinetti',
    label: 'Tinetti',
    paper: 'scala_tinetti_260818_125856.pdf',
    answers: {
      equilibrioSeduto: 'Sicuro, saldo, stabile',
      alzarsi: 'Capace, ma usa le braccia per spingersi',
      tentativiAlzarsi: 'Capace al primo tentativo',
      equilibrioImmediato: "Stabile ma usa deambulatore/bastone o allarga la base d'appoggio",
      equilibrioProlungato: 'Stabile a base stretta senza supporto',
      rombergSpinta: 'Oscilla, si afferra ma si mantiene in piedi',
      occhiChiusi: 'Stabile',
      girarsi360Passi: 'Passi continui',
      girarsi360Stabilita: 'Instabile (si afferra, oscilla)',
      sedersi: 'Usa le braccia o il movimento non è fluido',
      iniziazione: 'Nessuna esitazione',
      lunghezzaPassoDx: 'Piede DX supera il SX',
      altezzaPassoDx: 'Il piede DX si stacca completamente da terra',
      lunghezzaPassoSx: 'Piede SX supera il DX',
      altezzaPassoSx: 'Il piede SX non si stacca completamente da terra',
      simmetria: 'Passo DX e SX appaiono di lunghezza uguale',
      continuita: 'I passi appaiono continui',
      traiettoria: 'Lieve/moderata deviazione o usa ausilio per mantenere la rotta',
      tronco: 'Flessione delle ginocchia o del tronco o allargamento delle braccia',
      cammino: 'Talloni quasi si toccano durante la deambulazione',
    },
    total: 20, // balance 1+1+2+1+2+1+1+1+0+1 = 11 · gait 1+1+1+1+0+1+1+1+1+1 = 9
    maximum: 28,
    band: 'Rischio caduta moderato',
  },
  {
    key: 'gds15',
    type: 'gds15',
    label: 'GDS-15',
    paper: 'Scala_GDS_Geriatric_Depression_Scale_260818_123601.pdf',
    answers: Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [
        `q${i + 1}`,
        [2, 3, 4, 6, 8, 12, 14].includes(i + 1) ? 'SÌ' : 'NO',
      ]),
    ),
    // NO on 1,5,7,11,13 → 5 points; SÌ on 2,3,4,6,8,12,14 → 7 points; NO on 9,10,15 → 0
    total: 12,
    maximum: 15,
    band: 'Depressione grave',
  },
  {
    key: 'mna',
    type: 'mna',
    label: 'MNA®-SF',
    paper: 'Scala_MNA_SF_Malnutrizione_260818_123330.pdf',
    answers: {
      a: "Moderata riduzione dell'assunzione di cibo",
      b: 'Perdita di peso compresa tra 1 e 3 kg',
      c: 'In grado di alzarsi dal letto/sedia ma non esce di casa',
      d: 'No',
      e: 'Demenza moderata',
    },
    measures: { 'Peso (kg)': '58,5', 'Circonferenza del polpaccio (cm)': '29,5' }, // no height → F2
    total: 7, // 1+2+1+2+1 + F2 0
    maximum: 14,
    band: 'Malnutrito',
  },
  {
    key: 'ucla',
    type: 'ucla_npi_sleep',
    label: 'UCLA · Sonno-veglia (NPI)',
    paper: 'Scale_UCLA_Ritmo_Sonno_Veglia (1)_260818_123917.pdf',
    answers: {
      frequency: 'Frequentemente (più volte a settimana)',
      severity: 'Moderata (comporta disturbo evidente)',
      distress: 'Moderato',
    },
    total: 6,
    maximum: 12,
    band: 'Disturbo del sonno presente',
  },
  {
    key: 'painad',
    type: 'painad',
    label: 'PAINAD',
    paper: 'scala_painaid_modificata_260818_163516.pdf',
    answers: {
      respiration: 'Normale',
      negativeVocalization: 'Lamenti o gemiti occasionali. Parlare a bassa voce con tono negativo.',
      facialExpression: 'Triste, spaventata, corrucciata, smorfia occasionale.',
      bodyLanguage: 'Rigido. Pugni chiusi. Ginocchia al petto. Spinge via o colpisce.',
      consolability: 'Rassicurato o distratto dalla voce o dal contatto fisico.',
    },
    total: 5,
    maximum: 10,
    band: 'Dolore moderato',
  },
];

try {
  for (const scale of SCALES) {
    const { context, page } = await login('Infermiere 1', { width: 1180, height: 820 });
    try {
      await openModuli(page);
      await page
        .getByRole('button', { name: `Nuova compilazione ${scale.label}`, exact: true })
        .click();
      await sheet(page, scale.type).waitFor({ timeout: 20000 });
      for (const [key, value] of Object.entries(scale.answers))
        await pick(page, scale.type, key, value);
      for (const [label, value] of Object.entries(scale.measures ?? {}))
        await page.getByRole('textbox', { name: label }).fill(value);
      await page.waitForTimeout(400);
      const live = Number(
        await sheet(page, scale.type).locator('[data-testid="paper-total"]').innerText(),
      );
      check(
        `${scale.key}-live`,
        `${scale.key}: live total on the paper sheet`,
        live === scale.total,
        `${live}/${scale.maximum}`,
      );
      if (scale.type === 'mna') {
        const f2 = await sheet(page, 'mna')
          .locator('input[data-field-path="f2"]:checked')
          .getAttribute('aria-label');
        check(
          'mna-f2',
          'MNA-SF: F2 auto-selected from calf circumference when BMI is unavailable',
          /minore di 31 cm/.test(f2 ?? ''),
          f2 ?? '',
        );
      }
      await shotOf(page, sheet(page, scale.type), `${OUT}/screens/${scale.key}-form-1180x820.png`);
      await page.screenshot({ path: `${OUT}/screens/${scale.key}-form-1180x820-viewport.png` });
      await page.setViewportSize({ width: 820, height: 1180 });
      await page.waitForTimeout(500);
      await shotOf(page, sheet(page, scale.type), `${OUT}/screens/${scale.key}-form-820x1180.png`);
      await page.screenshot({ path: `${OUT}/screens/${scale.key}-form-820x1180-viewport.png` });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(
        `${scale.key}-portrait`,
        `${scale.key}: no horizontal page scroll at 820x1180`,
        overflow <= 1,
        `overflow ${overflow}px`,
      );
      await page.setViewportSize({ width: 1180, height: 820 });
      await page.getByRole('button', { name: 'Salva e verifica anteprima' }).click();
      await page.getByRole('button', { name: 'Conferma e finalizza' }).waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: 'Conferma e finalizza' }).click();
      await page.getByText('Valutazione finale salvata.').waitFor({ timeout: 30000 });
      const finalSheet = page.locator('.paper-summary .paper-sheet').first();
      const finalTotal = Number(
        await finalSheet.locator('[data-testid="paper-total"]').innerText(),
      );
      const state = (await finalSheet.locator('.paper-total__state').innerText()).trim();
      check(
        `${scale.key}-final`,
        `${scale.key}: final sheet total and band`,
        finalTotal === scale.total && state === scale.band,
        `${finalTotal}/${scale.maximum} · ${state}`,
      );
      check(
        `${scale.key}-readonly`,
        `${scale.key}: final sheet is read-only`,
        (await finalSheet.locator('input').count()) === 0,
      );
      await shotOf(page, finalSheet, `${OUT}/screens/${scale.key}-final.png`);
      // PDF: wait until archived, then read the archived bytes
      let row;
      for (let attempt = 0; attempt < 30; attempt++) {
        row = (
          await db.query(
            `SELECT a.id, a."formVersion", a."finalSnapshot"->'result' AS result, d."dataBase64"
             FROM "PatientAssessment" a LEFT JOIN "PatientDocument" d ON d."assessmentId" = a.id
             WHERE a."patientId" = $1 AND a.type = $2 AND a.status = 'final'
             ORDER BY a."finalizedAt" DESC LIMIT 1`,
            [NANNI, scale.type],
          )
        ).rows[0];
        if (row?.dataBase64) break;
        const refresh = page.getByRole('button', { name: 'Aggiorna stato PDF' });
        if (await refresh.isVisible().catch(() => false)) await refresh.click();
        await page.waitForTimeout(1000);
      }
      check(
        `${scale.key}-db`,
        `${scale.key}: stored result`,
        row?.result?.total === scale.total,
        `${row?.formVersion} ${JSON.stringify(row?.result)}`,
      );
      check(`${scale.key}-pdf`, `${scale.key}: PDF archived`, !!row?.dataBase64);
      if (row?.dataBase64) {
        const bytes = Buffer.from(row.dataBase64, 'base64');
        writeFileSync(`${OUT}/pdf/${scale.key}.pdf`, bytes);
        const pdfPages = await pdfToPngs(browser, bytes, `${OUT}/pdf/${scale.key}`, { scale: 1.4 });
        const paper = await paperImages(scale);
        await compose(
          `${scale.key}-pdf-vs-paper`,
          pdfPages,
          paper,
          `${scale.label} — PDF generato vs modulo cartaceo`,
        );
        await compose(
          `${scale.key}-form-vs-paper`,
          [`${OUT}/screens/${scale.key}-form-1180x820.png`],
          paper,
          `${scale.label} — form a schermo (1180x820) vs modulo cartaceo`,
        );
        await compose(
          `${scale.key}-portrait-vs-paper`,
          [`${OUT}/screens/${scale.key}-form-820x1180.png`],
          paper,
          `${scale.label} — form a schermo (820x1180) vs modulo cartaceo`,
        );
        const pdfOpen = page.getByRole('button', { name: 'Apri PDF' });
        if (!(await pdfOpen.isVisible().catch(() => false))) {
          const refresh = page.getByRole('button', { name: 'Aggiorna stato PDF' });
          if (await refresh.isVisible().catch(() => false)) await refresh.click();
        }
        check(
          `${scale.key}-pdf-ui`,
          `${scale.key}: «Apri PDF» offered in the final view`,
          await pdfOpen
            .waitFor({ timeout: 15000 })
            .then(() => true)
            .catch(() => false),
        );
      }
    } catch (error) {
      check(`${scale.key}-flow`, `${scale.key}: flow`, false, String(error).slice(0, 300));
      await page.screenshot({ path: `${OUT}/screens/${scale.key}-error.png` }).catch(() => {});
    } finally {
      await context.close();
    }
  }

  // OSS (read-only role): catalog without «Nuova compilazione» (F15). Own-scope resident (Nanni is outside it).
  {
    const olga = (await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P4-Olga-Verdi'`)).rows[0]?.id;
    const { context, page } = await login('OSS 1', { width: 1180, height: 820 });
    try {
      await openModuli(page, olga);
      const creates = await page.locator('.assessment-catalog [aria-label^="Nuova compilazione"]').count();
      const opens = await page.locator('.assessment-catalog [aria-label^="Apri "]').count();
      check('oss-f15', 'OSS: no «Nuova compilazione» in the catalog, «Apri» still available', creates === 0 && opens === 10, `create ${creates} · open ${opens}`);
      await page.screenshot({ path: `${OUT}/screens/oss-catalog.png`, fullPage: false });
      await page.getByRole('button', { name: 'Apri Indice di Barthel', exact: true }).click();
      await page.getByText('Storico valutazioni').first().waitFor({ timeout: 20000 });
      check('oss-no-new', 'OSS: no «Nuova compilazione»/«Crea rettifica» in the Barthel workspace',
        (await page.getByRole('button', { name: /Nuova compilazione|Nuova valutazione|Crea rettifica/ }).count()) === 0);
      await page.screenshot({ path: `${OUT}/screens/oss-barthel-workspace.png` });
    } catch (error) {
      check('oss-flow', 'OSS flow', false, String(error).slice(0, 300));
    } finally {
      await context.close();
    }
  }

  // Legacy v1 record stays readable with its own wording (Tinetti v1 created through the API)
  {
    const session = await (
      await fetch(`${API}/auth/simulator/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId: 'SIM-NURSE-1' }),
      })
    ).json();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };
    const keys = [
      'equilibrioSeduto',
      'alzarsi',
      'tentativiAlzarsi',
      'equilibrioImmediato',
      'equilibrioProlungato',
      'rombergSpinta',
      'occhiChiusi',
      'girarsi360Passi',
      'girarsi360Stabilita',
      'sedersi',
      'iniziazione',
      'lunghezzaPassoDx',
      'altezzaPassoDx',
      'lunghezzaPassoSx',
      'altezzaPassoSx',
      'simmetria',
      'continuita',
      'traiettoria',
      'tronco',
      'cammino',
    ];
    const create = await fetch(`${API}/patients/${NANNI}/assessments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        type: 'tinetti',
        formVersion: 'tinetti-it-2026-09-22-v1',
        assessedAt: '2026-09-25T08:00:00.000Z',
        answers: {
          ...Object.fromEntries(keys.map((k) => [k, 1])),
          notes: 'Scheda v1 (wording precedente)',
        },
      }),
    });
    const created = await create.json().catch(() => ({}));
    const id = created.assessment?.id;
    const finalized = id
      ? await fetch(`${API}/patients/${NANNI}/assessments/${id}/finalize`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: 1 }),
        })
      : null;
    check(
      'legacy-v1-api',
      'Tinetti v1 still created and finalized through the API (old version stays valid)',
      !!id && finalized?.ok === true,
      `${create.status} ${finalized?.status}`,
    );
    const { context, page } = await login('Infermiere 1', { width: 1180, height: 820 });
    try {
      await openModuli(page);
      await page.getByRole('button', { name: 'Apri Tinetti', exact: true }).click();
      await page.getByText('Storico valutazioni').first().waitFor({ timeout: 20000 });
      const legacy = page
        .locator('.assessment-history__list li', { hasText: '25/09/2026' })
        .first();
      await legacy.getByRole('button', { name: 'Apri valutazione' }).click();
      await page.getByText('Equilibrio seduto').first().waitFor({ timeout: 20000 });
      check(
        'legacy-v1-ui',
        'finalized Tinetti v1 opens with its original wording (no paper re-write)',
        (await page.locator('.paper-summary').count()) === 0,
      );
      await page.screenshot({ path: `${OUT}/screens/legacy-tinetti-v1.png`, fullPage: false });
    } catch (error) {
      check('legacy-v1-ui', 'legacy v1 UI', false, String(error).slice(0, 300));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await db.end();
}
check(
  'console',
  'no console errors',
  consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join(' | '),
);
check(
  'http',
  'no HTTP >= 400 (except auth)',
  httpErrors.length === 0,
  httpErrors.slice(0, 5).join(' | '),
);
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify({ results, consoleErrors, httpErrors }, null, 2),
);
const failed = results.filter((row) => row.result === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
