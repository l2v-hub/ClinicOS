"""Milo fase 2 — il team di agenti gira davvero (Agno Team), senza un modello reale.

Due server locali:
  - un finto modello compatibile con il protocollo chat/completions: a ogni turno sceglie la mossa
    guardando gli strumenti che riceve (delega allo specialista → strumento → risposta finale);
  - un finto backend che espone /internal/ai/tools/<nome> e controlla token di servizio e delega.
Si verifica il ciclo completo: coordinatore → specialista → lettura dal backend con la delega →
risposta con fonti rinumerate. Nessuna rete esterna.
"""
from __future__ import annotations

import asyncio
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from clinicos_ai.agents import team as team_mod

GRANT = "g" * 43
TOKEN = "service-token-for-tests"
SOURCE = {"sourceType": "VITAL_SIGN", "patientId": "p1", "recordId": "r-1", "label": "Rilevazione parametri",
          "exactText": "pa 150/90", "recordedAt": "2026-11-21T08:00:00.000Z"}


def _serve(handler_cls):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_cls)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class Backend(BaseHTTPRequestHandler):
    calls: list = []

    def log_message(self, *a):  # silenzio nei test
        pass

    def do_POST(self):  # noqa: N802
        body = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)) or b"{}")
        ok = (self.headers.get("authorization") == f"Bearer {TOKEN}" and self.headers.get("x-ai-grant") == GRANT)
        Backend.calls.append({"path": self.path, "args": body.get("args"), "authorized": ok})
        if not ok:
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b'{"error":"Delega non valida"}')
            return
        out = {"data": [{"series": [{"key": "pa_sistolica", "min": 130, "max": 150, "change": 20}]}],
               "sourceRefs": [SOURCE], "truncated": False}
        payload = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(payload)


class FakeModel(BaseHTTPRequestHandler):
    """Risponde come un modello: delega, poi usa lo strumento, poi conclude citando [S1]."""

    seen_tools: list = []
    bodies: list = []

    def log_message(self, *a):
        pass

    def _reply(self, message: dict, finish: str):
        payload = {"id": "chatcmpl-test", "object": "chat.completion", "created": 0, "model": "fake",
                   "choices": [{"index": 0, "message": message, "finish_reason": finish}],
                   "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}
        data = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):  # noqa: N802
        req = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)))
        FakeModel.bodies.append(req)
        tools = {t["function"]["name"]: t["function"] for t in req.get("tools") or []}
        FakeModel.seen_tools.append(sorted(tools))
        answered = any(m.get("role") == "tool" for m in req.get("messages") or [])
        delegate = next((n for n in tools if "member" in n or "delegate" in n or "transfer" in n), None)
        if delegate and not answered:
            params = tools[delegate].get("parameters", {}).get("properties", {})
            args = {}
            for key in params:
                if "member" in key or key.endswith("id"):
                    args[key] = "clinico"
                elif "task" in key or "description" in key or "input" in key:
                    args[key] = "Andamento della pressione del paziente aperto negli ultimi 7 giorni"
                elif "output" in key:
                    args[key] = "Valori con fonti"
            self._reply({"role": "assistant", "content": None, "tool_calls": [
                {"id": "call_delegate", "type": "function",
                 "function": {"name": delegate, "arguments": json.dumps(args)}}]}, "tool_calls")
            return
        if "get_patient_parameters" in tools and not answered:
            self._reply({"role": "assistant", "content": None, "tool_calls": [
                {"id": "call_params", "type": "function",
                 "function": {"name": "get_patient_parameters", "arguments": json.dumps({"days": 7})}}]},
                "tool_calls")
            return
        self._reply({"role": "assistant",
                     "content": "La sistolica è salita da 130 a 150 mmHg in 7 giorni [S1]. Valore inventato [S9]."},
                    "stop")


class MiloTeamTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.backend = _serve(Backend)
        cls.model = _serve(FakeModel)

    @classmethod
    def tearDownClass(cls):
        cls.backend.shutdown()
        cls.model.shutdown()

    def _factory(self):
        from agno.models.openai.like import OpenAILike  # solo nel test: il codice usa la factory del registry

        base = f"http://127.0.0.1:{self.model.server_address[1]}"
        return lambda: OpenAILike(id="fake", base_url=base, api_key="x", max_retries=0)

    def _env(self):
        return {"AI_GATEWAY_URL": f"http://127.0.0.1:{self.backend.server_address[1]}",
                "AI_RUNTIME_SERVICE_TOKEN": TOKEN}

    def _req(self, **extra):
        schema = [{"name": "get_patient_parameters", "args": {"patientId": "string", "days": "number?"}},
                  {"name": "get_patient_news2", "args": {"patientId": "string", "days": "number?"}},
                  {"name": "query_staff_shifts", "args": {"date": "string?", "ruolo": "string?"}}]
        return {"question": "Come va la pressione?", "grant": GRANT, "toolSchema": schema, "today": "2026-11-23",
                "currentPatient": {"id": "p1", "label": "Rossi Mario"}, "history": [], "maxToolCalls": 6,
                **extra}

    def test_full_loop_coordinator_specialist_backend(self):
        Backend.calls.clear()
        out = asyncio.run(team_mod.run_milo_team(self._req(), self._factory(), timeout_seconds=30,
                                                 env=self._env()))
        # Il backend ha ricevuto una lettura autorizzata con la delega, sul paziente aperto di default.
        reads = [c for c in Backend.calls if c["path"] == "/internal/ai/tools/get_patient_parameters"]
        self.assertEqual(len(reads), 1)
        self.assertTrue(reads[0]["authorized"])
        self.assertEqual(reads[0]["args"], {"days": 7})
        # Citazione rinumerata; il riferimento a una fonte mai restituita è tolto.
        self.assertIn("[1]", out["answerText"])
        self.assertNotIn("[S", out["answerText"])
        self.assertNotIn("[9]", out["answerText"])
        self.assertEqual(out["citedSources"], [SOURCE])
        self.assertEqual(out["toolCalls"], [{"tool": "get_patient_parameters", "ok": True}])
        self.assertEqual(out["members"], ["clinico"])

    def test_only_tools_offered_by_the_backend_reach_the_specialists(self):
        FakeModel.seen_tools.clear()
        Backend.calls.clear()
        asyncio.run(team_mod.run_milo_team(self._req(), self._factory(), timeout_seconds=30, env=self._env()))
        offered = {name for tools in FakeModel.seen_tools for name in tools}
        # Strumenti non presenti nello schema del backend (es. diario) non esistono per il team.
        self.assertNotIn("get_patient_diary", offered)
        self.assertNotIn("query_agenda", offered)
        self.assertIn("get_patient_parameters", offered)

    def test_without_gateway_configuration_the_team_refuses_to_start(self):
        from clinicos_ai.models.errors import RuntimeError_

        with self.assertRaises(RuntimeError_):
            asyncio.run(team_mod.run_milo_team(self._req(), self._factory(), timeout_seconds=5, env={}))

    def test_no_allowed_tool_means_no_team(self):
        from clinicos_ai.models.errors import RuntimeError_

        with self.assertRaises(RuntimeError_):
            asyncio.run(team_mod.run_milo_team(self._req(toolSchema=[]), self._factory(), timeout_seconds=5,
                                               env=self._env()))

    def test_tool_results_are_fenced_as_untrusted_data(self):
        ledger = team_mod.SourceLedger()
        gateway = team_mod.GatewayClient(GRANT, env=self._env())
        fn = team_mod.make_tool("get_patient_parameters", {"patientId": "string"}, "x", gateway, ledger)
        text = fn.entrypoint(days=7)
        self.assertIn("S1", text)
        self.assertTrue(text.startswith("<<<") and "DATI_APPLICAZIONE" in text.splitlines()[0])

    def test_renumbering_keeps_order_of_appearance(self):
        ledger = team_mod.SourceLedger()
        ledger.add([{"sourceType": "A", "recordId": "1"}, {"sourceType": "B", "recordId": "2"},
                    {"sourceType": "C", "recordId": "3"}])
        text, cited = team_mod.renumber_citations("Uno [S3], due [S1], ancora [S3] e falso [S7].", ledger)
        self.assertEqual(text, "Uno [1], due [2], ancora [1] e falso.")
        self.assertEqual([c["recordId"] for c in cited], ["3", "1"])

    def test_team_models_ask_for_no_reasoning_so_tools_work(self):
        """Azure gpt-6.1-sol su chat/completions rifiuta gli strumenti col ragionamento attivo."""
        from clinicos_ai.models.providers.agno_team import team_model

        FakeModel.bodies.clear()
        factory = self._factory()
        asyncio.run(team_mod.run_milo_team(self._req(), lambda: team_model(factory()), timeout_seconds=30,
                                           env=self._env()))
        self.assertTrue(FakeModel.bodies)
        self.assertTrue(all(b.get("reasoning_effort") == "none" for b in FakeModel.bodies))
        # Configurabile, con ripiego su «none» per valori non ammessi.
        self.assertEqual(team_model(factory(), env={"AI_TEAM_REASONING_EFFORT": "low"}).reasoning_effort, "low")
        self.assertEqual(team_model(factory(), env={"AI_TEAM_REASONING_EFFORT": "boh"}).reasoning_effort, "none")
        # Un valore già impostato dal provider non viene toccato.
        m = factory()
        m.reasoning_effort = "high"
        self.assertEqual(team_model(m).reasoning_effort, "high")


if __name__ == "__main__":
    unittest.main()
