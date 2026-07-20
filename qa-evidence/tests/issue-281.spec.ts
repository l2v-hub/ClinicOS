// #281 — Il riepilogo finale dell'import/intake mostra i VALORI reali che verranno creati
// (terapie con orari, allergie con gravità, anamnesi/diagnosi, anagrafica estesa) in una
// schermata stilata e leggibile — non più il solo elenco dei nomi-sezione senza stile.
import { test } from '@playwright/test';
import { guard, enterAs, nav, seedManualDraft, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const COGNOME = `Recap281-${STAMP}`;

const SEED = {
  anagrafica: {
    firstName: 'Amelia',
    lastName: COGNOME,
    dateOfBirth: '1948-11-02',
    sex: 'F',
    codiceFiscale: 'MLARCP48S42H501Y',
    phone: '333 7654321',
    email: 'amelia.recap@demo.it',
    address: 'Via delle Rose 12, Bologna',
  },
  allergie: [
    { id: `al-${STAMP}-1`, allergene: 'Penicillina', gravita: 'grave', reazione: 'orticaria' },
    { id: `al-${STAMP}-2`, allergene: 'Lattice', gravita: 'moderata', reazione: '' },
  ],
  anamnesi: {
    patologicaProssima:
      'Ricovero per scompenso cardiaco riacutizzato; dispnea da sforzo ingravescente.',
  },
  diagnosi: [{ id: `dx-${STAMP}-1`, descrizione: 'Scompenso cardiaco congestizio NYHA III' }],
  terapiaImport: [
    {
      farmacoNome: 'Amoxicillina',
      forma: 'CPR',
      dosaggio: '500 MG',
      viaSomministrazione: 'OS',
      quantita: '1',
      orari: ['08:00', '20:00'],
      giorni: [],
      dataInizio: '',
      classe: 'Antibiotico',
      note: '',
      originalText: 'AMOXICILLINA 500 MG CPR 1x2',
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
      originalText: 'FUROSEMIDE — posologia non leggibile',
      stato: 'da_verificare',
    },
  ],
};

test('#281 recap finale: valori reali leggibili (terapie, allergie, anamnesi, anagrafica)', async ({
  page,
}) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await seedManualDraft(page, SEED);

  await nav(page, 'Pazienti');
  await page.getByRole('button', { name: /Nuovo paziente/ }).click();
  await page.waitForTimeout(800);

  // Avanza fino allo step finale (6 — Verifica).
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Avanti/i }).click();
    await page.waitForTimeout(400);
  }
  const recap = page.locator('[data-testid="intake-step-6"]');
  await expect(recap).toBeVisible();

  // AC1: terapie elencate per NOME con orari e conteggio (non solo "Terapia farmacologica").
  await expect(recap.getByText('Terapie che verranno create (2)')).toBeVisible();
  await expect(recap.getByText('Amoxicillina — ore 08:00, 20:00')).toBeVisible();
  await expect(recap.getByText(/Furosemide/)).toBeVisible();
  await expect(recap.getByText(/da verificare/)).toBeVisible();

  // AC2: allergie con gravità, anamnesi e diagnosi con testo reale, anagrafica estesa.
  await expect(recap.getByText('Penicillina (grave)')).toBeVisible();
  await expect(recap.getByText('Lattice (moderata)')).toBeVisible();
  await expect(recap.getByText(/Ricovero per scompenso cardiaco riacutizzato/)).toBeVisible();
  await expect(recap.getByText('Scompenso cardiaco congestizio NYHA III')).toBeVisible();
  await expect(recap.getByText('MLARCP48S42H501Y')).toBeVisible();
  await expect(recap.getByText('333 7654321')).toBeVisible();

  // La schermata è stilata: le sezioni del recap sono card con bordo (non testo nudo).
  const section = recap.locator('.step-verifica__section').first();
  const borderW = await section.evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(borderW).not.toBe('0px');

  await page.screenshot({ path: `${OUT}/screenshots/281-recap-leggibile.png`, fullPage: true });
  g.assertClean(); // AC3
});
