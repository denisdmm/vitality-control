// Central de Vitalidade — Schema Prisma (rascunho de migração)
// Banco-alvo: PostgreSQL 16
// Uso: referência para a Fase 1 (scaffold do backend NestJS)
// NOTA: arquivo de documentação; o schema final ficará em backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

enum Role {
  PACIENTE
  MEDICO
  ADMINISTRADOR
}

enum HealthRecordStatus {
  SOLICITADO
  AGENDADO
  REALIZADO
}

enum VaccineSeries {
  SINGLE_DOSE
  TWO_DOSE
  THREE_DOSE
}

// ─────────────────────────────────────────────────────────────
// Usuários  (origem: central-de-vitalidade/users/accounts/{id})
// ─────────────────────────────────────────────────────────────

model User {
  id                  String   @id @default(uuid()) @db.Uuid
  name                String   @unique // username de login
  passwordHash        String   @map("password_hash")
  fullName            String   @map("full_name")
  socialName          String?  @map("social_name")
  email               String?
  medicalRecordNumber String?  @map("medical_record_number")
  crm                 String?  @unique
  photoUrl            String?  @map("photo_url")
  role                Role     @default(PACIENTE)
  height              Float?   // metros (IMC)
  inactivityTimeout   Int?     @map("inactivity_timeout") // ms
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // N:N self — pacientes vinculados a médicos (origem: doctorIds[])
  patientLinks  PatientDoctor[] @relation("patient")
  doctorLinks   PatientDoctor[] @relation("doctor")

  healthRecords HealthRecord[]
  medications   Medication[]
  vaccines      Vaccine[]
  vitals        VitalScore[]

  @@map("users")
}

// Join table para N:N paciente↔médico (origem: users/accounts/{id}.doctorIds)
model PatientDoctor {
  id        String @id @default(uuid()) @db.Uuid
  patientId String @map("patient_id") @db.Uuid
  doctorId  String @map("doctor_id") @db.Uuid
  patient   User   @relation("patient", fields: [patientId], references: [id], onDelete: Cascade)
  doctor    User   @relation("doctor", fields: [doctorId], references: [id], onDelete: Cascade)

  @@unique([patientId, doctorId])
  @@index([doctorId])
  @@map("patient_doctors")
}

// ─────────────────────────────────────────────────────────────
// Exames  (origem: .../users/accounts/{uid}/healthRecords/{id})
// ─────────────────────────────────────────────────────────────

model HealthRecord {
  id                   String             @id @default(uuid()) @db.Uuid
  userId               String             @map("user_id") @db.Uuid
  name                 String
  type                 String
  requestDate          DateTime           @map("request_date") @db.Timestamptz
  examDate             DateTime?          @map("exam_date") @db.Timestamptz
  result               String?
  status               HealthRecordStatus @default(SOLICITADO)
  requestingDoctorName String?            @map("requesting_doctor_name")
  requestingDoctorCrm  String?            @map("requesting_doctor_crm")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  subItems SubItem[]

  @@index([userId])
  @@map("health_records")
}

// Componentes do exame (origem: .../healthRecords/{id}/subItems/{itemId})
model SubItem {
  id        String @id @default(uuid()) @db.Uuid
  recordId  String @map("record_id") @db.Uuid
  name      String
  result    String
  reference String

  record HealthRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)

  @@index([recordId])
  @@map("sub_items")
}

// ─────────────────────────────────────────────────────────────
// Biometria diária (origem: data/bloodPressure, data/glucose, data/weight)
// ─────────────────────────────────────────────────────────────
// ADR-003: tabela única por dia/usuário; períodos manhã/tarde/noite em JSONB,
// espelhando o documento Firestore original.

model VitalScore {
  id                   String  @id @default(uuid()) @db.Uuid
  userId               String  @map("user_id") @db.Uuid
  date                 DateTime @db.Date // 'YYYY-MM-DD'
  // { manha?: {...}, tarde?: {...}, noite?: {...} } cada um { systolic, diastolic, pulse }
  bloodPressurePeriods Json?   @map("blood_pressure_periods")
  // { manha?: {value}, tarde?: {value}, noite?: {value} }
  glucosePeriods       Json?   @map("glucose_periods")
  weight               Float?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([date])
  @@map("vital_scores")
}

// ─────────────────────────────────────────────────────────────
// Medicamentos e Vacinas
// (origem: central-de-vitalidade/{uid}/medications e /vaccines)
// ─────────────────────────────────────────────────────────────

model Medication {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @map("user_id") @db.Uuid
  name      String
  dosage    String
  frequency String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("medications")
}

model Vaccine {
  id                         String         @id @default(uuid()) @db.Uuid
  userId                     String         @map("user_id") @db.Uuid
  vaccineName                String         @map("vaccine_name")
  vaccinationDate            DateTime       @map("vaccination_date") @db.Timestamptz
  seriesSchedule             String?        @map("series_schedule") // 'single-dose'|'two-dose'|'three-dose'
  intervalBetweenDoses       Int?           @map("interval_between_doses") // meses
  intervalBetweenBoosterDoses Int?          @map("interval_between_booster_doses") // meses

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("vaccines")
}

// ─────────────────────────────────────────────────────────────
// Catálogo compartilhado (origem: sharedData/exams/{slug})
// ─────────────────────────────────────────────────────────────

model ExamType {
  id    String @id @default(uuid()) @db.Uuid
  label String @unique

  @@map("exam_types")
}

// ─────────────────────────────────────────────────────────────
// Índices de saúde globais (origem: sharedData singleton)
// ADR-004: colunas tipadas (não JSONB) para validação e consulta.
// ─────────────────────────────────────────────────────────────

model SharedData {
  id                    Int     @id @default(1)
  bpSystolicIdeal       Int?    @map("bp_systolic_ideal")
  bpDiastolicIdeal      Int?    @map("bp_diastolic_ideal")
  bpSystolicLimit       Int?    @map("bp_systolic_limit")
  bpDiastolicLimit      Int?    @map("bp_diastolic_limit")
  glucosePreLimit       Int?    @map("glucose_pre_limit")
  glucoseDiabetesLimit  Int?    @map("glucose_diabetes_limit")

  @@map("shared_data")
}