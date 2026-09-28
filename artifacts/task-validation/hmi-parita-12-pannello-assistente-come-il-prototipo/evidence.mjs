// Evidenza browser: pannello Assistente come il prototipo HMI 1 (stub :3001).
// Dettatura simulata (SpeechRecognition e getUserMedia finti); il piano AI è intercettato.
//   BASE=http://localhost:4181 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-12-pannello-assistente-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4181';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function login(width, role = 'Operatore') {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.addInitScript(() => {
    class FakeSR {
      start() {
        setTimeout(
          () => this.onresult?.({ results: [[{ transcript: 'pressione 130 su 80' }]] }),
          150,
        );
      }
      stop() {
        setTimeout(() => this.onend?.(), 50);
      }
      abort() {}
    }
    window.SpeechRecognition = FakeSR;
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
  });
  const plans = [];
  await page.route(/\/ai\/actions\/plan/, (route) => {
    plans.push(route.request().postDataJSON?.() ?? null);
    route.fulfill({ status: 503, json: { error: 'non disponibile nello stub' } });
  });
  await page.goto(BASE);
  await page.getByText(role, { exact: true }).first().click();
  await page.waitForTimeout(1200);
  return { page, plans };
}
const item = (page) => page.locator('.teams-sidebar__item--ai');
async function openAsst(page, width) {
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await item(page).click();
  await page.waitForTimeout(900);
}
const panel = (page) => page.getByRole('dialog', { name: 'Assistente virtuale ClinicOS' });

// ── AC1: nessun pulsante flottante; la sidebar apre, dichiara lo stato, riprende il fuoco ──
for (const [width, role] of [
  [1180, 'Operatore'],
  [390, 'Operatore'],
  [1180, 'Amministratore'],
]) {
  const { page } = await login(width, role);
  const fab = await page.locator('.ai-fab').count();
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  const before = await item(page).getAttribute('aria-expanded');
  await item(page).click();
  await page.waitForTimeout(900);
  const open = await panel(page).isVisible();
  const after = await item(page).getAttribute('aria-expanded');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = !(await panel(page).isVisible());
  const focus = await page.evaluate(() => document.activeElement?.className ?? '');
  const expectFocus = width < 1024 ? /topbar-hamburger/ : /teams-sidebar__item--ai/;
  check(
    `AC1 ${role} ${width}: nessun pulsante flottante; "Assistente" apre il pannello (aria-expanded), Esc chiude e il fuoco torna ${width < 1024 ? 'al menu' : 'alla voce'}`,
    fab === 0 &&
      before === 'false' &&
      open &&
      after === 'true' &&
      closed &&
      expectFocus.test(focus),
    JSON.stringify({ fab, before, open, after, closed, focus }),
  );
  await page.close();
}

