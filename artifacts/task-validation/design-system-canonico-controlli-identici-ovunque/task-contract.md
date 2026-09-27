# Task Contract

## Task

- Title: Design system canonico: controlli identici ovunque
- Slug: design-system-canonico-controlli-identici-ovunque
- Type: refactor
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

The same kind of control looks different from page to page. The CSS holds more than 200 control classes: each page has its own chip, button and date navigation.

- Chips and filters: `filter-chip` is defined twice with different styles (pill 999px and pill 20px), alongside `agt-filter-chip`, `plist-chip`, `giro-chip`, `giro-chip--small`, `nm-chip`, `ho-chip`, `par-chip` and `agt-view-btn`.
- Buttons: `btn-primary`, `btn-secondary` and `btn-success` (green) alongside `giro-btn`, `ho-btn`, `nm-new-btn`, `agt-new-btn`, `par-save`, `par-next`, `plist-btn` and `turno-btn`.
- Date navigation: `agt-nav-btn` + `agt-today-btn` in Agenda, `giro-icon-btn` + chip in Terapia.

The user noticed it: "Nella sezione Agenda i pulsanti di filtro sembrano diversi", and asks for the design system to be "used paranoidly": buttons, filters, agendas, dates and tabs must look the same everywhere.

## Expected Behaviour

There is a single source for the look of controls: `frontend/src/design-system.css`, loaded after every other stylesheet.

**The canonical selectors win over any page rule.** They use an id-level specificity boost (`:not(#ds)`). A page can decide layout (margin, flex, order) but not the look of a control.

**Canonical controls** (tokens `--ds-*`):

| Control                               | Height | Radius | Style                                                                        | States                                                                                                 |
| ------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Chip / filter / view switch           | 48     | 12     | border 2px, 16 px text                                                       | active (`aria-pressed=true`, `.active` or `.is-active`): blue tint, blue border, blue-active text, 600 |
| Primary button                        | 48     | 12     | blue, white text                                                             | —                                                                                                      |
| Secondary button                      | 48     | 12     | white, border 2px #c9d3e1, blue-active text                                  | —                                                                                                      |
| Link button (`.ds-link`)              | min 48 | —      | no border, blue-active text                                                  | —                                                                                                      |
| Icon button                           | 48×48  | 12     | border 2px                                                                   | —                                                                                                      |
| Date navigation (`DateNav` component) | —      | —      | previous, "Oggi" (chip, pressed when on today), optional date field 48, next | —                                                                                                      |
| Card (`.ds-card`)                     | —      | 16     | padding 24, border 1px                                                       | —                                                                                                      |

All controls share the same visible focus (3px) and the same disabled state (opacity 0.5).

**Legacy classes are aliased** so every page uses the canonical look, including pages not yet redesigned:

- chip: `filter-chip`, `agt-filter-chip`, `agt-view-btn`;
- primary: `btn-primary`, `btn-success` (primary actions are always blue, as in the prototype);
- secondary: `btn-secondary`;
- icon: `icon-btn`.

**Migration.** The HMI pages (Pazienti, Terapia, Parametri, Consegne, Agenda operatore, Note, Farmaci, cartella) use the `ds-*` classes directly. Their local chip and button copies are removed.

Terapia and Agenda use the same `DateNav`. The small chip variant disappears: there is one chip size.

**Tabs (section navigation)** stay on the single `TopNav` component, already shared.

## Acceptance Criteria

- AC1: automated browser audit on every page (Turno, Pazienti, Terapia, Parametri, Consegne and Feed, Agenda operatore in day/week/month, Note, Farmaci, cartella, Agenda admin, Operatori admin). All visible chips have the same computed signature (height, radius, border width, font size and weight), and so do active chips (background, text, border). The same holds for primary buttons, secondary buttons and icon buttons. There are 0 differences between pages.
- AC2: guard test (unit) — the migrated HMI files no longer define or use local chip/button classes (`plist-chip`, `giro-chip`, `giro-btn`, `nm-chip`, `nm-new-btn`, `ho-chip`, `ho-btn`, `par-chip`, `agt-new-btn`, `giro-icon-btn`). `design-system.css` is the only place defining the look of `.ds-chip`, `.ds-btn` and `.ds-icon-btn`. The CSS files of the HMI pages do not set height, radius, background or border on those controls.
- AC3: `DateNav` is shared by Terapia and Agenda operatore (the "Oggi" chip is pressed on today). The Agenda filters are identical to the chips of the other pages.
- AC4: no functional regression. All evidence scripts of the HMI cycles pass (updated selectors only). No horizontal scroll at 390, 768, 1024, 1180 or 1440 on the audited pages.
- AC5: build passes; no new test failure against the baseline (tests that looked for old class names are updated).

## Test Plan

| Test type                 | Required | Reason                                           |
| ------------------------- | -------: | ------------------------------------------------ |
| Unit                      |      yes | design system guard (classes and CSS)            |
| Integration               |       no |                                                  |
| API                       |       no |                                                  |
| Playwright                |      yes | computed-style audit across pages + HMI evidence |
| Persistence after refresh |       no |                                                  |
| Agnos action registry     |       no |                                                  |
| Voice simulation          |       no |                                                  |
| OCR/import test           |       no |                                                  |
| Security/privacy scan     |       no |                                                  |

## Evidence Plan

Required evidence:

- validation-report.md
- logs/ds-audit.txt (style signatures per page and control) + screenshots per page
- test-results (full suite, build); HMI evidence re-run

## Risks

- The aliases change the look of legacy pages (admin, forms) that use `btn-primary`, `btn-secondary`, `btn-success` and `filter-chip`. It is intended (consistency), but dense layouts (tables, modals) need checking. The audit and QA cover them.
- `btn-success` stops being green: primary actions are blue, as in the brand palette.

## Gate Status

READY FOR IMPLEMENTATION
