#!/usr/bin/env node
// Natural-language test harness for the Phase 3 Skill layer (Prompt 3 §11).
//
// Talks to a RUNNING backend exactly like the future AI Assistant UI: Role Simulator session →
// POST /skills/converse (natural language) → Agno/deterministic interpretation → skill → policy →
// workflow → Tool Layer → business logic → result/audit. No shortcut, no mock.
//
// Usage:
//   node scripts/skills/nl-harness.mjs --base http://127.0.0.1:3001 --as SIM-NURSE-1 \
//        [--patient <id> [--patient-label "Rossi Mario"]] [--json] "messaggio 1" "messaggio 2" …
//   (no messages → interactive prompt; "conferma"/"annulla"/"riprova" are sent as actions)
//
// Every message continues the current workflow until it ends (COMPLETED/DENIED/FAILED/CANCELLED).

import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const base = option('--base', process.env.CLINICOS_API ?? 'http://127.0.0.1:3001').replace(
  /\/$/,
  '',
);
const identity = option('--as', 'SIM-NURSE-1');
const patientId = option('--patient', undefined);
const patientLabel = option('--patient-label', undefined);
const asJson = flag('--json');
const messages = args;

const TERMINAL = new Set(['COMPLETED', 'DENIED', 'FAILED', 'CANCELLED']);
const ACTIONS = { conferma: 'confirm', annulla: 'cancel', riprova: 'retry' };

async function http(method, path, token, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  try {
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: response.status, body: text };
  }
}

const session = await http('POST', '/auth/simulator/session', null, { identityId: identity });
if (session.status !== 201) {
  console.error(`Login ${identity} fallito (${session.status}): ${JSON.stringify(session.body)}`);
  process.exit(2);
}
const token = session.body.token;
const me = await http('GET', '/auth/me', token);
console.log(
  `# identità: ${me.body?.name ?? identity} · ruolo: ${me.body?.roleLabel ?? me.body?.appRole ?? '?'}`,
);

let workflowId = null;
const transcript = [];

async function send(text) {
  const action = ACTIONS[text.trim().toLowerCase()];
  const body = {
    ...(workflowId ? { workflowId } : {}),
    ...(action && workflowId ? { action } : { message: text }),
    ...(patientId
      ? {
          context: {
            currentPatientId: patientId,
            ...(patientLabel ? { currentPatientLabel: patientLabel } : {}),
          },
        }
      : {}),
  };
  const response = await http('POST', '/skills/converse', token, body);
  const r = response.body ?? {};
  transcript.push({ user: text, status: response.status, response: r });
  if (asJson) console.log(JSON.stringify({ user: text, ...r }));
  else {
    console.log(`\n> ${text}`);
    console.log(
      `[${r.status ?? response.status}] skill=${r.skillId ?? '-'} interpreter=${r.interpreter ?? '-'}`,
    );
    console.log(r.reply ?? JSON.stringify(r));
    if (r.suggestions?.length)
      console.log(`  possibili: ${r.suggestions.map((s) => s.name).join(', ')}`);
  }
  workflowId = r.workflowId && !TERMINAL.has(r.status) ? r.workflowId : null;
  return r;
}

if (messages.length) {
  for (const message of messages) await send(message);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) {
    const line = await rl.question(workflowId ? '… ' : '> ');
    if (!line.trim() || line.trim() === 'esci') break;
    await send(line);
  }
  rl.close();
}
