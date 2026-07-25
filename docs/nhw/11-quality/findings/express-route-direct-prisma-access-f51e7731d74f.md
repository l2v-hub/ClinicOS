---
id: "finding.coupling.express-route-direct-prisma-access"
kind: "architectural-finding"
title: "Express routes with direct Prisma access"
status: "observed"
summary: "54 Express endpoints invoke Prisma directly from route handlers."
bounded_contexts: []
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "458"
    line_end: "485"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "293"
    line_end: "325"
    confidence: "observed"
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "107"
    line_end: "122"
    confidence: "observed"
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "98"
    line_end: "113"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "889"
    line_end: "914"
    confidence: "observed"
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "140"
    line_end: "156"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "patientAssignmentRouter"
    line_start: "643"
    line_end: "662"
    confidence: "observed"
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "169"
    line_end: "188"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "90"
    line_end: "128"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "131"
    line_end: "142"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "205"
    line_end: "221"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "332"
    line_end: "356"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "43"
    line_end: "87"
    confidence: "observed"
  - path: "backend/src/routes/ai-audit.ts"
    symbol: "auditRouter"
    line_start: "29"
    line_end: "69"
    confidence: "observed"
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "18"
    line_end: "28"
    confidence: "observed"
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "14"
    line_end: "22"
    confidence: "observed"
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "58"
    line_end: "72"
    confidence: "observed"
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "77"
    line_end: "90"
    confidence: "observed"
  - path: "backend/src/routes/patient-intake.ts"
    symbol: "router"
    line_start: "112"
    line_end: "136"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "7"
    line_end: "18"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "28"
    line_end: "41"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "918"
    line_end: "938"
    confidence: "observed"
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "8"
    line_end: "33"
    confidence: "observed"
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "79"
    line_end: "94"
    confidence: "observed"
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "191"
    line_end: "217"
    confidence: "observed"
relations:
  - type: "documents"
    target: "api.backend.delete-admin-beds-by-param-12"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-admin-rooms-by-param-8"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-consegne-by-param-48"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-notes-by-param-79"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-patients-by-param-109"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-patients-by-param-diary-by-param-89"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-patients-by-param-room-assignments-by-param-16"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.delete-patients-by-param-therapies-by-param-100"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-admin-beds-available-3"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-admin-rooms-4"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-admin-rooms-by-param-6"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-admin-rooms-by-param-beds-9"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-admin-rooms-occupancy-2"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-ai-audit-21"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-consegne-45"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-notes-76"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-operators-80"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-operators-schedules-81"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patient-intake-documents-by-param-96"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-102"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-104"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-cartella-110"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-diary-85"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-diary-by-param-87"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-medication-administrations-101"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-room-assignments-13"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-patients-by-param-therapies-97"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.get-therapy-slots-112"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.patch-patients-by-param-108"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-admin-rooms-5"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-admin-rooms-by-param-beds-10"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-notes-77"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-operators-83"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patient-intake-discharge-letter-apply-95"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patient-intake-discharge-letter-extract-94"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patient-intake-discharge-letter-upload-93"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-107"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-by-param-diary-86"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-by-param-room-assignments-14"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-by-param-therapies-98"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-demo-setup-106"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-patients-seed-105"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-therapy-slots-confirm-113"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.post-therapy-slots-not-administered-114"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-admin-beds-by-param-11"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-admin-rooms-by-param-7"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-consegne-by-param-47"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-notes-by-param-78"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-operators-by-param-84"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-operators-by-param-schedule-82"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-patients-by-param-cartella-111"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-patients-by-param-diary-by-param-88"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-patients-by-param-room-assignments-by-param-15"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "documents"
    target: "api.backend.put-patients-by-param-therapies-by-param-99"
    evidence: "backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-audit.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/patient-intake.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-diary.ts,backend/src/routes/patient-therapies.ts"
    confidence: "observed"
tags:
  - "hidden-coupling"
  - "persistence"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `finding.coupling.express-route-direct-prisma-access` represent in ClinicOS?

## Canonical Definition

finding.coupling.express-route-direct-prisma-access is the canonical architectural-finding named Express routes with direct Prisma access.

## Inputs

54 routes with extracted Prisma calls.

## Outputs

Explicit route-to-persistence coupling map.

## Dependencies

Express route handlers and the shared Prisma client.

## Side Effects

Route handlers directly read or mutate persistent state.

## Consumers

Change-impact analysis for schema, transactions, and route behavior.

## Invariants

The finding describes observed coupling and does not prescribe a repository abstraction.

## Failure Modes

Schema or transaction changes can require coordinated edits across multiple handlers.

## Evidence

