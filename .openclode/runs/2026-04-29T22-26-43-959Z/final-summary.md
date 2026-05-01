# Final Summary

**Agents run:** 1
**Dry-run:** false

## Last agent output

FILE: prisma/schema.prisma
generator client { provider = 'prisma-client-js' } datasource db { provider = 'postgresql' url = env('DATABASE_URL') } enum Role { OPERATOR MANAGER } enum AppointmentStatus { SCHEDULED COMPLETED CANCELLED NO_SHOW } model User { id String @id @default(cuid()) email String @unique name String role Role createdAt DateTime @default(now()) operator Operator? } model Operator { id String @id @default(cuid()) userId String @unique user User @relation(fields: [userId], references: [id]) patients Patient[] appointments Appointment[] } model Patient { id String @id @default(cuid()) firstName String lastName String birthDate DateTime? phone String? email String? operatorId String? operator Operator? @relation(fields: [operatorId], references: [id]) clinicalRecord ClinicalRecord? appointments Appointment[] createdAt DateTime @default(now()) } model ClinicalRecord { id String @id @default(cuid()) patientId String @unique patient Patient @relation(fields: [patientId], references: [id]) anamnesis String? allergies String? medications String? notes ClinicalNote[] updatedAt DateTime @updatedAt } model ClinicalNote { id String @id @default(cuid()) clinicalRecordId String clinicalRecord ClinicalRecord @relation(fields: [clinicalRecordId], references: [id]) content String createdAt DateTime @default(now()) } model Appointment { id String @id @default(cuid()) patientId String patient Patient @relation(fields: [patientId], references: [id]) operatorId String operator Operator @relation(fields: [operatorId], references: [id]) startAt DateTime endAt DateTime status AppointmentStatus @default(SCHEDULED) notes String? }
END FILE
