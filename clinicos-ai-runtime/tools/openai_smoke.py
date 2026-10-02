"""OpenAI Direct smoke test (Phase 9B §16–17) — server-side, never prints the key.

    # on Railway (real):   railway run --service clinicos-ai-runtime --environment production -- \
    #                          python -m tools.openai_smoke --audio-dir ../scripts/voice/fixtures
    # locally vs stub:     OPENAI_BASE_URL=http://127.0.0.1:8811/v1 … python -m tools.openai_smoke

Checks: provider config visible; OPENAI_API_KEY present (length only); registry → OpenAI adapter;
FAST/COMMAND_PARSER/REASONING models resolved from config; one tiny Responses API call with usage;
STT: Italian numbers/units fixture, empty audio, invalid format, timeout; the key never appears in
any log line captured during the run. Exit code 0 only if every check passes.
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import logging
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from clinicos_ai.models.contract import AIRequest, ModelRole, generate  # noqa: E402
from clinicos_ai.models.errors import RuntimeError_, ai_error_code  # noqa: E402
from clinicos_ai.models.registry import ModelRegistry  # noqa: E402
from clinicos_ai.models.validation import validate_ai_config  # noqa: E402
from clinicos_ai.voice import stt  # noqa: E402

RESULTS: list[dict] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append({"check": name, "ok": bool(ok), "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'} {name} {detail}", flush=True)


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-dir", default=str(ROOT.parent / "scripts" / "voice" / "fixtures"))
    parser.add_argument("--out", default="")
    args = parser.parse_args()

    log_buffer = io.StringIO()
    handler = logging.StreamHandler(log_buffer)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()

    check("provider_is_openai", (os.environ.get("AI_PROVIDER") or "").lower() == "openai",
          f"AI_PROVIDER={os.environ.get('AI_PROVIDER')}")
    check("openai_key_present", bool(key), f"length={len(key)}")
    errors, warnings = validate_ai_config(os.environ)
    check("config_valid", not errors, "; ".join(errors)[:300])
    registry = ModelRegistry()
    roles = {k: v["model"] for k, v in registry.public_status()["roles"].items()}
    check("fast_model", roles.get("fast", "").startswith("openai:"), roles.get("fast", ""))
    check("command_parser_model", roles.get("command_parser", "").startswith("openai:"), roles.get("command_parser", ""))
    check("reasoning_model", roles.get("reasoning", "").startswith("openai:"), roles.get("reasoning", ""))
    built = registry.build("fast")
    check("registry_returns_openai_adapter", type(built.runner).__module__.endswith("providers.openai"),
          type(built.runner).__module__)
    try:
        resp = await generate(registry, AIRequest(ModelRole.FAST, "Rispondi esattamente con la parola: OK",
                                                  purpose="smoke"))
        check("responses_call", bool(resp.text.strip()) and resp.finish_reason == "completed",
              f"latencyMs={resp.latency_ms} answeredOK={'ok' in resp.text.lower()}")
        check("usage_collected", resp.usage.input_tokens > 0 and resp.usage.output_tokens > 0,
              json.dumps(resp.usage.to_dict()))
    except RuntimeError_ as ex:
        check("responses_call", False, ai_error_code(ex))

    status = stt.stt_status()
    check("stt_config", status["provider"] == "openai" and not status["realtime"]["enabled"],
          json.dumps(status))
    audio = (pathlib.Path(args.audio_dir) / "vitals-120-80.wav").read_bytes()
    try:
        result = await stt.transcribe(audio, "audio/wav", "it-IT")
        nums = re.findall(r"\d+", result.text)
        check("stt_italian_numbers", "120" in nums and "80" in nums, f"transcript_words={len(result.text.split())}")
        check("stt_usage", bool(result.usage), json.dumps(result.usage))
    except stt.SttError as ex:
        check("stt_italian_numbers", False, ex.kind)
    for name, payload, mime, expected in (("stt_empty_audio", b"", "audio/wav", "invalid_audio"),
                                          ("stt_invalid_format", b"RIFF", "text/plain", "invalid_audio")):
        try:
            await stt.transcribe(payload, mime, "it-IT")
            check(name, False, "accepted")
        except stt.SttError as ex:
            check(name, ex.kind == expected, ex.kind)
    base = os.environ.get("OPENAI_BASE_URL") or ""
    if re.search(r"//(127\.0\.0\.1|localhost)", base):
        RESULTS.append({"check": "stt_timeout", "ok": True, "detail": "skipped: loopback stub answers within 1 ms"})
        print("SKIP stt_timeout (loopback stub)", flush=True)
    else:
        try:
            await stt.transcribe(audio, "audio/wav", "it-IT", timeout_seconds=0.001)
            check("stt_timeout", False, "no timeout")
        except stt.SttError as ex:
            check("stt_timeout", ex.kind in ("timeout", "unavailable"), ex.kind)

    logging.getLogger().removeHandler(handler)
    check("key_not_in_logs", not key or key not in log_buffer.getvalue(), "")
    failed = [r for r in RESULTS if not r["ok"]]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} smoke checks passed", flush=True)
    if args.out:
        pathlib.Path(args.out).write_text(json.dumps({"results": RESULTS, "warnings": warnings}, indent=2),
                                          encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
