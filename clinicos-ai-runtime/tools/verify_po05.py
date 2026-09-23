"""Run runtime tests with external networking denied and emit source-bound evidence."""
from __future__ import annotations

import argparse
import hashlib
from importlib.metadata import version
import ipaddress
import json
from pathlib import Path
import platform
import socket
import subprocess
import sys
import time
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pattern", default="test_*.py")
    parser.add_argument("--output", default="docs/po05-validation.json")
    args = parser.parse_args()
    output = (ROOT / args.output).resolve()
    if not output.is_relative_to(ROOT / "docs"):
        raise ValueError("Evidence output must stay in runtime/docs")
    blocked = []

    def check(host):
        if host in (None, "localhost"):
            return
        try:
            if ipaddress.ip_address(host).is_loopback:
                return
        except ValueError:
            pass
        blocked.append("external connection blocked")
        raise AssertionError("PO05 tests prohibit external network connections")

    original_resolve = socket.getaddrinfo
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def resolve(host, *a, **k):
        check(host)
        return original_resolve(host, *a, **k)

    def connect(sock, address):
        if isinstance(address, tuple):
            check(address[0])
        return original_connect(sock, address)

    def connect_ex(sock, address):
        if isinstance(address, tuple):
            check(address[0])
        return original_connect_ex(sock, address)

    started = time.monotonic()
    with patch.object(socket, "getaddrinfo", resolve), patch.object(socket.socket, "connect", connect), \
            patch.object(socket.socket, "connect_ex", connect_ex):
        suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern=args.pattern)
        result = unittest.TextTestRunner(verbosity=2).run(suite)
    sources = sorted([*ROOT.glob("clinicos_ai/**/*.py"), *ROOT.glob("tests/**/*.py"),
                      *ROOT.glob("tools/**/*.py"), ROOT / "requirements.txt"])
    contract = ROOT / "docs/po05-contract.md"
    if contract.exists():
        sources.append(contract)
    digests = {str(path.relative_to(ROOT)).replace("\\", "/"):
               hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
    passed = result.wasSuccessful() and not result.skipped and not blocked
    report = {
        "task": "PO05 runtime recovery", "outcome": "PASS" if passed else "FAIL",
        "baseline_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "source_binding": "SHA256 of complete runtime Python source/tests/tools plus requirements and contract; includes uncommitted files",
        "source_set_sha256": hashlib.sha256(json.dumps(digests, sort_keys=True).encode()).hexdigest(),
        "files": digests, "python": platform.python_version(),
        "docker_python_target": "3.11",
        "docker_python_target_executed": sys.version_info[:2] == (3, 11),
        "packages": {package: version(package) for package in ("fastapi", "pydantic", "uvicorn", "agno")},
        "test_pattern": args.pattern, "tests_run": result.testsRun,
        "failures": len(result.failures), "errors": len(result.errors), "skipped": len(result.skipped),
        "external_connections_attempted": len(blocked), "live_provider_calls": 0,
        "http": "Uvicorn and real HTTP client over 127.0.0.1 with fake extraction provider",
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "policy_receipts": ["sha256:239254bb9138438b8d52ca123e43cd323a38723340f2802ff39e07edb4409f4d",
                            "sha256:38e480e64e9d4f13a44d7280745791ae4af113c6f7ece2daa97a4fa712f7b7ab",
                            "sha256:26090556ca991cfb0947ae2785d8824153618e9891eaa16f7a074128df1a365f"],
        "limitations": ["Runtime identity is RAM-only and expires with retention/restart.",
                        "Provider calls can repeat after loss or timeout; backend checkpoints prevent application duplicates.",
                        "Cancellation stops the asyncio task and blocks late publication; synchronous provider calls can continue until timeout.",
                        "No live provider, production, deployment, or performance benchmark validation."],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PO05 {report['outcome']}: {result.testsRun} tests; source {report['source_set_sha256']}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
