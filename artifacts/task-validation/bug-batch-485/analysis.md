# Issue485 analysis

Base: PR481 reviewed source6d2cc7919a86e3896426a7281f28f3406d8418e4. New dependent plan for the existing separate issue485; parent450 frozen plan, source and4/4 budget are unchanged. New issue485 implementation1/4 was reserved through the trusted controller store before execution; nonce50977692-758c-4129-ac54-07cc844bac91.

Independent negative baseline: manual1903x1032 bounds x231.5/y16/1440/1000, sections880px. The base intake CSS caps the modal and centers a second cap within the content body; only import mode has a late fullscreen override. Tablet manual also retains side margins. Share the existing reliable fullscreen rule and remove obsolete size caps rather than add another mode.

Actual phone imported-PDF source390x844 has canvas intersection height3.515625px with zero visible ink; the download link intercepts the lower part of Adatta. The fixed32dvh grid row and shrinkable vertical flex contents consume source height. CSS allocation and flex constraints must preserve usable source controls, visible document ink and a scrollable data pane together.

Matrix: issue485 → manual/import/editing viewport and usable source → IntakePage.css + ImportSession.css → desktop1903x1032/tablet820x1180/phone390x844 real-input/browser/persistence assertions. Baseline actual18 input interactions and3 DB-backed save/reload/resume paths passed; do not claim these rerun on a new candidate until independent QA executes them.

No clinical decision, API, auth, Prisma, config, provider or dependency change. Original user attachment was inaccessible (403) and was not inspected; reproductions use the actual user request and synthetic data. Layout-only changes do not justify inheriting new visual acceptance. New QA must assert actual canvas ink and hit-targets, not merely DOM presence. Existing external baseline media/source seals remain immutable.

Runtime boundary: isolated owned QA database and services only, whole-stack lock, no development PostgreSQL5432 or user Vite5304/5311. Preserve synthetic-only media and redact volatile auth headers from traces before publication. Parent dependency, genuine review and verified deploy remain separate gates; no closure based solely on a local pass.

## Round2 correction

Round1 passed1395 frontend tests, production build, nine standard viewport/stage checks,18actualinput interactions and three DB-backed save/reload/resume paths. New short-screen QA nevertheless measured32px PDF preview and toolbar/download overlap at390x600/320x568, with320data field inaccessible. The failed source/contract and complete94-file QA bundle remain immutable in the operator record. Round2 reserved2/4 before further coding; first staysfailed.

Root traced the defect to fixed document rows sharing a short remaining viewport with minmax(0,1fr) data: after header/footer, the data row collapses. On phones the revised workspace scrolls vertically, retains a readable original preview row and sizes the data row to its content. Original and fields are deliberately brought into view separately on short screens; no claim that both fit simultaneously. Desktop/tablet columns and successful manual fullscreen rules remain unchanged. No new short-height breakpoint is needed. Fresh independent QA is still required; existing build/test results do not approve untested source or release.

## Round3 and explicit scope version2

Round2 independent QA found67.046875px of usable original PDF in the real resumed review, whose44px controls and117px toolbar differ from the initial entry36px controls. A larger guessed source-row constant does not address the cause. Source rows now follow their actual content; the document stage has its own bounded viewport and scroll, with outer workspace scroll making the original and distant fields separately reachable on short phones. Imported editing keeps a usable data region and content-sized original.

A real320px patient-list entrypoint also overflowed: the long resume-draft action extended to332.55px. Before editing the third file, root durably recorded plan/contract version2, preserved the original two-file scope and all failed history, and added only a scoped PatientList.css direct-card action wrap. Full patient identifiers remain visible; no global overflow masking. That file overlaps inactiveUX447, so integration explicitly preserves both changes and repeats its tests.

The inherited160px compact-header scroll margin also displaced native focus inside fullscreen PDF toolbars. A scoped zero margin restores normal focus scrolling without global changes. Actual finite sidebar animations must finish before measuring geometry. Small320px default fit PDF font density is retained in raw results; real125% zoom, native pan and Adatta restoration must satisfy the unchanged meaningful-source thresholds. Neither assertions nor application controls are bypassed.

Author verification3 reports195/195 checks, sixteen layout measurements, twenty-six actual field interactions, seventeen source audits and three SQL-backed persist/reload/resume paths, without console/page/relevant HTTP errors. These are author checks, not the new independent QA verdict. Candidate full tracked-source freeze contains13011 entries, SHA2565aec5b816f981103a6e3ad8274e4586157f293c51a12c375a4529bae28f6f01c. Independent QA runs fresh frontend tests because designSystem.test.ts scans CSS directly, plus typechecks, production build and real browser/database flows.

## Round4 — canonical ownership

Independent QA3 ran the fresh1395frontend suite:1394PASS/1FAIL, designSystem.test.ts72 correctly flags PatientList.css canonical-button visual properties. Both typechecks passed; production build interrupted and browser did not launch. Do not inherit the author195browserchecks as independent evidence. Full13011hashes remained unchanged and owned stack cleanup passed. Negative report SHA256ebb58136bf9196e73dcdd85e11a13a6f015732eb209c9151e25b7a3481f2c32b is preserved.

Explicit scopeversion3 was recorded before the last attempt: restore only the owned pageCSS addition, move the same narrow contextual rule to design-system.css next to existing patient-list control rules, use its canonical height token. Do not evade the test by renaming selectors, removing guards or changing global behavior. New independent session must repeat all mandatory phases against the resulting exact source.

## Final independent result

Fourth-cycle QA passes all mandatory phases:1395freshfrontend, two types, production build and212realbrowserchecks;48PNG/2videos/trace scan+decode;13011tracked+236prior external proof identities preserved. SourcefreezeSHA256b344a0019c78c850179ce258ed35e4a1c2b366c9093ba5eef6c894a466f6661c. Local acceptance only; parent481 and release gates remain pending.
