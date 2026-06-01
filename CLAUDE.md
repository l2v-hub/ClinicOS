# ClinicOS Claude Instructions

ClinicOS is a full-stack healthcare management app.

Current architecture:
- frontend: React + TypeScript + Vite
- backend: Node.js + Express + TypeScript
- database: PostgreSQL
- ORM: Prisma 7
- local DB: Podman PostgreSQL on localhost:5432

Current backend:
- http://localhost:3001/health
- http://localhost:3001/patients

Current frontend:
- http://localhost:5173
- must call backend at http://localhost:3001

Design goal:
Use the Stitch healthcare mockup as visual reference.
Create a professional enterprise healthcare UI:
- sidebar navigation
- header
- operator/manager role awareness
- dashboard cards
- patient table
- patient detail layout
- clinical history central and expandable
- agenda with 30-minute slots
- manager multi-operator agenda

Important UX rule:
All major cards/widgets must be expandable.
When a widget is expanded, it becomes the central focus area.
Clinical history and treatment history are primary and must be central on patient/clinical record pages.
Other cards can be compressed/collapsed.

Development rules:
- Keep code simple.
- Prefer small components.
- Do not change backend unless explicitly asked.
- Do not change Prisma schema unless explicitly asked.
- Do not remove working /patients integration.
- Do not use heavy UI frameworks.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/007-clean-nav-layout/plan.md`.
<!-- SPECKIT END -->
