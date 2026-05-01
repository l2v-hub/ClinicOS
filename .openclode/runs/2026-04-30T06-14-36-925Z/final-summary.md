# Final Summary

**Agents run:** 1
**Dry-run:** false

## Last agent output

FILE: prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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
  id                  String        @id @default(cuid())
  email               String        @unique
  passwordHash        String
  fullName            String
  role                Role          @default(OPERATOR)
  isActive            Boolean       @default(true)
  lastLoginAt         DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  operator            Operator?
  appointmentsCreated Appointment[] @relation("AppointmentCreatedBy")
}

model Operator {
  id                 String           @id @default(cuid())
  userId             String           @unique
  licenseNumber      String?          @unique
  department         String?
  phone              String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  user               User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  registeredPatients Patient[]        @relation("PatientRegisteredBy")
  appointments       Appointment[]    @relation("AppointmentOperator")
  clinicalRecords    ClinicalRecord[] @relation("ClinicalRecordAuthor")
  clinicalNotes      ClinicalNote[]   @relation("ClinicalNoteAuthor")
}

model Patient {
  id                    String           @id @default(cuid())
  medicalRecordNumber   String           @unique
  firstName             String
  lastName              String
  dateOfBirth           DateTime
  sex                   String?
  email                 String?
  phone                 String?
  address               String?
  emergencyContactName  String?
  emergencyContactPhone String?
  registeredById        String?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  registeredBy          Operator?        @relation("PatientRegisteredBy", fields: [registeredById], references: [id], onDelete: SetNull)
  clinicalRecords       ClinicalRecord[]
  appointments          Appointment[]

  @@index([lastName, firstName])
  @@index([registeredById])
}

model ClinicalRecord {
  id               String         @id @default(cuid())
  patientId        String
  authorOperatorId String
  appointmentId    String?        @unique
  chiefComplaint   String?
  diagnosis        String?
  treatmentPlan    String?
  recordedAt       DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  patient          Patient        @relation(fields: [patientId], references: [id], onDelete: Cascade)
  authorOperator   Operator       @relation("ClinicalRecordAuthor", fields: [authorOperatorId], references: [id], onDelete: Restrict)
  appointment      Appointment?   @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  notes            ClinicalNote[]

  @@index([patientId])
  @@index([authorOperatorId])
}

model ClinicalNote {
  id               String         @id @default(cuid())
  clinicalRecordId String
  authorOperatorId String
  note             String
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  clinicalRecord   ClinicalRecord @relation(fields: [clinicalRecordId], references: [id], onDelete: Cascade)
  authorOperator   Operator       @relation("ClinicalNoteAuthor", fields: [authorOperatorId], references: [id], onDelete: Restrict)

  @@index([clinicalRecordId])
  @@index([authorOperatorId])
}

model Appointment {
  id              String            @id @default(cuid())
  patientId       String
  operatorId      String
  createdByUserId String
  scheduledAt     DateTime
  durationMinutes Int               @default(30)
  reason          String?
  notes           String?
  status          AppointmentStatus @default(SCHEDULED)
  completedAt     DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  patient         Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  operator        Operator          @relation("AppointmentOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  createdBy       User              @relation("AppointmentCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)
  clinicalRecord  ClinicalRecord?

  @@index([patientId, scheduledAt])
  @@index([operatorId, scheduledAt])
  @@index([createdByUserId])
  @@index([status, scheduledAt])
}
END FILE
