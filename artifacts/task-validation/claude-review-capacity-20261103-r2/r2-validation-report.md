# Current author and independent verification — round2

Source:21cbfa5b90dcde75b076521278d1f1c6a95bbc08; base:D2.
This is not a Claude approval or an application restoration receipt.

- Clean-source focused18 suites:175 total,172 pass,0 fail,3 explicit Linux skips.
  Every requested suite was checked to exist; clean HEAD/index were checked
  before/after. Earlier wrong-selector subsets remain disclosed and are not
  substituted for this run.
- Independent offline QA: same175/172/3 result;46 unchanged private assertions
  pass, including exact previously failing policy/liveness await races. Full
  changed-source manifest and hashes bind the reports. Prior blocked reports
  remain historical results, not overwritten approvals.
- Counter-order regression: exact retained red reproduced before counters1/1
  instead of0/0; current regression passes while preserving controlled positive
  reachability, fixture/target identity and isolated no-growth assertions.
- Full local Windows comparison: baselineD2 had1797 tests/1602 pass/194 fail/1
  skip; earlier source10000045 had1888/1690/194/4. Failed identities are equal.
  These are NON-GREEN diagnostics, not waived assertions or final CI.
- Real Linux source10000045: run41667635035 attempt1,2010 tests/2005 pass/2
  fail/3 platform skips. Both failures were OpenSSL chain/dependent TLS.
- Real Linux source4c8beb83: run41670288154 attempt1,2012/2008/1/3. Certificates
  and real TLS passed; the counter snapshot race failed. That test-only ordering
  defect is corrected in this source; exact final-head CI still must demonstrate it.
- Source5139 CI also retained a Windows checkout timeout; it is not green and is
  not evidence that Windows setup tests executed successfully on that run.

Actual final artifact-head required checks and all attempts are authenticated
from GitHub and attached to canonical generated context before requesting real
review. They are deliberately not invented in this pre-head file. Real Max round2,
post-Claude final Codex, native qualification, merge and app deployment remain
pending. Prior real Max round1 changes-requested and every original limit remain.

No real patient writes, provider fallback, production changes, disabled test
assertions, forged review, history reset or new demo allowance occurred.
