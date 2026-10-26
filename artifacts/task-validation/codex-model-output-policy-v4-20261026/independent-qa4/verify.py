import hashlib
import json
import pathlib
import subprocess
import sys

Q = pathlib.Path(__file__).resolve().parent
E = Q.parent
A = E / 'permanent-review-semantic-author4'
S = pathlib.Path('/tmp/clinicos-permanent-semantic-author4')
R = pathlib.Path('/workspace/ClinicOS')
C = '88b9a33d4a879b85bbf8b543fd474b390461d304'
P = '895e6bd54461fcc6a00be4117e4792bde6fc4e07'
B = '995e2ff6d14a96b5d67e0d14d708f4a95c4c816f'

def digest(value):
    return hashlib.sha256(value).hexdigest()

def load(path):
    return json.loads(path.read_text())

def git(*args):
    return subprocess.check_output(['git', '-C', str(R), *args])

def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

issues = []
def check(condition, label):
    if not condition:
        issues.append(label)

candidate = load(E / 'runtime-output-policy-publication4/source-candidate.json')
reservation = load(Q / 'reservation.json')
author_seal = load(A / 'seal.json')
projection = candidate['sourceProjection']
check((candidate['code'], candidate['parent'], candidate['trustedMain']) == (C, P, B), 'candidate identity')
check(reservation['nonce'] == '7f147816-563d-424c-96e9-69a0f2909985', 'completion reservation')
check(reservation['sourceCode'] == C, 'reservation source')
check(git('rev-parse', C + '^').decode().strip() == P, 'source parent')
check(git('merge-base', C, B).decode().strip() == B, 'trusted main ancestor')
check(git('rev-parse', C + '^{tree}').decode().strip() == candidate['tree'], 'source tree')
check(digest((A / 'seal.json').read_bytes()) == candidate['authorSealSha256'], 'author seal candidate binding')
check(digest((A / 'snapshot-after.json').read_bytes()) == candidate['sourceSnapshotFreezeSha256'], 'snapshot candidate binding')
for key, filename in [
    ('sourceManifestSha256', 'source-before-after.json'),
    ('snapshotFreezeSha256', 'snapshot-after.json'),
    ('patchSha256', 'source4.patch'),
    ('artifactManifestSha256', 'artifact-manifest.json'),
    ('resultSha256', 'result.json'),
]:
    check(digest((A / filename).read_bytes()) == author_seal[key], 'author seal: ' + filename)

actual_projection = []
for item in projection:
    name = item['path']
    data = git('show', C + ':' + name)
    blob = git('rev-parse', C + ':' + name).decode().strip()
    check(blob == item['gitBlobSha1'], 'Git blob: ' + name)
    check(digest(data) == item['rawSha256'], 'Git SHA256: ' + name)
    check((S / name).read_bytes() == data, 'frozen source: ' + name)
    actual_projection.append({**item, 'bytes': len(data), 'gitObjectVerified': True, 'snapshotByteExact': True})
check(len(projection) == 15, '15 source projection files')
changed = git('diff', '--name-only', P, C).decode().splitlines()
all_nonartifact = git('diff', '--name-only', B, C, '--', '.', ':(exclude)artifacts').decode().splitlines()
check(changed == candidate['changedFiles'], 'nine source4 files')
check(sorted(all_nonartifact) == sorted(item['path'] for item in projection), 'complete nonartifact projection')
for name in ['cli.mjs', 'models.mjs', 'process.mjs']:
    path = 'agent-team/src/bug-pipeline/' + name
    check(git('show', P + ':' + path) == (S / path).read_bytes(), 'source3 production: ' + name)
for name in ['models.test.mjs', 'process-output.test.mjs', 'routing.test.mjs']:
    path = 'agent-team/tests/bug-pipeline/' + name
    check(git('show', P + ':' + path) == (S / path).read_bytes(), 'source3 tests: ' + name)
quality = 'scripts/quality-gate/claude-bug-review.mjs'
def validator(data):
    return data.split(b'export function validateReview(', 1)[1].split(b'\nconst parseJson =', 1)[0]
check(validator(git('show', B + ':' + quality)) == validator((S / quality).read_bytes()), 'native validator byte exact')
adoption = 'agent-team/src/bug-pipeline/standalone-review.mjs'
check((S / adoption).read_bytes().replace(b"        'reviewHandoffHistory',\n", b'', 1) == git('show', P + ':' + adoption), 'adoption only preservation field')

manifest = load(A / 'artifact-manifest.json')
for item in manifest['files']:
    data = (A / item['path']).read_bytes()
    check((len(data), digest(data)) == (item['bytes'], item['rawSha256']), 'author artifact: ' + item['path'])
freeze = load(A / 'snapshot-after.json')
for item in freeze['files']:
    data = (S / item['path']).read_bytes()
    check((len(data), digest(data)) == (item['bytes'], item['rawSha256']), 'snapshot freeze: ' + item['path'])

tap = (Q / 'independent-replay.tap').read_text()
check(all(token in tap for token in ('# tests 25\n', '# pass 25\n', '# fail 0\n', '# skipped 0\n')), 'independent replay 25/25')
native = (A / 'native-full-history-preservation-final.tap').read_text()
check(all(token in native for token in ('# tests 1689\n', '# pass 1686\n', '# fail 0\n', '# skipped 3\n')), 'author native 1689/1686/0/3')

write(Q / 'source-projection.json', {
    'code': C, 'parent': P, 'trustedMain': B, 'tree': candidate['tree'],
    'files': actual_projection,
})
write(Q / 'integrity.json', {
    'sourceCode': C, 'sourceParent': P, 'trustedMain': B,
    'sourceProjectionCount': len(actual_projection),
    'source4ChangedFiles': changed,
    'nonartifactChangesFromTrustedMain': all_nonartifact,
    'authorArtifactCount': len(manifest['files']),
    'snapshotTrackedFileCount': len(freeze['files']),
    'authorSealSha256': digest((A / 'seal.json').read_bytes()),
    'nativeValidateReviewByteExact': True,
    'source3SixByteExact': True,
    'adoptionOnlyPreservationField': True,
    'independentReplayTests': 25,
    'independentReplayPassed': 25,
    'issues': issues,
    'passed': not issues,
})
print(json.dumps({'passed': not issues, 'issues': issues, 'files': len(actual_projection), 'snapshot': len(freeze['files'])}))
sys.exit(bool(issues))
