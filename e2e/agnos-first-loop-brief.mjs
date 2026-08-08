#!/usr/bin/env node
// Smoke con page.route: nessun backend reale. Verifica brief automatico, persistenza pannello,
// navigazione da chip.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5174';
const OUT = process.argv[2] ?? '.';
mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const FACILITY_READ = {
  intent: 'facility_snapshot',
  scope: 'cross_patient',
  results: [
    {
      generatedAt: new Date().toISOString(),
      occupancy: {
        totalRooms: 12,
        totalBeds: 30,
        occupiedBeds: 24,
        freeBeds: 5,
        maintenanceBeds: 1,
        occupancyPct: 80,
      },
      therapiesOverdueCount: 3,
      therapiesOverdue: [
        {
          patientId: 'p1',
          patientName: 'Rossi Mario',
          therapyId: 't1',
          drugName: 'Ramipril',
          scheduledTime: '08:00',
          minutesLate: 45,
          minutesUntil: 0,
          room: '1',
          bed: 'A',
          fascia: 'mattino',
        },
      ],
      consegneOverdueCount: 2,
      consegneOverdue: [
        {
          id: 'c1',
          pazienteId: 'p2',
          pazienteNome: 'Bianchi Anna',
          tipo: 'medicazione',
          priorita: 'alta',
          stato: 'aperta',
          note: '',
          scadenza: '2026-08-08',
          oraScadenza: '09:00',
          operatoreAssegnato: '',
        },
      ],
      appointmentsTodayCount: 7,
    },
  ],
  sources: [],
  navigation: [
    { type: 'open_therapies_today', label: 'Apri le terapie di oggi' },
    { type: 'open_consegne', label: 'Apri consegne', recordId: 'c1' },
    { type: 'open_agenda', label: 'Apri agenda' },
    { type: 'open_beds', label: 'Apri posti letto' },
  ],
  notFound: false,
  truncated: false,
};

const OPERATOR_READ = {
  intent: 'operator_queue',
  scope: 'cross_patient',
  results: [
    {
      generatedAt: new Date().toISOString(),
      windowMinutes: 120,
      operatorName: 'Maria Bianchi',
      scope: 'reparto',
      therapiesOverdueCount: 2,
      therapiesOverdue: [
        {
          patientId: 'p1',
          patientName: 'Rossi Mario',
          therapyId: 't1',
          drugName: 'Ramipril',
          scheduledTime: '08:00',
          minutesLate: 45,
          minutesUntil: 0,
          room: '1',
          bed: 'A',
          fascia: 'mattino',
        },
      ],
      therapiesDueSoonCount: 3,
      therapiesDueSoon: [
        {
          patientId: 'p2',
          patientName: 'Bianchi Anna',
          therapyId: 't2',
          drugName: 'Metformina',
          scheduledTime: '12:00',
          minutesLate: 0,
          minutesUntil: 40,
          room: '2',
          bed: 'B',
          fascia: 'pranzo',
        },
      ],
      myLikelyConsegneCount: 1,
      myLikelyConsegne: [
        {
          id: 'c1',
          pazienteId: 'p2',
          pazienteNome: 'Bianchi Anna',
          tipo: 'medicazione',
          priorita: 'alta',
          stato: 'aperta',
          note: '',
          scadenza: '2026-08-08',
          oraScadenza: '09:00',
          operatoreAssegnato: 'Maria Bianchi',
        },
      ],
      otherOpenConsegneCount: 4,
      otherOpenConsegne: [
        {
          id: 'c2',
          pazienteId: 'p3',
          pazienteNome: 'Verdi Luca',
          tipo: 'controllo',
          priorita: 'normale',
          stato: 'aperta',
          note: '',
          scadenza: '2026-08-09',
          oraScadenza: null,
          operatoreAssegnato: 'Altro',
        },
      ],
    },
  ],
  sources: [],
  navigation: [{ type: 'open_consegne', label: 'Apri consegne', recordId: 'c1' }],
  notFound: false,
  truncated: false,
};

const browser = await chromium.launch();

async function session(role) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await ctx.newPage();
  const planCalls = [];
  const consoleErrors = [];
  page.on('console', (m) => {
    // Le fetch verso :3001 sono abortite di proposito da questo mock: non sono errori dell'app.
    if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) consoleErrors.push(m.text());
  });
  // Ogni altra chiamata al backend fallisce: la app deve cadere sui dati mock. Registrata PRIMA
  // della rotta del planner: Playwright dà la precedenza all'ultima registrata.
  await page.route('**/localhost:3001/**', (r) => r.abort());
  await page.route('**/ai/actions/plan', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    planCalls.push(body);
    const read = /succed/i.test(body.text ?? '') ? FACILITY_READ : OPERATOR_READ;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: { actionType: 'read' },
        preview: null,
        read,
      }),
    });
  });
  await page.goto(FRONTEND + '/', { waitUntil: 'domcontentloaded' });
  await page.locator(`text="${role}"`).first().click();
  await page.waitForTimeout(1200);
  return { page, planCalls, consoleErrors, ctx };
}

