-- The public preview is an explicit synthetic dataset. Earlier demo migrations created the
-- roster and therapies but no normalized rooms/beds/placements, leaving the authoritative
-- occupancy screen at zero. Keep this data demo-scoped by requiring the known demo patients.

INSERT INTO "Room" ("id", "numero", "tipo", "piano", "reparto", "stato", "note", "createdAt", "updatedAt")
SELECT seed."id", seed."numero", 'doppia'::"RoomType", seed."piano", seed."reparto",
       'attiva'::"RoomStatus", '', NOW(), NOW()
FROM (VALUES
  ('SEED-ROOM-101', '101', '1°', 'Reparto A — Medicina Interna'),
  ('SEED-ROOM-201', '201', '2°', 'Reparto B — Chirurgia'),
  ('SEED-ROOM-301', '301', '3°', 'Riabilitazione'),
  ('SEED-ROOM-102', '102', '1°', 'Reparto A — Medicina Interna')
) AS seed("id", "numero", "piano", "reparto")
WHERE EXISTS (SELECT 1 FROM "Patient" WHERE "medicalRecordNumber" = 'MRN-DEMO-001')
ON CONFLICT DO NOTHING;

INSERT INTO "Bed" ("id", "roomId", "label", "stato", "note", "createdAt", "updatedAt")
SELECT seed."id", seed."roomId", seed."label", 'libero', '', NOW(), NOW()
FROM (VALUES
  ('SEED-BED-101-A', 'SEED-ROOM-101', 'A'),
  ('SEED-BED-101-B', 'SEED-ROOM-101', 'B'),
  ('SEED-BED-201-A', 'SEED-ROOM-201', 'A'),
  ('SEED-BED-201-B', 'SEED-ROOM-201', 'B'),
  ('SEED-BED-301-A', 'SEED-ROOM-301', 'A'),
  ('SEED-BED-301-B', 'SEED-ROOM-301', 'B'),
  ('SEED-BED-102-A', 'SEED-ROOM-102', 'A'),
  ('SEED-BED-102-B', 'SEED-ROOM-102', 'B')
) AS seed("id", "roomId", "label")
WHERE EXISTS (SELECT 1 FROM "Room" WHERE "id" = seed."roomId")
ON CONFLICT DO NOTHING;

-- Every row below names the patient and exact bed. There is deliberately no first-free or
-- therapy-based inference. Existing active placements always win, preserving operator changes.
INSERT INTO "PatientRoomAssignment"
  ("id", "patientId", "roomId", "bedId", "startDate", "endDate", "note", "createdById", "createdAt", "updatedAt")
SELECT seed."assignmentId", patient."id", seed."roomId", seed."bedId", CURRENT_DATE::text,
       NULL, 'Assegnazione dimostrativa esplicita', patient."registeredById", NOW(), NOW()
FROM (VALUES
  ('SEED-PLACEMENT-001', 'MRN-DEMO-001', 'SEED-ROOM-101', 'SEED-BED-101-A'),
  ('SEED-PLACEMENT-002', 'MRN-DEMO-002', 'SEED-ROOM-101', 'SEED-BED-101-B'),
  ('SEED-PLACEMENT-003', 'MRN-DEMO-003', 'SEED-ROOM-201', 'SEED-BED-201-A'),
  ('SEED-PLACEMENT-004', 'MRN-DEMO-004', 'SEED-ROOM-201', 'SEED-BED-201-B'),
  ('SEED-PLACEMENT-005', 'MRN-DEMO-005', 'SEED-ROOM-301', 'SEED-BED-301-A'),
  ('SEED-PLACEMENT-006', 'MRN-DEMO-006', 'SEED-ROOM-301', 'SEED-BED-301-B'),
  ('SEED-PLACEMENT-007', 'MRN-DEMO-007', 'SEED-ROOM-102', 'SEED-BED-102-A'),
  ('SEED-PLACEMENT-008', 'MRN-DEMO-008', 'SEED-ROOM-102', 'SEED-BED-102-B')
) AS seed("assignmentId", "mrn", "roomId", "bedId")
JOIN "Patient" patient ON patient."medicalRecordNumber" = seed."mrn"
JOIN "Bed" bed ON bed."id" = seed."bedId" AND bed."roomId" = seed."roomId"
WHERE NOT EXISTS (
  SELECT 1 FROM "PatientRoomAssignment" existing
  WHERE existing."patientId" = patient."id"
    AND existing."startDate" <= CURRENT_DATE::text
    AND (existing."endDate" IS NULL OR existing."endDate" >= CURRENT_DATE::text)
)
AND NOT EXISTS (
  SELECT 1 FROM "PatientRoomAssignment" existing
  WHERE existing."bedId" = seed."bedId"
    AND existing."startDate" <= CURRENT_DATE::text
    AND (existing."endDate" IS NULL OR existing."endDate" >= CURRENT_DATE::text)
)
ON CONFLICT DO NOTHING;
