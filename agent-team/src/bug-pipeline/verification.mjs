import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(import.meta.url);
const PG = '/usr/lib/postgresql/16/bin';

export function verificationArguments(cwd, command, args = []) {
  return [
    'sandbox',
    '-c',
    'features.network_proxy=true',
    '-c',
    'permissions.clinicos-verification={extends=":workspace",network={enabled=true,mode="full",allow_local_binding=true,domains={},enable_socks5=false,enable_socks5_udp=false}}',
    '--permission-profile',
    'clinicos-verification',
    '--include-managed-config',
    '--cd',
    cwd,
    '--',
    process.execPath,
    FILE,
    '--',
    command,
    ...args,
  ];
}

function execute(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
}

export async function runVerification(command, args) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'clinicos-verification-pg-'));
  // Use an owned temporary directory independent of the model-selected command.
  if (!/^\/tmp\/clinicos-verification-pg-[A-Za-z0-9]+$/.test(directory)) {
    await rm(directory, { recursive: true, force: true });
    throw new Error('Unexpected verification temporary directory');
  }
  const data = path.join(directory, 'data');
  let started = false;
  const required = async (binary, options) => {
    if ((await execute(binary, options)) !== 0)
      throw new Error('Synthetic database preparation failed');
  };
  try {
    await required(path.join(PG, 'initdb'), [
      '-D',
      data,
      '-A',
      'trust',
      '-U',
      'postgres',
      '--no-locale',
      '-E',
      'UTF8',
    ]);
    await required(path.join(PG, 'pg_ctl'), [
      '-D',
      data,
      '-l',
      path.join(directory, 'postgres.log'),
      '-o',
      '-h 127.0.0.1 -p 5432 -c unix_socket_directories=',
      '-w',
      'start',
    ]);
    started = true;
    await required(path.join(PG, 'createdb'), [
      '-h',
      '127.0.0.1',
      '-p',
      '5432',
      '-U',
      'postgres',
      'clinicos_test',
    ]);
    await required('npm', ['run', 'db:migrate']);
    return await execute(command, args);
  } finally {
    if (started)
      await execute(path.join(PG, 'pg_ctl'), ['-D', data, '-m', 'immediate', '-w', 'stop']);
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  try {
    if (process.argv[2] !== '--' || !process.argv[3])
      throw new Error('Missing verification command');
    process.exitCode = await runVerification(process.argv[3], process.argv.slice(4));
  } catch {
    console.error('Isolated verification failed to prepare its synthetic database or command');
    process.exitCode = 1;
  }
}
