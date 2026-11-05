import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { boundedCleanup, isCleanupFailure } from './native-guard-outcome.mjs';
export { boundedCleanup } from './native-guard-outcome.mjs';
const provenClean = new WeakSet();
const retainedEvidence = new WeakMap();
export function readCleanupEvidence(error) {
  const value = isCleanupFailure(error) ? retainedEvidence.get(error) : undefined;
  return value === undefined ? undefined : structuredClone(value);
}
export async function stopNativeResources(proxy, container) {
  const start = (resource) => {
    try {
      return Promise.resolve(resource?.close());
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const outcomes = await Promise.allSettled([start(proxy), start(container)]);
  if (outcomes.some((outcome) => outcome.status === 'rejected'))
    throw new Error('native-runtime-cleanup-failed');
  if (container && outcomes[1].value?.removed !== true)
    throw new Error('native-runtime-cleanup-failed');
}
export function runtimeCleanup(certificates, proxy, container, remove, timeoutMs = 10000) {
  return boundedCleanup(async () => {
    let disposalFailed = false;
    try {
      certificates?.dispose();
    } catch {
      disposalFailed = true;
    }
    await stopNativeResources(proxy, container);
    if (disposalFailed) throw new Error('native-runtime-cleanup-failed');
    await remove();
  }, timeoutMs);
}
const capacityFailures = new WeakSet();
export const isNativeStagingCapacityError = (error) =>
  typeof error === 'object' && error !== null && capacityFailures.has(error);
export { createNativeReviewStager } from './native-guard-qualification.mjs';
const EMPTY_POLICY = 'Remote settings: Saved empty sentinel (404 response)';
const PRE_SETTLEMENT = new Set([
  'Remote settings: No settings found (204)',
  'Remote settings: No settings found (404)',
  'Remote settings: Fetched successfully',
]);

// Diagnostics stay private. In particular no exception/receipt contains a line,
// settings value, provider body, OAuth value or a hash of credential-bearing data.
export function createPolicyBarrier() {
  let pending = Buffer.alloc(0),
    bytes = 0,
    poisoned = false,
    settlements = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const consume = (line) => {
    if (line.includes('Failed to save')) poisoned = true;
    if (!line.includes('Remote settings:')) return;
    const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) \[DEBUG\] (Remote settings: .+)$/.exec(
      line,
    );
    if (!match || !Number.isFinite(Date.parse(match[1]))) {
      poisoned = true;
      return;
    }
    if (match[2] === EMPTY_POLICY) {
      settlements++;
      if (settlements !== 1) poisoned = true;
    } else if (settlements || !PRE_SETTLEMENT.has(match[2])) poisoned = true;
  };
  const ready = () => !poisoned && settlements === 1 && pending.length === 0;
  return {
    push(chunk) {
      if (!Buffer.isBuffer(chunk)) {
        poisoned = true;
        return;
      }
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        pending = Buffer.alloc(0);
        poisoned = true;
        return;
      }
      pending = Buffer.concat([pending, chunk]);
      let end;
      while ((end = pending.indexOf(10)) !== -1) {
        const encoded = pending.subarray(0, end);
        pending = pending.subarray(end + 1);
        if (encoded.length > 8192) poisoned = true;
        else {
          try {
            consume(decoder.decode(encoded).replace(/\r$/, ''));
          } catch {
            poisoned = true;
          }
        }
      }
      if (pending.length > 8192) {
        pending = Buffer.alloc(0);
        poisoned = true;
      }
    },
    ready,
    invalid: () => poisoned,
    receipt: () => ({ status: ready() ? 'settled-empty' : 'policy-unproven', settlements }),
  };
}

