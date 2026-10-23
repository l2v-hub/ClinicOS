"""Replace exact synthetic QA session credentials; keep playable trace ZIPs and provenance."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import zipfile

TOKEN = re.compile(rb"sim\.([A-Za-z0-9_-]{20,450})\.([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])")


def session_tokens(data):
    tokens = set()
    for match in TOKEN.finditer(data):
        try:
            payload = match.group(1)
            claims = json.loads(base64.urlsafe_b64decode(payload + b"=" * (-len(payload) % 4)))
            if (claims.get("v") == 1 and claims.get("sub") in {
                "SIM-ADMIN", "SIM-SUPERVISOR-1", "SIM-DOCTOR-1", "SIM-NURSE-1", "SIM-OSS-1"
            } and isinstance(claims.get("iat"), int) and isinstance(claims.get("exp"), int)
                    and isinstance(claims.get("sid"), str)):
                tokens.add(match.group(0))
            else:
                raise ValueError("Unexpected signed session shape; publication refused")
        except (ValueError, TypeError, KeyError) as error:
            raise ValueError("Unexpected signed session shape; publication refused") from error
    return tokens


def redact(filename):
    before = filename.read_bytes()
    old_hash = hashlib.sha256(before).hexdigest()
    with zipfile.ZipFile(filename) as archive:
        assert archive.testzip() is None, "Original trace CRC failure"
        entries = [(info, archive.read(info)) for info in archive.infolist()]
        comment = archive.comment
    tokens = set().union(*(session_tokens(data) for _, data in entries))
    if not tokens:
        return {"path": str(filename), "sha256": old_hash, "tokensRemaining": 0, "changed": False}
    private = Path(tempfile.gettempdir()) / "clinicos-447-private-traces"
    private.mkdir(mode=0o700, exist_ok=True)
    original = private / (old_hash + ".zip")
    if not original.exists():
        shutil.copyfile(filename, original)
        original.chmod(0o600)
    counts = []
    temporary = filename.with_suffix(".sanitized.tmp")
    with zipfile.ZipFile(temporary, "w") as output:
        output.comment = comment
        for info, data in entries:
            original_data = data
            replacements = 0
            for token in tokens:
                count = data.count(token)
                if count:
                    marker = b"qa-session-redacted-" + hashlib.sha256(token).hexdigest()[:12].encode()
                    data = data.replace(token, marker)
                    replacements += count
            assert not session_tokens(data), "Live credential remains in sanitized trace"
            output.writestr(info, data)
            if replacements:
                counts.append({"entry": info.filename, "replacements": replacements})
            elif info.filename.endswith((".png", ".jpg", ".jpeg", ".woff2")):
                assert data == original_data, "Visual/font bytes must remain unchanged"
    with zipfile.ZipFile(temporary) as verified:
        assert verified.testzip() is None, "Sanitized trace CRC failure"
        assert len(verified.infolist()) == len(entries)
        for info in verified.infolist():
            assert not session_tokens(verified.read(info)), "Residual signed token"
    os.replace(temporary, filename)
    return {"path": str(filename), "originalSha256": old_hash,
            "sanitizedSha256": hashlib.sha256(filename.read_bytes()).hexdigest(),
            "sessionsRedacted": len(tokens), "entries": counts, "tokensRemaining": 0,
            "changed": True, "originalRetainedPrivateOutsideRepository": True}


target = Path(sys.argv[1]).resolve()
paths = sorted(target.rglob("*.zip")) if target.is_dir() else [target]
records = [redact(filename) for filename in paths]
report = {"policy": "exact synthetic session values only; no event or outcome removal",
          "zipValidation": "CRC and residual signed-token scan passed", "archives": records}
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(json.dumps(report, indent=2) + "\n")
else:
    print(json.dumps(report))
