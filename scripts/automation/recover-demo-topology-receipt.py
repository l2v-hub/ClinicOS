#!/usr/bin/env python3
"""Recover one original metadata receipt. This is not deployment authorization."""
import datetime as dt
import hashlib
import io
import json
import os
import re
import stat
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import zlib

REPO = 'l2v-hub/ClinicOS'
REPO_ID = 1256069551
RUN = 39150528800
ATTEMPT = 1
SOURCE_SHA = '729e6144b9d5a924874843ba264819d4bd1a6dca'
ARTIFACT = 12145555014
ARCHIVE_SIZE = 1237
ARCHIVE_DIGEST = '4fc7496c6b3280979c25b184317bdc79cd6b28505e27762105c1a8a29e44e9e8'
ARTIFACT_NAME = 'demo-source-topology-39150528800-1'
MEMBER = 'demo-source-topology-receipt.json'
PROJECT = 'bddf5d1b-ee83-4362-8238-a79721f795e5'
ENVIRONMENT = '8021987e-8eaa-4bc8-a102-20566db5e6b4'
SERVICE = 'c000f011-0349-4ea9-9b56-13c625b5767b'
DOMAIN = 'clinicos-backend-demo.up.railway.app'
MARKER = '<!-- clinicos:original-demo-topology:39150528800:1:12145555014 -->'
MAX_RECEIPT = 131072
MAX_COMMENT = 60000
CI_RUN = 39151482025
CI_JOB = 117746872227
CI_HEAD = '94fcaada4c224d3a3e472725c07a89b35c8dfe33'
CI_BRANCH = 'codex/standalone-pr-review'
CI_STEP = 'Test queue, sessions, evidence, budgets and release guards'
CI_COMMAND = 'node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs'
CI_MARKER = '<!-- clinicos:ci-fingerprints:39151482025:2:117746872227 -->'
MAX_LOG = 2097152
CI_TEST_FILES = {f'agent-team/tests/bug-pipeline/{name}.test.mjs' for name in (
    'comment-review-handoff', 'contracts', 'cron-install', 'dashboard', 'demo-deployment',
    'external-review', 'github', 'issue-review-communication', 'models', 'pipeline', 'release',
    'repository-settings', 'routing', 'setup-review', 'subscription-auth', 'windows-review',
    'workflow-intake', 'workspace', 'attempt-budget', 'standalone-review-contracts', 'standalone-review')}
CI_TEST_FILES.add('scripts/quality-gate/claude-bug-review.test.mjs')
ID = r'[A-Za-z0-9][A-Za-z0-9_:/+=.\-]{0,199}'
NAME = r'[A-Za-z0-9][A-Za-z0-9 ._\-]{0,79}'
REPOSITORY = r'[A-Za-z0-9_.\-]{1,100}/[A-Za-z0-9_.\-]{1,100}'
ROOT = r'/?[A-Za-z0-9._/\-]{0,256}'
BRANCH = r'[A-Za-z0-9][A-Za-z0-9._/\-]{0,199}'
SECRET = re.compile(r'gh[pousr]_|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_\-]{10,}\.')


class RecoveryError(Exception):
    """Only constant diagnostic codes may cross the console boundary."""


def require(condition, code='INVALID_METADATA'):
    if not condition:
        raise RecoveryError(code)


def exact(value, expected):
    require(type(value) is type(expected) and value == expected)
    return value


def keys(value, names):
    require(type(value) is dict and set(value) == set(names.split()))


def text(value, pattern=ID, nullable=False):
    if nullable and value is None:
        return None
    require(type(value) is str and re.fullmatch(pattern, value) is not None)
    require(not SECRET.search(value))
    return value


def boolean(value):
    require(type(value) is bool)
    return value


def integer(value, low, high):
    require(type(value) is int and low <= value <= high)
    return value


def array(value, maximum):
    require(type(value) is list and len(value) <= maximum)
    return value


def unique(values, field='id'):
    require(len({item[field] for item in values}) == len(values))
    return values


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def digest(value):
    return hashlib.sha256(compact(value).encode()).hexdigest()


