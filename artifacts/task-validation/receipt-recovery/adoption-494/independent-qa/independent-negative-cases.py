#!/usr/bin/env python3
"""Independent security cases; synthetic data only, socket access prohibited."""
import contextlib
import copy
import gzip
import hashlib
import importlib.util
import io
import json
import pathlib
import socket
import struct
import unittest
from unittest.mock import Mock, patch

ROOT = pathlib.Path('/workspace/clinicos-topology-receipt')
SPEC = importlib.util.spec_from_file_location('independent_recovery', ROOT / 'scripts/automation/recover-demo-topology-receipt.py')
R = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(R)

def log_bytes(title='independent failure', location='scripts/quality-gate/claude-bug-review.test.mjs:19:2'):
    # Authored independently of the candidate test module.
    lines = ['##[group]Run ' + R.CI_COMMAND, '##[endgroup]', 'TAP version 13',
             'not ok 7 - ' + title, '  ---', "  location: '" + location + "'",
             "  failureType: 'testCodeFailure'", "  code: 'ERR_ASSERTION'",
             "  operator: 'deepStrictEqual'", '  ...', '# tests 2', '# pass 1',
             '# fail 1', '# cancelled 0', '# skipped 0', '# todo 0',
             '##[error]Process completed with exit code 1.']
    return ''.join('2026-10-18T12:00:01.123Z ' + line + '\n' for line in lines).encode()

def provenance():
    run = dict(id=R.CI_RUN, run_attempt=2, head_sha=R.CI_HEAD, head_branch=R.CI_BRANCH,
               status='completed', conclusion='failure', event='pull_request',
               path='.github/workflows/bug-pipeline-tests.yml',
               repository=dict(id=R.REPO_ID, full_name=R.REPO),
               head_repository=dict(id=R.REPO_ID, full_name=R.REPO),
               created_at='2026-10-18T12:00:00Z', updated_at='2026-10-18T12:00:06Z')
    step = dict(name=R.CI_STEP, status='completed', conclusion='failure', number=5,
                started_at='2026-10-18T12:00:02Z', completed_at='2026-10-18T12:00:03Z')
    job = dict(id=R.CI_JOB, run_id=R.CI_RUN, run_attempt=2, head_sha=R.CI_HEAD,
               name='bug-pipeline-tests', status='completed', conclusion='failure',
               started_at='2026-10-18T12:00:01Z', completed_at='2026-10-18T12:00:05Z', steps=[step])
    return run, job

class Client:
    def __init__(self):
        self.run, self.job = provenance()
        self.pages = [[]]
        self.writes = []
        self.main_reads = 0
        self.raise_after_write = False
        self.bad_reply = False
        self.stale_second = False
        self.job_drift = False
        self.fetched = False
    def api(self, route, data=None):
        if data is not None:
            assert route == 'issues/492/comments', route
            item = dict(body=data['body'], user=dict(login='github-actions[bot]', type='Bot'))
            self.writes.append(item)
            self.pages[-1].append(item)
            if self.raise_after_write:
                raise R.RecoveryError('HTTP_FAILED')
            return {} if self.bad_reply else item
        if route == 'git/ref/heads/main':
            self.main_reads += 1
            return dict(ref='refs/heads/main', object=dict(type='commit', sha=('b' if self.stale_second and self.main_reads > 1 else 'a') * 40))
        if route == f'actions/runs/{R.CI_RUN}/attempts/2':
            return copy.deepcopy(self.run)
        if route == f'actions/jobs/{R.CI_JOB}':
            job = copy.deepcopy(self.job)
            if self.fetched and self.job_drift:
                job['completed_at'] = '2026-10-18T12:00:04Z'
            return job
        assert route.startswith('issues/492/comments?per_page=100&page='), route
        page = int(route.rsplit('=', 1)[1])
        return self.pages[page - 1] if page <= len(self.pages) else []
    def job_log(self):
        self.fetched = True
        return log_bytes()

ENV = dict(GITHUB_EVENT_NAME='workflow_dispatch', GITHUB_REPOSITORY=R.REPO,
           GITHUB_REF='refs/heads/main', GITHUB_SHA='a' * 40,
           RECOVERY_REVIEWED_SHA='a' * 40, RECOVERY_MODE='ci-fingerprints')

