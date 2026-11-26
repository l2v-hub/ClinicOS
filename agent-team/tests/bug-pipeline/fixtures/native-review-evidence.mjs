import assert from 'node:assert/strict';
import {
  validateNativeRequest,
  isNativeRequestCapacityError,
} from '../../../src/bug-pipeline/native-guard-request.mjs';
const line = (message) => Buffer.from(`2026-11-03T14:00:00.000Z [DEBUG] ${message}\n`);
const settled = 'Remote settings: Saved empty sentinel (404 response)';
const sha = 'a'.repeat(40);
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['subject_sha'],
  properties: { subject_sha: { type: 'string', const: sha } },
};
const expected = {
  input: 'Synthetic source only',
  model: 'claude-opus-5-5',
  outputCap: 32768,
  contextWindow: 1000000,
  subjectSha: sha,
  schema,
};
const profile = { model: expected.model, contextWindow: 1000000, maxOutputTokens: 128000 };
const frame = (type, fields) => `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
function syntheticSse(report) {
  return Buffer.from(
    frame('message_start', {
      message: {
        id: 'msg_fixture',
        type: 'message',
        role: 'assistant',
        model: expected.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 1 },
      },
    }) +
      frame('content_block_start', {
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'toolu_fixture',
          name: 'StructuredOutput',
          input: {},
        },
      }) +
      frame('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(report) },
      }) +
      frame('content_block_stop', { index: 0 }) +
      frame('message_delta', {
        delta: { stop_reason: 'tool_use', stop_sequence: null },
        usage: { output_tokens: 50 },
      }) +
      frame('message_stop', {}),
  );
}
export function sessionFixture({
  suppliedReport,
  lateRetry = false,
  policyFailure = false,
  cliDuplicate = false,
  isolated = true,
  hang = false,
  systemBytes = 0,
  wrapperSequence,
  rejectSecondPolicy = false,
  closeFailure = false,
} = {}) {
  const calls = [];
  let privateRead = false;
  let diagnostic;
  let invalidateLive;
  let starts = 0;
  const startRuntime = async ({
    expected: pinned,
    data,
    onStage,
    onDiagnostic,
    observeResponse,
    onCapacity,
  }) => {
    diagnostic = onDiagnostic;
    let live = true;
    invalidateLive = () => {
      live = false;
    };
    let done;
    const completion = new Promise((resolve) => {
      done = resolve;
    });
    const report = suppliedReport ?? { subject_sha: sha };
    const startNumber = starts++;
    setImmediate(() => {
      try {
        onDiagnostic(line(settled));
        if (rejectSecondPolicy && startNumber > 0)
          onDiagnostic(line('Remote settings: Unexpected policy change'));
        const body = Buffer.from(
          JSON.stringify({
            model: pinned.model,
            max_tokens: pinned.outputCap,
            stream: true,
            system: [
              { type: 'text', text: 'w'.repeat(wrapperSequence?.[startNumber] ?? systemBytes) },
            ],
            messages: [{ role: 'user', content: pinned.input }],
            tools: [{ name: 'StructuredOutput', input_schema: pinned.schema }],
          }),
        );
        const seal = validateNativeRequest({
          body,
          rawHeaders: [
            'Host',
            'api.anthropic.com',
            'Content-Type',
            'application/json',
            'Content-Length',
            String(body.length),
            'Authorization',
            'Bearer synthetic-fixture',
          ],
          host: 'api.anthropic.com',
          method: 'POST',
          path: '/v1/messages',
          expected: pinned,
        });
        const candidate = data.stage({
          seal,
          forward: async () => {
            calls.push('forward');
            const response = observeResponse({ statusCode: 200, requestId: 'req_fixture', seal });
            response.push(syntheticSse(report));
            if (hang) return await new Promise(() => {});
            if (lateRetry) data.fail();
            if (policyFailure) onDiagnostic(line('Remote settings: Unexpected policy change'));
            done({ ok: true, code: 0 });
            return { statusCode: 200 };
          },
        });
        calls.push('stage');
        onStage(candidate);
      } catch (error) {
        if (isNativeRequestCapacityError(error)) onCapacity(error.metadata);
        data.fail();
        done({ ok: false, code: 1 });
      }
    });
    return {
      completion,
      isLive: () => live,
      isolation: Promise.resolve({
        runtimeIsolationVerified: isolated,
        binaryVerified: true,
        cliSha256: 'bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222',
        imageDigest: 'sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2',
      }),
      takePrivateOutput() {
        assert.equal(privateRead, false);
        privateRead = true;
        const json = JSON.stringify({
          type: 'result',
          subtype: 'success',
          is_error: false,
          structured_output: report,
          modelUsage: { [profile.model]: profile },
        });
        return {
          stdout: cliDuplicate
            ? json.replace('"is_error":false', '"is_error":true,"is_error":false')
            : json,
          stderr: 'synthetic-private-diagnostic',
        };
      },
      async close() {
        live = false;
        calls.push('close');
        done({ ok: false, code: null });
        if (closeFailure) throw new Error('synthetic private cleanup detail');
      },
    };
  };
  return {
    calls,
    startRuntime,
    poisonPolicy: () => diagnostic(line('Remote settings: Unexpected policy change')),
    die: () => invalidateLive(),
  };
}