// ── AC2–AC4 a 1180 ────────────────────────────────────────────────────────────────────────
{
  const { page, plans } = await login(1180);
  await openAsst(page, 1180);
  const head = await page.evaluate(() => {
    const p = document.querySelector('.agnos-panel');
    const btns = [...p.querySelectorAll('.ai-drawer__header button')].map((b) => {
      const cs = getComputedStyle(b);
      return [
        b.className,
        b.getAttribute('aria-label'),
        b.getAttribute('aria-pressed'),
        cs.width,
        cs.height,
      ].join(' | ');
    });
    const scrim = document.querySelector('.ai-drawer__scrim');
    return {
      title: p.querySelector('.agnos-title')?.textContent.trim(),
      titleColor: getComputedStyle(p.querySelector('.agnos-title')).color,
      intro: p.querySelector('.agnos-intro__text')?.textContent.replace(/\s+/g, ' ').trim(),
      scope: p.querySelector('.agnos-intro__scope')?.textContent.trim(),
      btns,
      scrim: scrim ? getComputedStyle(scrim).backgroundColor : null,
    };
  });
  check(
    'AC2 testata "Assistente" con "IA"; lettura vocale (aria-pressed) e chiusura sono ds-icon-btn 48px',
    head.title === 'Assistente IA' &&
      head.btns.length === 2 &&
      head.btns.every((b) => /^ds-icon-btn/.test(b) && / 48px \| 48px$/.test(b)) &&
      /aria-pressed|false/.test(head.btns[0]) &&
      /\| false \|/.test(head.btns[0]),
    JSON.stringify(head.btns),
  );
  check(
    'AC2 dichiarazione "non un operatore umano" e perimetro visibili sotto la testata',
    /Assistente virtuale \(IA\), non un operatore umano/.test(head.intro ?? '') &&
      /Ogni scrittura passa dalla scheda di conferma/.test(head.intro ?? '') &&
      head.scope === 'Perimetro: Tutti i pazienti autorizzati',
    JSON.stringify({ intro: head.intro, scope: head.scope }),
  );
  check('AC2 la pagina dietro non si oscura (nessun velo)', head.scrim === null, head.scrim);
  await page.screenshot({ path: `${DIR}/screenshots/assistente-1180.png` });
  // lettura vocale: interruttore canonico
  const tts = page.locator('.agnos-tts');
  if (await tts.count()) {
    await tts.click();
    const pressed = await tts.evaluate((el) => ({
      pressed: el.getAttribute('aria-pressed'),
      bg: getComputedStyle(el).backgroundColor,
    }));
    check(
      'AC2 lettura vocale premuta: aria-pressed true con lo stato "premuto" del design system',
      pressed.pressed === 'true' && pressed.bg === 'rgb(234, 241, 254)',
      JSON.stringify(pressed),
    );
    await tts.click();
  }
  // AC3: domande suggerite
  const sugg = await page.evaluate(() =>
    [...document.querySelectorAll('.agnos-suggestions button')].map((b) => {
      const cs = getComputedStyle(b);
      return {
        cls: b.className,
        text: b.textContent.trim(),
        w: b.getBoundingClientRect().width,
        align: cs.textAlign,
        minH: cs.minHeight,
      };
    }),
  );
  const listW = await page.evaluate(
    () => document.querySelector('.agnos-suggestions')?.getBoundingClientRect().width,
  );
  check(
    'AC3 domande suggerite: ds-btn--secondary ds-btn--block a tutta larghezza, testo a sinistra, min 48px',
    sugg.length > 0 &&
      sugg.every(
        (s) =>
          /ds-btn ds-btn--secondary ds-btn--block/.test(s.cls) &&
          Math.abs(s.w - listW) < 1 &&
          s.align === 'left' &&
          s.minH === '48px',
      ),
    JSON.stringify(sugg),
  );
  // il brief chiede già un piano all'apertura: si contano solo le richieste successive
  const base = plans.length;
  await page.locator('.agnos-suggestions button').first().click();
  await page.waitForTimeout(400);
  const value = await page.locator('.agnos-input').inputValue();
  check(
    'AC3 un clic compila il campo senza inviare',
    value === sugg[0].text && plans.length === base,
    JSON.stringify({ value, inviate: plans.length - base }),
  );
  // AC4: composer
  const comp = await page.evaluate(() => {
    const t = document.querySelector('.agnos-input');
    const mic = document.querySelector('.agnos-mic');
    const send = document.querySelector('.ai-asst__send');
    const cs = getComputedStyle(t);
    return {
      placeholder: t.placeholder,
      field: [
        t.className,
        cs.minHeight,
        cs.borderTopWidth,
        cs.borderTopLeftRadius,
        cs.fontSize,
      ].join(' | '),
      mic: [
        mic.className,
        mic.getAttribute('aria-pressed'),
        mic.getAttribute('aria-label'),
        getComputedStyle(mic).width,
      ].join(' | '),
      send: [send.className, send.textContent.trim()].join(' | '),
    };
  });
  check(
    'AC4 composer: "Chiedi o detta" (form-input 48/2/12/16), microfono ds-icon-btn con aria-pressed, invio ds-btn--primary',
    comp.placeholder === 'Chiedi o detta' &&
      /form-input agnos-input \| 48px \| 2px \| 12px \| 16px/.test(comp.field) &&
      /^ds-icon-btn agnos-mic \| false \| Parla: detta una richiesta \| 48px$/.test(comp.mic) &&
      /ds-btn ds-btn--primary ai-asst__send \| Invia richiesta/.test(comp.send),
    JSON.stringify(comp),
  );
  await page.locator('.agnos-input').press('Enter');
  await page.waitForTimeout(800);
  check(
    'AC4 Invio con Enter manda la richiesta (un piano, col testo scelto)',
    plans.length === base + 1 && JSON.stringify(plans.at(-1)).includes(sugg[0].text),
    JSON.stringify(plans.at(-1)),
  );
  const beforeVoice = plans.length;
  // dettatura simulata: consenso → registrazione → termina
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(300);
  const consent = await page.getByRole('button', { name: 'Attiva microfono' }).count();
  await page.getByRole('button', { name: 'Attiva microfono' }).click();
  await page.waitForTimeout(500);
  const rec = await page.locator('.agnos-mic').evaluate((el) => ({
    pressed: el.getAttribute('aria-pressed'),
    cls: el.className,
    label: el.getAttribute('aria-label'),
    bg: getComputedStyle(el).backgroundColor,
    transcript: document.querySelector('.agnos-input').value,
  }));
  await page.screenshot({ path: `${DIR}/screenshots/dettatura-1180.png` });
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(700);
  const done = await page.evaluate(() => ({
    pressed: document.querySelector('.agnos-mic').getAttribute('aria-pressed'),
    value: document.querySelector('.agnos-input').value,
    label: document.querySelector('.agnos-compose label')?.textContent,
  }));
  check(
    'AC4 dettatura: consenso, poi microfono premuto e rosso di registrazione con la trascrizione; "Termina" la chiude',
    consent === 1 &&
      rec.pressed === 'true' &&
      /ds-icon-btn--recording/.test(rec.cls) &&
      rec.label === 'Termina dettatura' &&
      rec.bg === 'rgb(217, 58, 74)' &&
      /pressione 130 su 80/.test(rec.transcript) &&
      done.pressed === 'false' &&
      // come prima: a fine dettatura la richiesta parte da sola per mostrare la proposta
      plans.length === beforeVoice + 1 &&
      JSON.stringify(plans.at(-1)).includes('pressione 130 su 80'),
    JSON.stringify({ consent, rec, done }),
  );
  // clic fuori chiude
  await page.mouse.click(200, 400);
  await page.waitForTimeout(500);
  check('AC2 il clic fuori dal pannello lo chiude', !(await panel(page).isVisible()));
  await page.close();
}

