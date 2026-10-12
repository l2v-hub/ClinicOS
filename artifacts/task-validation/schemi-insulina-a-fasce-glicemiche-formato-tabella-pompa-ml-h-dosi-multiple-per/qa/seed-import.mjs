// Seeds a review-ready import job whose narrative therapy text is the given fixture, then creates
// the intake draft through the real API (deterministic parser). Synthetic data only, local DB only.
import { prisma } from '../../../../backend/src/lib/prisma.js';
const API = 'http://127.0.0.1:3097';
export async function token(identityId) {
  const r = await fetch(`${API}/auth/simulator/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5197' }, body: JSON.stringify({ identityId }) });
  return (await r.json()).token;
}
export async function seedImport(therapyText, { firstName, lastName, dateOfBirth }, identityId = 'SIM-DOCTOR-1') {
  const narrative = { schemaVersion: 'clinicos-discharge-narrative-v1', firstName, lastName, dateOfBirth, placeOfBirth: '', sex: '', fiscalCode: '', address: '', phone: '', email: '', allergyStatus: 'not_documented', allergiesText: '', diagnosisText: '', anamnesisText: '', hospitalCourseText: '', consultationsText: '', imagingDiagnosticsText: '', proceduresAndInterventionsText: '', therapyText, adviceAndFollowUpText: '', unmappedText: '', boldTags: [], sourceReferences: [], missingSections: [], warnings: [] };
  const job = await prisma.importJob.create({ data: { maxFiles: 5, maxTotalBytes: 10 * 1024 * 1024, expiresAt: new Date(Date.now() + 864e5), status: 'review_ready', createdById: identityId, resultData: { _narrative: narrative, _sections: null, _full: { cartella: {} } } } });
  const t = await token(identityId);
  const res = await fetch(`${API}/intake/drafts/from-import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, Origin: 'http://127.0.0.1:5197' }, body: JSON.stringify({ importJobId: job.id }) });
  const body = await res.json();
  return { job, status: res.status, draft: body.draft ?? body, token: t };
}
if (process.argv[2] === 'probe') {
  const { TABLE } = await import('./texts.mjs');
  const r = await seedImport(TABLE, { firstName: 'Qaprobe', lastName: 'Sintetico', dateOfBirth: '1950-01-01' });
  console.log(r.status, r.draft.id, JSON.stringify(r.draft.data?.terapiaImport?.map(x => ({ n: x.farmacoNome, s: x.stato, bands: x.glucoseScale?.length, w: x.glucoseScaleWarnings, u: x.glucoseDoseUnit }))));
  const j = await fetch(`${API}/ai/extraction/jobs/${r.job.id}`, { headers: { Authorization: `Bearer ${r.token}`, Origin: 'http://127.0.0.1:5197' } });
  console.log(j.status, JSON.stringify((await j.json()).review ?? {}).slice(0, 400));
  await prisma.$disconnect();
}
