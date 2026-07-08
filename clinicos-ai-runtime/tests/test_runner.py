"""issue #239: il runner condiviso NON deve ingoiare gli errori provider. Se l'SDK cattura
l'errore in una RunOutput con status=ERROR (invece di sollevarlo), il runner deve emergere un
RuntimeError_ PROVIDER_ERROR (→ HTTP 502 + log status=failure), non restituire il testo d'errore."""
import unittest
from enum import Enum

from clinicos_ai.models.spec import ModelSpec
from clinicos_ai.models.errors import RuntimeError_, ErrorKind
from clinicos_ai.models.providers._common import make_built


class _Status(Enum):
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class _Resp:
    def __init__(self, content, status=None):
        self.content = content
        self.status = status


class _Agent:
    def __init__(self, resp):
        self._resp = resp

    def run(self, prompt):
        return self._resp


def _built(resp):
    return make_built(ModelSpec("azure", "gpt-5.5"), lambda: _Agent(resp), timeout_seconds=5, label="Azure")


class RunnerErrorSurfacingTests(unittest.IsolatedAsyncioTestCase):
    async def test_error_status_raises_provider_error(self):
        built = _built(_Resp("Resource not found", status=_Status.ERROR))
        with self.assertRaises(RuntimeError_) as cm:
            await built.runner.run("say OK", [])
        self.assertEqual(cm.exception.kind, ErrorKind.PROVIDER_ERROR)
        # il testo d'errore NON viene restituito come risposta valida
        self.assertIn("Resource not found", cm.exception.message)

    async def test_ok_status_returns_content(self):
        built = _built(_Resp("piano valido", status=_Status.COMPLETED))
        self.assertEqual(await built.runner.run("q", []), "piano valido")

    async def test_no_status_attr_returns_content(self):
        # provider mock / risposte senza attributo status → comportamento invariato
        built = _built(_Resp("ok", status=None))
        self.assertEqual(await built.runner.run("q", []), "ok")


if __name__ == "__main__":
    unittest.main()
