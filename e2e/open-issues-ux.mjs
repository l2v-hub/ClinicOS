// Synthetic browser regressions for #405, #408, #410 and #416.
// Run against Vite: node e2e/open-issues-ux.mjs [frontendUrl] [outputDir]
// Optionally set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH for a system Chromium.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const output = resolve(process.argv[3] ?? 'artifacts/task-validation/open-issues-ux');
mkdirSync(output, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
const results = [];
const errors = [];
const patient = {
  id: 'QA-UX-P1',
  firstName: 'Persona',
  lastName: 'Sintetica',
  medicalRecordNumber: 'QA',
  codiceFiscale: 'SNTPSN80A01H501A',
};
const fixture = `<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppointmentForm} from '/src/components/shared/AppointmentForm.tsx';
import {TherapyCalendarGrid} from '/src/components/shared/TherapyCalendarGrid.tsx';
import {AdessoQueue} from '/src/components/operator/AdessoQueue.tsx';
import {TurnoAppointments} from '/src/components/operator/TurnoAppointments.tsx';
import {TurnoHandovers} from '/src/components/operator/TurnoHandovers.tsx';
import '/src/index.css'; import '/src/App.css'; import '/src/app-additions.css';
import '/src/components/operator/OperatorDashboard.css'; import '/src/design-system.css';
const h=React.createElement;
window.actions=[];
const dose=(key,patientId='QA-UX-P1')=>({key,kind:'terapia-ritardo',patientId,nome:patientId,
 dettaglio:'Farmaco '+key+' · 1 cp · orale',tempo:'In ritardo di 30 min',ora:'08:00',luogo:'Camera 1',inRitardo:true,urgenza:30,
 landing:{tab:'terapia-farmacologica',therapy:{date:'2026-10-10',fascia:'mattina',therapyId:key}}});
const items=[...Array.from({length:12},(_,i)=>dose('group-'+i)),...Array.from({length:10},(_,i)=>dose('single-'+i,'QA-P'+i)),
 ...Array.from({length:8},(_,i)=>({...dose('check-'+i),kind:'anomalia-farmaci',inRitardo:false,landing:{}})),
 {...dose('handover'),kind:'consegna-urgente',inRitardo:false,dettaglio:'Nuova consegna urgente',landing:{tab:'consegne',consegnaId:'QA-HANDOVER'}}];
const cells=['late','due','done','missed','unknown'].map((tone,i)=>({date:'2026-10-10',time:String(8+i).padStart(2,'0')+':00',title:'5 dosi',detail:'2 somministrate · 1 non somministrata · 2 da erogare',count:5,pendingCount:tone==='done'?0:2,tone}));
function Fixture(){
 const [form,setForm]=useState(false);
 return h('main',{style:{padding:16,maxWidth:1100,margin:'auto'}},
  h('button',{type:'button',className:'ds-btn ds-btn--secondary',onClick:()=>setForm(true)},'Apri appuntamento'),
  form&&h(AppointmentForm,{data:'2026-10-10',ora:'08:00',operatoreId:'QA-OP',operatori:[{id:'QA-OP',nome:'Operatore',cognome:'Sintetico',stato:'attivo'}],onSave:async()=> 'Conflitto sintetico: fascia occupata.',onCancel:()=>setForm(false)}),
  h(TherapyCalendarGrid,{days:['2026-10-10','2026-10-11'],today:'2026-10-10',cells,onOpen:(date,time)=>window.actions.push({date,time})}),
  h(AdessoQueue,{items,terapie:'ready',consegne:'ready',anomalie:'ready',onOpenTherapy:()=>{},onOpenConsegne:()=>{},onSelectPaziente:(nome,patientId,landing)=>window.actions.push({patientId,landing})}),
  h(TurnoAppointments,{agenda:[],onOpenAgenda:()=>{}}),
  h(TurnoHandovers,{overview:{recentPreview:[],urgentPreview:[]},state:'ready',onOpen:()=>{}})
 );
}
createRoot(document.getElementById('root')).render(h(Fixture));
</script></body></html>`;
const fixtureDirectory = mkdtempSync(
  fileURLToPath(new URL('../frontend/.ux-regression-', import.meta.url)),
);
writeFileSync(resolve(fixtureDirectory, 'index.html'), fixture);
const fixtureUrl = `${base}/${fixtureDirectory.split('/').at(-1)}/index.html`;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
  page.on('requestfailed', (request) => console.error(request.url(), request.failure()));
  await page.route('**/patients/page/search', (route) =>
    route.fulfill({ json: { items: [patient], hasMore: false, nextCursor: null } }),
  );
  await page.goto(fixtureUrl);
  const trigger = page.getByRole('button', { name: 'Apri appuntamento', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const labels = await dialog.locator('label[for]').evaluateAll((nodes) =>
    nodes.map((label) => ({
      id: label.htmlFor,
      name: label.textContent.replace('*', '').trim(),
      matches: [...document.querySelectorAll('[id]')].filter((node) => node.id === label.htmlFor)
        .length,
    })),
  );
  assert.equal(labels.length, 10);
  for (const label of labels) {
    assert.equal(label.matches, 1);
    await dialog.locator('label[for]').filter({ hasText: label.name }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), label.id);
    await dialog.getByRole('button', { name: 'Chiudi', exact: true }).focus();
  }
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  writeFileSync(
    resolve(output, 'appointment-accessibility-tree.json'),
    JSON.stringify(
      ax.nodes
        .filter(
          (node) =>
            labels.some(
              (label) =>
                node.name?.value?.toLocaleLowerCase('it') === label.name.toLocaleLowerCase('it'),
            ) ||
            ['Nuovo Appuntamento', 'Chiudi', 'Annulla', 'Salva appuntamento'].includes(
              node.name?.value,
            ),
        )
        .map((node) => ({
          role: node.role?.value,
          name: node.name?.value,
          ignored: node.ignored,
        })),
      null,
      2,
    ),
  );
  for (const name of [
    'Durata',
    'Tipo intervento',
    'Priorità',
    'Operatore',
    'Stato',
    'Camera (opz.)',
    'Note cliniche',
  ])
    assert.ok(
      ax.nodes.some(
        (node) =>
          node.name?.value?.toLocaleLowerCase('it') === name.toLocaleLowerCase('it') &&
          !node.ignored,
      ),
      name,
    );
  await dialog.getByRole('combobox', { name: /Paziente/i }).fill('Sintetica');
  await dialog.getByRole('listbox').getByRole('option').first().click();
  await dialog.getByRole('button', { name: 'Salva appuntamento' }).click();
  await dialog.getByRole('alert').waitFor();
  const errorId = await dialog.getByRole('alert').getAttribute('id');
  assert.equal(await dialog.getAttribute('aria-describedby'), errorId);
  assert.equal(
    await dialog
      .getByRole('button', { name: 'Salva appuntamento' })
      .getAttribute('aria-describedby'),
    errorId,
  );
  await dialog.getByRole('button', { name: 'Chiudi', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    'Salva appuntamento',
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('aria-label')),
    'Chiudi',
  );
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.ok(await trigger.evaluate((element) => element === document.activeElement));
  results.push({
    issue: 405,
    labels: labels.length,
    accessibilityTree: 'named controls',
    keyboard: 'focus trap / Escape / return focus / described error',
  });

  await page.locator('body').evaluate((element) => {
    element.style.filter = 'grayscale(1)';
  });
  const calendar = page.getByRole('table', { name: 'Calendario terapie per orario' });
  assert.equal(await calendar.locator('[aria-current="date"]').count(), 1);
  assert.match(await calendar.locator('[aria-current="date"]').innerText(), /Oggi/);
  for (const state of [
    'Ritardo / non registrata',
    'Programmata',
    'Somministrate',
    'Non somministrate presenti',
    'Stato da verificare',
  ])
    assert.ok(await calendar.getByText(state, { exact: true }).isVisible(), state);
  await calendar.locator('[data-time="08:00"][data-testid]').click();
  assert.deepEqual((await page.evaluate(() => window.actions)).at(-1), {
    date: '2026-10-10',
    time: '08:00',
  });
  await calendar.screenshot({ path: resolve(output, 'calendar-grayscale.png') });
  await page.locator('body').evaluate((element) => {
    element.style.filter = '';
  });
  results.push({
    issue: 408,
    states: 5,
    today: 'text / aria-current',
    selection: 'exact day and time',
    grayscale: 'text retained',
  });

  const queue = page.getByRole('region', { name: 'Adesso', exact: true });
  assert.ok(await queue.getByText('Nuova consegna urgente', { exact: true }).isVisible());
  assert.ok(await queue.getByRole('heading', { name: 'Scadute · 22 attività' }).isVisible());
  await queue.locator('summary').click();
  await queue.locator('[data-adesso-kind="terapia-ritardo"]').nth(11).click();
  assert.equal(
    (await page.evaluate(() => window.actions)).at(-1).landing.therapy.therapyId,
    'group-11',
  );
  await queue.getByRole('button', { name: 'Mostra altri 7 gruppi' }).click();
  assert.equal(await queue.locator('[data-adesso-kind="terapia-ritardo"]').count(), 22);
  await queue.getByRole('button', { name: /Apri .*Nuova consegna urgente/ }).click();
  assert.equal(
    (await page.evaluate(() => window.actions)).at(-1).landing.consegnaId,
    'QA-HANDOVER',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await queue.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await queue.locator('details').getAttribute('open'), null);
  await page.keyboard.press('Enter');
  assert.equal(await queue.locator('details').getAttribute('open'), '');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await queue.screenshot({ path: resolve(output, 'adesso-mobile.png') });
  assert.equal(errors.length, 0, errors.join('\n'));
  results.push({
    issue: 410,
    doses: 22,
    urgency: 'visible independently of delays/checks',
    actions: 'exact dose / handover',
    keyboardExpansion: true,
    mobileOverflow: false,
  });
  const bedside = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  bedside.on('pageerror', (error) => errors.push(error.message));
  await bedside.goto(base);
  await bedside.getByRole('button', { name: /^Operatore/ }).click();
  await bedside.getByRole('button', { name: 'Pazienti', exact: true }).click();
  await bedside
    .getByRole('button', { name: /Apri cartella/ })
    .first()
    .waitFor();
  const sizes = [];
  async function checkTargets(selector, context) {
    const controls = await bedside.locator(selector).evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getClientRects().length && !node.disabled)
        .map((node) => ({
          name: node.getAttribute('aria-label') || node.textContent.trim(),
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
    );
    assert.ok(controls.length, context);
    for (const control of controls) {
      assert.ok(
        control.height >= 43.9 && control.width >= 43.9,
        JSON.stringify({ context, ...control }),
      );
    }
    sizes.push({
      context,
      count: controls.length,
      minHeight: Math.min(...controls.map((control) => control.height)),
    });
  }
  await checkTargets('.patient-list-view button', 'patient roster desktop');
  await bedside
    .getByRole('searchbox', { name: 'Cerca paziente per nome o codice fiscale' })
    .fill('Bassi');
  await bedside.getByRole('button', { name: 'Cancella', exact: true }).waitFor();
  await checkTargets('.search-clear-btn', 'search clear target');
  await bedside.getByRole('button', { name: 'Cancella', exact: true }).click();
  await bedside
    .getByRole('button', { name: /Apri cartella/ })
    .first()
    .click();
  await bedside.locator('.patient-record-view').waitFor();
  await checkTargets(
    '.chart-sections__actions button, .patient-record-view [role="tab"]',
    'chart actions and tabs',
  );
  await bedside.getByRole('tab', { name: 'Moduli', exact: true }).click();
  await bedside.locator('.assessment-catalog').waitFor();
  await checkTargets('.assessment-catalog button', 'module catalog actions');
  await bedside.setViewportSize({ width: 390, height: 844 });
  await checkTargets(
    '.chart-sections__actions button, .patient-record-view [role="tab"]',
    'chart mobile actions and tabs',
  );
  assert.ok(await bedside.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await bedside.screenshot({ path: resolve(output, 'chart-mobile.png'), fullPage: true });
  await bedside.close();
  const rooms = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await rooms.goto(base);
  await rooms.getByRole('button', { name: /^Amministratore/ }).click();
  await rooms.getByRole('button', { name: 'Posti Letto', exact: true }).click();
  await rooms.locator('.rooms-view').waitFor();
  const roomTargets = await rooms
    .locator('.rooms-view .ds-btn, .rooms-view .ds-chip, .rooms-view .ds-icon-btn')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getClientRects().length)
        .map((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
    );
  assert.ok(roomTargets.length);
  assert.ok(
    roomTargets.every((target) => target.width >= 43.9 && target.height >= 43.9),
    JSON.stringify(roomTargets),
  );
  results.push({
    issue: 416,
    targets: sizes,
    roomControls: roomTargets.length,
    device: 'Chromium desktop / 390px viewport',
  });
  await rooms.close();
  assert.equal(errors.length, 0, errors.join('\n'));
  writeFileSync(
    resolve(output, 'browser-results.json'),
    JSON.stringify(
      {
        results,
        errors,
        limitations: [
          'No physical touch device, gloves, intense-light hardware or real screen reader tested.',
        ],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  rmSync(fixtureDirectory, { recursive: true, force: true });
}