try {
  // ── Admin: facility snapshot ──
  {
    const { page, planCalls, consoleErrors } = await session('Amministratore');
    await page.click('.ai-fab');
    await page.waitForSelector('.agnos-brief', { timeout: 5000 });
    await page.waitForTimeout(800);
    ok(
      'AC7 admin: il brief parte da solo senza input',
      planCalls.length === 1,
      JSON.stringify(planCalls[0]),
    );
    ok(
      'AC4: navKey viaggia nella richiesta',
      typeof planCalls[0]?.navKey === 'string',
      String(planCalls[0]?.navKey),
    );
    const brief = await page.locator('.agnos-brief').innerText();
    ok('brief facility: occupazione', brief.includes('24/30'), brief.split('\n')[1]);
    ok('brief facility: eyebrow', /situazione struttura/i.test(brief));
    ok(
      'brief facility: terapie in ritardo',
      /Terapie in ritardo/.test(brief) && /\b3\b/.test(brief),
    );
    ok('brief facility: appuntamenti oggi', /Appuntamenti oggi/.test(brief));
    ok(
      'brief facility: timestamp',
      /rilevato alle \d{2}:\d{2}/.test(brief),
      brief.split('\n').pop(),
    );
    const chips = await page.locator('.agnos-brief .srev-chip').allInnerTexts();
    ok(
      'chip senza verbo del backend',
      chips.length > 0 && !chips.some((c) => c.startsWith('Apri ')),
      JSON.stringify(chips),
    );
    ok('chip occupazione: Posti letto', chips.includes('Posti letto'), JSON.stringify(chips));
    await page.screenshot({ path: join(OUT, 'brief-admin.png') });

    // AC6: chiudo → il pannello resta nel DOM, nascosto e inerte
    await page.click('.agnos-panel .ai-drawer__header .icon-btn:last-child');
    await page.waitForTimeout(500);
    const hidden = await page.locator('.agnos-panel').getAttribute('aria-hidden');
    const inert = await page.locator('.agnos-panel').evaluate((el) => el.hasAttribute('inert'));
    ok(
      'AC6: pannello montato ma nascosto',
      hidden === 'true' && inert,
      `aria-hidden=${hidden} inert=${inert}`,
    );

    // Riapro: nessuna seconda fetch del brief
    await page.click('.ai-fab');
    await page.waitForTimeout(800);
    ok(
      'brief recuperato una sola volta per sessione',
      planCalls.length === 1,
      `chiamate=${planCalls.length}`,
    );
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    ok('riapertura: focus sul campo di testo', focused.includes('agnos-input'), focused);

    // AC5: un chip di reparto naviga davvero
    await page.locator('.agnos-brief .srev-chip', { hasText: 'Consegne' }).first().click();
    await page.waitForTimeout(800);
    const hash = await page.evaluate(() => location.hash);
    ok('AC5: chip Consegne naviga', hash.includes('consegne'), hash);
    await page.screenshot({ path: join(OUT, 'nav-consegne.png') });

    await page.locator('.agnos-brief .srev-chip', { hasText: 'Posti letto' }).first().click();
    await page.waitForTimeout(800);
    const hashBeds = await page.evaluate(() => location.hash);
    ok('AC5: chip Posti letto naviga', hashBeds.includes('posti-letto'), hashBeds);
    ok('AC-R5: nessun errore console', consoleErrors.length === 0, consoleErrors.join(' | '));
    await page.screenshot({ path: join(OUT, 'nav-posti-letto.png') });
  }

  // ── Operatore: coda di lavoro ──
  {
    const { page, planCalls, consoleErrors } = await session('Operatore');
    await page.click('.ai-fab');
    await page.waitForSelector('.agnos-brief', { timeout: 5000 });
    await page.waitForTimeout(800);
    const brief = await page.locator('.agnos-brief').innerText();
    ok(
      'AC7 operatore: brief automatico',
      planCalls.length === 1 && /devo fare/i.test(planCalls[0].text),
      planCalls[0]?.text,
    );
    ok('brief operatore: eyebrow', /la giornata di oggi/i.test(brief));
    ok('brief operatore: totale attività', /\b10\b/.test(brief), brief.split('\n')[1]);
    ok('brief operatore: riga in ritardo', /in ritardo di 45 min/.test(brief));
    ok('brief operatore: riga in scadenza', /tra 40 min/.test(brief));
    ok('brief operatore: suffisso onesto', brief.includes('assegnato a te'));
    ok('brief operatore: disclaimer non esclusivo', brief.includes('non è un elenco esclusivo'));
    ok('brief operatore: troncamento', /Vedi tutte le 10 attività/.test(brief));
    ok('AC-R5: nessun errore console', consoleErrors.length === 0, consoleErrors.join(' | '));
    await page.screenshot({ path: join(OUT, 'brief-operatore.png') });
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
