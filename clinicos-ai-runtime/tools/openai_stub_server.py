"""Standalone OpenAI-compatible stub (Responses + transcriptions) for process-level switch tests.

    python -m tools.openai_stub_server --port 8811      → base URL http://127.0.0.1:8811/v1

Same behaviour as tests/openai_stub.py (deterministic routing). No network, no key, no cost.
"""
from __future__ import annotations

import argparse
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))

from openai_stub import StubServer  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8811)
    args = parser.parse_args()
    server = StubServer()
    # rebind on the requested port
    server._server.server_close()
    from http.server import ThreadingHTTPServer

    server._server = ThreadingHTTPServer(("127.0.0.1", args.port), server._server.RequestHandlerClass)
    server.base_url = f"http://127.0.0.1:{args.port}/v1"
    import threading

    server._thread = threading.Thread(target=server._server.serve_forever, daemon=True)
    server._thread.start()
    print(f"openai stub on {server.base_url}", flush=True)
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
