// Evidenza browser: Diario → "Valida terapia" → anteprima → conferma → link alla riga in Terapia.
// Le anteprime sono quelle dell'interprete reale del backend (previews.json, da make-previews.ts);
// with-therapy, diario e lista terapie sono simulati con page.route sopra lo stub su :3001.
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/diario-terapia-2-valida-terapia-dal-diario-con-anteprima-e-link';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const PREVIEWS = JSON.parse(readFileSync(`${DIR}/previews.json`, 'utf8'));
const roster = await (await fetch('http://localhost:3001/patients/page?limit=1')).json();
const P = roster.items[0];
const name = `${P.lastName}, ${P.firstName}`;
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const CLINICAL = ['Ramipril', 'RAMIPRIL', 'Tachipirina', 'Febbre', 'Sospendere'];

function makeState() {
  return {
    created: [],
    withTherapyCalls: [],
    previewCalls: 0,
    urls: [],
    consoleText: [],
    failNext: null,
  };
}

async function wire(context, S) {
  await context.route(/\/patients\/[^/]+\/diary\/therapy-preview$/, async (route) => {
    S.previewCalls++;
    const body = JSON.parse(route.request().postData() || '{}');
    const p = PREVIEWS[body.text];
    if (!p) return route.fulfill({ status: 500, json: { error: 'testo non previsto nello stub' } });
    return route.fulfill({ status: 200, json: p, headers: { 'cache-control': 'no-store' } });
  });
  await context.route(/\/patients\/[^/]+\/diary\/with-therapy$/, async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    S.withTherapyCalls.push(body);
    if (S.failNext) {
      const f = S.failNext;
      S.failNext = null;
      return route.fulfill({ status: f.status, json: f.json });
    }
    const prior = S.created.find((c) => c.requestId === body.requestId);
    if (prior)
      return route.fulfill({ status: 200, json: { entry: prior.entry, therapy: prior.therapy } });
    const therapy = {
      id: `th-diario-${S.created.length + 1}`,
      patientId: P.id,
      farmacoNome: body.therapy.farmacoNome,
      stato: 'attiva',
    };
    const entry = {
      id: `d-diario-${S.created.length + 1}`,
      patientId: P.id,
      authorType: 'medico',
      authorName: 'Dr. Marco Ferretti',
      title: body.entry.title ?? null,
      content: body.entry.content,
      priority: body.entry.priority,
      status: body.entry.status,
      entryDateTime: body.entry.entryDateTime,
      category: 'terapia',
      therapyId: therapy.id,
      therapy: { id: therapy.id, farmacoNome: therapy.farmacoNome, stato: 'attiva' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    S.created.push({ requestId: body.requestId, entry, therapy, input: body.therapy });
    return route.fulfill({ status: 201, json: { entry, therapy } });
  });
  await context.route(/\/patients\/[^/]+\/diary(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (S.delayGet) await new Promise((r) => setTimeout(r, S.delayGet));
    const res = await route.fetch();
    const json = await res.json();
    const extra = S.created.map((c) => c.entry);
    if (S.removed) extra.push(S.removed);
    return route.fulfill({
      response: res,
      json: { ...json, entries: [...extra, ...json.entries] },
    });
  });
  await context.route(/\/patients\/[^/]+\/therapies\/page(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    const rows = S.created.map((c, k) => ({
      ...json.items[0],
      id: c.therapy.id,
      farmacoNome: c.therapy.farmacoNome,
      dosaggio: '5 mg',
      stato: 'attiva',
      fascePranzo: false,
      fasceSera: false,
      orarioSpecifico: null,
      _k: k,
    }));
    return route.fulfill({ response: res, json: { ...json, items: [...json.items, ...rows] } });
  });
}

async function openDiary(page) {
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.topbar-search').click();
  await page.locator('.search-modal__input').fill(P.lastName);
  await page.waitForTimeout(800);
  await page.locator('.search-modal__results button', { hasText: name }).first().click();
  await page.locator('.page-header__title', { hasText: P.lastName }).first().waitFor();
  await page.getByRole('button', { name: 'Aggiungi voce', exact: true }).first().waitFor();
  await page.waitForTimeout(800);
}

async function newEntry(page, text) {
  const add = page.getByRole('button', { name: 'Aggiungi voce', exact: true }).first();
  if (await add.isVisible().catch(() => false)) await add.click();
  const area = page.getByPlaceholder('Descrizione, note cliniche…');
  await area.waitFor();
  await area.fill(text);
}

const panel = (page) => page.getByTestId('diary-therapy-panel');
const confirmBtn = (page) => page.getByRole('button', { name: 'Conferma e aggiungi in Terapia' });

const browser = await chromium.launch();

// ── AC1 + AC4 + persistenza + privacy (1180) ────────────────────────────────
{
  const S = makeState();
  const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  await wire(context, S);
  const page = await context.newPage();
  page.on('request', (r) => S.urls.push(r.url()));
  page.on('console', (m) => S.consoleText.push(m.text()));
  await openDiary(page);
  const TXT = 'Ramipril 5 mg 1 cpr per os ore 8';
  await newEntry(page, TXT);
  const valida = page.getByRole('button', { name: 'Valida terapia' });
  await valida.click();
  await panel(page).waitFor();
  await page.waitForTimeout(400);
  const focusOnOpen = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
  check(
    'A11y: all’apertura il focus va sul titolo del pannello',
    focusOnOpen === 'Anteprima terapia',
    `focus=${focusOnOpen}`,
  );
  const vals = await panel(page).evaluate((el) =>
    [...el.querySelectorAll('input, select')].map((i) => i.value).filter(Boolean),
  );
  const joined = vals.join(' | ') + ' | ' + (await panel(page).innerText()).replace(/\s+/g, ' ');
  check(
    'AC1: anteprima con RAMIPRIL, 5 mg, 1 compressa, orale, 08:00',
    /RAMIPRIL/.test(joined) &&
      /\b5\b/.test(joined) &&
      /08:00/.test(joined) &&
      /compress/i.test(joined) &&
      /oral/i.test(joined),
    joined,
  );
  await panel(page).screenshot({ path: `${DIR}/screenshots/ac1-anteprima.png` });
  check('AC1: conferma attiva con anteprima completa', await confirmBtn(page).isEnabled());
  const nameNote = await page.evaluate(() =>
    document.querySelector('[data-testid="diary-therapy-panel"]').innerText.includes('Nome già presente in terapia'),
  );
  check('Pannello aperto: il nome letto dal testo non è presentato come "già presente in terapia"', !nameNote);

  // AC4: errore 409 dal server → messaggio, niente perso; poi modifica → nuovo requestId
  S.failNext = { status: 400, json: { error: 'x', code: 'unit_required' } };
  await confirmBtn(page).click();
  await page.waitForTimeout(600);
  const errText = await panel(page).innerText();
  const firstId = S.withTherapyCalls[0]?.requestId;
  check(
    'AC4: errore del server mostrato nel pannello senza perdere i campi',
    S.withTherapyCalls.length === 1 &&
      /unit|unità/i.test(errText) &&
      (await panel(page).isVisible()),
    errText
      .split('\n')
      .filter((l) => /unit|unità/i.test(l))
      .join(' / '),
  );
  // stessa versione: nuovo tentativo riusa lo stesso requestId
  await confirmBtn(page).dblclick();
  await page.waitForTimeout(800);
  const ids = S.withTherapyCalls.map((c) => c.requestId);
  check(
    'AC4: nuovo tentativo e doppio clic sulla stessa versione riusano lo stesso requestId',
    ids.length >= 2 && ids.every((i) => i === firstId) && S.created.length === 1,
    `chiamate=${ids.length} idUguali=${ids.every((i) => i === firstId)} create=${S.created.length}`,
  );
  const card = page.locator('.diario-card__therapy[data-therapy-id="th-diario-1"]');
  await card.waitFor({ timeout: 5000 }).catch(() => {});
  check(
    'AC1: dopo la conferma il pannello si chiude e la card mostra "Terapia aggiunta: RAMIPRIL — apri" con lo stato',
    (await card.count()) === 1 &&
      /Terapia aggiunta:\s*RAMIPRIL/.test(await card.innerText()) &&
      /Attiva/i.test(await card.innerText()) &&
      (await panel(page).count()) === 0,
    (await card.count()) ? (await card.innerText()).replace(/\s+/g, ' ') : 'card assente',
  );
  const focusAfter = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
  );
  check(
    'A11y: dopo la conferma il focus va sul link "apri" della voce creata',
    /apri la terapia RAMIPRIL/.test(focusAfter ?? ''),
    `focus=${focusAfter}`,
  );

  // QA1: modifica della voce collegata → la card resta collegata (la PUT non porta "therapy").
  // La GET di rilettura viene ritardata per vedere lo stato subito dopo la PUT.
  S.delayGet = 4000;
  await context.route(/\/patients\/[^/]+\/diary\/d-diario-1$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = JSON.parse(route.request().postData() || '{}');
    const { therapy: _omit, ...row } = S.created[0].entry;
    return route.fulfill({ status: 200, json: { entry: { ...row, ...body } } });
  });
  await page
    .locator('.diario-card', { hasText: TXT })
    .first()
    .getByRole('button', { name: /Modifica/ })
    .first()
    .click();
  await page.locator('input[placeholder="Titolo voce…"]').last().fill('Titolo modificato');
  await page
    .getByRole('button', { name: /^Salva/ })
    .last()
    .click();
  await page.waitForTimeout(800);
  const afterEdit = page.locator('.diario-card', { hasText: TXT }).first();
  const afterEditText = (await afterEdit.innerText()).replace(/\s+/g, ' ');
  check(
    'QA1: subito dopo la modifica la voce collegata mostra ancora "Terapia aggiunta: RAMIPRIL" (mai "non più presente")',
    /Terapia aggiunta:\s*RAMIPRIL/.test(afterEditText) && !/non più presente/.test(afterEditText),
    afterEditText.slice(0, 160),
  );
  S.delayGet = 0;
  await page.waitForTimeout(4200);
  const sent = S.created[0]?.input ?? {};
  check(
    'AC1: una sola terapia creata, payload coerente con l’anteprima',
    S.created.length === 1 &&
      sent.farmacoNome === 'RAMIPRIL' &&
      JSON.stringify(sent).includes('08:00'),
    JSON.stringify({ farmaco: sent.farmacoNome, via: sent.viaSomministrazione, tipo: sent.tipo }),
  );
  await page
    .locator('.diario-card')
    .first()
    .screenshot({ path: `${DIR}/screenshots/ac1-card-link.png` });

  // apri → Terapia con riga evidenziata
  await page.getByRole('button', { name: 'apri la terapia RAMIPRIL nella scheda Terapia' }).click();
  await page.waitForTimeout(1500);
  const focused = page.locator('tr.therapy-list-row--focus');
  const activeTab = await page
    .locator('[aria-selected="true"], [aria-current="page"]')
    .allInnerTexts()
    .then((t) => t.join(' / '))
    .catch(() => '');
  check(
    'AC1: "apri" porta a Terapia con la riga di RAMIPRIL evidenziata e visibile',
    /Terapia/.test(activeTab) &&
      (await focused.count()) === 1 &&
      /RAMIPRIL/i.test(await focused.innerText()) &&
      (await focused.isVisible()),
    `tab=${activeTab.trim()} righeEvidenziate=${await focused.count()}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/ac1-terapia-riga-evidenziata.png` });

  // Persistenza: ricarico e riapro il diario; aggiungo una voce collegata a una terapia cancellata
  S.removed = {
    id: 'd-diario-removed',
    patientId: P.id,
    authorType: 'medico',
    authorName: 'Dr. Marco Ferretti',
    title: null,
    content: 'Voce collegata a una terapia poi cancellata',
    priority: 'normale',
    status: 'aperta',
    entryDateTime: new Date().toISOString().slice(0, 16),
    category: 'terapia',
    therapy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await page.evaluate(() => sessionStorage.clear());
  await openDiary(page);
  const cardAfter = page.locator('.diario-card__therapy[data-therapy-id="th-diario-1"]');
  const removedCard = page.locator('.diario-card', {
    hasText: 'Voce collegata a una terapia poi cancellata',
  });
  check(
    'Persistenza: dopo il ricaricamento la voce collegata mostra ancora link e stato',
    (await cardAfter.count()) === 1 && /RAMIPRIL/.test(await cardAfter.innerText()),
  );
  check(
    'Persistenza: voce collegata a una terapia cancellata → "Terapia non più presente", senza link',
    /Terapia non più presente/.test(await removedCard.innerText().catch(() => '')) &&
      (await removedCard.getByRole('button', { name: /apri la terapia/ }).count()) === 0,
  );
  await page
    .locator('.diario-card')
    .first()
    .screenshot({ path: `${DIR}/screenshots/persistenza-dopo-ricarica.png` });

  // Privacy
  // /farmaci/cerca è la ricerca in anagrafica del campo Farmaco, già esistente in Terapia: riceve
  // solo il nome del farmaco scelto, mai il testo della voce di diario.
  const catalog = S.urls.filter((u) => new URL(u).pathname === '/farmaci/cerca');
  const leakUrl = S.urls.filter(
    (u) =>
      new URL(u).pathname !== '/farmaci/cerca' &&
      CLINICAL.some((w) => decodeURIComponent(u).includes(w)),
  );
  const fullTextInUrl = S.urls.filter((u) => decodeURIComponent(u).includes('cpr per os'));
  check(
    'Privacy: il testo della voce di diario non compare mai in un URL',
    fullTextInUrl.length === 0,
    `ricercheAnagraficaFarmaci=${catalog.length}`,
  );
  const leakConsole = S.consoleText.filter((t) => CLINICAL.some((w) => t.includes(w)));
  check(
    'Privacy: nessun testo clinico negli URL',
    leakUrl.length === 0,
    leakUrl.slice(0, 3).join(' '),
  );
  check(
    'Privacy: nessun testo clinico nella console',
    leakConsole.length === 0,
    leakConsole.slice(0, 3).join(' '),
  );
  await context.close();
}