def parse_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'DUPLICATE_JSON_KEY')
            result[key] = value
        return result
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                          parse_constant=lambda _: require(False, 'INVALID_JSON'))
    except (UnicodeError, ValueError, RecursionError):
        raise RecoveryError('INVALID_JSON') from None


def timestamp(value):
    text(value, r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z')
    try:
        return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise RecoveryError('INVALID_TIMESTAMP') from None


def trigger(value, environment, services, scoped=False):
    keys(value, 'id projectId environmentId serviceId repository provider branch checkSuites baseEnvironmentOverrideId')
    # Property order matches the original JS serializer for each inventory.
    result = {'id': text(value['id'])}
    if scoped:
        result['provider'] = text(value['provider'], NAME)
        require(result['provider'].lower() == 'github')
    result.update(projectId=exact(value['projectId'], PROJECT),
                  environmentId=exact(value['environmentId'], environment),
                  serviceId=text(value['serviceId']))
    require(result['serviceId'] in services)
    result['repository'] = text(value['repository'], REPOSITORY)
    if scoped:
        exact(result['repository'], REPO)
        exact(result['serviceId'], SERVICE)
    else:
        result['provider'] = text(value['provider'], NAME)
    result.update(branch=text(value['branch'], BRANCH),
                  checkSuites=boolean(value['checkSuites']),
                  baseEnvironmentOverrideId=text(value['baseEnvironmentOverrideId'], nullable=True))
    return result


def inventory(value):
    keys(value, 'projectId environments services scopedInventory scopedInventorySha256 paginationComplete allVisibleEnvironmentsAccessible observedConstraints credentialScope projectWideVisibility serviceConnectAllowed refusalReason')
    exact(value['projectId'], PROJECT)
    services = []
    for item in array(value['services'], 100):
        keys(item, 'id name projectId')
        services.append({'id': text(item['id']), 'name': text(item['name'], NAME),
                         'projectId': exact(item['projectId'], PROJECT)})
    unique(services)
    service_ids = {item['id'] for item in services}
    require(SERVICE in service_ids)
    environments = []
    for item in array(value['environments'], 32):
        keys(item, 'id projectId name canAccess isEphemeral sourceEnvironmentId instances triggers')
        env = {'id': text(item['id']), 'projectId': exact(item['projectId'], PROJECT),
               'name': text(item['name'], NAME), 'canAccess': boolean(item['canAccess']),
               'isEphemeral': boolean(item['isEphemeral']),
               'sourceEnvironmentId': text(item['sourceEnvironmentId'], nullable=True),
               'instances': None, 'triggers': None}
        if env['canAccess']:
            instances = []
            for instance in array(item['instances'], 400):
                keys(instance, 'id serviceId environmentId repository rootDirectory')
                require(text(instance['serviceId']) in service_ids)
                instances.append({'id': text(instance['id']), 'serviceId': text(instance['serviceId']),
                                  'environmentId': exact(instance['environmentId'], env['id']),
                                  'repository': text(instance['repository'], REPOSITORY, nullable=True),
                                  'rootDirectory': text(instance['rootDirectory'], ROOT, nullable=True)})
            env['instances'] = unique(instances)
            unique(instances, 'serviceId')
            env['triggers'] = unique([trigger(t, env['id'], service_ids)
                                      for t in array(item['triggers'], 400)])
        else:
            exact(item['instances'], None)
            exact(item['triggers'], None)
        environments.append(env)
    unique(environments)
    demo = next((env for env in environments if env['id'] == ENVIRONMENT), None)
    require(demo is not None and demo['name'] == 'demo' and demo['canAccess'])
    scoped = value['scopedInventory']
    keys(scoped, 'schemaVersion projectId environmentId environmentName serviceId repository rootDirectory domains triggers hasMoreTriggers')
    domains = []
    for item in array(scoped['domains'], 64):
        keys(item, 'kind domain')
        require(item['kind'] in ('serviceDomains', 'customDomains'))
        domains.append({'kind': item['kind'], 'domain': text(item['domain'], r'[a-z0-9](?:[a-z0-9.\-]{0,251}[a-z0-9])?')})
    require(any(item['domain'] == DOMAIN for item in domains))
    require(all(sum(item['kind'] == kind for item in domains) <= 32
                for kind in ('serviceDomains', 'customDomains')))
    projected = {'schemaVersion': exact(scoped['schemaVersion'], 1),
                 'projectId': exact(scoped['projectId'], PROJECT),
                 'environmentId': exact(scoped['environmentId'], ENVIRONMENT),
                 'environmentName': exact(scoped['environmentName'], 'demo'),
                 'serviceId': exact(scoped['serviceId'], SERVICE),
                 'repository': exact(scoped['repository'], REPO),
                 'rootDirectory': text(scoped['rootDirectory'], ROOT, nullable=True),
                 'domains': domains,
                 'triggers': unique([trigger(t, ENVIRONMENT, service_ids, scoped=True)
                                     for t in array(scoped['triggers'], 2)]),
                 'hasMoreTriggers': exact(scoped['hasMoreTriggers'], False)}
    instance = next((i for i in demo['instances'] if i['serviceId'] == SERVICE), None)
    require(instance is not None and instance['repository'] == REPO
            and instance['rootDirectory'] == projected['rootDirectory'])
    require([t for t in demo['triggers'] if t['serviceId'] == SERVICE] == projected['triggers'])
    exact(value['scopedInventorySha256'], digest(projected))
    constraints = []
    if any(env['id'] != ENVIRONMENT for env in environments):
        constraints.append('OTHER_VISIBLE_ENVIRONMENTS')
    if any(not env['canAccess'] for env in environments):
        constraints.append('INACCESSIBLE_VISIBLE_ENVIRONMENTS')
    if any(env['isEphemeral'] or env['sourceEnvironmentId'] is not None for env in environments):
        constraints.append('FORKED_OR_EPHEMERAL_ENVIRONMENTS')
    if not projected['triggers']:
        constraints.append('MISSING_TARGET_TRIGGER')
    return {'projectId': PROJECT, 'environments': environments, 'services': services,
            'scopedInventory': projected, 'scopedInventorySha256': digest(projected),
            'paginationComplete': exact(value['paginationComplete'], True),
            'allVisibleEnvironmentsAccessible': exact(value['allVisibleEnvironmentsAccessible'], all(e['canAccess'] for e in environments)),
            'observedConstraints': exact(value['observedConstraints'], constraints),
            'credentialScope': exact(value['credentialScope'], 'project-environment'),
            'projectWideVisibility': exact(value['projectWideVisibility'], 'unproven'),
            'serviceConnectAllowed': exact(value['serviceConnectAllowed'], False),
            'refusalReason': exact(value['refusalReason'], 'PROJECT_WIDE_VISIBILITY_UNPROVEN')}


def validate_receipt(raw, run, forbidden=()):
    require(len(raw) <= MAX_RECEIPT, 'RECEIPT_SIZE')
    value = parse_json(raw)
    keys(value, 'schemaVersion repository reviewedSha runId runAttempt capturedAt operation outcome inventory inventorySha256 readRequests')
    projected = inventory(value['inventory'])
    captured = timestamp(value['capturedAt'])
    require(timestamp(run['created_at']) <= captured <= timestamp(run['updated_at']))
    result = {'schemaVersion': exact(value['schemaVersion'], 1),
              'repository': exact(value['repository'], REPO),
              'reviewedSha': exact(value['reviewedSha'], SOURCE_SHA),
              'runId': exact(value['runId'], str(RUN)),
              'runAttempt': exact(value['runAttempt'], str(ATTEMPT)),
              'capturedAt': value['capturedAt'], 'operation': exact(value['operation'], 'inspect'),
              'outcome': exact(value['outcome'], 'inspected-visibility-unproven'),
              'inventory': projected, 'inventorySha256': exact(value['inventorySha256'], digest(projected)),
              'readRequests': integer(value['readRequests'], 1, 200)}
    output = compact(result)
    require(not SECRET.search(output) and not any(s and s in output for s in forbidden), 'UNSAFE_RECEIPT')
    return result


def extract_archive(raw):
    require(len(raw) == ARCHIVE_SIZE and hashlib.sha256(raw).hexdigest() == ARCHIVE_DIGEST, 'ARCHIVE_DIGEST')
    try:
        # Reject prefixes, trailing bytes, archive comments and ZIP64/multi-disk records.
        require(raw.startswith(b'PK\x03\x04') and raw[-22:-18] == b'PK\x05\x06', 'ZIP_STRUCTURE')
        disk, directory_disk, entries_disk, entries, directory_size, offset, comment = struct.unpack('<HHHHIIH', raw[-18:])
        require((disk, directory_disk, entries_disk, entries, comment) == (0, 0, 1, 1, 0)
                and offset + directory_size == len(raw) - 22, 'ZIP_STRUCTURE')
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            members = archive.infolist()
            require(len(members) == 1, 'ZIP_MEMBERS')
            member = members[0]
            mode = member.external_attr >> 16
            require(member.filename == MEMBER and member.orig_filename == MEMBER
                    and member.header_offset == 0 and not member.is_dir()
                    and (not stat.S_IFMT(mode) or stat.S_ISREG(mode))
                    and not member.flag_bits & ~0x80E and not member.extra and not member.comment
                    and member.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'ZIP_MEMBER')
            require(0 < member.file_size <= MAX_RECEIPT and 0 < member.compress_size <= ARCHIVE_SIZE
                    and member.file_size <= member.compress_size * 200, 'ZIP_SIZE')
            # Account for every byte, including a streaming uploader's data descriptor.
            # A hidden local entry or gap must not pass just because the central directory omits it.
            local = struct.unpack('<IHHHHHIIIHH', raw[:30])
            require(local[2] == member.flag_bits and local[3] == member.compress_type
                    and local[9] == len(MEMBER) and local[10] == 0
                    and raw[30:30 + local[9]] == MEMBER.encode()
                    and directory_size == 46 + len(MEMBER), 'ZIP_STRUCTURE')
            data_end = 30 + local[9] + member.compress_size
            sizes = (member.CRC, member.compress_size, member.file_size)
            if member.flag_bits & 8:
                descriptor = raw[data_end:offset]
                expected = struct.pack('<III', *sizes)
                require(descriptor in (expected, b'PK\x07\x08' + expected), 'ZIP_STRUCTURE')
                require(local[6:9] in ((0, 0, 0), sizes), 'ZIP_STRUCTURE')
            else:
                require(data_end == offset and local[6:9] == sizes, 'ZIP_STRUCTURE')
            with archive.open(member) as stream:
                receipt = stream.read(MAX_RECEIPT + 1)  # zipfile verifies CRC at EOF.
            require(len(receipt) == member.file_size, 'ZIP_SIZE')
            return receipt
    except (zipfile.BadZipFile, OSError, ValueError, RuntimeError, EOFError, NotImplementedError,
            struct.error, zlib.error):
        raise RecoveryError('INVALID_ZIP') from None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GitHub:
    def __init__(self, token):
        require(type(token) is str and bool(token), 'TOKEN_MISSING')
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, url, authenticated=False, data=None, redirect=False, limit=2097152):
        stage = 'API' if authenticated else 'STORAGE'
        def http_failure(status):
            require(type(status) is int and 100 <= status <= 599, stage + '_HTTP_STATUS_INVALID')
            raise RecoveryError(stage + '_HTTP_' + str(status))
        headers = {'User-Agent': 'ClinicOS-original-topology-recovery'}
        if authenticated:
            require(url.startswith(f'https://api.github.com/repos/{REPO}/'), 'API_DESTINATION')
            headers.update(Authorization=f'Bearer {self.token}', Accept='application/vnd.github+json',
                           **{'X-GitHub-Api-Version': '2022-11-28'})
        if data is not None:
            headers['Content-Type'] = 'application/json'
        try:
            request = urllib.request.Request(url, headers=headers, data=data)
            try:
                response = self.opener.open(request, timeout=30)
            except urllib.error.HTTPError as error:
                if redirect and type(error.code) is int and error.code == 302:
                    with error:
                        return error.headers.get('Location')
                with error:
                    http_failure(error.code)
            with response:
                if redirect or type(response.status) is not int or response.status not in (200, 201):
                    http_failure(response.status)
                raw = response.read(limit + 1)
                require(len(raw) <= limit, 'HTTP_SIZE')
                return raw
        except (urllib.error.URLError, OSError, ValueError):
            raise RecoveryError(stage + '_HTTP_FAILED') from None

    def api(self, route, data=None):
        raw = self.request(f'https://api.github.com/repos/{REPO}/{route}', authenticated=True,
                           data=None if data is None else compact(data).encode())
        return parse_json(raw)

    def download(self, route, limit):
        destination = self.request(f'https://api.github.com/repos/{REPO}/{route}',
                                   authenticated=True, redirect=True)
        try:
            url = urllib.parse.urlsplit(destination)
            require(url.scheme == 'https' and not url.username and not url.password
                    and url.port in (None, 443) and not url.fragment
                    and not re.search(r'[\s\\]', destination)
                    and any(url.hostname.endswith(suffix) for suffix in
                            ('.blob.core.windows.net', '.actions.githubusercontent.com', '.githubusercontent.com')),
                    'STORAGE_DESTINATION')
        except (TypeError, ValueError, AttributeError):
            raise RecoveryError('STORAGE_DESTINATION') from None
        # Never forward the GitHub credential, log the signed URL, or follow another redirect.
        return self.request(destination, limit=limit)

    def archive(self):
        return self.download(f'actions/artifacts/{ARTIFACT}/zip', ARCHIVE_SIZE)

    def job_log(self):
        return self.download(f'actions/jobs/{CI_JOB}/logs', MAX_LOG)


