# Local startup observation

The owned hidden Vite process PID2972 started successfully from the frozen repository config on assigned port7525. The start-server.ps1 readiness probe exhausted its bounded short PowerShell requests during cold React/Vite dependency compilation and reported `Owned local server not ready`. Its existing policy, stdout and stderr are retained unchanged. The process was not restarted and application source was not changed. An independent Node GET subsequently returned200 with1065bytes and browser.mjs completed all6 assertions successfully against the same process. This is a tooling readiness timeout, not a passing application assertion or a suppressed browser failure.

No production transport or API was used. Browser execution remains serialized in the assigned lane.
