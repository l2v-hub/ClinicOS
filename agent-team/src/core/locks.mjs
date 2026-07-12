import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function arbitrateClaims(claims, now = new Date()) {
  return claims.filter((claim) => Date.parse(claim.expires_at) > now.getTime()).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.comment_id - b.comment_id)[0] ?? null;
}

export async function acquireGitHubClaim({ github, issue, workerId, role, attempt, leaseDurationMs, now = new Date() }) {
  const claim = { schema_version: 1, message_type: 'work.claim', lease_id: randomUUID(), worker_id: workerId, role, issue_number: issue.number, attempt, created_at: now.toISOString(), expires_at: new Date(now.getTime() + leaseDurationMs).toISOString() };
  const created = await github.addIssueComment(issue.number, `<!-- clinic-os-agent-team:v1 -->\n${JSON.stringify(claim)}`);
  claim.comment_id = created.id;
  const comments = await github.listIssueComments(issue.number);
  const claims = comments.map((comment) => { try { const parsed = JSON.parse(comment.body.split('\n').slice(1).join('\n')); return parsed.message_type === 'work.claim' && parsed.attempt === attempt ? { ...parsed, comment_id: comment.id } : null; } catch { return null; } }).filter(Boolean);
  const winner = arbitrateClaims(claims, now);
  return { won: winner?.comment_id === claim.comment_id, claim, winner };
}

export async function acquireLocalSupervisorLock(runtimeRoot) {
  await mkdir(runtimeRoot, { recursive: true });
  const lockPath = path.join(runtimeRoot, 'supervisor.lock');
  let handle;
  try { handle = await open(lockPath, 'wx'); } catch (error) { if (error.code === 'EEXIST') throw new Error('supervisor already running'); throw error; }
  await handle.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
  await handle.close();
  return { async release() { await rm(lockPath, { force: true }); } };
}

export async function isSupervisorLive(runtimeRoot) {
  try { const state = JSON.parse(await readFile(path.join(runtimeRoot, 'heartbeat.json'), 'utf8')); return Date.now() - Date.parse(state.at) < 45000; } catch { return false; }
}

export async function writeHeartbeat(runtimeRoot, state) {
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(path.join(runtimeRoot, 'heartbeat.json'), JSON.stringify({ ...state, pid: process.pid, at: new Date().toISOString() }));
}
