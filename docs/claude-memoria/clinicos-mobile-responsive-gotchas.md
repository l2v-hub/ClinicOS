---
name: clinicos-mobile-responsive-gotchas
description: 'ClinicOS mobile/responsive fixes — drawer nav, and the overflow-x/nested-scroll traps that break sticky + hide content'
metadata:
  node_type: memory
  type: reference
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
---

Responsive was added for tablet/phone (all live on prod). The non-obvious traps, already fixed — don't reintroduce:

- **Mobile nav drawer**: ≤1023px the `.teams-sidebar` was `display:none` with NO replacement. Now it's an off-canvas drawer (`transform:translateX(-100%)` → `0` on `.app-shell--nav-open`) toggled by a hamburger in `.compact-topbar`; a `.mobile-nav-scrim` closes it; `navigate()` in App.tsx sets `mobileNavOpen=false`.
- **`overflow-x:hidden` forces `overflow-y:auto`** (CSS used-value rule): a global `.app-shell,.main-area-clean{overflow-x:hidden}` made those ancestors scrollports → broke `position:sticky` topbar AND anchored scroll wrongly. Fix: that rule is now scoped to `@media(min-width:1024px)`; the horizontal guard on mobile lives on `body{overflow-x:hidden}`. If sticky breaks again, check for an unscoped `overflow-x:hidden` ancestor.
- **Patient-chart nested-scroll shell trap**: the desktop model is a fixed 100vh shell with inner scroll (`.main-area-clean{height:100vh;overflow:hidden}` > `.content-panel{overflow:auto}` > `.patient-record-view`/`.cr-detail-layout--no-sidebar{height:100%;overflow:hidden}` > `.cr-detail-content{overflow-y:auto}`). On phone this trapped long clinical forms (Braden/Terapia) in a ~418px window with the Save button unreachable. Fix: at ≤1023px release the WHOLE chain to `height:auto;overflow(-y):visible` so the document scrolls; topbar made `position:sticky`.
- **Wide tables/grids**: use `overflow-x:auto` on the wrapper (`.table-wrap`, `.clinicos-table-wrap`, `.cts__body`) so they scroll, not clip. Verify "content wider than viewport" is always inside such a container (element-level, since `.app-shell` overflow-x:hidden masks the page-level scrollbar).
- **Fixed multi-col form grids** (`.terapia-sched-form 1fr 1fr`, `.form-row-2col`) collapse to 1 column ≤768px + fields `min-width:0` (else the dose "mg" clips).
- **`.cr-alert-band` (allergie/rischi strip)**: `align-items:flex-start` (no stretch) on desktop; in the ≤768px column band `.cr-alert-strip{flex:0 0 auto;width:100%}` (else `flex:1 1 300px` makes the 300px basis the HEIGHT → 300px-tall cards).

Verify responsive with Playwright at 360/390/768/1024; related [[clinicos-deploy-mechanics]].
