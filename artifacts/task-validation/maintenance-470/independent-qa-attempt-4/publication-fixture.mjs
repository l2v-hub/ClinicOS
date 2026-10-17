// Synthetic browser I/O fixture reused transparently; actual verifier is unmodified.
// Controlled synthetic failure fixtures, not live browser evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { verifyOnlineDemo, assertPublishedBundle, BACKEND } from '../../../../scripts/maintenance/demo-online-empty-browser.mjs';
const token = 'synthetic-private-session-do-not-publish';
function browserFixture({ logoutFails = false } = {}) {
  const listeners = new Map();
  let videoDirectory;
  const response = {
    url: () => BACKEND + '/patients/page',
    ok: () => true,
    status: () => 200,
    json: async () => ({ items: [] }),
  };
  const emit = () => listeners.get('response')?.(response);
  const page = {
    setDefaultTimeout() {},
    on: (name, cb) => listeners.set(name, cb),
    goto: async () => {},
    waitForResponse: async () => ({ status: () => 201, json: async () => ({ token }) }),
    locator: () => ({
      filter: () => ({ waitFor: async () => {}, count: async () => 1, click: async () => emit() }),
    }),
    getByRole: () => ({ waitFor: async () => {} }),
    reload: async () => emit(),
    screenshot: async ({ path }) =>
      fs.writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])),
  };
  const context = {
    newPage: async () => page,
    close: async () => {},
    tracing: {
      start: async (options) => assert.equal(options.snapshots, false),
      stop: async (options) => {
        if (options?.path)
          execFileSync(
            'python3',
            [
              '-c',
              "import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],'w') as z:\n z.writestr('trace.network','')\n z.writestr('trace.trace','{\"type\":\"after\",\"method\":\"reload\"}\\n')",
              options.path,
            ],
            { stdio: 'pipe' },
          );
      },
    },
  };
  const chromium = {
    launch: async () => ({
      newContext: async (options) => {
        videoDirectory = options.recordVideo.dir;
        await fs.mkdir(videoDirectory, { recursive: true });
        await fs.writeFile(
          join(videoDirectory, 'synthetic.webm'),
          Buffer.from([26, 69, 223, 163, 0, 0]),
        );
        return context;
      },
      close: async () => {},
    }),
  };
  const fetchImpl = async (url) => ({
    status: url.endsWith('/logout') ? (logoutFails ? 500 : 204) : 200,
    json: async () =>
      url.endsWith('/auth/status')
        ? { mode: 'demo', simulator: true }
        : url.endsWith('/identities')
          ? { identities: [{ id: 'SIM-ADMIN', name: 'Synthetic Admin' }] }
          : url.endsWith('/auth/me')
            ? { id: 'synthetic-admin' }
            : url.includes('/patients/page')
              ? { items: [] }
              : { slots: [] },
  });
  return { chromium, fetchImpl, getVideoDirectory: () => videoDirectory };
}

export {browserFixture,token};