// The runtime receives only the data half. No release capability or canonical
// controller is mounted in the child or exposed through the egress socket.
export async function stageGuardedSession({
  expected,
  startRuntime,
  validateClaim,
  timeoutMs = 20 * 60000,
  cleanupTimeoutMs = 10000,
  reviewTracked,
}) {
  const { createNativeGuardState } = await import('./native-guard-state.mjs');
  const { createNativeResponseGuard } = await import('./native-guard-response.mjs');
  const { parseGuardJson } = await import('./native-guard-json.mjs');
  assert.equal(typeof startRuntime, 'function');
  assert.equal(typeof validateClaim, 'function');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20 * 60000);
  assert.ok(
    Number.isSafeInteger(cleanupTimeoutMs) && cleanupTimeoutMs > 0 && cleanupTimeoutMs <= 10000,
  );
  const pinned = structuredClone(expected);
  const tracked = reviewTracked === undefined ? null : new Set(reviewTracked);
  assert.equal(pinned.contextWindow, 1000000);
  assert.equal(pinned.outputCap, 32768);
  assert.match(pinned.subjectSha ?? '', /^[a-f0-9]{40}$/);
  assert.match(pinned.model ?? '', /^claude-opus-[0-9]+(?:-[0-9]+){1,3}$/);
  const policy = createPolicyBarrier();
  let runtime,
    startup,
    staged,
    response,
    closed = false,
    released = false;
  const deadline = Date.now() + timeoutMs;
  let expireReject;
  const expired = new Promise((_, rejectExpired) => {
    expireReject = rejectExpired;
  });
  expired.catch(() => {});
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  ready.catch(() => {});
  let claimSha256;
  const state = createNativeGuardState({
    validateClaim: async (claim, seal) => {
      assert.equal(policy.ready(), true, 'native-policy-unproven');
      assert.equal(runtime?.isLive(), true, 'native-process-unavailable');
      const owned = await validateClaim(claim, seal);
      if (owned !== true || !policy.ready() || !runtime.isLive()) return false;
      claimSha256 = createHash('sha256').update(JSON.stringify(claim)).digest('hex');
      return true;
    },
  });
  const reject = () => {
    state.data.fail();
    readyReject(new Error('native-session-rejected'));
    // Synchronously fence late policy events before a queued release resumes.
    void close().catch(() => {});
  };
  const maybeReady = () => {
    if (staged && policy.ready()) readyResolve(staged);
  };
  const timer = setTimeout(() => {
    expireReject(new Error('native-session-rejected'));
    reject();
  }, timeoutMs);
  const cleanup = boundedCleanup(async () => {
    let owned = runtime;
    if (!owned) {
      try {
        owned = await startup;
      } catch (error) {
        if (provenClean.has(error)) return;
        throw error;
      }
    }
    await owned.close();
  }, cleanupTimeoutMs);
  const close = (reason = new Error('native-session-rejected')) => {
    closed = true;
    // Wake every wait even if `ready` already settled or release is in progress.
    expireReject(reason);
    clearTimeout(timer);
    state.data.fail();
    return cleanup();
  };
  try {
    startup = Promise.resolve().then(() =>
      startRuntime({
        expected: structuredClone(pinned),
        data: Object.freeze({
          fail: state.data.fail,
          status: state.data.status,
          stage(candidate) {
            const forward = candidate.forward;
            assert.equal(typeof forward, 'function');
            return state.data.stage({
              seal: candidate.seal,
              forward() {
                // This is the synchronous commit point AFTER the state's await.
                // No async liveness/policy assertion may stand in for this fence.
                assert.equal(policy.ready(), true);
                assert.equal(runtime?.isLive(), true);
                assert.ok(Date.now() < deadline);
                return forward();
              },
            });
          },
        }),
        onDiagnostic(chunk) {
          policy.push(chunk);
          if (policy.invalid() || (policy.receipt().settlements > 0 && !policy.ready())) {
            reject();
            return;
          }
          maybeReady();
        },
        onStage(candidate) {
          if (staged) {
            reject();
            throw new Error('native-session-rejected');
          }
          staged = candidate;
          candidate.completion.catch(() => {});
          maybeReady();
        },
        onCapacity(metadata) {
          if (!policy.ready() || !runtime?.isLive()) {
            reject();
            return;
          }
          const names = [
            'requiredTokensUpperBound',
            'contextBytes',
            'inputBytes',
            'schemaBytes',
            'maxTokens',
            'contextWindow',
          ];
          if (
            !metadata ||
            Object.keys(metadata).length !== names.length ||
            !names.every((name) => Number.isSafeInteger(metadata[name]) && metadata[name] >= 0) ||
            metadata.contextWindow !== 1000000 ||
            metadata.requiredTokensUpperBound <= 1000000
          ) {
            reject();
            return;
          }
          const failure = new Error('native-session-capacity-exceeded');
          capacityFailures.add(failure);
          state.data.fail();
          readyReject(failure);
          void close(failure).catch(() => {});
        },
        observeResponse({ statusCode, requestId, seal }) {
          if (response || seal.bodySha256 !== staged?.seal.bodySha256) {
            reject();
            throw new Error('native-session-rejected');
          }
          response = createNativeResponseGuard({
            statusCode,
            requestId,
            model: pinned.model,
            maxTokens: seal.maxTokens,
            subjectSha: pinned.subjectSha,
            schema: pinned.schema,
          });
          return response;
        },
      }),
    );
    runtime = await Promise.race([startup, expired]);
    // An exit before the source/policy barrier must not leave a hung claim wait.
    runtime.completion.then((result) => {
      if (!released || result.ok !== true || !state.data.status().forwarded) reject();
    }, reject);
    await Promise.race([ready, expired]);
    const verifiedIsolation = await Promise.race([runtime.isolation, expired]);
    assert.equal(verifiedIsolation?.runtimeIsolationVerified, true, 'native-isolation-unproven');
    assert.equal(verifiedIsolation.binaryVerified, true, 'native-binary-unproven');
    assert.equal(runtime.isLive(), true, 'native-process-unavailable');
    assert.ok(Date.now() < deadline);
    assert.equal(state.data.status().phase, 'STAGED');
    assert.equal(policy.ready(), true);
    return Object.freeze({
      seal: structuredClone(staged.seal),
      policyReceipt: () => policy.receipt(),
      assertReady() {
        assert.equal(closed, false);
        assert.equal(released, false);
        assert.equal(policy.ready(), true);
        assert.equal(state.data.status().phase, 'STAGED');
        assert.equal(runtime.isLive(), true);
        assert.ok(Date.now() < deadline);
      },
      close,
      async release(actualClaim) {
        let completed, projectEvidence;
        try {
          assert.equal(released, false);
          assert.equal(policy.ready(), true);
          assert.equal(runtime.isLive(), true);
          released = true;
          assert.ok(Date.now() < deadline);
          await Promise.race([state.parent.release(staged.handle, actualClaim), expired]);
          const result = await Promise.race([runtime.completion, expired]);
          assert.equal(result.ok, true);
          assert.equal(result.code, 0);
          assert.equal(policy.ready(), true);
          assert.deepEqual(state.data.status(), {
            phase: 'RELEASED',
            forwardAttempts: 1,
            forwarded: true,
          });
          const raw = runtime.takePrivateOutput();
          const envelope = parseGuardJson(Buffer.from(raw.stdout), { maxBytes: 768 * 1024 });
          assert.equal(envelope.is_error, false);
          assert.equal(envelope.type, 'result');
          assert.equal(envelope.subtype, 'success');
          const network = response.finish({ cliReport: envelope.structured_output });
          const { qualifiedModelProfile, projectNativeEvidence } =
            await import('./cloud-review-worker.mjs');
          projectEvidence = projectNativeEvidence;
          const profile = qualifiedModelProfile(envelope.modelUsage);
          assert.equal(profile.model, pinned.model);
          const isolation = await runtime.isolation;
          assert.equal(isolation?.runtimeIsolationVerified, true);
          const seal = staged.seal;
          const hash = (value) => createHash('sha256').update(value).digest('hex');
          const proof = {
            inputSha256: hash(pinned.input),
            subjectSha: pinned.subjectSha,
            claimSha256,
            schemaSha256: hash(JSON.stringify(pinned.schema)),
            bodySha256: seal.bodySha256,
            contextSha256: seal.contextSha256,
            model: seal.model,
            actualMaxTokens: seal.maxTokens,
            contextBytes: seal.contextBytes,
            requiredTokensUpperBound: seal.requiredTokensUpperBound,
            outputTokens: network.outputTokens,
            forwardAttempts: 1,
            forwarded: true,
            policyStatus: 'settled-empty',
            responseMatchesNative: true,
            runtimeIsolationVerified: true,
            binaryVerified: isolation.binaryVerified === true,
            imageDigest: isolation.imageDigest,
            cliSha256: isolation.cliSha256,
          };
          completed = {
            ok: true,
            code: 0,
            stdout: JSON.stringify({
              structured_output: envelope.structured_output,
              modelUsage: envelope.modelUsage,
            }),
            stderr: '',
            providerExecuted: true,
            report: envelope.structured_output,
            profile,
            proof,
          };
          return completed;
        } catch {
          throw new Error('native-session-rejected');
        } finally {
          try {
            await close();
          } catch (error) {
            if (completed && tracked && isCleanupFailure(error)) {
              try {
                const report = projectEvidence(completed.report, pinned.subjectSha, tracked);
                retainedEvidence.set(error, {
                  report,
                  proof: {
                    ...completed.proof,
                    reportSha256: createHash('sha256').update(JSON.stringify(report)).digest('hex'),
                  },
                });
              } catch {
                /* Cleanup failure remains authoritative; omit unsafe evidence. */
              }
            }
            throw error;
          }
        }
      },
    });
  } catch (error) {
    await close();
    if (isNativeStagingCapacityError(error)) throw error;
    throw new Error('native-session-rejected');
  }
}
export function createNativeRuntimeFactory({ cliPath, oauthToken }) {
  assert.equal(process.platform, 'linux', 'native-linux-required');
  assert.ok(typeof oauthToken === 'string' && oauthToken.length > 0 && oauthToken.length <= 8192);
  assert.ok(typeof cliPath === 'string' && cliPath.startsWith('/'));
  return async ({ expected, data, onDiagnostic, onStage, onCapacity, observeResponse }) => {
    const [
      { mkdtemp, mkdir, realpath, rm },
      path,
      os,
      certificatesModule,
      proxyModule,
      containerModule,
    ] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
      import('node:os'),
      import('./native-guard-certificates.mjs'),
      import('./native-guard-proxy.mjs'),
      import('./native-guard-container.mjs'),
    ]);
    const { validateNativeRequest, isNativeRequestCapacityError } =
      await import('./native-guard-request.mjs');
    const { fileURLToPath } = await import('node:url');
    const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-native-guard-'));
    const resolvedRoot = await realpath(root);
    let certificates, proxy, container;
    let close;
    const cleanup = () =>
      (close ??= runtimeCleanup(certificates, proxy, container, async () => {
        await certificates?.cleanup();
        // Remove only this invocation's private mkdtemp.
        assert.equal(await realpath(root), resolvedRoot);
        assert.equal(path.dirname(resolvedRoot), await realpath(os.tmpdir()));
        assert.match(path.basename(resolvedRoot), /^clinicos-native-guard-[A-Za-z0-9]+$/);
        await rm(resolvedRoot, { recursive: true, force: true });
      }))();
    try {
      const socketDirectory = path.join(root, 'egress');
      const publicDirectory = path.join(root, 'public');
      await mkdir(socketDirectory, { mode: 0o700 });
      await mkdir(publicDirectory, { mode: 0o700 });
      certificates = await certificatesModule.createNativeGuardCertificates({
        parentDirectory: resolvedRoot,
      });
      const ca = await certificatesModule.writeNativePublicCA(
        publicDirectory,
        certificates.publicCA,
      );
      proxy = proxyModule.createNativeGuardProxy({
        tlsOptions: certificates.tlsOptions,
        oauthToken,
        expected,
        data,
        validateRequest: validateNativeRequest,
        onStage,
        isCapacityError: isNativeRequestCapacityError,
        onCapacity,
        observeResponse,
      });
      await proxy.listen(socketDirectory);
      container = await containerModule.startNativeGuardContainer({
        paths: {
          cli: await realpath(cliPath),
          launcher: fileURLToPath(new URL('./native-guard-launcher.mjs', import.meta.url)),
          ca,
          socketDirectory,
        },
        bootstrap: {
          oauthToken,
          model: expected.model,
          schema: expected.schema,
          input: expected.input,
          outputCap: expected.outputCap,
        },
        onDiagnostic,
      });
      return {
        completion: container.completion,
        isolation: container.isolation,
        isLive: () => container.isLive(),
        takePrivateOutput: () => container.takePrivateOutput(),
        close: cleanup,
      };
    } catch {
      await cleanup();
      const error = new Error('native-runtime-rejected');
      provenClean.add(error);
      throw error;
    }
  };
}
