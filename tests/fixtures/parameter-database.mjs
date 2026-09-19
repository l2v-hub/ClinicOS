import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const fixtureActors = {
  operator: { id: 'VITALS-QA-OP', role: 'operatore', name: 'Ignored client name' },
  outsider: { id: 'VITALS-QA-OTHER', role: 'operatore' },
  manager: { id: 'VITALS-QA-MANAGER', role: 'manager' },
};
export const fixturePatientIds = ['vitals-qa-anna', 'vitals-qa-bruno', 'vitals-qa-other'];

/** All migrations run against a new, local synthetic PostgreSQL-compatible database. */
export async function startParameterDatabase({ port = 0, dataDir } = {}) {
  if (dataDir) await mkdir(dataDir, { recursive: true });
  const db = await PGlite.create({ ...(dataDir ? { dataDir } : {}), extensions: { pg_trgm } });
  // Exercise offset-aware SQL explicitly; UTC-only fixtures conceal adapter timestamp errors.
  await db.exec("SET TIME ZONE 'Europe/Rome'");
  await db.exec(
    'CREATE TABLE IF NOT EXISTS "__FixtureMigration" ("name" TEXT PRIMARY KEY, "sha256" TEXT NOT NULL)',
  );
  const directory = resolve(repositoryRoot, 'prisma/migrations');
  const migrations = (await readdir(directory, { withFileTypes: true }))
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
  const applied = [];
  for (const name of migrations) {
    const sql = await readFile(resolve(directory, name, 'migration.sql'), 'utf8');
    const sha256 = createHash('sha256').update(sql).digest('hex');
    const existing = await db.query('SELECT "sha256" FROM "__FixtureMigration" WHERE "name" = $1', [
      name,
    ]);
    if (existing.rows.length) {
      if (existing.rows[0].sha256 !== sha256) throw new Error(`Fixture migration changed: ${name}`);
      continue;
    }
    await db.exec(sql);
    await db.query('INSERT INTO "__FixtureMigration" VALUES ($1, $2)', [name, sha256]);
    applied.push(name);
  }
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port, maxConnections: 16 });
  await socket.start();
  const url = `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`;
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1')
    throw new Error('Fixture database must remain loopback-only');
  return {
    db,
    socket,
    url,
    applied,
    async close() {
      await socket.stop();
      await db.close();
    },
  };
}

export async function seedParameterDatabase(db) {
  const now = '2026-09-19T08:00:00.000Z';
  for (const [key, actor] of Object.entries(fixtureActors)) {
    const name =
      key === 'operator'
        ? 'Operatrice QA'
        : key === 'manager'
          ? 'Responsabile QA'
          : 'Operatore Esterno QA';
    await db.query(
      `INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "role", "updatedAt")
      VALUES ($1, $2, 'synthetic-disabled', $3, $4::"Role", $5) ON CONFLICT ("id") DO NOTHING`,
      [
        `${actor.id}-USER`,
        `${key}@synthetic.invalid`,
        name,
        key === 'manager' ? 'MANAGER' : 'OPERATOR',
        now,
      ],
    );
    await db.query(
      `INSERT INTO "Operator" ("id", "userId", "updatedAt") VALUES ($1, $2, $3) ON CONFLICT ("id") DO NOTHING`,
      [actor.id, `${actor.id}-USER`, now],
    );
  }
  for (const [index, id] of fixturePatientIds.entries()) {
    await db.query(
      `INSERT INTO "Patient" ("id", "medicalRecordNumber", "firstName", "lastName", "dateOfBirth", "sex", "phone", "registeredById", "updatedAt")
      VALUES ($1, $2, $3, $4, '1950-01-01', $5, '0000000000', $6, $7) ON CONFLICT ("id") DO NOTHING`,
      [
        id,
        `SYNTHETIC-${id}`,
        ['Anna', 'Bruno', 'Esterno'][index],
        ['Alfa', 'Beta', 'Gamma'][index],
        index === 1 ? 'M' : 'F',
        index === 2 ? fixtureActors.outsider.id : fixtureActors.operator.id,
        now,
      ],
    );
    const data = {
      pazienteId: id,
      cameraNumero: String(index + 11),
      lettoNumero: 'A',
      parametriMensili: [
        {
          id: `${id}-legacy`,
          mese: 9,
          anno: 2026,
          createdAt: '2026-09-01T08:00:00.000Z',
          giorni: [
            {
              giorno: 18,
              pa: '120/80',
              spo2: '98',
              fc: '72',
              dtx08: '99',
              dtx12: '104',
              dtx18: '101',
              firmaIpM: 'Operatore storico',
              note: 'Valore storico sintetico',
            },
          ],
        },
      ],
      parametriVitali: [
        {
          id: `${id}-old`,
          etichetta: 'Temperatura',
          valore: '36.7',
          unita: '°C',
          stato: 'normale',
          rilevato: '2026-09-17',
          rilevatoDa: 'Operatore storico',
        },
      ],
      allergie: [],
      terapie: [],
      diagnosi: [],
    };
    await db.query(
      `INSERT INTO "Cartella" ("id", "patientId", "data", "updatedAt") VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT ("patientId") DO NOTHING`,
      [`${id}-cartella`, id, JSON.stringify(data), now],
    );
  }
}