def validate_run(run):
    for key, expected in {'id': RUN, 'run_attempt': ATTEMPT, 'head_sha': SOURCE_SHA,
                          'head_branch': 'main', 'status': 'completed', 'conclusion': 'success',
                          'event': 'workflow_dispatch', 'path': '.github/workflows/inspect-demo-source-topology.yml'}.items():
        exact(run.get(key), expected)
    for field in ('repository', 'head_repository'):
        exact(run.get(field, {}).get('full_name'), REPO)
        exact(run[field].get('id'), REPO_ID)
    require(timestamp(run['created_at']) <= timestamp(run['updated_at']))


def validate_artifact(value):
    require(value.get('expired') is not True, 'ARTIFACT_EXPIRED')
    for key, expected in {'id': ARTIFACT, 'name': ARTIFACT_NAME, 'expired': False,
                          'size_in_bytes': ARCHIVE_SIZE, 'digest': 'sha256:' + ARCHIVE_DIGEST}.items():
        exact(value.get(key), expected)
    for key, expected in {'id': RUN, 'head_sha': SOURCE_SHA, 'head_branch': 'main',
                          'repository_id': REPO_ID, 'head_repository_id': REPO_ID}.items():
        exact(value.get('workflow_run', {}).get(key), expected)


def context(env):
    exact(env.get('GITHUB_EVENT_NAME'), 'workflow_dispatch')
    exact(env.get('GITHUB_REPOSITORY'), REPO)
    exact(env.get('GITHUB_REF'), 'refs/heads/main')
    sha = text(env.get('GITHUB_SHA'), r'[a-f0-9]{40}')
    exact(env.get('RECOVERY_REVIEWED_SHA'), sha)
    return sha


