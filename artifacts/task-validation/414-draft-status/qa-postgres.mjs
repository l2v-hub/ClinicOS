import { cpSync, mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';
import postgres from 'pg';
export async function syntheticPostgres() {
  const original = 'C:/Users/Claudio/AppData/Local/Temp/claude/C--Workspace-ClinicOSHouse/8f38df7f-f662-4544-a826-be262b0e6cf2/scratchpad/pg/node_modules/@embedded-postgres/windows-x64/native';
  const scratch = mkdtempSync(resolve(tmpdir(), 'clinicos-414-runtime-'));
  cpSync(original, resolve(scratch, 'native'), { recursive: true });
  // The cached native fixture is missing UTC. Supply a private, fixed-offset TZif v1
  // fixture; no shared binary/resource is changed. Offset 0, no DST/transitions.
  const utc = Buffer.alloc(54); utc.write('TZif'); utc.writeUInt32BE(1, 36); utc.writeUInt32BE(4, 40); utc.write('UTC\0', 50);
  const zoneDir = resolve(scratch, 'native/share/timezone'); mkdirSync(resolve(zoneDir, 'Etc'), { recursive: true });
  if (!existsSync(resolve(zoneDir, 'UTC'))) writeFileSync(resolve(zoneDir, 'UTC'), utc);
  if (!existsSync(resolve(zoneDir, 'Etc/UTC'))) writeFileSync(resolve(zoneDir, 'Etc/UTC'), utc);
  const pg = await startPo05Postgres({ bin: resolve(scratch, 'native/bin'), artifactRoot: scratch, repositoryRoot: process.cwd() });
  await pg.db.query("SET TIME ZONE 'UTC'"); await pg.db.query("SET TIME ZONE 'Europe/Rome'");
  // Prisma's externally supplied adapter pool outlives $disconnect. Track only
  // this process's fresh synthetic URL, close it before stopping its cluster.
  const pools = new Set(), connect = postgres.Pool.prototype.connect;
  postgres.Pool.prototype.connect = function(...args) {
    if (this.options.connectionString === pg.url) pools.add(this);
    return connect.apply(this, args);
  };
  const stop = pg.close;
  pg.close = async () => {
    postgres.Pool.prototype.connect = connect;
    for (const pool of pools) if (!pool.ending) await pool.end();
    await stop();
  };
  return pg;
}
