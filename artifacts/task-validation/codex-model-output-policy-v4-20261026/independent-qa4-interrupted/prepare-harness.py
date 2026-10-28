import pathlib, re
q = pathlib.Path(__file__).resolve().parent
s = pathlib.Path('/tmp/clinicos-permanent-semantic-author4')
original = (s / 'agent-team/tests/bug-pipeline/standalone-review.test.mjs').read_text()
fixture = original[original.index('function fixture('):original.index('\nasync function isolatedFinalizeEnvironment')]
revision = original[original.index('function revision('):original.index("\ntest('revision appends")]
header = '''// Reused synthetic transport only, extracted from the verified frozen test prelude.
// All QA assertions and scenarios reside in independent.test.mjs; no author tests run here.
import assert from 'node:assert/strict';
import { createStandaloneReview, STANDALONE_REPO as repo } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/bug-pipeline/standalone-review.mjs';
import { sha256 } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/bug-pipeline/contracts.mjs';
const clone = (value) => structuredClone(value);
const sha = 'a'.repeat(40), baseSha = 'b'.repeat(40), testedSha = 'c'.repeat(40);
const path = 'artifacts/task-validation/standalone-review-81';
'''
(q / 'native-transport-fixture.mjs').write_text(header + fixture + '\n' + revision + '\nexport { fixture, revision, sha, baseSha };\n')
print('Wrote QA-only synthetic transport harness; production modules imported from frozen snapshot.')
