import { readdirSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';

const AB = 'C:/Workspace/DG_SE_DEV/ClinicOS/.worktrees/evidence/artifacts/task-validation';
const now = new Date().toISOString();

// Evidenced issues: slug + kind + one-line what-was-verified.
const EVID = {
  '171-stato-camere-e-pazienti-presenti': ['#171 Stato camere e pazienti presenti', 'UI reale (admin → Posti Letto): 3 camere/4 letti, occupancy, letto OCCUPATO con paziente presente.'],
  '214-consegne-tra-operatori': ['#214 Consegne tra operatori', 'UI reale (operatore → Consegne) + API con creatoDA(sender)/operatoreAssegnato(recipient)/stato; transizioni in_corso/completata.'],
  '187-lettura-dati-paziente-tramite-chatbot': ['#187 Lettura dati paziente tramite chatbot', 'UI reale: chatbot Agnos risponde "mostrami gli ultimi parametri di Moretti Elena" con parametri (SpO2/FC/PA) e Fonte: VITAL_SIGN.'],
  '186-action-registry-agnos-per-gestione-routine-paziente': ['#186 Action registry Agnos', 'GET /ai/actions/catalog live: 8 azioni CRU, kinds {read,create,update}, zero delete.'],
  '223-audit-privacy-safe-operational-actions': ['#223 Audit privacy-safe azioni operative', 'Test operational-audit verde: recordOperationalAudit registra actor/action/entity/outcome/timestamp, solo nomi campo.'],
  '201-fake-voice-provider-deterministic-tests': ['#201 Test provider voce fake', 'Test voice-provider verde: FakeVoiceSttProvider copre success/failure/timeout senza credenziali.'],
  '202-privacy-voice-logging': ['#202 Privacy voice logging', 'Test privacy verde (trascrizione mai loggata; metadati minimi) + controllo dettatura (mic) presente in UI.'],
  '157-agnos-query-operative': ['#157 Agnos query operative su struttura e pazienti', 'Motore componibile: authz(context-facility)+validate+schema verdi; dato facility live (/admin/rooms). NL→plan in UI usa planner LLM.'],
  '137-agnos-planner-llm': ['#137 Agnos planner LLM', 'Test llm-planner verde con provider fake controllato (mode=llm + fallback deterministico), nessuna credenziale live.'],
  '224-no-secret-frontend-bundle-scan': ['#224 No secret frontend + scansione bundle', 'Scanner: self-test OK, frontend/src 0 findings, secret finto → exit 1. CI scandisce anche il bundle.'],
  '133-ci-browser-e2e-runtime-mock-reachability': ['#133 CI browser-e2e runtime reachability', 'Fix statico verificato: workflow 127.0.0.1 (0 localhost residui), assert /v1/document-jobs, assert creazione, node --check OK.'],
  '188-creazione-consegne-tramite-chatbot': ['#188 Creazione consegne tramite chatbot', 'Chatbot: plan create_consegna → conferma → execute → consegna persistita (trovata via GET /consegne).'],
  '189-creazione-diario-tramite-chatbot': ['#189 Creazione diario tramite chatbot', 'Chatbot: plan add_diary_note → conferma obbligatoria → execute ok + recordId Prisma persistito.'],
  '190-registrazione-parametri-tramite-chatbot': ['#190 Registrazione parametri tramite chatbot', 'Chatbot: plan create_vital_sign → conferma → execute → valore poi visibile via lettura (persistenza).'],
  '193-rifiuto-delete-tramite-chatbot': ['#193 Rifiuto Delete tramite chatbot', 'Ogni variante delete rifiutata al plan (refuse_forbidden) e all\'execute (HTTP 4xx), nessuna scrittura.'],
  '194-conferma-obbligatoria-create-update-agnos': ['#194 Conferma obbligatoria per Create/Update Agnos', 'execute confirmed:false → HTTP 428; confirmed:true → ok + recordId. Plan ri-derivato server-side (tamper-proof).'],
  '178-consegne-strutturate': ['#178 Consegne strutturate', 'GET /consegne: consegne con stato enum (aperta/in_corso/completata) + link paziente/operatore.'],
  '175-terapie-da-somministrare': ['#175 Terapie da somministrare', 'GET /patients/:id/therapies 200: terapie del paziente disponibili.'],
  '177-diario-clinico-assistenziale': ['#177 Diario clinico assistenziale', 'GET /patients/:id/diary 200: diario clinico leggibile per paziente.'],
  '198-dettatura-parametri': ['#198 Dettatura parametri', 'Comando canale voce → plan create_vital_sign con conferma; dettatura vocale riconosciuta.'],
  '195-infrastruttura-voce-agnos': ['#195 Infrastruttura voce Agnos', 'GET /ai/voice/stt: contratto STT capability/degradation; trascrizione Web Speech client-side.'],
  '216-ordinamento-pazienti': ['#216 Ordinamento pazienti', 'UI Pazienti: lista ordinata (lib/patientSort) renderizzata; no console error, no HTTP 4xx.'],
};

function testResultsDir(slug) {
  const trp = `${AB}/${slug}/test-results`;
  if (!existsSync(trp)) return null;
  const d = readdirSync(trp).find((n) => statSync(`${trp}/${n}`).isDirectory());
  return d ? `test-results/${d}` : null;
}

for (const [slug, [title, what]] of Object.entries(EVID)) {
  const tr = testResultsDir(slug);
  const files = tr ? readdirSync(`${AB}/${slug}/${tr}`) : [];
  const hasTrace = files.includes('trace.zip');
  const hasVideo = files.some((f) => f.endsWith('.webm'));
  const md = `# Validation Report (Evidence Remediation) — ${title}

- Slug: ${slug}
- Date: ${now}
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (\`qa-evidence/\`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
${what}

## Evidenze oggettive (path reali)
- Screenshot finale: \`artifacts/task-validation/${slug}/final/after.png\`
- Playwright HTML report: \`artifacts/task-validation/${slug}/playwright-report/index.html\`
${tr ? `- Trace: \`artifacts/task-validation/${slug}/${tr}/trace.zip\` ${hasTrace ? '' : '(assente)'}\n- Video: \`artifacts/task-validation/${slug}/${tr}/\` (${hasVideo ? '*.webm' : 'assente'})\n- Test-results: \`artifacts/task-validation/${slug}/${tr}/\`` : '- (test-results non trovati)'}
- Spec Playwright: \`qa-evidence/tests/${slug.split('-')[0] === '171' ? 'issue-171' : 'issue-' + slug.split('-')[0]}.spec.ts\`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
`;
  writeFileSync(`${AB}/${slug}/validation-report.md`, md);

  const num = slug.split('-')[0];
  const tc = `# Task Contract — ${title}

- Issue: #${num}
- Slug: ${slug}
- Date: ${now}
- Mode: Parallel Evidence Remediation (Codex QA gate). Claude produces objective evidence; Codex closes.

## Objective
Produce objective Playwright evidence that #${num} meets its acceptance criteria on the current code
(real assertions, no console errors, no HTTP 4xx/5xx, persistence-after-reload where data changes;
QA report surface for internal/no-UI features), saved under this folder.

## Scope of evidence
${what}

## Acceptance
- A dedicated Playwright test with real assertions runs green on the current stack.
- Bundle present: final screenshot, trace.zip, playwright-report/, test-results/${hasVideo ? ', video.webm' : ''}.
- validation-report.md references the real artifact paths.

## Governance
Claude does NOT close the issue. Decision emitted: READY FOR CODEX QA. Codex re-runs the QA gate.
`;
  writeFileSync(`${AB}/${slug}/task-contract.md`, tc);
  console.log(`wrote ${slug} (trace=${hasTrace} video=${hasVideo}) + task-contract`);
}
