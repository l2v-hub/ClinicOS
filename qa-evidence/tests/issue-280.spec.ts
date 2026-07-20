// #280 — Le terapie rilevate dall'import sono riviste nel FORM reale della creazione manuale
// (TherapyFormFields) precompilato dal bridge, con il testo originale accanto; una modifica nel
// form sopravvive alla conferma (terapia creata aggiornata); le righe "da verificare" restano
// segnalate. Draft d'import seedato con terapiaImport (provider AI mock = estrazione vuota).
import { test } from '@playwright/test';
import { guard, enterAs, nav, seedManualDraft, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const COGNOME = `Import280-${STAMP}`;

const SEED = {
  anagrafica: {
    firstName: 'Enrico',
    lastName: COGNOME,
    dateOfBirth: '1950-03-12',
    sex: 'M',
  },
  terapiaImport: [
    {
      farmacoNome: 'Amoxicillina',
      forma: 'CPR RIV',
      dosaggio: '500 MG',
      viaSomministrazione: 'OS',
      quantita: '1',
      orari: ['08:00', '20:00'],
      giorni: [],
      dataInizio: '',
      classe: 'Antibiotico',
      note: '',
      originalText: 'AMOXICILLINA 500 MG CPR RIV — 1 cpr ore 8 e 20 per OS',
      stato: 'ok',
    },
    {
      farmacoNome: 'Furosemide',
      forma: '',
      dosaggio: '',
      viaSomministrazione: '',
      quantita: '',
      orari: [],
      giorni: [],
      dataInizio: '',
      classe: '',
      note: '',
      originalText: 'FUROSEMIDE — posologia non leggibile nel documento',
      stato: 'da_verificare',
    },
  ],
};

test('#280 import terapia: form reale precompilato + testo originale + modifica che persiste', async ({
  page,
}) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  const draftId = await seedManualDraft(page, SEED);

  await nav(page, 'Pazienti');
  await page.getByRole('button', { name: /Nuovo paziente/ }).click();
  await page.waitForTimeout(800);

  // Step 1 → 3 (Clinica)
  await page.getByRole('button', { name: /Avanti/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Avanti/i }).click();
  await page.waitForTimeout(600);

  // AC1: il form REALE della creazione manuale, precompilato dai dati parsati.
  const review = page.locator('[data-testid="discharge-therapy-review"]');
  await expect(review).toBeVisible();
  const rows = review.locator('[data-testid="discharge-therapy-row"]');
  await expect(rows).toHaveCount(2);

  const amoxi = rows.nth(0);
  await expect(amoxi.getByPlaceholder('es. Kanrenol')).toHaveValue('Amoxicillina');
  // Forma mappata CPR RIV → compressa; via OS → orale; dosaggio 500 mg; orari 08:00 e 20:00.
  await expect(amoxi.locator('select.form-select').first()).toHaveValue('compressa');
  await expect(amoxi.getByPlaceholder('es. 100')).toHaveValue('500');
  await expect(amoxi.locator('input[type="time"]').first()).toHaveValue('08:00');
  await expect(amoxi.locator('input[type="time"]').nth(1)).toHaveValue('20:00');

  // AC2: testo originale estratto visibile accanto al form.
  await expect(amoxi.locator('[data-testid="discharge-original-text"]')).toContainText(
    'AMOXICILLINA 500 MG CPR RIV',
  );

  // AC4: la riga incompleta resta segnalata "da verificare" e non viene persa.
  await expect(page.locator('[data-testid="discharge-therapy-alert"]')).toBeVisible();
  await expect(rows.nth(1)).toHaveAttribute('data-stato', 'da_verificare');
  await expect(rows.nth(1).locator('.discharge-therapy-review__badge.is-verify')).toBeVisible();

  await page.screenshot({
    path: `${OUT}/screenshots/280-form-reale-precompilato.png`,
    fullPage: true,
  });

  // AC3: modifica nel form (orario 08:00 → 09:30) → draft aggiornato → sopravvive alla conferma.
  await amoxi.locator('input[type="time"]').first().fill('09:30');
  await page.waitForTimeout(1500); // debounce autosave patchDraft

  // Accetta la terapia (gate #235) e completa il flusso fino alla creazione.
  await page.locator('[data-testid="accept-therapy"]').check();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Avanti/i }).click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-testid="accept-demographics"]').check();
  const createBtn = page.getByRole('button', { name: /^Crea paziente$/ }).last();
  await expect(createBtn).toBeEnabled({ timeout: 8000 });

  const confirmResp = page.waitForResponse(
    (r) => r.url().includes(`/intake/drafts/${draftId}/confirm`) && r.request().method() === 'POST',
  );
  await createBtn.click();
  const confirm = await confirmResp;
  expect(confirm.status()).toBe(201);
  const confirmBody = (await confirm.json()) as { patient?: { id: string } };
  const patientId = confirmBody.patient?.id;
  expect(patientId, 'confirm restituisce il paziente creato').toBeTruthy();

  // La terapia creata riflette la modifica fatta nel form (09:30, non più 08:00).
  const thResp = await page.request.get(`http://localhost:3001/patients/${patientId}/therapies`);
  expect(thResp.ok()).toBeTruthy();
  const therapies = (await thResp.json()) as Array<{
    farmacoNome: string;
    schedules: Array<{ time: string }>;
  }>;
  const amoxiCreated = therapies.find((t) => /amoxicillina/i.test(t.farmacoNome));
  expect(
    amoxiCreated,
    `terapie create: ${JSON.stringify(therapies.map((t) => t.farmacoNome))}`,
  ).toBeTruthy();
  const times = (amoxiCreated?.schedules ?? []).map((s) => s.time);
  expect(times).toContain('09:30');
  expect(times).toContain('20:00');
  expect(times).not.toContain('08:00');

  // Persistenza dopo reload: il paziente creato è in lista.
  await page.reload();
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await expect(page.getByText(COGNOME, { exact: false }).first()).toBeVisible({ timeout: 15000 });

  await page.screenshot({ path: `${OUT}/screenshots/280-paziente-creato.png`, fullPage: true });
  g.assertClean();
});
