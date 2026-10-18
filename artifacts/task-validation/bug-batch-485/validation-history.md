# Preserved validation history

The fourth candidate does not erase the independent failures. Original private packets and full media remain unchanged; these SHA256 values identify their reports. They are not substituted for fresh independent QA of the current source.

| Evidence | Result | Report SHA256 |
|---|---|---|
| Baseline | FAILED VALIDATION | `93790c1833c0c38e21466c4bcd347bbe8ea3edc468fec3086dcfcc51ae4aa459` |
| Round1 | FAILED VALIDATION | `c219b0e296a1485137789fc8244393593851f5815ff4893004628b242702848d` |
| Round2 | FAILED VALIDATION | `7ffa34254cd08d20ca7a969858b7eea3f4ad0c6f07fe629550f479d23255c17f` |
| Round3 | FAILED VALIDATION | `ebb58136bf9196e73dcdd85e11a13a6f015732eb209c9151e25b7a3481f2c32b` |

Baseline: manual viewport1903x1032 was capped at1440x1000, sections880; phone390x844 visible source3.515625px/zeroink with control overlap. Round1 fixed standard cases but short phones left32px of source and an unreachable data field. Round2 resumed readonly review left67.046875px of source because the toolbar used44px controls. Round3 author browser checks passed but independent1395frontend suite found the page-local canonical-control rule, so no independent browser result was certified. Round4 moves only ownership of that scoped rule to the canonical stylesheet; all prior intrinsic sizing/focus changes remain explicitly in scope.

Implementation attempts are durably1failed/2failed/3failed/4passed independent QA. Parent481 source/reviews and other batch budgets remain unchanged. No fifth attempt, fake approval, deployment identity or issue closure is created.