// ── QA: Esc nel flusso vocale e clic fuori che naviga ────────────────────────────────────
{
  const { page } = await login(1180);
  const state = () =>
    page.evaluate(() => ({
      open: document.querySelector('.agnos-panel')?.getAttribute('aria-hidden') === 'false',
      consent: !!document.querySelector('.agnos-consent-prompt'),
      focus: document.activeElement?.className ?? document.activeElement?.tagName,
      expanded: document.querySelector('.teams-sidebar__item--ai')?.getAttribute('aria-expanded'),
    }));
  // 1) consenso aperto: Esc lo chiude come "Annulla" e il fuoco torna al microfono
  await openAsst(page, 1180);
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const s1 = await state();
  // 2) "Annulla" del consenso: il fuoco va al microfono, Esc chiude il pannello
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.waitForTimeout(300);
  const s2 = await state();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const s2b = await state();
  check(
    'QA Esc: col consenso aperto lo chiude (fuoco al microfono); dopo "Annulla" il fuoco è sul microfono ed Esc chiude il pannello',
    s1.open && !s1.consent && /agnos-mic/.test(s1.focus) && /agnos-mic/.test(s2.focus) && !s2b.open,
    JSON.stringify({ s1, s2, s2b }),
  );
  // 3) durante la dettatura: Esc chiude il pannello e ferma la dettatura, senza inviare
  await item(page).click();
  await page.waitForTimeout(700);
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Attiva microfono' }).click();
  await page.waitForTimeout(500);
  const s3 = await state();
  const listening = await page.locator('.agnos-mic').getAttribute('aria-pressed');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const s3b = await state();
  await item(page).click();
  await page.waitForTimeout(600);
  const micAfter = await page.locator('.agnos-mic').getAttribute('aria-pressed');
  check(
    'QA Esc durante la dettatura: fuoco sul microfono, Esc chiude il pannello e ferma la dettatura',
    listening === 'true' && /agnos-mic/.test(s3.focus) && !s3b.open && micAfter === 'false',
    JSON.stringify({ s3, listening, s3b, micAfter }),
  );
  // 4) clic fuori su "Pazienti": chiude il pannello e la pagina cambia (nessun velo che assorbe)
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => ({
    hash: location.hash,
    open: document.querySelector('.agnos-panel')?.getAttribute('aria-hidden') === 'false',
    expanded: document.querySelector('.teams-sidebar__item--ai')?.getAttribute('aria-expanded'),
  }));
  // 5) clic fuori su un campo della pagina: il pannello si chiude, il fuoco resta nel campo e
  //    ciò che si scrive arriva al campo (lo spazio non riapre l'assistente)
  await page.waitForSelector('.plist-list');
  await item(page).click();
  await page.waitForTimeout(700);
  const search = page.getByPlaceholder(/Cerca per nome/);
  await search.click();
  await page.keyboard.type('Ro ss');
  await page.waitForTimeout(500);
  const typed = await page.evaluate(() => ({
    value: document.activeElement?.value,
    open: document.querySelector('.agnos-panel')?.getAttribute('aria-hidden') === 'false',
  }));
  check(
    'QA clic fuori su un campo: il pannello si chiude, il fuoco resta nel campo e il testo scritto arriva',
    typed.value === 'Ro ss' && !typed.open,
    JSON.stringify(typed),
  );
  await search.fill('');
  // 6) la voce "Assistente" alterna: secondo clic chiude
  await item(page).click();
  await page.waitForTimeout(600);
  const t1 = await item(page).getAttribute('aria-expanded');
  await item(page).click();
  await page.waitForTimeout(600);
  const t2 = await item(page).getAttribute('aria-expanded');
  const t2open = await page.evaluate(
    () => document.querySelector('.agnos-panel')?.getAttribute('aria-hidden') === 'false',
  );
  check(
    'QA la voce "Assistente" alterna: apre (aria-expanded true) e al secondo clic chiude',
    t1 === 'true' && t2 === 'false' && !t2open,
    JSON.stringify({ t1, t2, t2open }),
  );
  check(
    'QA clic fuori su "Pazienti": il pannello si chiude e la navigazione avviene al primo clic',
    nav.hash === '#/pazienti' && !nav.open && nav.expanded === 'false',
    JSON.stringify(nav),
  );
  await page.close();
}

for (const width of [390, 768, 1024, 1440]) {
  const { page } = await login(width);
  await openAsst(page, width);
  const s = await page.evaluate(() => {
    const p = document.querySelector('.agnos-panel').getBoundingClientRect();
    const row = document.querySelector('.agnos-compose-row').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inside: row.right <= p.right + 0.5 && row.left >= p.left - 0.5,
      width: Math.round(p.width),
    };
  });
  check(
    `AC4 ${width}: pannello senza scorrimento orizzontale, campo e microfono dentro il pannello`,
    s.overflow <= 0 && s.inside,
    JSON.stringify(s),
  );
  await page.screenshot({ path: `${DIR}/screenshots/assistente-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
