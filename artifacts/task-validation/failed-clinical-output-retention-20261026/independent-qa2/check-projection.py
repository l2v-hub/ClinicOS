import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path('/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics')
source = json.loads((root / 'failed-output-retention-source2/source-candidate.json').read_text())
reservation = json.loads((root / 'failed-output-retention-source2/qa2-reservation.json').read_text())
author = root / 'failed-output-retention-source2/author/amendment-1'
snapshot = pathlib.Path('/tmp/clinicos-failed-output-qa2')
git = '/workspace/ClinicOS'
assert source['code'] == reservation['sourceCode'] == '24f669b706193eef9ac08bd7a02ab440be692189'
assert source['baseSha'] == reservation['baseSha'] == '13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73'
assert source['sourceProjection'] == reservation['sourceProjection']
assert subprocess.check_output(['git', '-C', git, 'rev-parse', source['code'] + '^']).decode().strip() == source['parent']
assert hashlib.sha256((author / 'seal.json').read_bytes()).hexdigest() == source['authorSealSha256']
assert hashlib.sha256((author / 'source-projection.json').read_bytes()).hexdigest() == source['authorProjectionSha256']
seal = json.loads((author / 'seal.json').read_text())
for file, digest in seal['hashes'].items():
    stored = author / ('source/' if file in seal['hashes'] and file in [entry['path'] for entry in source['sourceProjection']] else '') / file
    assert hashlib.sha256(stored.read_bytes()).hexdigest() == digest, file
for entry in source['sourceProjection']:
    name = entry['path']
    data = subprocess.check_output(['git', '-C', git, 'show', source['code'] + ':' + name])
    assert len(data) == entry['bytes'], name
    assert hashlib.sha256(data).hexdigest() == entry['rawSha256'], name
    assert subprocess.check_output(['git', '-C', git, 'rev-parse', source['code'] + ':' + name]).decode().strip() == entry['gitBlobSha1'], name
    assert (author / 'source' / name).read_bytes() == data, name
    assert (snapshot / name).read_bytes() == data, name
print(json.dumps({'status': 'EXACT', 'code': source['code'], 'parent': source['parent'], 'base': source['baseSha'], 'files': len(source['sourceProjection']), 'authorSeal': 'MATCH', 'authorArtifacts': len(seal['hashes']), 'snapshot': 'MATCH'}))