export function selectLocalParameterDatabase(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' || !parsed.port)
    throw new Error('Explicit loopback database URL required');
  // Override before any Prisma import. No inherited production connection is used.
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.AUTH_MODE = 'demo';
}

export async function closeParameterPrisma(prisma) {
  await prisma.$disconnect();
  // Prisma does not own the external pg.Pool created by lib/prisma.ts. Let its
  // default 10-second idle timeout drain sockets before stopping the fixture DB.
  await new Promise((resolveIdle) => setTimeout(resolveIdle, 11000));
}

/** Mount the production patients router, including real authentication and Cartella PUT. */
export async function startParameterApi({ port = 0, faults = false } = {}) {
  const [{ default: express }, { default: router }] = await Promise.all([
    import('express'),
    import('../../backend/src/routes/patients.ts'),
  ]);
  const app = express();
  const requests = [];
  let nextFault = null;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Operator-Id, X-Operator-Role');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', synthetic: true }));
  if (faults) {
    app.post('/__fixture/fault', (req, res) => {
      if (!['after-commit', 'before-commit', 'delay', 'clear'].includes(req.body?.mode)) {
        res.status(400).end();
        return;
      }
      nextFault = req.body.mode === 'clear' ? null : req.body.mode;
      res.json({ nextFault });
    });
    app.get('/__fixture/requests', (_req, res) => res.json(requests));
  }
  app.use(async (req, res, next) => {
    if (req.method !== 'POST' || !/\/parameter-readings$/.test(req.path)) {
      next();
      return;
    }
    const record = {
      path: req.path,
      requestId: req.body?.requestId,
      measuredAt: req.body?.measuredAt,
      values: req.body?.values,
      status: null,
    };
    requests.push(record);
    res.on('finish', () => {
      record.status = res.statusCode;
    });
    const fault = nextFault;
    nextFault = null;
    if (fault === 'before-commit') {
      res.status(503).json({ error: 'Errore sintetico prima del salvataggio. Riprova.' });
      return;
    }
    if (fault === 'delay') await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
    if (fault === 'after-commit') {
      const originalJson = res.json.bind(res);
      res.json = (body) =>
        res.statusCode < 300
          ? originalJson.call(res.status(503), {
              error: 'Risposta sintetica persa dopo il salvataggio. Riprova la stessa richiesta.',
            })
          : originalJson(body);
    }
    next();
  });
  app.use('/api/patients', router);
  const server = await new Promise((resolveServer) => {
    const result = app.listen(port, '127.0.0.1', () => resolveServer(result));
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    async close() {
      server.closeAllConnections();
      await new Promise((resolveClose, reject) =>
        server.close((error) => (error ? reject(error) : resolveClose())),
      );
    },
  };
}
