# Independent diff review — PASS

- NewPatientFlow.tsx:80-104 selects page only for routed initialPath and propagates through loading/error/import/manual intake. Appointment chooser default remains modal.
- AccessibleDialogSurface.tsx:25-29 preserves original DialogSurface behavior by default. DialogLoading.tsx propagates explicit presentation.
- PatientWorkspaceSurface.tsx:29-54 measures actual existing main/topbar, observes resize/scroll and disconnects on cleanup. CSS scopes main-pane surface and overrides existing viewport rules without navigation duplication.
- PatientWorkspaceSurface.tsx:56-115 sets/restores previous inert state on replaced main children, names its region, avoids modal focus trap, respects existing true modal on Escape, cleans event listeners and restores connected trigger focus. Runtime cold-module/API opening/reopen probes found no leaked inert state.
- PatientWorkspaceSurface.tsx:78-103 serializes shell click guard and replays original connected target after success. IntakeWorkspace.tsx:781-813 returns save outcome; :848-853 guards pending/error saves. Synthetic422 and immediate-navigation probes both pass with retained field and fixture version assertions.
- DischargeImportModal.tsx:343-354 declines navigation during busy/upload and opens existing review close confirmation. Nested confirmation focus/background click/Escape tested.
- No backend/API/schema/config/dependency edits; no broad formatting/debug instrumentation or new logging. Full new files and changed tests/harness reviewed, including files untracked by git diff.
- No correctness findings. Limitation: synthetic shell rather than full authenticated App; report records that precisely.
