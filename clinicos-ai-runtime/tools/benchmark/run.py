"""Provider-independent AI benchmark (Phase 9).

Runs the SAME fixtures through whatever provider the environment configures (AI_PROVIDER +
AI_MODEL_<ROLE>, STT_PROVIDER + STT_MODEL — or the legacy variables), using the real agent
functions. Comparing OpenAI vs Claude vs Gemini vs Azure vs local = run it twice with a different
configuration; the suite never changes.

    python -m tools.benchmark.run --suites command_parser,reasoning,summary,stt \
        --audio-dir ../scripts/voice/fixtures --out report.json

Measures per case and in aggregate: correctness (skill / intent / values / transcript), structured
output validity, latency, provider-reported tokens, normalized error codes. Fixtures are synthetic
(tools/benchmark/fixtures.json); nothing clinical leaves the machine except those synthetic texts.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import pathlib
import re
import statistics
import sys
import time
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from clinicos_ai.agents.assistant import run_assistant_compose, run_assistant_plan  # noqa: E402
from clinicos_ai.agents.skill_router import run_skill_route  # noqa: E402
from clinicos_ai.models.errors import RuntimeError_, ai_error_code  # noqa: E402
from clinicos_ai.models.registry import ModelRegistry  # noqa: E402
from clinicos_ai.voice import stt  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
INTENTS = {"allergies", "therapies", "vitals_range", "vitals_recent", "narrative_search", "document_search",
           "timeline", "appointments", "correlate", "patient_search", "refuse_clinical", "data_query", "unknown"}
VALUE_KEYS = ["pa", "spo2", "fc", "temperatura", "fr", "dtx", "o2", "coscienza"]
TOOL_SCHEMA = [{"name": n} for n in ("search_patients", "allergies", "therapies", "vitals_recent", "query_data")]


def _norm(text: str) -> list[str]:
    return re.findall(r"[a-zà-ù0-9]+", (text or "").lower())


def word_accuracy(expected: str, actual: str) -> float:
    """1 - WER (word-level Levenshtein), clamped to [0, 1]; both empty = 1."""
    ref, hyp = _norm(expected), _norm(actual)
    if not ref:
        return 1.0 if not hyp else 0.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h))
        prev = cur
    return max(0.0, 1 - prev[-1] / len(ref))


PACE_S = 0.0  # pause between provider calls (low-quota deployments); --pace-ms


async def _timed(coro):
    if PACE_S:
        await asyncio.sleep(PACE_S)
    t0 = time.monotonic()
    try:
        return await coro, None, int((time.monotonic() - t0) * 1000)
    except RuntimeError_ as ex:
        return None, ai_error_code(ex), int((time.monotonic() - t0) * 1000)


async def bench_command_parser(registry, cases, skills):
    out = []
    for case in cases:
        forbidden_ids = {case["skill"]} if case.get("forbiddenForRole") else set()
        available = [s for s in skills if s["id"] not in forbidden_ids]
        forbidden = [{"id": s["id"], "name": s["name"]} for s in skills if s["id"] in forbidden_ids]
        res, code, ms = await _timed(run_skill_route(registry, case["message"], available, None,
                                                     date.today().isoformat(), VALUE_KEYS, forbidden=forbidden))
        route = (res or {}).get("route") or {}
        checks = {"skill": route.get("skillId") == case.get("skill")}
        for key in ("values",):
            if key in case:
                checks[key] = all(str(route.get(key, {}).get(k, "")).replace(" ", "") == v for k, v in case[key].items())
        if case.get("currentPatient"):
            checks["currentPatient"] = route.get("currentPatient") is True
        for key in ("patientQuery", "query", "text"):
            if key in case:
                checks[key] = case[key].lower() in str(route.get(key, "")).lower()
        out.append({"id": case["id"], "ok": code is None and all(checks.values()), "valid": code is None,
                    "checks": checks, "error": code, "ms": ms, "ai": (res or {}).get("ai")})
    return out


async def bench_reasoning(registry, cases):
    out = []
    for case in cases:
        res, code, ms = await _timed(run_assistant_plan(registry, case["question"], TOOL_SCHEMA))
        intent = ((res or {}).get("plan") or {}).get("intent")
        out.append({"id": case["id"], "ok": intent == case["intent"], "valid": code is None and intent in INTENTS,
                    "intent": intent, "error": code, "ms": ms, "ai": (res or {}).get("ai")})
    return out


async def bench_summary(registry, cases):
    out = []
    for case in cases:
        res, code, ms = await _timed(run_assistant_compose(registry, case["question"], case["results"], case["sources"]))
        cited = set((res or {}).get("citedSources") or [])
        grounded = cited <= set(case["sources"])
        answered = bool((res or {}).get("answerText"))
        out.append({"id": case["id"], "ok": code is None and grounded and (answered or not case["results"]),
                    "valid": code is None, "grounded": grounded, "answered": answered, "error": code, "ms": ms,
                    "ai": (res or {}).get("ai")})
    return out


async def bench_stt(cases, audio_dir: pathlib.Path):
    out = []
    for case in cases:
        audio = (audio_dir / case["file"]).read_bytes()
        t0 = time.monotonic()
        try:
            result = await stt.transcribe(audio, "audio/wav", "it-IT")
            acc = word_accuracy(case["expected"], result.text)
            out.append({"id": case["id"], "ok": acc >= 0.8, "valid": True, "accuracy": round(acc, 3),
                        "transcript": result.text, "ms": int((time.monotonic() - t0) * 1000),
                        "ai": {"provider": result.provider, "model": result.model, "usage": result.usage}})
        except stt.SttError as ex:
            out.append({"id": case["id"], "ok": False, "valid": False, "error": ex.kind,
                        "ms": int((time.monotonic() - t0) * 1000)})
    return out


def summarize(rows):
    ms = [r["ms"] for r in rows if r.get("ms") is not None]
    tokens_in = sum((((r.get("ai") or {}).get("usage") or {}).get("input_tokens") or ((r.get("ai") or {}).get("usage") or {}).get("inputTokens") or 0) for r in rows)
    tokens_out = sum((((r.get("ai") or {}).get("usage") or {}).get("output_tokens") or ((r.get("ai") or {}).get("usage") or {}).get("outputTokens") or 0) for r in rows)
    errors: dict[str, int] = {}
    for r in rows:
        if r.get("error"):
            errors[r["error"]] = errors.get(r["error"], 0) + 1
    return {"cases": len(rows), "correct": sum(r["ok"] for r in rows),
            "accuracyPct": round(100 * sum(r["ok"] for r in rows) / max(1, len(rows)), 1),
            "validityPct": round(100 * sum(r["valid"] for r in rows) / max(1, len(rows)), 1),
            "latencyMsP50": int(statistics.median(ms)) if ms else None,
            "latencyMsMax": max(ms) if ms else None,
            "inputTokens": tokens_in, "outputTokens": tokens_out, "errors": errors}


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suites", default="command_parser,reasoning,summary,stt")
    parser.add_argument("--fixtures", default=str(HERE / "fixtures.json"))
    parser.add_argument("--audio-dir", default=str(ROOT.parent / "scripts" / "voice" / "fixtures"))
    parser.add_argument("--out", default="")
    parser.add_argument("--pace-ms", type=int, default=0)
    args = parser.parse_args()
    global PACE_S
    PACE_S = max(0, args.pace_ms) / 1000
    fixtures = json.loads(pathlib.Path(args.fixtures).read_text(encoding="utf-8"))
    skills = json.loads((HERE / "skills.json").read_text(encoding="utf-8"))
    registry = ModelRegistry()
    status = registry.public_status()
    report = {"config": {"mode": status["mode"], "provider": status["provider"],
                         "roles": {k: v["model"] for k, v in status["roles"].items()},
                         "stt": stt.stt_status()}, "suites": {}}
    suites = [s.strip() for s in args.suites.split(",") if s.strip()]
    for suite in suites:
        if suite == "command_parser":
            rows = await bench_command_parser(registry, fixtures["command_parser"], skills)
        elif suite == "reasoning":
            rows = await bench_reasoning(registry, fixtures["reasoning"])
        elif suite == "summary":
            rows = await bench_summary(registry, fixtures["summary"])
        elif suite == "stt":
            rows = await bench_stt(fixtures["stt"], pathlib.Path(args.audio_dir))
        else:
            raise SystemExit(f"suite sconosciuta: {suite}")
        report["suites"][suite] = {"summary": summarize(rows), "cases": rows}
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")
    print(json.dumps({"config": report["config"], **{k: v["summary"] for k, v in report["suites"].items()}},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