def fresh_main(client, sha):
    value = client.api('git/ref/heads/main')
    exact(value.get('ref'), 'refs/heads/main')
    exact(value.get('object', {}).get('type'), 'commit')
    current = text(value['object'].get('sha'), r'[a-f0-9]{40}')
    require(current == sha, 'MAIN_MOVED')


def validate_ci_provenance(run, job):
    for key, expected in {'id': CI_RUN, 'run_attempt': 2, 'head_sha': CI_HEAD,
                          'head_branch': CI_BRANCH, 'status': 'completed', 'conclusion': 'failure',
                          'event': 'pull_request', 'path': '.github/workflows/bug-pipeline-tests.yml'}.items():
        exact(run.get(key), expected)
    for field in ('repository', 'head_repository'):
        exact(run.get(field, {}).get('full_name'), REPO)
        exact(run[field].get('id'), REPO_ID)
    for key, expected in {'id': CI_JOB, 'run_id': CI_RUN, 'run_attempt': 2, 'head_sha': CI_HEAD,
                          'name': 'bug-pipeline-tests', 'status': 'completed', 'conclusion': 'failure'}.items():
        exact(job.get(key), expected)
    steps = array(job.get('steps'), 30)
    failed = [step for step in steps if step.get('conclusion') == 'failure']
    require(len(failed) == 1, 'CI_FAILED_STEP')
    exact(failed[0].get('name'), CI_STEP)
    exact(failed[0].get('status'), 'completed')
    integer(failed[0].get('number'), 1, 30)
    require(timestamp(run['created_at']) <= timestamp(job['started_at'])
            <= timestamp(failed[0]['started_at']) <= timestamp(failed[0]['completed_at'])
            <= timestamp(job['completed_at']) <= timestamp(run['updated_at']), 'CI_TIMES')


