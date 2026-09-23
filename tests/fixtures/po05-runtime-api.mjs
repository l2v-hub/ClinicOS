import { createServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';

export const po05Actor = {
  id: 'PO05-SYNTHETIC-OP',
  role: 'operatore',
  name: 'Operatore sintetico',
};
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)),
  );
const close = async (server) => {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
};

/** Loopback-only, provider-free implementation of the document-job lifecycle contract. */
export async function startPo05Runtime({ respond, token = 'po05-synthetic-runtime' } = {}) {
  const jobs = new Map(),
    external = new Map(),
    events = [],
    faults = new Map();
  let sequence = 0;
  const publicJob = (job) => ({
    job_id: job.id,
    status: job.status,
    input_hash: job.input.input_hash,
    attempt: job.attempt,
    model: 'synthetic-po05',
    error: job.error ?? null,
    finish_reason: job.finish_reason ?? 'stop',
    truncated: job.truncated ?? false,
  });
  const server = createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== `Bearer ${token}`) return reply(401, {});
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const action = url.pathname.endsWith('/run')
        ? 'run'
        : url.pathname.endsWith('/retry')
          ? 'retry'
          : url.pathname === '/v1/document-jobs'
            ? 'create'
            : 'read';
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      const send = (status, result) => {
        if (faults.get(action)) {
          faults.set(action, faults.get(action) - 1);
          return reply(503, { synthetic: 'lost-response' });
        }
        return reply(status, result);
      };
      if (url.pathname === '/v1/runtime/capabilities')
        return reply(200, { document_job_contract_version: 2, max_upload_bytes: 40 * 1024 * 1024 });
      if (action === 'create') {
        const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const prior = external.get(body.external_job_id);
        if (prior && prior.digest !== digest) return reply(409, {});
        const job = prior ?? {
          id: randomUUID(),
          input: body,
          digest,
          status: 'created',
          attempt: 0,
          sequence: ++sequence,
        };
        jobs.set(job.id, job);
        external.set(body.external_job_id, job);
        events.push({ action, unit: body.external_job_id, jobId: job.id, replay: !!prior });
        return send(201, publicJob(job));
      }
      const match = url.pathname.match(/^\/v1\/document-jobs\/([^/]+)(?:\/(run|retry|result))?$/);
      const job = match && jobs.get(match[1]);
      if (!job) return reply(404, {});
      if (match[2] === 'result')
        return reply(200, {
          ...publicJob(job),
          data: job.status === 'review_ready' ? job.data : null,
          ...job.resultOverrides,
        });
      if (action === 'run' || action === 'retry') {
        if (action === 'run' && job.mode && job.mode !== body.mode) return reply(409, {});
        if (action === 'retry' && body.expected_attempt > job.attempt) return reply(409, {});
        if (
          (action === 'run' && job.status === 'created') ||
          (action === 'retry' && body.expected_attempt === job.attempt && job.status === 'failed')
        ) {
          job.mode = job.mode ?? body.mode;
          job.attempt++;
          job.status = 'running';
          job.error = null;
          events.push({
            action: 'start',
            unit: job.input.external_job_id,
            attempt: job.attempt,
            mode: job.mode,
          });
          Promise.resolve()
            .then(async () => {
              const output = respond ? await respond(job) : null;
              Object.assign(job, {
                status: 'review_ready',
                data:
                  job.mode === 'ocr'
                    ? { rawText: '## DIAGNOSI\nOsservazione sintetica.' }
                    : { anagrafica: { nome: 'Persona', cognome: 'Sintetica' }, cartella: {} },
                ...output,
              });
            })
            .catch(() => {
              job.status = 'failed';
              job.error = { kind: 'provider_error' };
            });
        }
        return send(202, publicJob(job));
      }
      return reply(200, publicJob(job));
    } catch {
      reply(500, { synthetic: 'fixture-error' });
    }
  });
  const url = await listen(server);
  return {
    url,
    token,
    jobs,
    events,
    dropNext(action) {
      faults.set(action, (faults.get(action) ?? 0) + 1);
    },
    forgetAll() {
      jobs.clear();
      external.clear();
    },
    close: () => close(server),
  };
}

/** Real import/draft/patient routers. Call only after selecting a synthetic loopback DB. */
export async function startPo05ImportApi({ autoWorker = false, port = 0 } = {}) {
  if (new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1')
    throw new Error('Loopback DB required');
  const [
    { default: express },
    { default: jobs },
    { default: drafts },
    { default: patients },
    { prisma },
    { runNextPageJob },
  ] = await Promise.all([
    import('express'),
    import('../../backend/src/routes/ai-jobs.ts'),
    import('../../backend/src/routes/intake-drafts.ts'),
    import('../../backend/src/routes/patients.ts'),
    import('../../backend/src/lib/prisma.ts'),
    import('../../backend/src/ai/upload/pages/worker.ts'),
  ]);
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Operator-Id, X-Operator-Role, Idempotency-Key',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.get('/health', (_req, res) => res.json({ synthetic: true, status: 'ok' }));
  app.use('/ai/extraction/jobs', jobs);
  app.use('/intake/drafts', drafts);
  app.use('/api/patients', patients);
  const server = await new Promise((resolve) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });
  let busy = false;
  const timer = autoWorker
    ? setInterval(() => {
        if (busy) return;
        busy = true;
        runNextPageJob({ pollMs: 10 }).finally(() => {
          busy = false;
        });
      }, 100)
    : null;
  timer?.unref();
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    prisma,
    close: async () => {
      if (timer) clearInterval(timer);
      await close(server);
    },
  };
}