- `backend/src/routes/admin-rooms.ts:458-485` — adminRouter
- `backend/src/routes/admin-rooms.ts:293-325` — adminRouter
- `backend/src/routes/consegne.ts:107-122` — consegneRouter
- `backend/src/routes/note.ts:98-113` — noteRouter
- `backend/src/routes/patients.ts:889-914` — router
- `backend/src/routes/patient-diary.ts:140-156` — router
- `backend/src/routes/admin-rooms.ts:643-662` — patientAssignmentRouter
- `backend/src/routes/patient-therapies.ts:169-188` — router
- `backend/src/routes/admin-rooms.ts:90-128` — adminRouter
- `backend/src/routes/admin-rooms.ts:131-142` — adminRouter
- `backend/src/routes/admin-rooms.ts:205-221` — adminRouter
- `backend/src/routes/admin-rooms.ts:332-356` — adminRouter
- `backend/src/routes/admin-rooms.ts:43-87` — adminRouter
- `backend/src/routes/ai-audit.ts:29-69` — auditRouter
- `backend/src/routes/consegne.ts:18-28` — consegneRouter
- `backend/src/routes/note.ts:14-22` — noteRouter
- `backend/src/routes/operators.ts:58-72` — operatorsRouter
- `backend/src/routes/operators.ts:77-90` — operatorsRouter
- `backend/src/routes/patient-intake.ts:112-136` — router
- `backend/src/routes/patients.ts:7-18` — router
- `backend/src/routes/patients.ts:28-41` — router
- `backend/src/routes/patients.ts:918-938` — router
- `backend/src/routes/patient-diary.ts:8-33` — router
- `backend/src/routes/patient-diary.ts:79-94` — router
- `backend/src/routes/patient-therapies.ts:191-217` — router

## Related Knowledge

- `documents` → `api.backend.delete-admin-beds-by-param-12`
- `documents` → `api.backend.delete-admin-rooms-by-param-8`
- `documents` → `api.backend.delete-consegne-by-param-48`
- `documents` → `api.backend.delete-notes-by-param-79`
- `documents` → `api.backend.delete-patients-by-param-109`
- `documents` → `api.backend.delete-patients-by-param-diary-by-param-89`
- `documents` → `api.backend.delete-patients-by-param-room-assignments-by-param-16`
- `documents` → `api.backend.delete-patients-by-param-therapies-by-param-100`
- `documents` → `api.backend.get-admin-beds-available-3`
- `documents` → `api.backend.get-admin-rooms-4`
- `documents` → `api.backend.get-admin-rooms-by-param-6`
- `documents` → `api.backend.get-admin-rooms-by-param-beds-9`
- `documents` → `api.backend.get-admin-rooms-occupancy-2`
- `documents` → `api.backend.get-ai-audit-21`
- `documents` → `api.backend.get-consegne-45`
- `documents` → `api.backend.get-notes-76`
- `documents` → `api.backend.get-operators-80`
- `documents` → `api.backend.get-operators-schedules-81`
- `documents` → `api.backend.get-patient-intake-documents-by-param-96`
- `documents` → `api.backend.get-patients-102`
- `documents` → `api.backend.get-patients-by-param-104`
- `documents` → `api.backend.get-patients-by-param-cartella-110`
- `documents` → `api.backend.get-patients-by-param-diary-85`
- `documents` → `api.backend.get-patients-by-param-diary-by-param-87`
- `documents` → `api.backend.get-patients-by-param-medication-administrations-101`
- `documents` → `api.backend.get-patients-by-param-room-assignments-13`
- `documents` → `api.backend.get-patients-by-param-therapies-97`
- `documents` → `api.backend.get-therapy-slots-112`
- `documents` → `api.backend.patch-patients-by-param-108`
- `documents` → `api.backend.post-admin-rooms-5`
- `documents` → `api.backend.post-admin-rooms-by-param-beds-10`
- `documents` → `api.backend.post-notes-77`
- `documents` → `api.backend.post-operators-83`
- `documents` → `api.backend.post-patient-intake-discharge-letter-apply-95`
- `documents` → `api.backend.post-patient-intake-discharge-letter-extract-94`
- `documents` → `api.backend.post-patient-intake-discharge-letter-upload-93`
- `documents` → `api.backend.post-patients-107`
- `documents` → `api.backend.post-patients-by-param-diary-86`
- `documents` → `api.backend.post-patients-by-param-room-assignments-14`
- `documents` → `api.backend.post-patients-by-param-therapies-98`
- `documents` → `api.backend.post-patients-demo-setup-106`
- `documents` → `api.backend.post-patients-seed-105`
- `documents` → `api.backend.post-therapy-slots-confirm-113`
- `documents` → `api.backend.post-therapy-slots-not-administered-114`
- `documents` → `api.backend.put-admin-beds-by-param-11`
- `documents` → `api.backend.put-admin-rooms-by-param-7`
- `documents` → `api.backend.put-consegne-by-param-47`
- `documents` → `api.backend.put-notes-by-param-78`
- `documents` → `api.backend.put-operators-by-param-84`
- `documents` → `api.backend.put-operators-by-param-schedule-82`
- `documents` → `api.backend.put-patients-by-param-cartella-111`
- `documents` → `api.backend.put-patients-by-param-diary-by-param-88`
- `documents` → `api.backend.put-patients-by-param-room-assignments-by-param-15`
- `documents` → `api.backend.put-patients-by-param-therapies-by-param-99`
