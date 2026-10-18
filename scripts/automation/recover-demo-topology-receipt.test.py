#!/usr/bin/env python3
"""Offline adversarial transport tests. No network, provider or application calls."""
import hashlib
import importlib.util
import io
import json
import pathlib
import gzip
import stat
import unittest
import urllib.error
import zipfile
from unittest.mock import patch

PATH = pathlib.Path(__file__).with_name('recover-demo-topology-receipt.py')
SPEC = importlib.util.spec_from_file_location('recovery', PATH)
R = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(R)


def fixture():
    scoped = {'schemaVersion': 1, 'projectId': R.PROJECT, 'environmentId': R.ENVIRONMENT,
              'environmentName': 'demo', 'serviceId': R.SERVICE, 'repository': R.REPO,
              'rootDirectory': '', 'domains': [{'kind': 'serviceDomains', 'domain': R.DOMAIN}],
              'triggers': [], 'hasMoreTriggers': False}
    env = {'id': R.ENVIRONMENT, 'projectId': R.PROJECT, 'name': 'demo', 'canAccess': True,
           'isEphemeral': False, 'sourceEnvironmentId': None,
           'instances': [{'id': 'demo-instance', 'serviceId': R.SERVICE,
                          'environmentId': R.ENVIRONMENT, 'repository': R.REPO, 'rootDirectory': ''}],
           'triggers': []}
    inv = {'projectId': R.PROJECT, 'environments': [env],
           'services': [{'id': R.SERVICE, 'name': 'backend', 'projectId': R.PROJECT}],
           'scopedInventory': scoped, 'scopedInventorySha256': R.digest(scoped),
           'paginationComplete': True, 'allVisibleEnvironmentsAccessible': True,
           'observedConstraints': ['MISSING_TARGET_TRIGGER'], 'credentialScope': 'project-environment',
           'projectWideVisibility': 'unproven', 'serviceConnectAllowed': False,
           'refusalReason': 'PROJECT_WIDE_VISIBILITY_UNPROVEN'}
    return {'schemaVersion': 1, 'repository': R.REPO, 'reviewedSha': R.SOURCE_SHA,
            'runId': str(R.RUN), 'runAttempt': '1', 'capturedAt': '2026-10-18T17:39:02.000Z',
            'operation': 'inspect', 'outcome': 'inspected-visibility-unproven',
            'inventory': inv, 'inventorySha256': R.digest(inv), 'readRequests': 12}


def run_metadata():
    return {'id': R.RUN, 'run_attempt': 1, 'head_sha': R.SOURCE_SHA, 'head_branch': 'main',
            'status': 'completed', 'conclusion': 'success', 'event': 'workflow_dispatch',
            'path': '.github/workflows/inspect-demo-source-topology.yml',
            'repository': {'id': R.REPO_ID, 'full_name': R.REPO},
            'head_repository': {'id': R.REPO_ID, 'full_name': R.REPO},
            'created_at': '2026-10-18T17:38:36Z', 'updated_at': '2026-10-18T17:39:06Z'}


def artifact_metadata():
    return {'id': R.ARTIFACT, 'name': R.ARTIFACT_NAME, 'expired': False,
            'size_in_bytes': R.ARCHIVE_SIZE, 'digest': 'sha256:' + R.ARCHIVE_DIGEST,
            'workflow_run': {'id': R.RUN, 'head_sha': R.SOURCE_SHA, 'head_branch': 'main',
                             'repository_id': R.REPO_ID, 'head_repository_id': R.REPO_ID}}


def archive(raw=None, filename=None, extra=None, compression=zipfile.ZIP_DEFLATED):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=compression) as handle:
        handle.writestr(filename or R.MEMBER, raw if raw is not None else (R.compact(fixture()) + '\n').encode())
        if extra:
            handle.writestr(extra, b'private-data')
    return output.getvalue()


def refresh(value):
    inv = value['inventory']
    inv['scopedInventorySha256'] = R.digest(inv['scopedInventory'])
    value['inventorySha256'] = R.digest(inv)


