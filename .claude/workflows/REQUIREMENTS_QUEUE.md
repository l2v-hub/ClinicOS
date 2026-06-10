# ClinicOS Requirements Queue Workflow

This workflow is mandatory when processing ClinicOS requirements.

## Source of truth

GitHub Issues are the source of truth for requirements.

Only issues with label:

clinicos-requirement

must be processed.

## Rule

Open issue = requirement to process.  
Closed issue = completed, tested and validated.  
Blocked issue = do not close, add status-blocked and comment why.

## Processing order

1. priority-high
2. priority-medium
3. priority-low
4. oldest open issue first

## Mandatory process for each issue

For each GitHub issue:

1. Read issue list:
   gh issue list --label "clinicos-requirement" --state open

2. Pick the first processable issue according to priority.

3. Read the issue:
   gh issue view <issue-number>

4. Add processing label:
   gh issue edit <issue-number> --add-label "status-processing"

5. Understand:
   - problem
   - objective
   - scope included
   - scope excluded
   - acceptance criteria
   - tests required

6. Implement only the scope of that issue.

7. Do not modify backend, Prisma, API or deployment configuration unless the issue explicitly requires it.

8. Run required tests.

9. Always run:
   npm run build

10. If tests pass:
    - comment on the issue with:
      - files changed
      - acceptance criteria satisfied
      - tests executed
      - build result
      - commit hash if available
    - add label status-tested
    - remove label status-processing
    - close the issue

11. If tests fail:
    - do not close the issue
    - comment with failure details
    - keep or add status-processing only if still working

12. If blocked:
    - add label status-blocked
    - remove label status-processing
    - comment exactly why it is blocked
    - do not close the issue

13. Move to the next open requirement only after the current one is completed or blocked.

## Never do

- Do not process already closed issues.
- Do not skip acceptance criteria.
- Do not close an issue without tests.
- Do not close an issue if npm run build fails.
- Do not refactor outside the issue scope.
- Do not invent missing requirements.

## Mandatory Push and Deployment Rule

After a requirement is implemented and tested, the requirement is not complete until the code has been committed, pushed, and the deployment has started.

Final successful flow:

1. Implement requirement.
2. Satisfy acceptance criteria.
3. Run required tests.
4. Run:
   npm run build
5. If build passes, check git status:
   git status
6. Commit changes:
   git add .
   git commit -m "REQ-XXX implement <short requirement title>"
7. Push changes:
   git push origin HEAD
8. Confirm that deployment has started.

Deployment rules:

- If frontend files changed, Vercel deployment must start after push.
- If backend files changed, Railway deployment must start after push, if Railway is connected to the GitHub branch.
- If both frontend and backend changed, both deployments must be considered.
- If the current branch does not trigger production deployment, Claude must clearly report whether it triggered a preview deployment or whether a merge to the deploy branch is required.

Issue closing rule:

Claude must not close the GitHub Issue unless:

- acceptance criteria are satisfied;
- required tests are executed;
- npm run build passes;
- git commit succeeds;
- git push succeeds;
- deployment has started or Claude clearly verifies that the push triggered the configured deploy pipeline.

If deployment does not start:

- do not close the issue;
- add label status-deploy-failed;
- remove label status-processing;
- comment on the issue explaining why deployment did not start.

If deployment starts successfully:

- add label status-deploying;
- comment on the issue with:
  - files changed;
  - tests executed;
  - npm run build result;
  - commit hash;
  - pushed branch;
  - deployment status;
- then add label status-deployed or status-tested;
- remove label status-processing;
- close the issue.

Mandatory final commands after tests pass:

git status
git add .
git commit -m "REQ-XXX implement <short title>"
git push origin HEAD

Then verify deployment trigger.