def parse_ci_log(raw):
    require(0 < len(raw) <= MAX_LOG, 'LOG_SIZE')
    if raw.startswith(b'\x1f\x8b'):
        try:
            inflater = zlib.decompressobj(16 + zlib.MAX_WBITS)
            decoded = inflater.decompress(raw, MAX_LOG + 1)
            require(len(decoded) <= MAX_LOG and inflater.eof and not inflater.unused_data
                    and not inflater.unconsumed_tail, 'LOG_EXPANSION')
        except zlib.error:
            raise RecoveryError('LOG_COMPRESSION') from None
    else:
        decoded = raw
    try:
        contents = decoded.decode('utf-8')
    except UnicodeError:
        raise RecoveryError('LOG_ENCODING') from None
    if contents.startswith('\ufeff'):
        contents = contents[1:]  # Exactly one leading UTF-8 BOM; never strip interior BOMs.
    require(all(len(line.encode()) <= 8192 for line in contents.splitlines()), 'LOG_LINE_SIZE')
    sgr = re.compile(r'\x1b\[[0-9;]{0,64}m')
    require(sum(1 for _ in sgr.finditer(contents)) <= 4096, 'LOG_SGR_LIMIT')
    contents = sgr.sub('', contents)
    # SGR is formatting only. Never interpret cursor movement, OSC or other controls.
    require(not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\ufeff]|\r(?!\n)', contents), 'LOG_CONTROL')
    source_lines = contents.splitlines()
    require(0 < len(source_lines) <= 30000, 'LOG_LINES')
    lines = []
    for line in source_lines:
        require(len(line.encode()) <= 8192, 'LOG_LINE_SIZE')
        match = re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z (.*)', line)
        require(match is not None, 'LOG_TIMESTAMP')
        lines.append(match[1])
    start = '##[group]Run ' + CI_COMMAND
    require(lines.count(start) == 1, 'LOG_STEP')
    first = lines.index(start)
    endings = [i for i in range(first + 1, len(lines))
               if lines[i] == '##[error]Process completed with exit code 1.']
    require(len(endings) == 1, 'LOG_STEP')
    lines = lines[first + 1:endings[0]]
    require(not any(line.startswith('##[group]Run ') for line in lines), 'LOG_STEP')
    fingerprints = []
    counts = {}
    allowed_codes = {'ERR_ASSERTION', 'ERR_TEST_FAILURE', 'ERR_INVALID_ARG_TYPE',
                     'ERR_MODULE_NOT_FOUND', 'ENOENT', 'EACCES', 'ETIMEDOUT'}
    allowed_operators = {'strictEqual', 'deepStrictEqual', 'equal', 'deepEqual', 'notStrictEqual',
                         'notDeepStrictEqual', 'notEqual', 'notDeepEqual', 'match', 'doesNotMatch',
                         'throws', 'doesNotThrow', 'rejects', 'doesNotReject', 'ifError', 'fail', 'ok'}
    allowed_types = {'testCodeFailure', 'subtestsFailed', 'hookFailed', 'cancelledByParent',
                     'testTimeoutFailure', 'testAborted', 'uncaughtException', 'unhandledRejection'}
    for index, line in enumerate(lines):
        summary = re.fullmatch(r'# (tests|pass|fail|cancelled|skipped|todo) (\d{1,5})', line)
        if summary:
            require(summary[1] not in counts, 'LOG_SUMMARY')
            counts[summary[1]] = integer(int(summary[2]), 0, 20000)
        match = re.fullmatch(r'( *)not ok (\d{1,5}) - (.{1,2048})', line)
        if not match:
            continue
        require(len(fingerprints) < 32 and len(match[1]) <= 16, 'LOG_FAILURE_LIMIT')
        indent = match[1] + '  '
        require(index + 1 < len(lines) and lines[index + 1] == indent + '---', 'LOG_FAILURE_BLOCK')
        fields = {}
        end = False
        for entry in lines[index + 2:index + 202]:
            if entry == indent + '...':
                end = True
                break
            field = re.fullmatch(re.escape(indent) + r'(location|code|operator|failureType): (.+)', entry)
            if field:
                require(field[1] not in fields, 'LOG_DUPLICATE_FIELD')
                fields[field[1]] = field[2]
        require(end and 'location' in fields, 'LOG_FAILURE_BLOCK')
        location = fields['location']
        if len(location) >= 2 and location[0] == location[-1] and location[0] in "'\"":
            location = location[1:-1]
        for prefix in ('file:///home/runner/work/ClinicOS/ClinicOS/', '/home/runner/work/ClinicOS/ClinicOS/'):
            if location.startswith(prefix):
                location = location[len(prefix):]
                break
        location_match = re.fullmatch(r'(agent-team/tests/bug-pipeline/[A-Za-z0-9][A-Za-z0-9_\-]*\.test\.mjs|scripts/quality-gate/claude-bug-review\.test\.mjs):([1-9]\d{0,5}):([1-9]\d{0,4})', location)
        require(location_match is not None, 'LOG_LOCATION')
        require(location_match[1] in CI_TEST_FILES, 'LOG_LOCATION')
        def enum(field, allowed):
            item = fields.get(field)
            if item is None:
                return 'UNREPORTED'
            if len(item) >= 2 and item[0] == item[-1] and item[0] in "'\"":
                item = item[1:-1]
            return item if item in allowed else 'OTHER'
        fingerprints.append({'testTitleSha256': hashlib.sha256(match[3].encode()).hexdigest(),
            'location': location_match[1] + ':' + location_match[2],
            'errorCode': enum('code', allowed_codes), 'operator': enum('operator', allowed_operators),
            'failureType': enum('failureType', allowed_types)})
    require(set(counts) == {'tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'}
            and counts['fail'] == len(fingerprints) > 0
            and counts['tests'] == sum(value for key, value in counts.items() if key != 'tests'), 'LOG_SUMMARY')
    require(len({(f['testTitleSha256'], f['location']) for f in fingerprints}) == len(fingerprints), 'LOG_DUPLICATE_FAILURE')
    return {'counts': counts, 'failures': fingerprints}