class FakeGitHub:
    def __init__(self, raw=None):
        self.raw = archive() if raw is None else raw
        self.run = run_metadata()
        self.artifact = artifact_metadata()
        self.comments = []
        self.writes = []
        self.calls = []
        self.sha = 'a' * 40
        self.stale_second = False
        self.main_reads = 0

    def api(self, route, data=None):
        self.calls.append(route)
        if data is not None:
            if route != 'issues/481/comments':
                raise AssertionError('unexpected mutation')
            self.writes.append(data)
            item = {'body': data['body'], 'user': {'login': 'github-actions[bot]', 'type': 'Bot'}}
            self.comments.append(item)
            return item
        if route == 'git/ref/heads/main':
            self.main_reads += 1
            sha = 'b' * 40 if self.stale_second and self.main_reads > 1 else self.sha
            return {'ref': 'refs/heads/main', 'object': {'type': 'commit', 'sha': sha}}
        if route == f'actions/runs/{R.RUN}':
            return self.run
        if route == f'actions/artifacts/{R.ARTIFACT}':
            return self.artifact
        if route.startswith('issues/481/comments?'):
            return self.comments if 'page=1' in route else []
        raise AssertionError('unexpected API read')

    def archive(self):
        self.calls.append('archive')
        return self.raw


def ci_log(title='synthetic failing title', location='agent-team/tests/bug-pipeline/github.test.mjs:42:1',
           code='ERR_ASSERTION', operator='strictEqual', message='private assertion details'):
    lines = ['##[group]Run ' + R.CI_COMMAND, R.CI_COMMAND, 'shell: /usr/bin/bash -e {0}',
             '##[endgroup]', 'TAP version 13', '# Subtest: ' + title, 'not ok 1 - ' + title,
             '  ---', '  duration_ms: 1.2', "  type: 'test'", "  location: '" + location + "'",
             "  failureType: 'testCodeFailure'", '  error: ' + message,
             "  code: '" + code + "'", '  actual: private-actual', '  expected: private-expected',
             "  operator: '" + operator + "'", '  stack: |- ', '    private-stack', '  ...',
             'ok 2 - synthetic passing title', 'ok 3 - synthetic skipped title # SKIP', '1..3',
             '# tests 3', '# pass 1', '# fail 1', '# cancelled 0', '# skipped 1', '# todo 0',
             '##[error]Process completed with exit code 1.']
    return ''.join('2026-10-18T17:38:42.1234567Z ' + line + '\n' for line in lines).encode()


class FakeCIGitHub(FakeGitHub):
    def __init__(self, raw=None):
        super().__init__()
        self.log = ci_log() if raw is None else raw
        self.run.update(id=R.CI_RUN, run_attempt=2, head_sha=R.CI_HEAD,
                        head_branch=R.CI_BRANCH, conclusion='failure', event='pull_request',
                        path='.github/workflows/bug-pipeline-tests.yml')
        self.job = {'id': R.CI_JOB, 'run_id': R.CI_RUN, 'run_attempt': 2,
                    'head_sha': R.CI_HEAD, 'name': 'bug-pipeline-tests',
                    'status': 'completed', 'conclusion': 'failure',
                    'started_at': '2026-10-18T17:38:40Z', 'completed_at': '2026-10-18T17:39:04Z',
                    'steps': [{'number': 5, 'name': R.CI_STEP, 'status': 'completed', 'conclusion': 'failure',
                               'started_at': '2026-10-18T17:38:41Z', 'completed_at': '2026-10-18T17:38:59Z'}]}
        self.metadata_drift = False
        self.downloaded = False

    def api(self, route, data=None):
        self.calls.append(route)
        if route == f'actions/runs/{R.CI_RUN}/attempts/2':
            result = dict(self.run)
            if self.metadata_drift and self.downloaded:
                result['updated_at'] = '2026-10-18T17:39:07Z'
            return result
        if route == f'actions/jobs/{R.CI_JOB}':
            return self.job
        if route.startswith('issues/492/comments'):
            if data is None:
                return self.comments
            self.writes.append(data)
            item = {'body': data['body'], 'user': {'login': 'github-actions[bot]', 'type': 'Bot'}}
            self.comments.append(item)
            return item
        return super().api(route, data)

    def job_log(self):
        self.downloaded = True
        return self.log


