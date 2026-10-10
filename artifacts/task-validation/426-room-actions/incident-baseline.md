# Baseline harness observations

First browser attempt waited for rooms immediately after simulator login, but this application intentionally sends the administrator to Dashboard. It had no console/page/HTTP/unexpected/external/write errors. Actual synthetic dashboard screenshot and failure JSON/trace/video retained at baseline/browser. The harness now follows the actual Dashboard Gestione posti letto button to enter the intended view; no app change for this correction. Current baseline source remainsb7 plus only new TDD source-regression tests; original four missing identity expectations RED.

The combined server-start command initially ended before browser invocation because a PowerShell LASTEXITCODE value was absent. Server was verified by recorded PID30312/listener7517 and the browser was invoked separately. No evidence was claimed from the skipped command. Native launcher overlays in new checkout appeared during normal environment setup and are preserved/excluded from app scope.
