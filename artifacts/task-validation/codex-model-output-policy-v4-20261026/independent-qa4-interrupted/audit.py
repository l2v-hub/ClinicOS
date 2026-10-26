import hashlib, json, pathlib, subprocess, sys

Q = pathlib.Path(__file__).resolve().parent
E = Q.parent
A = E / 'permanent-review-semantic-author4'
S = pathlib.Path('/tmp/clinicos-permanent-semantic-author4')
R = pathlib.Path('/workspace/ClinicOS')
C = '88b9a33d4a879b85bbf8b543fd474b390461d304'
P = '895e6bd54461fcc6a00be4117e4792bde6fc4e07'
B = '995e2ff6d14a96b5d67e0d14d708f4a95c4c816f'
phase = sys.argv[1]
issues = []
def sha(data): return hashlib.sha256(data).hexdigest()
def git(*args): return subprocess.check_output(['git', '-C', str(R), *args])
def read(p): return json.loads(p.read_text())
def expect(ok, detail):
    if not ok: issues.append(detail)

reservation = read(Q / 'reservation.json')
seal = read(A / 'seal.json')
candidate = read(E / 'runtime-output-policy-publication4/source-candidate.json')
expect(sha((A / 'seal.json').read_bytes()) == reservation['authorSealSha256'], 'author seal binding')
for field, filename in [
    ('sourceManifestSha256', 'source-before-after.json'),
    ('snapshotFreezeSha256', 'snapshot-after.json'),
    ('patchSha256', 'source4.patch'),
    ('artifactManifestSha256', 'artifact-manifest.json'),
    ('resultSha256', 'result.json'),
]:
    expect(sha((A / filename).read_bytes()) == seal[field], 'seal mismatch: ' + filename)
expect(candidate['sourceProjection'] == reservation['sourceProjection'], 'coordinator projection mismatch')
expect(candidate['code'] == C and candidate['parent'] == P and candidate['trustedMain'] == B, 'candidate commit binding')
expect(git('rev-parse', C + '^').decode().strip() == P, 'Git parent')
projection = []
for item in reservation['sourceProjection']:
    file = item['path']
    data = git('show', C + ':' + file)
    blob = git('rev-parse', C + ':' + file).decode().strip()
    raw = sha(data)
    expect(blob == item['gitBlobSha1'] and raw == item['rawSha256'], 'Git projection: ' + file)
    expect((S / file).read_bytes() == data, 'snapshot projection: ' + file)
    projection.append({**item, 'bytes': len(data), 'verified': True})
changed = git('diff', '--name-only', P, C).decode().splitlines()
total = git('diff', '--name-only', B, C, '--', '.', ':(exclude)artifacts').decode().splitlines()
expect(len(changed) == 9, '9-file source4 delta')
expect(sorted(total) == sorted(i['path'] for i in projection), 'all 15 nonartifact source changes')
manifest = read(A / 'artifact-manifest.json')
for item in manifest['files']:
    data = (A / item['path']).read_bytes()
    expect(len(data) == item['bytes'] and sha(data) == item['rawSha256'], 'author artifact: ' + item['path'])
snapshot = read(A / 'snapshot-after.json')
for item in snapshot['files']:
    data = (S / item['path']).read_bytes()
    expect(len(data) == item['bytes'] and sha(data) == item['rawSha256'], 'snapshot freeze: ' + item['path'])
six = read(A / 'source-before-after.json')['preservedSource3SixFiles']
for item in six:
    expect(git('show', P + ':' + item['path']) == (S / item['path']).read_bytes(), 'Source3 preserved: ' + item['path'])
def validator(data):
    return data.split(b'export function validateReview(', 1)[1].split(b'\nconst parseJson =', 1)[0]
file = 'scripts/quality-gate/claude-bug-review.mjs'
expect(validator(git('show', B + ':' + file)) == validator((S / file).read_bytes()), 'trusted995 native validateReview function body')
old = git('show', P + ':agent-team/src/bug-pipeline/standalone-review.mjs')
new = (S / 'agent-team/src/bug-pipeline/standalone-review.mjs').read_bytes()
expect(new.replace(b"        'reviewHandoffHistory',\n", b'', 1) == old, 'adoption is exactly one added preservation key')
result = {
    'phase': phase, 'sourceCode': C, 'sourceParent': P, 'trustedMain': B,
    'nonce': reservation['nonce'], 'stateCommit': reservation['stateCommit'],
    'authorSealSha256': sha((A / 'seal.json').read_bytes()),
    'authorManifestEntries': len(manifest['files']), 'snapshotFreezeEntries': len(snapshot['files']),
    'source4ChangedFiles': changed, 'allNonartifactChanges': total, 'sourceProjection': projection,
    'source3SixByteExact': True, 'nativeValidateReviewBodyByteExactToTrusted995': True,
    'adoptionOnlyOnePreservationKey': True, 'issues': issues, 'passed': not issues,
}
(Q / ('integrity-' + phase + '.json')).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['phase', 'sourceCode', 'authorManifestEntries', 'snapshotFreezeEntries', 'passed', 'issues']}))
sys.exit(bool(issues))