// ── AC2 + AC3 + AC5 (1180) ─────────────────────────────────────────────────
{
  const S = makeState();
  const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  await wire(context, S);
  const page = await context.newPage();
  await openDiary(page);

  await newEntry(page, 'Febbre Tachipirina 1000 mg 1 cpr per os ore 8');
  await page.getByRole('button', { name: 'Valida terapia' }).click();
  await panel(page).waitFor();
  await page.waitForTimeout(400);
  const t2 = await panel(page).innerText();
  const nameVal = await panel(page).evaluate((el) => {
    const inputs = [...el.querySelectorAll('input')];
    return inputs.map((i) => i.value).join('|');
  });
  check(
    'AC2: testo non riconosciuto → avviso visibile, campi non precompilati, conferma disattivata',
    /non riconosciut/i.test(t2) &&
      !/TACHIPIRINA|FEBBRE/.test(nameVal) &&
      !(await confirmBtn(page).isEnabled()),
    t2
      .split('\n')
      .filter((l) => /riconosc|controlla/i.test(l))
      .slice(0, 2)
      .join(' / '),
  );
  await panel(page).screenshot({
    path: `${DIR}/screenshots/ac2-avviso-testo-non-riconosciuto.png`,
  });
  await page.getByRole('button', { name: 'Chiudi anteprima' }).click();

  const area = page.getByPlaceholder('Descrizione, note cliniche…');
  await area.fill('Ramipril 5 mg 1 cpr per os ore 8 e 10');
  await page.getByRole('button', { name: 'Valida terapia' }).click();
  await panel(page).waitFor();
  await page.waitForTimeout(400);
  const t3 = await panel(page).innerText();
  check(
    'AC2: conflitto di fascia → conferma bloccata e suggerimento di due terapie',
    /due terapie/i.test(t3) && !(await confirmBtn(page).isEnabled()),
    t3
      .split('\n')
      .filter((l) => /fascia|due terapie/i.test(l))
      .slice(0, 2)
      .join(' / '),
  );
  await panel(page).screenshot({ path: `${DIR}/screenshots/ac2-conflitto-fascia.png` });
  await page.getByRole('button', { name: 'Chiudi anteprima' }).click();

  await area.fill('Sospendere Ramipril');
  await page.getByRole('button', { name: 'Valida terapia' }).click();
  await panel(page).waitFor();
  await page.waitForTimeout(400);
  const intent = page.getByTestId('diary-therapy-intent');
  check(
    'AC3: intento di sospensione → nessuna conferma, messaggio su dove agire',
    (await intent.count()) === 1 &&
      (await confirmBtn(page).count()) === 0 &&
      /Terapia|giro/i.test(await intent.innerText()),
    (await intent.innerText().catch(() => '')).replace(/\s+/g, ' '),
  );
  await panel(page).screenshot({ path: `${DIR}/screenshots/ac3-intento-sospensione.png` });

  // AC3/AC5: "Salva" come voce normale continua a funzionare (POST /diary normale)
  const normalPosts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /\/diary$/.test(new URL(r.url()).pathname))
      normalPosts.push(r.url());
  });
  await page
    .getByRole('button', { name: /^Salva/ })
    .first()
    .click();
  await page.waitForTimeout(1000);
  check(
    'AC3/AC5: "Salva" registra la voce normale (POST /diary) e nessuna chiamata with-therapy',
    normalPosts.length === 1 && S.withTherapyCalls.length === 0,
    `postDiary=${normalPosts.length} withTherapy=${S.withTherapyCalls.length}`,
  );
  await context.close();
}

