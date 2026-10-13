// Diagnostic branch: use the existing project token without SSH or credential export.
// Only the existing READ ONLY inventory can connect to PostgreSQL.
import { spawnSync } from 'node:child_process';

function fail(code) {
  const error = new Error('Production inventory prerequisite unavailable');
  error.code = code;
  throw error;
}
function railwayJson(args) {
  const result = spawnSync('railway', args, { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) fail('RAILWAY_CONFIGURATION_READ_FAILED');
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail('RAILWAY_CONFIGURATION_FORMAT');
  }
}
function url(value) {
  try {
    const result = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(result.protocol)) fail('INVALID_DATABASE_PROTOCOL');
    return result;
  } catch {
    fail('DATABASE_BINDING_UNAVAILABLE');
  }
}
function privateHost(host) {
  return host.endsWith('.railway.internal') || ['localhost', '127.0.0.1', '::1'].includes(host);
}
function sameDatabase(privateUrl, publicUrl) {
  return privateUrl.pathname === publicUrl.pathname &&
    privateUrl.username === publicUrl.username && privateUrl.password === publicUrl.password;
}
function serviceCandidates(value, host, result = new Map(), depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return result;
  if (typeof value.id === 'string' && typeof value.name === 'string') {
    const normal = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normal(value.name) === normal(host.split('.')[0]) || /postgres/i.test(value.name))
      result.set(value.id, value.name);
  }
  for (const nested of Object.values(value)) serviceCandidates(nested, host, result, depth + 1);
  return result;
}

try {
  if (!process.env.RAILWAY_TOKEN || !process.env.RAILWAY_SERVICE) fail('RAILWAY_BINDING_UNAVAILABLE');
  const backend = railwayJson(['variables', '--service', process.env.RAILWAY_SERVICE, '--json']);
  const primary = url(backend.DATABASE_URL);
  let connection = primary;
  if (privateHost(primary.hostname)) {
    let verifiedPublic = null;
    if (backend.DATABASE_PUBLIC_URL) {
      const candidate = url(backend.DATABASE_PUBLIC_URL);
      if (sameDatabase(primary, candidate) && !privateHost(candidate.hostname)) verifiedPublic = candidate;
    }
    if (!verifiedPublic) {
      const status = railwayJson(['status', '--json']);
      const candidates = serviceCandidates(status, primary.hostname);
      if (candidates.size > 10) fail('AMBIGUOUS_DATABASE_SERVICE');
      for (const [id] of candidates) {
        const config = railwayJson(['variables', '--service', id, '--json']);
        if (!config.DATABASE_URL || !config.DATABASE_PUBLIC_URL) continue;
        const internal = url(config.DATABASE_URL), external = url(config.DATABASE_PUBLIC_URL);
        if (internal.hostname === primary.hostname && sameDatabase(primary, internal) &&
            sameDatabase(primary, external) && !privateHost(external.hostname)) {
          verifiedPublic = external;
          break;
        }
      }
    }
    if (!verifiedPublic) fail('VERIFIED_PUBLIC_DATABASE_MAPPING_UNAVAILABLE');
    connection = verifiedPublic;
  }
  // A public connection must verify the certificate; no cleartext or insecure fallback.
  connection.searchParams.set('sslmode', 'verify-full');
  console.log(JSON.stringify({
    mode: 'read-only', projectId: backend.RAILWAY_PROJECT_ID,
    environmentId: backend.RAILWAY_ENVIRONMENT_ID, backendServiceId: backend.RAILWAY_SERVICE_ID,
    configuredDatabaseHost: primary.hostname, connectionHost: connection.hostname,
    database: decodeURIComponent(primary.pathname.slice(1)), credentialsExported: false,
  }));
  const inventory = spawnSync(process.execPath, [
    'scripts/maintenance/production-db-inventory.mjs', '--expected-host', connection.hostname,
    '--expected-database', decodeURIComponent(primary.pathname.slice(1)),
  ], {
    stdio: 'inherit', timeout: 120000,
    env: { ...process.env, CLINICOS_PRODUCTION_DATABASE_URL: connection.toString() },
  });
  process.exitCode = inventory.status ?? 1;
} catch (error) {
  const code = /^[A-Z0-9_]+$/.test(error?.code ?? '') ? error.code : 'INVENTORY_PREREQUISITE_FAILED';
  console.error(JSON.stringify({ mode: 'read-only', error: code, credentialsExported: false }));
  process.exitCode = 1;
}
