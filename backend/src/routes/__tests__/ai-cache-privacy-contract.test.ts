import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../app.ts', import.meta.url), 'utf8');

test('public AI cache privacy runs before parsing, authentication and every AI router', () => {
  const privacyMiddleware = appSource.indexOf("app.use('/ai',");
  const parser = appSource.indexOf("export const STANDARD_JSON_LIMIT = '512kb'");
  assert.ok(privacyMiddleware >= 0);
  assert.ok(privacyMiddleware < parser);
  assert.match(
    appSource.slice(privacyMiddleware, parser),
    /res\.setHeader\('Cache-Control', 'private, no-store'\)/,
  );

  for (const mount of [
    "app.use('/ai/extraction/jobs'",
    "app.use('/ai/extraction'",
    "app.use('/ai/assistant'",
    "app.use('/ai/voice'",
    "app.use('/ai/actions'",
    "app.use('/ai/audit'",
  ]) {
    assert.ok(privacyMiddleware < appSource.indexOf(mount), mount);
  }
});