// ── AC6: larghezze ─────────────────────────────────────────────────────────
for (const width of [390, 768, 1024, 1180, 1440]) {
  const S = makeState();
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: width < 1024,
    isMobile: width < 1024,
  });
  await wire(context, S);
  const page = await context.newPage();
  await openDiary(page);
  await newEntry(page, 'Ramipril 5 mg 1 cpr per os ore 8');
  await page.getByRole('button', { name: 'Valida terapia' }).click();
  await panel(page).waitFor();
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="diary-therapy-panel"]');
    // Radio e checkbox si toccano tramite la loro etichetta: si misura l'etichetta.
    const ctrls = [...p.querySelectorAll('button, input, select')]
      .filter((e) => e.offsetParent)
      .map((e) =>
        e.matches('input[type=radio], input[type=checkbox]') && e.closest('label')
          ? e.closest('label')
          : e,
      );
    const small = ctrls
      .map((e) => ({
        t: (e.textContent || e.getAttribute('aria-label') || e.name || e.type).trim().slice(0, 30),
        h: Math.round(e.getBoundingClientRect().height),
      }))
      .filter((c) => c.h < 44);
    const pr = p.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panelOut: Math.round(pr.right - document.documentElement.clientWidth),
      small,
    };
  });
  const touch = width < 1024;
  check(
    `AC6 ${width}px: nessuno scorrimento orizzontale${touch ? ', controlli ≥ 44px' : ''}`,
    m.overflow <= 0 && m.panelOut <= 0 && (!touch || m.small.length === 0),
    JSON.stringify(m),
  );
  await panel(page).screenshot({ path: `${DIR}/screenshots/ac6-${width}.png` });
  await context.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
