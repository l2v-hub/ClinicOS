import builtins, sys, unittest
from pathlib import Path
original_import = builtins.__import__
def core_import(name, *args, **kwargs):
    if name == "httpx" or name.startswith("httpx."):
        raise ModuleNotFoundError("httpx unavailable: independent minimal core probe", name=name)
    return original_import(name, *args, **kwargs)
for name in list(sys.modules):
    if name == "httpx" or name.startswith("httpx."): del sys.modules[name]
builtins.__import__ = core_import
sys.path.insert(0, str(Path("clinicos-ai-runtime").resolve()))
try:
    __import__("httpx")
except ModuleNotFoundError:
    print("CONFIRMED: httpx import unavailable", flush=True)
else: raise AssertionError("httpx unexpectedly available")
suite = unittest.defaultTestLoader.discover("clinicos-ai-runtime/tests", pattern="test_*.py")
result = unittest.TextTestRunner(verbosity=2).run(suite)
assert result.testsRun == 240, result.testsRun
assert not result.skipped, result.skipped
sys.exit(0 if result.wasSuccessful() else 1)
