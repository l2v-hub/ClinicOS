// Native guarded-profile orchestration. No default activation or provider fallback.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
}) {
  const { createNativeGuardState } = await import('./native-guard-state.mjs');
  const { createNativeResponseGuard } = await import('./native-guard-response.mjs');
  const { parseGuardJson } = await import('./native-guard-json.mjs');
  assert.equal(typeof startRuntime, 'function');
  assert.equal(typeof validateClaim, 'function');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20 * 60000);
  const pinned = structuredClone(expected);
  assert.equal(pinned.contextWindow, 1000000);
  assert.equal(pinned.outputCap, 32768);
  assert.match(pinned.subjectSha ?? '', /^[a-f0-9]{40}$/);
  assert.match(pinned.model ?? '', /^claude-opus-[0-9]+(?:-[0-9]+){1,3}$/);
  const policy = createPolicyBarrier();
  let runtime,
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
  const state = createNativeGuardState({
    validateClaim: async (claim, seal) => {
      assert.equal(policy.ready(), true, 'native-policy-unproven');
      return (await validateClaim(claim, seal)) === true;
    },
  });
  const reject = () => {
    state.data.fail();
    readyReject(new Error('native-session-rejected'));
    Promise.resolve()
      .then(() => runtime?.close())
      .catch(() => {});
  };
  const maybeReady = () => {
    if (staged && policy.ready()) readyResolve(staged);
  };
  const timer = setTimeout(() => {
    expireReject(new Error('native-session-rejected'));
    reject();
  }, timeoutMs);
  timer.unref?.();
  const close = async () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    state.data.fail();
    try {
      await runtime?.close();
    } catch {
      throw new Error('native-session-cleanup-failed');
    }
  };
  try {
    runtime = await startRuntime({
      expected: structuredClone(pinned),
      data: state.data,
      onDiagnostic(chunk) {
        policy.push(chunk);
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
    });
    // An exit before the source/policy barrier must not leave a hung claim wait.
    runtime.completion.then(() => {
      if (!released) reject();
    }, reject);
    await Promise.race([ready, expired]);
    const verifiedIsolation = await Promise.race([runtime.isolation, expired]);
    assert.equal(verifiedIsolation?.runtimeIsolationVerified, true, 'native-isolation-unproven');
    assert.equal(verifiedIsolation.binaryVerified, true, 'native-binary-unproven');
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
        assert.ok(Date.now() < deadline);
      },
      close,
      async release(actualClaim) {
        try {
          assert.equal(released, false);
          assert.equal(policy.ready(), true);
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
          const { qualifiedModelProfile } = await import('./cloud-review-worker.mjs');
          const profile = qualifiedModelProfile(envelope.modelUsage);
          assert.equal(profile.model, pinned.model);
          const isolation = await runtime.isolation;
          assert.equal(isolation?.runtimeIsolationVerified, true);
          const seal = staged.seal;
          const hash = (value) => createHash('sha256').update(value).digest('hex');
          const proof = {
            inputSha256: hash(pinned.input),
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
          return {
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
        } catch {
          throw new Error('native-session-rejected');
        } finally {
          await close();
        }
      },
    });
  } catch {
    await close();
    throw new Error('native-session-rejected');
  }
}

export function createNativeRuntimeFactory({ cliPath, oauthToken }) {
  assert.equal(process.platform, 'linux', 'native-linux-required');
  assert.ok(typeof oauthToken === 'string' && oauthToken.length > 0 && oauthToken.length <= 8192);
  assert.ok(typeof cliPath === 'string' && cliPath.startsWith('/'));
  return async ({ expected, data, onDiagnostic, onStage, observeResponse }) => {
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
    const { validateNativeRequest } = await import('./native-guard-request.mjs');
    const { fileURLToPath } = await import('node:url');
    const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-native-guard-'));
    const resolvedRoot = await realpath(root);
    let certificates,
      proxy,
      container,
      disposed = false;
    const close = async () => {
      if (disposed) return;
      disposed = true;
      let failed = false;
      try {
        await container?.close();
      } catch {
        failed = true;
      }
      try {
        await proxy?.close();
      } catch {
        failed = true;
      }
      certificates?.dispose();
      // Only the exact private mkdtemp created by this invocation. Never prune
      // Docker, images/volumes, a checkout, user HOME or a caller-selected path.
      assert.equal(await realpath(root), resolvedRoot);
      assert.equal(path.dirname(resolvedRoot), await realpath(os.tmpdir()));
      assert.match(path.basename(resolvedRoot), /^clinicos-native-guard-[A-Za-z0-9]+$/);
      await rm(resolvedRoot, { recursive: true, force: true });
      if (failed) throw new Error('native-runtime-cleanup-failed');
    };
    try {
      const socketDirectory = path.join(root, 'egress');
      const publicDirectory = path.join(root, 'public');
      await mkdir(socketDirectory, { mode: 0o700 });
      await mkdir(publicDirectory, { mode: 0o700 });
      certificates = await certificatesModule.createNativeGuardCertificates();
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
        takePrivateOutput: () => container.takePrivateOutput(),
        close,
      };
    } catch {
      await close();
      throw new Error('native-runtime-rejected');
    }
  };
}

export function createNativeReviewStager({ startRuntime, qualification }) {
  return async ({ source, completeOptionalEvidence, sha, profile, validateClaim }) => {
    const receipt = qualification();
    assert.equal(receipt?.status, 'native-profile-qualified');
    assert.equal(receipt.applicationReviewClaimed, false);
    assert.deepEqual(profile, receipt.profile);
    assert.equal(receipt.requestOutputCap, 32768);
    const { cloudReviewPayload, completeCloudReviewEvidence } =
      await import('./cloud-review-worker.mjs');
    const minimal = cloudReviewPayload({ packet: source.packet, sha, model: profile.model });
    const packetBytes = Buffer.byteLength(JSON.stringify(source.packet));
    const inputPrefixBytes = Buffer.byteLength(minimal.input) - packetBytes;
    const schemaBytes = Buffer.byteLength(JSON.stringify(minimal.schema));
    // Planning only, NOT admission and NOT a re-labelled observed model default.
    // The actual complete native request, including all additional wrappers,
    // must be staged and checked before the caller is allowed to claim.
    const packetByteBudget = 1000000 - 65536 - 32768 - inputPrefixBytes - schemaBytes;
    const completed = await completeCloudReviewEvidence({
      source,
      completeOptionalEvidence,
      packetByteBudget,
    });
    const payload = cloudReviewPayload({ packet: completed.packet, sha, model: profile.model });
    const session = await stageGuardedSession({
      expected: {
        input: payload.input,
        schema: payload.schema,
        model: profile.model,
        contextWindow: 1000000,
        outputCap: 32768,
        subjectSha: sha,
      },
      startRuntime,
      validateClaim,
    });
    return {
      source: completed,
      session,
      prepared: {
        ...payload,
        capacity: {
          ...profile,
          inputBytes: session.seal.inputBytes,
          schemaBytes: session.seal.schemaBytes,
          nativeOverheadTokens: 65536,
          enforcedMaxOutputTokens: session.seal.maxTokens,
          requiredTokensUpperBound: session.seal.requiredTokensUpperBound,
          guardProfile: 'native-max-single-forward-v1',
        },
      },
    };
  };
}
