// Metadata only: observe captured, already sanitized runner strings, never repair them.
import { createHash } from 'node:crypto';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { reviewSchema, validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { claudeFailureCode } from './claude-review-cron.mjs';
import { communicationText, REVIEW_FAILURE_CODES } from './issue-review-communication.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const categories = new Map([
  ['invalid or stale Claude review', 'stale-or-shape'],
  ['review verdict contradicts findings', 'contradiction'],
  ['invalid review finding location', 'location'],
  ['incomplete review finding', 'fields'],
  ['unsafe review content', 'unsafe'],
]);
const emptyDiagnostic = () => ({
  capturedSanitizedStdoutStringBytes: null,
  capturedSanitizedStdoutSha256: null,
  capturedSanitizedStderrStringBytes: null,
  capturedSanitizedStderrSha256: null,
  exitCode: null,
  runnerError: null,
  runnerThrew: false,
  diagnosticFailed: false,
  nativeClaudeFailure: null,
  envelopeParsed: false,
  structuredOutputPresent: false,
  schemaAccepted: false,
  nativeAccepted: false,
  communicationAccepted: false,
  category: 'other',
  findingCount: null,
  verdict: null,
  reportSha256: null,
});
export const reviewRunnerThrewDiagnostic = () => ({ ...emptyDiagnostic(), runnerThrew: true });

export function classifyReviewResult(result, sha, tracked) {
  const info = emptyDiagnostic();
  try {
    const stdout = typeof result?.stdout === 'string' ? result.stdout : '';
    const stderr = typeof result?.stderr === 'string' ? result.stderr : '';
    info.capturedSanitizedStdoutStringBytes = Buffer.byteLength(stdout);
    info.capturedSanitizedStdoutSha256 = hash(stdout);
    info.capturedSanitizedStderrStringBytes = Buffer.byteLength(stderr);
    info.capturedSanitizedStderrSha256 = hash(stderr);
    info.exitCode =
      Number.isInteger(result?.code) && result.code >= 0 && result.code <= 255 ? result.code : null;
    info.runnerError = [
      'timeout',
      'output-limit',
      'spawn-failed',
      'subscription-oauth-required',
      'local-subscription-config-required',
    ].includes(result?.error)
      ? result.error
      : result?.error
        ? 'other'
        : null;
    const failure = claudeFailureCode(result);
    info.nativeClaudeFailure = REVIEW_FAILURE_CODES.includes(failure)
      ? failure
      : failure === null
        ? null
        : 'other';
    info.category = 'envelope-json';
    let report;
    try {
      const envelope = JSON.parse(stdout);
      info.envelopeParsed = true;
      info.structuredOutputPresent = Boolean(
        envelope && typeof envelope === 'object' && Object.hasOwn(envelope, 'structured_output'),
      );
      if (!info.structuredOutputPresent) return info;
      report = envelope.structured_output;
    } catch {
      return info;
    }
    info.findingCount =
      Array.isArray(report?.findings) && report.findings.length <= 10000000
        ? report.findings.length
        : null;
    info.verdict = ['approved', 'changes-requested', 'blocked'].includes(report?.verdict)
      ? report.verdict
      : null;
    info.reportSha256 = hash(JSON.stringify(report));
    try {
      validateAgainstSchema(report, reviewSchema);
      info.schemaAccepted = true;
    } catch {
      info.category = 'schema';
      return info;
    }
    let validated;
    try {
      validated = validateReview(report, sha, tracked);
      info.nativeAccepted = true;
    } catch (error) {
      info.category = categories.get(error?.message) ?? 'other';
      return info;
    }
    try {
      // Exact native communication projection; its result is neither retained nor substituted.
      validateReview(
        {
          ...validated,
          summary: communicationText(validated.summary),
          findings: validated.findings.map((finding) => ({
            ...finding,
            ...Object.fromEntries(
              ['problem', 'requested_change', 'test_expectation'].map((field) => [
                field,
                communicationText(finding[field]),
              ]),
            ),
          })),
        },
        sha,
        tracked,
      );
      info.communicationAccepted = true;
      info.category = 'valid';
    } catch {
      info.category = 'post-communication';
    }
    return info;
  } catch {
    // A diagnostic error cannot alter the original result or native control flow.
    return { ...emptyDiagnostic(), diagnosticFailed: true };
  }
}
