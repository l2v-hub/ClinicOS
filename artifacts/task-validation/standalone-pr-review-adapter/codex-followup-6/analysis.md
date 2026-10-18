# Follow-up 10 analysis

The actual `gh pr merge` invocation reports the reviewed-head refusal as a completed exit 1 with the exact GraphQL operation marker and no HTTP status. Existing classification leaves this as an uncertain merge, so the controller retains its merging reservation. The controller already has a native current-state guard that confirms the exact reviewed identity is still OPEN and unmerged before it archives a definite rejection. The change therefore adds a narrow refusal diagnostic and lets that existing guard run; no new retry path is introduced.

The budget validators run at state load and save. Legacy free-text extension owners therefore need their `budgetAuthorizationCutover` marker before this controller is deployed. Existing live markers/history were preserved unchanged.