class IndependentSecurity(unittest.TestCase):
    def setUp(self):
        for name in ('socket.socket', 'socket.create_connection', 'socket.getaddrinfo'):
            blocker = patch(name, side_effect=AssertionError('offline socket guard'))
            blocker.start()
            self.addCleanup(blocker.stop)
    def reject_log(self, raw):
        with self.assertRaises(R.RecoveryError):
            R.parse_ci_log(raw)
    def test_independent_happy_path_and_exact_public_projection(self):
        c = Client()
        self.assertEqual(R.recover(c, ENV), 'published')
        body = c.writes[0]['body']
        data = json.loads(body.split('```json\n')[1].split('\n```')[0])
        self.assertEqual(set(data['failures'][0]), {'testTitleSha256', 'location', 'errorCode', 'operator', 'failureType'})
        self.assertEqual(data['failures'][0]['testTitleSha256'], hashlib.sha256(b'independent failure').hexdigest())
        self.assertEqual(data['fetchedBytesSha256'], hashlib.sha256(log_bytes()).hexdigest())
        self.assertNotIn('independent failure', body)
    def test_write_lost_response_rerun_does_not_duplicate(self):
        c = Client(); c.raise_after_write = True
        with self.assertRaisesRegex(R.RecoveryError, 'HTTP_FAILED'):
            R.recover(c, ENV)
        c.raise_after_write = False
        self.assertEqual(R.recover(c, ENV), 'already-published')
        self.assertEqual(len(c.writes), 1)
    def test_write_malformed_ack_rerun_does_not_duplicate(self):
        c = Client(); c.bad_reply = True
        with self.assertRaisesRegex(R.RecoveryError, 'COMMENT_REPLY'):
            R.recover(c, ENV)
        self.assertEqual(R.recover(c, ENV), 'already-published')
        self.assertEqual(len(c.writes), 1)
    def test_second_page_marker_and_duplicate_conflict(self):
        c = Client(); R.recover(c, ENV)
        own = c.pages[0][0]
        c.pages = [[dict(body='ordinary', user={}) for _ in range(100)], [own]]
        self.assertEqual(R.recover(c, ENV), 'already-published')
        c.pages[1].append(own)
        with self.assertRaisesRegex(R.RecoveryError, 'COMMENT_CONFLICT'):
            R.recover(c, ENV)
        self.assertEqual(len(c.writes), 1)
    def test_conflict_on_later_page_cannot_publish(self):
        c = Client()
        c.pages = [[dict(body='ordinary') for _ in range(100)], [dict(body=R.CI_MARKER, user=dict(login='attacker', type='User'))]]
        with self.assertRaisesRegex(R.RecoveryError, 'COMMENT_CONFLICT'):
            R.recover(c, ENV)
        self.assertFalse(c.writes)
    def test_job_metadata_drift_after_download_and_main_drift_before_write(self):
        for field in ('job_drift', 'stale_second'):
            c = Client(); setattr(c, field, True)
            with self.subTest(field=field), self.assertRaises(R.RecoveryError):
                R.recover(c, ENV)
            self.assertFalse(c.writes)
    def test_wrong_repository_id_and_job_step_boolean_rejected_before_fetch(self):
        for mutation in ('repo-id', 'fork-id', 'bool-step', 'step-time'):
            c = Client()
            if mutation == 'repo-id': c.run['repository']['id'] = 1
            if mutation == 'fork-id': c.run['head_repository']['id'] = True
            if mutation == 'bool-step': c.job['steps'][0]['number'] = True
            if mutation == 'step-time': c.job['steps'][0]['completed_at'] = '2026-10-18T12:01:00Z'
            with self.subTest(mutation=mutation), self.assertRaises(R.RecoveryError):
                R.recover(c, ENV)
            self.assertFalse(c.fetched); self.assertFalse(c.writes)
    def test_unknown_mode_values_no_api_call(self):
        for mode in ('TOPOLOGY', 'topology;echo', '', None, 1):
            c = Client()
            with self.subTest(mode=mode), self.assertRaises(R.RecoveryError):
                R.recover(c, dict(ENV, RECOVERY_MODE=mode))
            self.assertEqual(c.main_reads, 0)
    def test_bound_token_never_reflected_from_title_or_message(self):
        secret = 'opaque-independent-bound-fixture'
        raw = log_bytes(title=secret).replace(b"  operator: 'deepStrictEqual'", ("  operator: '" + secret + "'\n2026-10-18T12:00:01Z   error: https://private.invalid/" + secret).encode())
        c = Client(); c.job_log = lambda: raw
        self.assertEqual(R.recover(c, ENV, forbidden=(secret,)), 'published')
        body = c.writes[0]['body']
        self.assertNotIn(secret, body); self.assertNotIn('private.invalid', body)
        self.assertIn('"operator":"OTHER"', body)
    def test_encoded_traversal_drive_letter_query_and_column_bounds(self):
        for location in ('agent-team/tests/bug-pipeline/%2e%2e/github.test.mjs:1:1',
                         'C:/agent-team/tests/bug-pipeline/github.test.mjs:1:1',
                         'scripts/quality-gate/claude-bug-review.test.mjs?key=x:1:1',
                         'scripts/quality-gate/claude-bug-review.test.mjs:0:1',
                         'scripts/quality-gate/claude-bug-review.test.mjs:1:100000'):
            with self.subTest(location=location): self.reject_log(log_bytes(location=location))
    def test_gzip_truncated_multimember_and_crc_rejected(self):
        zipped = gzip.compress(log_bytes())
        corrupt = bytearray(zipped); corrupt[-8] ^= 1
        for raw in (zipped[:-1], zipped + gzip.compress(b'ignored'), bytes(corrupt)):
            with self.subTest(length=len(raw)): self.reject_log(raw)
    def test_fake_nested_command_duplicate_summary_and_control_rejected(self):
        raw = log_bytes()
        for bad in (raw.replace(b'TAP version 13', ('##[group]Run ' + R.CI_COMMAND).encode()),
                    raw.replace(b'# tests 2', b'# tests 2\n2026-10-18T12:00:01Z # tests 2'),
                    raw.replace(b'independent failure', b'independent\x00failure'),
                    raw.replace(b'independent failure', b'independent\rfailure')):
            self.reject_log(bad)
    def test_unallowlisted_error_and_failure_type_reduce_to_constants(self):
        raw = log_bytes().replace(b'ERR_ASSERTION', b'private-error-value').replace(b'testCodeFailure', b'private-type-value')
        output = json.dumps(R.parse_ci_log(raw))
        self.assertNotIn('private-', output)
        self.assertIn('OTHER', output)
    def test_actual_archive_digest_never_accepts_synthetic_or_mutated_data(self):
        for raw in (b'PK\x03\x04' + b'x' * (R.ARCHIVE_SIZE - 4), b'x' * (R.ARCHIVE_SIZE + 1)):
            with self.assertRaisesRegex(R.RecoveryError, 'ARCHIVE_DIGEST'):
                R.extract_archive(raw)
    def test_archive_central_local_filename_and_comment_rejected(self):
        import zipfile
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(R.MEMBER, b'{"synthetic":true}')
        original = stream.getvalue()
        bad_name = bytearray(original); bad_name[30] ^= 1
        commented = bytearray(original); commented[-2:] = struct.pack('<H', 1); commented += b'x'
        for raw in (bytes(bad_name), bytes(commented)):
            with patch.object(R, 'ARCHIVE_SIZE', len(raw)), patch.object(R, 'ARCHIVE_DIGEST', hashlib.sha256(raw).hexdigest()):
                with self.assertRaises(R.RecoveryError): R.extract_archive(raw)
    def test_missing_duplicate_json_and_surrogate_never_publish(self):
        for raw in (b'{"inventory":{},"inventory":{}}', b'\xef\xbb\xbf{}', b'{}'):
            with self.assertRaises(R.RecoveryError): R.validate_receipt(raw, {})
    def test_authenticated_destination_and_redirect_policy_before_io(self):
        c = R.GitHub('opaque-test-fixture'); c.opener = Mock()
        for url in ('http://api.github.com/repos/' + R.REPO + '/x',
                    'https://api.github.com.evil.invalid/repos/' + R.REPO + '/x',
                    'https://api.github.com/repos/foreign/repo/x'):
            with self.assertRaisesRegex(R.RecoveryError, 'API_DESTINATION'):
                c.request(url, authenticated=True)
        c.opener.open.assert_not_called()
        for destination in ('https://x.blob.core.windows.net/a\nheader:x',
                            'https://x.blob.core.windows.net\\@evil.invalid/a',
                            'https://x.actions.githubusercontent.com:80/a',
                            'https://x.githubusercontent.com/a#fragment'):
            calls=[]
            def response(url, **kwargs):
                calls.append(kwargs)
                return destination
            with patch.object(c, 'request', side_effect=response), self.assertRaises(R.RecoveryError):
                c.job_log()
            self.assertEqual(len(calls), 1)
    def test_main_errors_emit_constant_code_without_exception_details(self):
        output=io.StringIO()
        with patch.object(R, 'GitHub', side_effect=ValueError('private-url-and-token')), contextlib.redirect_stderr(output):
            self.assertEqual(R.main(), 1)
        self.assertEqual(output.getvalue(), 'TOPOLOGY_RECOVERY_FAILED\n')

if __name__ == '__main__':
    unittest.main(verbosity=2)
