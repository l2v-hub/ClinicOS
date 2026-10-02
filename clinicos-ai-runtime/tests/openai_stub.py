"""Local OpenAI-compatible stub (Responses API + audio transcriptions) for contract tests.

Lets the REAL OpenAI adapter + official SDK run end-to-end without a key or network cost:
point OPENAI_BASE_URL at http://127.0.0.1:<port>/v1. The "model" is emulated with the
deterministic router of the test provider, so routing results are comparable across providers.
Behaviour switch: StubServer.mode = ok | 429 | 401 | 500 | context | incomplete | refusal |
content_filter | slow | malformed. Records the requests it received (no content kept by callers).
"""
from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from clinicos_ai.models.providers.fake import route_for
from clinicos_ai.models.providers.mock import EMPTY_EXTRACTION, EMPTY_PLAN


def _input_text(body: dict) -> str:
    parts = []
    for message in body.get("input") or []:
        for part in message.get("content") or []:
            if part.get("type") == "input_text":
                parts.append(part.get("text", ""))
    return "\n".join(parts)


def _answer(prompt: str) -> str:
    if "SKILL_ROUTE_V1" in prompt:
        return json.dumps(route_for(prompt))
    if "ASSISTANT_PLAN_V1" in prompt:
        return json.dumps(EMPTY_PLAN)
    if "ASSISTANT_COMPOSE_V1" in prompt:
        return json.dumps({"answerText": "", "citedSources": []})
    return json.dumps(EMPTY_EXTRACTION)


class StubServer:
    def __init__(self) -> None:
        self.mode = "ok"
        self.requests: list[dict] = []
        stub = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):  # silence
                pass

            def _send(self, status: int, payload, raw: bytes | None = None):
                body = raw if raw is not None else json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):  # noqa: N802 — test introspection only
                if self.path == "/__requests":
                    return self._send(200, stub.requests)
                return self._send(404, {"error": "not found"})

            def do_POST(self):  # noqa: N802
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(length)
                model = None
                if self.path.endswith("/responses"):
                    try:
                        model = json.loads(raw or b"{}").get("model")
                    except ValueError:
                        model = None
                else:
                    import re as _re
                    found = _re.search(rb'name="model"\r\n\r\n([^\r]+)', raw or b"")
                    model = found.group(1).decode() if found else None
                prompt_text = ""
                if self.path.endswith("/responses"):
                    try:
                        prompt_text = _input_text(json.loads(raw or b"{}"))
                    except ValueError:
                        prompt_text = ""
                purpose = ("skill_route" if "SKILL_ROUTE_V1" in prompt_text else "plan" if "ASSISTANT_PLAN_V1" in prompt_text
                           else "compose" if "ASSISTANT_COMPOSE_V1" in prompt_text else "other")
                stub.requests.append({"path": self.path, "auth": self.headers.get("Authorization", ""),
                                      "requestId": self.headers.get("X-Request-Id"), "model": model,
                                      "purpose": purpose if self.path.endswith("/responses") else "stt"})
                mode = stub.mode
                if mode == "slow":
                    time.sleep(3)
                if mode == "429":
                    return self._send(429, {"error": {"message": "Rate limit reached", "type": "rate_limit_error"}})
                if mode == "401":
                    return self._send(401, {"error": {"message": "Incorrect API key provided", "type": "invalid_request_error"}})
                if mode == "500":
                    return self._send(500, {"error": {"message": "server error", "type": "server_error"}})
                if mode == "context":
                    return self._send(400, {"error": {"message": "context_length_exceeded: too many tokens",
                                                      "code": "context_length_exceeded", "type": "invalid_request_error"}})
                if mode == "malformed":
                    return self._send(200, None, raw=b"<html>not json</html>")
                if self.path.endswith("/audio/transcriptions"):
                    return self._send(200, {"text": "pressione 120 su 80",
                                            "usage": {"type": "duration", "seconds": 2}})
                body = json.loads(raw or b"{}")
                text = _answer(_input_text(body))
                content = [{"type": "output_text", "text": text, "annotations": []}]
                status, incomplete = "completed", None
                if mode == "incomplete":
                    status, incomplete = "incomplete", {"reason": "max_output_tokens"}
                if mode == "content_filter":
                    status, incomplete = "incomplete", {"reason": "content_filter"}
                if mode == "refusal":
                    content = [{"type": "refusal", "refusal": "Non posso aiutare."}]
                return self._send(200, {
                    "id": "resp_stub", "object": "response", "created_at": int(time.time()),
                    "model": body.get("model"), "status": status, "incomplete_details": incomplete,
                    "output": [{"type": "message", "id": "msg_stub", "role": "assistant",
                                "status": "completed", "content": content}],
                    "parallel_tool_calls": True, "tool_choice": "auto", "tools": [],
                    "usage": {"input_tokens": 120, "output_tokens": 15, "total_tokens": 135,
                              "input_tokens_details": {"cached_tokens": 40},
                              "output_tokens_details": {"reasoning_tokens": 5}},
                })

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.base_url = f"http://127.0.0.1:{self._server.server_address[1]}/v1"
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    def __enter__(self) -> "StubServer":
        self._thread.start()
        return self

    def __exit__(self, *exc) -> None:
        self._server.shutdown()
        self._server.server_close()
