# Execution Log

## [CODER] (212483ms — azure/gpt-5.4-pro)

### Prompt

Use FULL FILE MODE only. Output FILE blocks only. Do not output prose. Create exactly one file: prisma/schema.prisma. It must be a formatted Prisma schema for PostgreSQL with generator client, datasource db, enums Role OPERATOR MANAGER and AppointmentStatus SCHEDULED COMPLETED CANCELLED NO_SHOW, models User, Operator, Patient, ClinicalRecord, ClinicalNote, Appointment. Use relations between users/operators/patients/clinical records/appointments. Apply changes to disk.

OUTPUT FORMAT — MANDATORY:
You MUST output complete file contents using this exact format for every file:

FILE: path/to/file.ext
<complete file content — every line>
END FILE

Rules:

- Output the FULL file content. No partial content. No placeholders.
- Do NOT output unified diffs (--- / +++ / @@ lines). Diffs are rejected.
- Do NOT use ```diff blocks. Diffs are rejected.
- Repeat FILE/END FILE for each file you create or modify.
- File path must be relative to the project root (e.g. src/App.tsx).

### Response

FILE: prisma/schema.prisma
generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}

enum Role {
OPERATOR
MANAGER
}

enum AppointmentStatus {
SCHEDULED
COMPLETED
CANCELLED
NO_SHOW
}

model User {
id String @id @default(cuid())
email String @unique
passwordHash String
fullName String
role Role @default(OPERATOR)
isActive Boolean @default(true)
lastLoginAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
operator Operator?
appointmentsCreated Appointment[] @relation("AppointmentCreatedBy")
}

model Operator {
id String @id @default(cuid())
userId String @unique
licenseNumber String? @unique
department String?
phone String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
registeredPatients Patient[] @relation("PatientRegisteredBy")
appointments Appointment[] @relation("AppointmentOperator")
clinicalRecords ClinicalRecord[] @relation("ClinicalRecordAuthor")
clinicalNotes ClinicalNote[] @relation("ClinicalNoteAuthor")
}

model Patient {
id String @id @default(cuid())
medicalRecordNumber String @unique
firstName String
lastName String
dateOfBirth DateTime
sex String?
email String?
phone String?
address String?
emergencyContactName String?
emergencyContactPhone String?
registeredById String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
registeredBy Operator? @relation("PatientRegisteredBy", fields: [registeredById], references: [id], onDelete: SetNull)
clinicalRecords ClinicalRecord[]
appointments Appointment[]

@@index([lastName, firstName])
@@index([registeredById])
}

model ClinicalRecord {
id String @id @default(cuid())
patientId String
authorOperatorId String
appointmentId String? @unique
chiefComplaint String?
diagnosis String?
treatmentPlan String?
recordedAt DateTime @default(now())
updatedAt DateTime @updatedAt
patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
authorOperator Operator @relation("ClinicalRecordAuthor", fields: [authorOperatorId], references: [id], onDelete: Restrict)
appointment Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
notes ClinicalNote[]

@@index([patientId])
@@index([authorOperatorId])
}

model ClinicalNote {
id String @id @default(cuid())
clinicalRecordId String
authorOperatorId String
note String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
clinicalRecord ClinicalRecord @relation(fields: [clinicalRecordId], references: [id], onDelete: Cascade)
authorOperator Operator @relation("ClinicalNoteAuthor", fields: [authorOperatorId], references: [id], onDelete: Restrict)

@@index([clinicalRecordId])
@@index([authorOperatorId])
}

model Appointment {
id String @id @default(cuid())
patientId String
operatorId String
createdByUserId String
scheduledAt DateTime
durationMinutes Int @default(30)
reason String?
notes String?
status AppointmentStatus @default(SCHEDULED)
completedAt DateTime?
cancelledAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
operator Operator @relation("AppointmentOperator", fields: [operatorId], references: [id], onDelete: Restrict)
createdBy User @relation("AppointmentCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)
clinicalRecord ClinicalRecord?

@@index([patientId, scheduledAt])
@@index([operatorId, scheduledAt])
@@index([createdByUserId])
@@index([status, scheduledAt])
}
END FILE

## Tool Results

[writeFile]: C:\Workspace\DG_SE_DEV\ClinicOS\prisma\schema.prisma