def ci_comment(client):
    run = client.api(f'actions/runs/{CI_RUN}/attempts/2')
    job = client.api(f'actions/jobs/{CI_JOB}')
    validate_ci_provenance(run, job)
    raw = client.job_log()
    report = parse_ci_log(raw)
    after_run = client.api(f'actions/runs/{CI_RUN}/attempts/2')
    after_job = client.api(f'actions/jobs/{CI_JOB}')
    validate_ci_provenance(after_run, after_job)
    require(run == after_run and job == after_job, 'CI_PROVENANCE_DRIFT')
    public = {'schemaVersion': 1, 'kind': 'fixed-ci-failure-fingerprints', 'repository': REPO,
              'runId': CI_RUN, 'runAttempt': 2, 'jobId': CI_JOB, 'headSha': CI_HEAD,
              'branch': CI_BRANCH, 'workflow': '.github/workflows/bug-pipeline-tests.yml',
              'job': 'bug-pipeline-tests', 'failedStep': CI_STEP,
              'precommittedLogDigest': 'unavailable', 'fetchedBytes': len(raw),
              'fetchedBytesSha256': hashlib.sha256(raw).hexdigest(), **report}
    return CI_MARKER + '\nFixed failed CI fingerprints; no precommitted log digest; not release authorization.\n```json\n' + compact(public) + '\n```'


