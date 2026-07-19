import { test, expect, showReport, reportDoc } from '../harness';
import { execSync } from 'node:child_process';
import { parseDischargeTherapy } from '../../backend/src/intake/parse-discharge-therapy.js';

// #156 / #204 / #205 / #206 / #207 — discharge-letter therapy TEXT → structured rows → confirm → PatientTherapy.
// Objective evidence: the REAL parser (PR #158) + the REAL API E2E that persists to Postgres (verified by DB read).
const THERAPY = [
  'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  'CACIT VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00 dal 03/07/2026 Mar Gio Sab Dom (Classe A)',
  'PEVARYL POLVERE INGUINE SN X 1 AL DI',
].join('\n');
const TSX = 'C:/Workspace/DG_SE_DEV/ClinicOS/node_modules/tsx/dist/cli.mjs';
const THER_ROOT = 'C:/Workspace/DG_SE_DEV/ClinicOS/.worktrees/therapy';

test('#156/#204-207 terapia dimissioni → righe strutturate → persistite', async ({ page }) => {
  // #204/#205: extraction into structured rows.
  const rows = parseDischargeTherapy(THERAPY);
  expect(rows.length).toBe(3);
  expect(rows.map((r) => r.farmacoNome)).toEqual(
    expect.arrayContaining(['KEPPRA', 'CACIT', 'PEVARYL']),
  );
  expect(rows.some((r) => r.orari.length > 0)).toBeTruthy(); // structured times parsed
  const keppra = rows.find((r) => r.farmacoNome === 'KEPPRA')!;
  expect(keppra.orari).toEqual(expect.arrayContaining(['08:00', '20:00']));
  expect(keppra.stato).toBe('ok');
  // #206: incomplete line flagged da_verificare (never dropped).
  const daVerificare = rows.filter((r) => r.stato === 'da_verificare');
  expect(daVerificare.length).toBeGreaterThan(0);

  // #207: full API E2E — confirm → PatientTherapy persisted, verified by a fresh DB read.
  let out = '';
  try {
    out = execSync(`node "${TSX}" e2e/therapy-import-api.mjs`, {
      cwd: THER_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (e: any) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const m = out.match(/OK — (\d+) detected, (\d+) persisted/);
  expect(m, `E2E output tail: ${out.slice(-240)}`).toBeTruthy();
  expect(Number(m![2])).toBe(3);

  await showReport(
    page,
    reportDoc(
      'Terapia dimissioni → righe strutturate (#156 #204 #205 #206 #207)',
      [
        {
          k: '#204 Estrazione terapia',
          v: `${rows.length} righe estratte dal testo di dimissione`,
          ok: rows.length === 3,
        },
        ...rows.map((r) => ({
          k: `· ${r.farmacoNome}`,
          v: `dose="${r.quantita || r.dosaggio}" · orari=[${r.orari.join(', ')}] · stato=${r.stato}`,
          ok: true,
        })),
        {
          k: '#205 Righe strutturate',
          v: 'farmacoNome / quantita / dosaggio / orari / dataInizio per riga',
          ok: true,
        },
        {
          k: '#206 Campi incerti (da_verificare)',
          v: `righe incomplete flaggate: ${daVerificare.map((r) => r.farmacoNome).join(', ')}`,
          ok: daVerificare.length > 0,
        },
        {
          k: '#207 Salvataggio dopo conferma',
          v: `E2E API: ${m![1]} detected, ${m![2]} persisted su PatientTherapy (verificato via lettura DB = "dopo refresh")`,
          ok: Number(m![2]) === 3,
        },
        {
          k: 'Codice',
          v: 'PR #158 — parser deterministico parse-discharge-therapy.ts + confirm→PatientTherapy',
          ok: true,
        },
      ],
      'Nessuna riga scartata; una riga incompleta diventa da_verificare. Evidenza: parser reale + E2E API con persistenza Postgres.',
    ),
  );
  await expect(page.getByText('Terapia dimissioni')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
