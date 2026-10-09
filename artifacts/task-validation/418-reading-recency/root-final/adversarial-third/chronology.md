# Root independent-recipe rerun

The first copy raced the QA append of two reload cases: actual root run21 had19PASS/2FAIL, not a complete19-only run. Original script and artifacts remain root-final/adversarial. Reload initially assumed simulator auth persisted across refresh, which the unchanged in-memory baseline does not do.

The second actual root run failed all21 at the guard because only the HTTP origin was moved7483to7481; its newly added WebSocket guard still allowed only7483 and denied local Vite HMR7481. Those full outputs remain root-final/adversarial-final. No source edit, clinical write or external socket occurred: local HMR was denied. The corrected normal-relogin test also initially expected dashboard rather than the baseline restored deep-link; fresh QA retained both failed recipes.

This third run copies the actual final21 independent recipe, changing only both local HTTP/WebSocket ports7483to7481, its output path through the new directory, and adding a JSON reporter. All original19 assertions plus two explicit same-profile reaccess/read-only-history reload assertions remain. No source fixes after frozen d028. Current results are authoritative, earlier failures are never reinterpreted as passes.
