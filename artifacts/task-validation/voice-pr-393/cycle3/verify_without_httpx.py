"""Independent coordinator regression: emulate missing optional httpx import."""
import importlib.abc
import importlib.util
import pathlib
import sys
import unittest

class NoHttpx(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == 'httpx' or fullname.startswith('httpx.'):
            raise ModuleNotFoundError('httpx intentionally unavailable in core compatibility probe', name=fullname)
        return None

sys.meta_path.insert(0, NoHttpx())
for name in list(sys.modules):
    if name == 'httpx' or name.startswith('httpx.'):
        del sys.modules[name]
if len(sys.argv) == 2:
    spec = importlib.util.spec_from_file_location('old_voice_realtime', sys.argv[1])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    suite = unittest.TestSuite([module.DispatcherTests('test_real_asgi_auth_actual_stream_limit_and_safe_response')])
else:
    suite = unittest.defaultTestLoader.discover('clinicos-ai-runtime/tests', pattern='test_*.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
