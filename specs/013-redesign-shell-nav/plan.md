# Plan 013 — Redesign Shell + Nav

## File changes

### NEW

- `frontend/src/components/shared/PageHeader.tsx` — shared header w/ breadcrumb, title, L2 slot, actions slot
- `frontend/src/components/shared/AIAssistantButton.tsx` — floating circular button + placeholder panel
- `specs/013-redesign-shell-nav/spec.md` ✓
- `specs/013-redesign-shell-nav/plan.md` ✓

### MODIFIED

- `frontend/src/types.ts` — add NavKey 'ai-assistant'
- `frontend/src/App.tsx` — add ai-assistant route, mount AIAssistantButton globally
- `frontend/src/components/shared/TeamsLikeSidebar.tsx` — add AI Assistant entry
- `frontend/src/App.css` — add PageHeader + AIAssistantButton styles
- `frontend/src/components/admin/AdminDashboard.tsx` — adopt PageHeader
- `frontend/src/components/operator/OperatorDashboard.tsx` — adopt PageHeader
- `frontend/src/components/operator/PatientList.tsx` — adopt PageHeader

## Architecture decisions

- PageHeader is a slot-based component (children = page-specific actions); does not own L2 tabs but accepts them as `<slot>` prop. This keeps L2 ownership with the page (avoids prop drilling) while ensuring uniform breadcrumb + title styling.
- AI Assistant initial state: clicking the floating button or sidebar entry opens a right-side drawer with placeholder text ("Assistente AI in arrivo"). No backend call. Drawer is closeable. Allows future logic without refactor.
- NavKey `ai-assistant` added but rendered as drawer trigger, not full page navigation. This avoids breaking history/back behavior.
- Keep `compact-topbar` minimal (search only) — page-level headers carry breadcrumb/title.

## Test plan

- Build clean: `npm run build`
- Visual smoke: open AdminDashboard, OperatorDashboard, PatientList, PatientDetail — confirm:
  - sidebar shows AI Assistant entry
  - floating circular button bottom-right
  - clicking opens placeholder panel
  - PageHeader renders on adopted pages w/ uniform style
- No TS errors, no console errors.

## Commit

`feat: redesign ClinicOS layout and multi-level navigation in medical blue style`
