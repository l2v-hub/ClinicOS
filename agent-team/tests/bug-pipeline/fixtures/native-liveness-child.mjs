import { stageGuardedSession } from '../../../src/bug-pipeline/native-guard-session.mjs';

const expected = {
  input: 'synthetic',
  schema: {},
  subjectSha: 'a'.repeat(40),
  model: 'claude-opus-5-5',
  contextWindow: 1000000,
  outputCap: 32768,
};
const pending = () => new Promise(() => {});
const mode = process.argv[2];
let forwards = 0;
const line = (text) => Buffer.from(`2026-11-03T14:00:00.000Z [DEBUG] Remote settings: ${text}\n`);
const startRuntime =
  mode === 'startup'
    ? pending
    : ['isolation', 'release'].includes(mode)
      ? async ({ data, onStage, onDiagnostic }) => {
          setImmediate(() => {
            const staged = data.stage({
              seal: {},
              forward: async () => {
                forwards++;
              },
            });
            onStage(staged);
            onDiagnostic(line('Saved empty sentinel (404 response)'));
            if (mode === 'isolation')
              setImmediate(() => onDiagnostic(line('Unexpected policy change')));
          });
          return {
            completion: pending(),
            isolation:
              mode === 'isolation'
                ? pending()
                : Promise.resolve({ runtimeIsolationVerified: true, binaryVerified: true }),
            isLive: () => true,
            close: async () => {},
          };
        }
      : async () => ({
          completion: Promise.resolve({ ok: false }),
          isolation: pending(),
          isLive: () => false,
          close: pending,
        });
try {
  const session = await stageGuardedSession({
    expected,
    startRuntime,
    validateClaim: async () => true,
    timeoutMs: ['isolation', 'release'].includes(mode) ? 1000 : 60,
    cleanupTimeoutMs: 60,
  });
  if (mode !== 'release') process.exitCode = 1;
  else {
    const result = session.release({ nonce: 'fixture' });
    setImmediate(() => {
      void session.close();
    });
    await result;
    process.exitCode = 1;
  }
} catch (error) {
  console.log(`${error.message}${mode === 'release' ? ` forwards=${forwards}` : ''}`);
}