class Tests(unittest.TestCase):
    def setUp(self):
        blocker = patch('socket.create_connection', side_effect=AssertionError('network forbidden in offline tests'))
        blocker.start()
        self.addCleanup(blocker.stop)

    def env(self):
        return {'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_REPOSITORY': R.REPO,
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_SHA': 'a' * 40,
                'RECOVERY_REVIEWED_SHA': 'a' * 40}

    def recover(self, client, **kwargs):
        with patch.object(R, 'ARCHIVE_SIZE', len(client.raw)), patch.object(
                R, 'ARCHIVE_DIGEST', hashlib.sha256(client.raw).hexdigest()):
            client.artifact['size_in_bytes'] = len(client.raw)
            client.artifact['digest'] = 'sha256:' + R.ARCHIVE_DIGEST
            return R.recover(client, self.env(), **kwargs)

    def extract(self, raw):
        with patch.object(R, 'ARCHIVE_SIZE', len(raw)), patch.object(
                R, 'ARCHIVE_DIGEST', hashlib.sha256(raw).hexdigest()):
            return R.extract_archive(raw)

    def reject_receipt(self, value):
        client = FakeGitHub(archive(R.compact(value).encode()))
        with self.assertRaises(R.RecoveryError):
            self.recover(client)
        self.assertEqual(client.writes, [])

    def test_original_fixed_identity_constants(self):
        self.assertEqual(R.RUN, 39150528800)
        self.assertEqual(R.ARTIFACT, 12145555014)
        self.assertEqual(R.ARCHIVE_SIZE, 1237)
        self.assertEqual(R.ARCHIVE_DIGEST, '4fc7496c6b3280979c25b184317bdc79cd6b28505e27762105c1a8a29e44e9e8')

    def test_complete_receipt_and_idempotent_comment(self):
        client = FakeGitHub()
        self.assertEqual(self.recover(client), 'published')
        body = client.writes[0]['body']
        self.assertTrue(body.startswith(R.MARKER + '\n'))
        published = json.loads(body.split('```json\n')[1].split('\n```')[0])
        self.assertEqual(published, fixture())
        self.assertIn(hashlib.sha256((R.compact(fixture()) + '\n').encode()).hexdigest(), body)
        self.assertIn('not deployment confirmation', body)
        self.assertLessEqual(len(body.encode()), R.MAX_COMMENT)
        self.assertEqual(self.recover(client), 'already-published')
        self.assertEqual(len(client.writes), 1)

    def test_wrong_run_identity_rejected_before_archive(self):
        mutations = {'id': 1, 'run_attempt': 2, 'head_sha': 'b' * 40, 'head_branch': 'other',
                     'status': 'in_progress', 'conclusion': 'failure', 'event': 'pull_request', 'path': 'evil.yml'}
        for key, bad in mutations.items():
            with self.subTest(key=key):
                client = FakeGitHub()
                client.run[key] = bad
                with self.assertRaises(R.RecoveryError):
                    self.recover(client)
                self.assertNotIn('archive', client.calls)
                self.assertFalse(client.writes)
        for field in ('repository', 'head_repository'):
            client = FakeGitHub()
            client.run[field]['full_name'] = 'foreign/repo'
            with self.assertRaises(R.RecoveryError):
                self.recover(client)

    def test_wrong_artifact_metadata(self):
        for key, bad in {'id': 1, 'name': 'wrong', 'expired': True, 'size_in_bytes': 1,
                         'digest': 'sha256:' + '0' * 64}.items():
            with self.subTest(key=key):
                metadata = artifact_metadata()
                metadata[key] = bad
                with self.assertRaises(R.RecoveryError):
                    R.validate_artifact(metadata)
        for key in artifact_metadata()['workflow_run']:
            metadata = artifact_metadata()
            metadata['workflow_run'][key] = None
            with self.assertRaises(R.RecoveryError):
                R.validate_artifact(metadata)

    def test_dispatch_context_and_fresh_main(self):
        for key in self.env():
            env = self.env()
            env[key] = 'wrong'
            with self.subTest(key=key), self.assertRaises(R.RecoveryError):
                R.recover(FakeGitHub(), env)
        client = FakeGitHub()
        client.sha = 'c' * 40
        with self.assertRaises(R.RecoveryError):
            self.recover(client)
        self.assertNotIn('archive', client.calls)
        client = FakeGitHub()
        client.stale_second = True
        with self.assertRaises(R.RecoveryError):
            self.recover(client)
        self.assertFalse(client.writes)

    def test_archive_digest_and_length_before_parse(self):
        for raw in (b'not-zip', b'0' * R.ARCHIVE_SIZE):
            with self.assertRaisesRegex(R.RecoveryError, 'ARCHIVE_DIGEST'):
                R.extract_archive(raw)

    def test_extra_path_members_trailing_and_prefix_rejected(self):
        raws = [archive(extra='extra.json'), archive(filename='../' + R.MEMBER),
                archive(filename='folder/' + R.MEMBER), archive() + b'trailing', b'prefix' + archive()]
        for raw in raws:
            with self.subTest(length=len(raw)), self.assertRaises(R.RecoveryError):
                self.extract(raw)

    def test_crc_failure_rejected_even_with_valid_archive_digest(self):
        raw = bytearray(archive(compression=zipfile.ZIP_STORED))
        raw[30 + len(R.MEMBER) + 10] ^= 1
        with self.assertRaises(R.RecoveryError):
            self.extract(bytes(raw))

    def test_streaming_data_descriptor_supported_and_hidden_bytes_rejected(self):
        class Streaming(io.BytesIO):
            def seekable(self):
                return False

            def seek(self, *args):
                raise OSError('streaming')
        stream = Streaming()
        with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as handle:
            handle.writestr(R.MEMBER, (R.compact(fixture()) + '\n').encode())
        self.assertEqual(json.loads(self.extract(stream.getvalue())), fixture())
        raw = bytearray(archive())
        offset = int.from_bytes(raw[-6:-2], 'little')
        raw[offset:offset] = b'unclaimed'
        raw[-6:-2] = (offset + len(b'unclaimed')).to_bytes(4, 'little')
        with self.assertRaises(R.RecoveryError):
            self.extract(bytes(raw))

    def test_encrypted_and_unsupported_compression_rejected(self):
        raw = bytearray(archive())
        offset = int.from_bytes(raw[-6:-2], 'little')
        raw[6:8] = (1).to_bytes(2, 'little')
        raw[offset + 8:offset + 10] = (1).to_bytes(2, 'little')
        with self.assertRaises(R.RecoveryError):
            self.extract(bytes(raw))
        with self.assertRaises(R.RecoveryError):
            self.extract(archive(compression=zipfile.ZIP_BZIP2))

    def test_compression_size_and_symlink_rejected(self):
        for raw in (archive(b'x' * (R.MAX_RECEIPT + 1)), archive(b'x' * 100000)):
            with self.assertRaisesRegex(R.RecoveryError, 'ZIP_SIZE'):
                self.extract(raw)
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as handle:
            item = zipfile.ZipInfo(R.MEMBER)
            item.external_attr = (stat.S_IFLNK | 0o777) << 16
            handle.writestr(item, b'target')
        with self.assertRaises(R.RecoveryError):
            self.extract(output.getvalue())

    def test_invalid_json_duplicate_fields_and_nonfinite(self):
        for raw in (b'{"a":1,"a":2}', b'{"a":NaN}', b'\xff', b'[' * 1500):
            with self.assertRaises(R.RecoveryError):
                R.parse_json(raw)

    def test_unknown_fields_at_every_schema_layer(self):
        paths = [(), ('inventory',), ('inventory', 'environments', 0),
                 ('inventory', 'environments', 0, 'instances', 0), ('inventory', 'services', 0),
                 ('inventory', 'scopedInventory'), ('inventory', 'scopedInventory', 'domains', 0)]
        for path in paths:
            value = fixture()
            target = value
            for key in path:
                target = target[key]
            target['unsafe'] = 'private-value'
            refresh(value)
            with self.subTest(path=path):
                self.reject_receipt(value)

    def test_fixed_receipt_identity_flags_and_digests(self):
        for key, bad in {'schemaVersion': True, 'repository': 'other/repo', 'reviewedSha': 'b' * 40,
                         'runId': str(R.RUN + 1), 'runAttempt': '2', 'operation': 'create-main',
                         'outcome': 'deployed', 'inventorySha256': '0' * 64, 'readRequests': True,
                         'capturedAt': '2026-10-18T18:39:02.000Z'}.items():
            value = fixture()
            value[key] = bad
            with self.subTest(key=key):
                self.reject_receipt(value)
        for key, bad in {'projectId': 'wrong', 'scopedInventorySha256': '0' * 64,
                         'paginationComplete': False, 'allVisibleEnvironmentsAccessible': False,
                         'observedConstraints': [], 'credentialScope': 'account',
                         'projectWideVisibility': 'proven', 'serviceConnectAllowed': True,
                         'refusalReason': 'NONE'}.items():
            value = fixture()
            value['inventory'][key] = bad
            value['inventorySha256'] = R.digest(value['inventory'])
            with self.subTest(key=key):
                self.reject_receipt(value)

    def test_unsafe_names_and_actual_bound_secret_rejected(self):
        for name in ('ghp_synthetic', 'github_pat_synthetic', 'sk-ant-synthetic', 'newline\n', '<script>'):
            value = fixture()
            value['inventory']['services'][0]['name'] = name
            refresh(value)
            self.reject_receipt(value)
        value = fixture()
        value['inventory']['services'][0]['name'] = 'opaque-bound-secret'
        refresh(value)
        client = FakeGitHub(archive(R.compact(value).encode()))
        with self.assertRaises(R.RecoveryError):
            self.recover(client, forbidden=('opaque-bound-secret',))
        self.assertFalse(client.writes)

    def test_inaccessible_environment_semantics(self):
        value = fixture()
        value['inventory']['environments'].append({'id': 'hidden', 'projectId': R.PROJECT,
            'name': 'hidden', 'canAccess': False, 'isEphemeral': True, 'sourceEnvironmentId': R.ENVIRONMENT,
            'instances': None, 'triggers': None})
        value['inventory']['allVisibleEnvironmentsAccessible'] = False
        value['inventory']['observedConstraints'] = ['OTHER_VISIBLE_ENVIRONMENTS',
            'INACCESSIBLE_VISIBLE_ENVIRONMENTS', 'FORKED_OR_EPHEMERAL_ENVIRONMENTS', 'MISSING_TARGET_TRIGGER']
        refresh(value)
        client = FakeGitHub(archive(R.compact(value).encode()))
        self.assertEqual(self.recover(client), 'published')
        value['inventory']['environments'][1]['instances'] = []
        refresh(value)
        self.reject_receipt(value)

    def test_duplicate_foreign_instance_and_scope_mismatch(self):
        for change in ('duplicate-env', 'duplicate-service', 'foreign-instance', 'root-mismatch', 'missing-domain'):
            value = fixture()
            inv = value['inventory']
            if change == 'duplicate-env':
                inv['environments'] *= 2
            elif change == 'duplicate-service':
                inv['services'] *= 2
            elif change == 'foreign-instance':
                inv['environments'][0]['instances'][0]['environmentId'] = 'foreign'
            elif change == 'root-mismatch':
                inv['scopedInventory']['rootDirectory'] = 'wrong'
            else:
                inv['scopedInventory']['domains'] = []
            refresh(value)
            with self.subTest(change=change):
                self.reject_receipt(value)

    def test_trigger_projection_order_and_scope(self):
        value = fixture()
        scoped = {'id': 'trigger-id', 'provider': 'GitHub', 'projectId': R.PROJECT,
                  'environmentId': R.ENVIRONMENT, 'serviceId': R.SERVICE, 'repository': R.REPO,
                  'branch': 'main', 'checkSuites': True, 'baseEnvironmentOverrideId': None}
        topology = {key: scoped[key] for key in ('id', 'projectId', 'environmentId', 'serviceId',
                    'repository', 'provider', 'branch', 'checkSuites', 'baseEnvironmentOverrideId')}
        value['inventory']['scopedInventory']['triggers'] = [scoped]
        value['inventory']['environments'][0]['triggers'] = [topology]
        value['inventory']['observedConstraints'] = []
        refresh(value)
        self.assertEqual(self.recover(FakeGitHub(archive(R.compact(value).encode()))), 'published')
        value['inventory']['environments'][0]['triggers'][0]['unsafe'] = 'no'
        refresh(value)
        self.reject_receipt(value)

    def test_comment_conflicts_duplicate_marker_and_size_fail_closed(self):
        for user in ({'login': 'attacker', 'type': 'User'}, {'login': 'github-actions[bot]', 'type': 'Bot'}):
            client = FakeGitHub()
            client.comments = [{'body': R.MARKER + '\nwrong', 'user': user}]
            with self.assertRaises(R.RecoveryError):
                self.recover(client)
            self.assertFalse(client.writes)
        client = FakeGitHub()
        self.recover(client)
        client.comments *= 2
        with self.assertRaises(R.RecoveryError):
            self.recover(client)
        self.assertEqual(len(client.writes), 1)
        client = FakeGitHub()
        with patch.object(R, 'MAX_COMMENT', 10), self.assertRaises(R.RecoveryError):
            self.recover(client)
        self.assertFalse(client.writes)

    def test_comment_pagination_exhaustion_and_http_size_fail_closed(self):
        client = FakeGitHub()
        original = client.api
        def many_comments(route, data=None):
            if route.startswith('issues/481/comments?'):
                return [{'body': 'ordinary comment', 'user': {'login': 'someone'}}] * 100
            return original(route, data)
        client.api = many_comments
        with self.assertRaisesRegex(R.RecoveryError, 'COMMENTS_LIMIT'):
            self.recover(client)
        self.assertFalse(client.writes)
        transport = R.GitHub('opaque-secret')
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b'too many'
        transport.opener = unittest.mock.Mock()
        transport.opener.open.return_value = response
        with self.assertRaisesRegex(R.RecoveryError, 'HTTP_SIZE'):
            transport.request('https://x.blob.core.windows.net/a', limit=2)

    def test_http_storage_no_auth_no_redirect_and_host_rejection(self):
        client = R.GitHub('opaque-secret')
        calls = []
        def request(url, **kwargs):
            calls.append((url, kwargs))
            if kwargs.get('authenticated'):
                return 'https://storage.blob.core.windows.net/artifact?signature=synthetic'
            return b'archive'
        with patch.object(client, 'request', side_effect=request):
            self.assertEqual(client.archive(), b'archive')
        self.assertTrue(calls[0][1]['authenticated'])
        self.assertNotIn('authenticated', calls[1][1])
        self.assertNotIn('redirect', calls[1][1])
        for url in ('http://x.blob.core.windows.net/a', 'https://evil.com/a',
                    'https://x.blob.core.windows.net.evil.com/a',
                    'https://user:pass@x.blob.core.windows.net/a',
                    'https://x.blob.core.windows.net:444/a', 'https://x.blob.core.windows.net/a#fragment'):
            with patch.object(client, 'request', return_value=url), self.assertRaises(R.RecoveryError):
                client.archive()

    def test_http_token_not_forwarded_and_failures_do_not_echo_url(self):
        client = R.GitHub('opaque-secret')
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b'ok'
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        client.opener = opener
        self.assertEqual(client.request('https://x.blob.core.windows.net/a?private=yes'), b'ok')
        req = opener.open.call_args.args[0]
        self.assertNotIn('Authorization', req.headers)
        client.request('https://api.github.com/repos/' + R.REPO + '/actions/runs/1', authenticated=True)
        self.assertEqual(opener.open.call_args.args[0].get_header('Authorization'), 'Bearer opaque-secret')
        opener.open.side_effect = urllib.error.URLError('https://private/signed?secret=yes')
        with self.assertRaises(R.RecoveryError) as error:
            client.request('https://x.blob.core.windows.net/a?private=yes')
        self.assertEqual(str(error.exception), 'HTTP_FAILED')
        self.assertIsNone(R.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.com'))

    def test_workflow_guards_pins_and_permission_scope(self):
        workflow = PATH.parents[2] / '.github/workflows/recover-demo-topology-receipt.yml'
        value = workflow.read_text()
        for guard in ("github.event_name == 'workflow_dispatch'", "github.ref == 'refs/heads/main'",
                      "github.repository == 'l2v-hub/ClinicOS'", 'inputs.reviewed_sha == github.sha',
                      'persist-credentials: false', 'ref: ${{ github.sha }}', 'actions: read', 'issues: write'):
            self.assertIn(guard, value)
        self.assertEqual(value.count('uses:'), 1)
        self.assertIn('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683', value)
        self.assertNotIn('secrets.', value)
        self.assertNotIn('railway-backend', value)
        self.assertNotIn('pull_request', value)
        self.assertIn('options: [topology, ci-fingerprints]', value)
        self.assertIn('default: topology', value)

    def test_ci_fixed_provenance_fingerprints_and_idempotence(self):
        self.assertEqual(len(R.CI_TEST_FILES), 22)
        for name in ('attempt-budget', 'standalone-review-contracts', 'standalone-review'):
            self.assertIn(f'agent-team/tests/bug-pipeline/{name}.test.mjs', R.CI_TEST_FILES)
        client = FakeCIGitHub()
        env = {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'}
        self.assertEqual(R.recover(client, env), 'published')
        body = client.writes[0]['body']
        self.assertTrue(body.startswith(R.CI_MARKER))
        report = json.loads(body.split('```json\n')[1].split('\n```')[0])
        self.assertEqual(report['precommittedLogDigest'], 'unavailable')
        self.assertEqual(report['fetchedBytesSha256'], hashlib.sha256(client.log).hexdigest())
        self.assertEqual(report['counts']['fail'], 1)
        self.assertEqual(report['failures'], [{'testTitleSha256': hashlib.sha256(b'synthetic failing title').hexdigest(),
            'location': 'agent-team/tests/bug-pipeline/github.test.mjs:42', 'errorCode': 'ERR_ASSERTION',
            'operator': 'strictEqual', 'failureType': 'testCodeFailure'}])
        for private in ('synthetic failing title', 'private assertion details', 'private-actual',
                        'private-expected', 'private-stack'):
            self.assertNotIn(private, body)
        self.assertEqual(R.recover(client, env), 'already-published')
        self.assertEqual(len(client.writes), 1)
        self.assertFalse(any('issues/481/' in call for call in client.calls))

    def test_ci_unknown_modes_provenance_and_drift_rejected(self):
        client = FakeCIGitHub()
        with self.assertRaisesRegex(R.RecoveryError, 'INVALID_MODE'):
            R.recover(client, {**self.env(), 'RECOVERY_MODE': 'arbitrary'})
        self.assertFalse(client.calls)
        for field, bad in {'id': 1, 'run_attempt': 1, 'head_sha': 'b' * 40, 'head_branch': 'main',
                           'event': 'push', 'path': 'evil.yml', 'conclusion': 'success'}.items():
            client = FakeCIGitHub()
            client.run[field] = bad
            with self.subTest(field=field), self.assertRaises(R.RecoveryError):
                R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
            self.assertFalse(client.writes)
            self.assertFalse(client.downloaded)
        for field, bad in {'id': 1, 'run_id': 1, 'run_attempt': 1, 'head_sha': 'b' * 40,
                           'name': 'other-job', 'conclusion': 'success'}.items():
            client = FakeCIGitHub()
            client.job[field] = bad
            with self.subTest(field=field), self.assertRaises(R.RecoveryError):
                R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
            self.assertFalse(client.writes)
        client = FakeCIGitHub()
        client.metadata_drift = True
        with self.assertRaisesRegex(R.RecoveryError, 'CI_PROVENANCE_DRIFT'):
            R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
        self.assertFalse(client.writes)

    def test_ci_paths_secret_reflection_and_unknown_enums(self):
        for path in ('../../private.test.mjs:1:1', 'agent-team/tests/bug-pipeline/../private.test.mjs:1:1',
                     '/tmp/private.test.mjs:1:1', 'agent-team/tests/bug-pipeline/ghp_private.test.mjs:1:1',
                     'agent-team/tests/bug-pipeline/unknown.test.mjs:1:1', 'https://private.test.mjs:1:1'):
            client = FakeCIGitHub(ci_log(location=path))
            with self.subTest(path=path), self.assertRaises(R.RecoveryError):
                R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
            self.assertFalse(client.writes)
        private = 'ghp_synthetic_sensitive_token'
        client = FakeCIGitHub(ci_log(title=private, code=private, operator=private,
            message='https://private/signed?secret=yes ' + private))
        self.assertEqual(R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'}, forbidden=(private,)), 'published')
        self.assertNotIn(private, client.writes[0]['body'])
        self.assertNotIn('https://private', client.writes[0]['body'])
        self.assertIn('"errorCode":"OTHER"', client.writes[0]['body'])
        report = R.parse_ci_log(ci_log(location='file:///home/runner/work/ClinicOS/ClinicOS/agent-team/tests/bug-pipeline/github.test.mjs:42:1'))
        self.assertEqual(report['failures'][0]['location'], 'agent-team/tests/bug-pipeline/github.test.mjs:42')

    def test_ci_logs_bounds_gzip_empty_nonfailed_duplicate_and_block_rejection(self):
        plain = ci_log()
        self.assertEqual(R.parse_ci_log(plain), R.parse_ci_log(gzip.compress(plain)))
        bads = [b'', b'x' * (R.MAX_LOG + 1), gzip.compress(b'x' * (R.MAX_LOG + 1)),
                gzip.compress(plain) + b'trailing', plain.replace(b'not ok 1', b'ok 1'),
                plain.replace(b'# fail 1', b'# fail 0'), plain.replace(b'# tests 3', b'# tests 4'),
                plain.replace(b'  ...', b'    ...'), plain.replace(b"  code: 'ERR_ASSERTION'", b"  code: 'ERR_ASSERTION'\n2026-10-18T17:38:42Z   code: 'ENOENT'"),
                plain.replace(b'##[error]Process completed with exit code 1.', b'finished'),
                b'2026-10-18T17:38:42Z ' + b'x' * 8193 + b'\n', b'untimestamped\n',
                plain + b'2026-10-18T17:38:42Z \x1b[31mred\n']
        for raw in bads:
            client = FakeCIGitHub(raw)
            with self.subTest(length=len(raw)), self.assertRaises(R.RecoveryError):
                R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
            self.assertFalse(client.writes)
        block = plain[plain.index(b'2026-10-18T17:38:42.1234567Z not ok'):plain.index(b'2026-10-18T17:38:42.1234567Z ok 2')]
        duplicate = plain.replace(b'2026-10-18T17:38:42.1234567Z ok 2', block + b'2026-10-18T17:38:42.1234567Z ok 2')
        duplicate = duplicate.replace(b'# fail 1', b'# fail 2').replace(b'# tests 3', b'# tests 4')
        with self.assertRaisesRegex(R.RecoveryError, 'LOG_DUPLICATE_FAILURE'):
            R.parse_ci_log(duplicate)

    def test_ci_failed_step_stale_main_conflicts_and_job_log_token_separation(self):
        for change in ('wrong-step', 'no-failure', 'many-failures', 'stale-main', 'conflict'):
            client = FakeCIGitHub()
            if change == 'wrong-step':
                client.job['steps'][0]['name'] = 'other-step'
            elif change == 'no-failure':
                client.job['steps'][0]['conclusion'] = 'success'
            elif change == 'many-failures':
                client.job['steps'] *= 2
            elif change == 'stale-main':
                client.stale_second = True
            else:
                client.comments = [{'body': R.CI_MARKER, 'user': {'login': 'github-actions[bot]', 'type': 'Bot'}}]
            with self.subTest(change=change), self.assertRaises(R.RecoveryError):
                R.recover(client, {**self.env(), 'RECOVERY_MODE': 'ci-fingerprints'})
            self.assertFalse(client.writes)
        client = R.GitHub('opaque-secret')
        calls = []
        def request(url, **kwargs):
            calls.append((url, kwargs))
            return 'https://x.blob.core.windows.net/log?private=yes' if kwargs.get('authenticated') else ci_log()
        with patch.object(client, 'request', side_effect=request):
            self.assertEqual(client.job_log(), ci_log())
        self.assertIn(f'actions/jobs/{R.CI_JOB}/logs', calls[0][0])
        self.assertNotIn('authenticated', calls[1][1])


if __name__ == '__main__':
    unittest.main(verbosity=2)
