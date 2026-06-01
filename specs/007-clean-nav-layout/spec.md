# Feature Spec: Clean Navigation Layout

**Branch**: `007-clean-nav-layout` | **Status**: In Planning

## Overview

A frontend-only CSS/layout refactor that eliminates dead lateral space in the main shell, aligns breakpoints to tablet-first targets (1024px, 1180px, 1366px+), and upgrades navigation hierarchy styling. L2 navigation moves from pill/border to animated underline; L3 navigation becomes scrollable compact pills; tab content changes get a smooth slide/fade transition class.

## Requirements

### R01 – Layout Shell

- Main container must use `width: 100%` with no `max-width` applied to the full page
- `max-width` constraints allowed only on inner content areas where needed (e.g., form columns)
- Content area between sidebar and viewport edge must be fully fluid with no dead lateral space
- Responsive padding: compact on tablet, larger on desktop
- No global horizontal overflow (`overflow-x: hidden` on shell, not on body)

### R02 – Responsive Breakpoints

- **Tablet**: 1024px–1179px — compact padding, no dead space, horizontally scrollable tabs if needed
- **Large tablet**: 1180px–1365px — intermediate layout, wider cards allowed
- **Desktop**: >=1366px — full width, cards and tables extend naturally
- No `max-width` clamp on the app shell at any of these breakpoints
- No global `overflow-x` that hides scroll indicators

### R03 – Second Level Navigation (L2)

- Remove any border or pill/box styling around L2 tabs
- Active tab: underline indicator only (no background fill)
- Font size more prominent than L3 (existing `--l2-font: 14px` to be preserved or increased)
- Touch-friendly padding (min 44px height per WCAG tap target)
- Animated active underline: CSS `::after` pseudo-element with `transition` on `width` or `transform` (160–220ms)
- Hover state: light background tint, no border
- Inactive tabs: no underline, no background

### R04 – Third Level Navigation (L3)

- Compact pill/subtab style (retain existing pill shape)
- Active state: more subtle than L2 (lighter background, no heavy border)
- Inactive: minimal styling
- If tabs overflow container width, allow horizontal scroll (`overflow-x: auto`) with hidden scrollbar (`-ms-overflow-style: none; scrollbar-width: none`)
- `::webkit-scrollbar` hidden for webkit browsers
- Internal scroll must not affect page-level layout

### R05 – Tab Transitions

- Create or update a CSS class `tab-panel-transition` applied to the tab content wrapper
- Transition effect: combined fade + slight horizontal slide (e.g., `opacity` + `transform: translateX`)
- Duration: 160–220ms, easing: `ease-out`
- On tab change, outgoing panel fades/slides out; incoming panel fades/slides in
- Must respect `@media (prefers-reduced-motion: reduce)` — disable transitions if set
- No layout thrash during transition (use `position: absolute` for outgoing panel or CSS `@starting-style` / `display` toggle with `visibility`)
- Implementation: CSS class toggling via React state (add/remove `is-entering` / `is-leaving` classes)

## QA Checklist

- [ ] Scheda Paziente at 1024x768: no horizontal overflow, no dead lateral space
- [ ] Scheda Paziente at 1180x820: layout fills width correctly
- [ ] Scheda Paziente at 1366x768+ (desktop): full-width cards and tables
- [ ] L2 tab change: underline animates to new active tab (160–220ms)
- [ ] L3 tab change: pill activates, container scrolls if overflowed
- [ ] Agenda page: fills width, no layout regression
- [ ] Terapia page: fills width, no layout regression
- [ ] Parametri page: fills width, no layout regression
- [ ] Diario page: fills width, no layout regression
- [ ] No horizontal scrollbar on `<body>` or `.app-shell` at any tested viewport
- [ ] `npm run build` completes with zero TypeScript errors and zero lint errors
- [ ] With `prefers-reduced-motion: reduce` set: tab transitions are instant

## Out of Scope

- Backend changes
- Prisma schema changes
- New npm dependencies
- Changes to sidebar navigation (L1)
- Changes to data fetching or API integration
- Mobile viewports below 1024px (existing rules remain unchanged)
