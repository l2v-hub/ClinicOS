Use DYNAMIC WORKFLOW.

Read and follow exactly:

.claude/workflows/REQUIREMENTS_QUEUE.md

Goal:
process ClinicOS GitHub requirements queue.

Source:
GitHub Issues with label:

clinicos-requirement

Start by running:

gh issue list --label "clinicos-requirement" --state open

Then process one issue at a time.

Mandatory rules:
- open issue = to process
- closed issue = already completed, tested and validated
- never process closed issues
- never close an issue unless acceptance criteria are satisfied
- never close an issue unless required tests pass
- never close an issue unless npm run build passes
- if blocked, add status-blocked and comment why
- if completed, comment test report and close the issue

For each issue:
1. read issue details
2. create short implementation plan
3. implement only the issue scope
4. run required tests
5. run npm run build
6. comment final report on GitHub issue
7. close issue only if successful
8. move to next issue

Stop when there are no more open processable issues.

Additional mandatory deployment rule:

A requirement is complete only after:
1. acceptance criteria pass;
2. required tests pass;
3. npm run build passes;
4. changes are committed;
5. changes are pushed;
6. deployment starts.

After implementation and tests, run:

git status
git add .
git commit -m "REQ-XXX implement <short title>"
git push origin HEAD

Then verify that deployment has started.

Do not close the GitHub Issue if the push fails.
Do not close the GitHub Issue if deployment does not start.
If deployment fails or does not start, add label status-deploy-failed and comment the reason.

When successful, comment the GitHub Issue with:
- requirement number;
- files changed;
- tests executed;
- npm run build result;
- commit hash;
- pushed branch;
- deployment status.

Only then close the issue.