def topology_comment(client, forbidden):
    run = client.api(f'actions/runs/{RUN}')
    validate_run(run)
    artifact = client.api(f'actions/artifacts/{ARTIFACT}')
    validate_artifact(artifact)
    raw = extract_archive(client.archive())
    receipt = validate_receipt(raw, run, forbidden)
    body = (MARKER + '\nOriginal read-only topology metadata; not deployment confirmation or release authorization.\n'
            + f'Original run: https://github.com/{REPO}/actions/runs/{RUN}\n'
            + f'Artifact: {ARTIFACT_NAME} (ID {ARTIFACT}); archive SHA-256: {ARCHIVE_DIGEST}\n'
            + f'Receipt bytes SHA-256: {hashlib.sha256(raw).hexdigest()}\n```json\n'
            + compact(receipt) + '\n```')
    return body


def recover(client, env, forbidden=()):
    sha = context(env)
    mode = env.get('RECOVERY_MODE', 'topology')
    require(type(mode) is str and mode in ('topology', 'ci-fingerprints'), 'INVALID_MODE')
    fresh_main(client, sha)
    if mode == 'topology':
        body, marker, target = topology_comment(client, forbidden), MARKER, 481
    else:
        body, marker, target = ci_comment(client), CI_MARKER, 492
    require(len(body.encode()) <= MAX_COMMENT, 'COMMENT_SIZE')
    require(not any(s and s in body for s in forbidden), 'UNSAFE_COMMENT')
    found = []
    for page in range(1, 11):
        comments = client.api(f'issues/{target}/comments?per_page=100&page={page}')
        require(type(comments) is list and len(comments) <= 100, 'COMMENTS_INVALID')
        for item in comments:
            require(type(item) is dict and type(item.get('body')) is str, 'COMMENTS_INVALID')
            if marker in item['body']:
                user = item.get('user')
                require(type(user) is dict and type(user.get('login')) is str
                        and type(user.get('type')) is str, 'COMMENTS_INVALID')
                if user['login'] != 'github-actions[bot]':
                    continue  # A public commenter cannot reserve the canonical bot marker.
                require(user['type'] == 'Bot' and item['body'] == body, 'COMMENT_CONFLICT')
                found.append(item)
        if len(comments) < 100:
            break
    else:
        raise RecoveryError('COMMENTS_LIMIT')
    require(len(found) <= 1, 'COMMENT_CONFLICT')
    fresh_main(client, sha)
    if found:
        return 'already-published'
    result = client.api(f'issues/{target}/comments', {'body': body})
    require(type(result) is dict and result.get('body') == body
            and result.get('user', {}).get('login') == 'github-actions[bot]', 'COMMENT_REPLY')
    return 'published'


def main():
    try:
        token = os.environ.get('GITHUB_TOKEN')
        result = recover(GitHub(token), os.environ, forbidden=(token,))
        print('TOPOLOGY_RECOVERY_' + result.upper().replace('-', '_'))
        return 0
    except RecoveryError as error:
        print('TOPOLOGY_RECOVERY_' + str(error), file=sys.stderr)
    except Exception:
        print('TOPOLOGY_RECOVERY_FAILED', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
