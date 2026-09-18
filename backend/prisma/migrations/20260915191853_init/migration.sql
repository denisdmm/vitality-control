-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PACIENTE', 'MEDICO', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "HealthRecordStatus" AS ENUM ('SOLICITADO', 'AGENDADO', 'REALIZADO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "social_name" TEXT,
    "email" TEXT,
    "medical_record_number" TEXT,
    "crm" TEXT,
    "photo_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PACIENTE',
    "height" DOUBLE PRECISION,
    "inactivity_timeout" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_doctors" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,

    CONSTRAINT "patient_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "request_date" TIMESTAMPTZ NOT NULL,
    "exam_date" TIMESTAMPTZ,
    "result" TEXT,
    "status" "HealthRecordStatus" NOT NULL DEFAULT 'SOLICITADO',
    "requesting_doctor_name" TEXT,
    "requesting_doctor_crm" TEXT,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_items" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reference" TEXT NOT NULL,

    CONSTRAINT "sub_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_scores" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "blood_pressure_periods" JSONB,
    "glucose_periods" JSONB,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "vital_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "vaccination_date" TIMESTAMPTZ NOT NULL,
    "series_schedule" TEXT,
    "interval_between_doses" INTEGER,
    "interval_between_booster_doses" INTEGER,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_data" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bp_systolic_ideal" INTEGER,
    "bp_diastolic_ideal" INTEGER,
    "bp_systolic_limit" INTEGER,
    "bp_diastolic_limit" INTEGER,
    "glucose_pre_limit" INTEGER,
    "glucose_diabetes_limit" INTEGER,

    CONSTRAINT "shared_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_crm_key" ON "users"("crm");

-- CreateIndex
CREATE INDEX "patient_doctors_doctor_id_idx" ON "patient_doctors"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_doctors_patient_id_doctor_id_key" ON "patient_doctors"("patient_id", "doctor_id");

-- CreateIndex
CREATE INDEX "health_records_user_id_idx" ON "health_records"("user_id");

-- CreateIndex
CREATE INDEX "sub_items_record_id_idx" ON "sub_items"("record_id");

-- CreateIndex
CREATE INDEX "vital_scores_date_idx" ON "vital_scores"("date");

-- CreateIndex
CREATE UNIQUE INDEX "vital_scores_user_id_date_key" ON "vital_scores"("user_id", "date");

-- CreateIndex
CREATE INDEX "medications_user_id_idx" ON "medications"("user_id");

-- CreateIndex
CREATE INDEX "vaccines_user_id_idx" ON "vaccines"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_types_label_key" ON "exam_types"("label");

-- AddForeignKey
ALTER TABLE "patient_doctors" ADD CONSTRAINT "patient_doctors_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_doctors" ADD CONSTRAINT "patient_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_items" ADD CONSTRAINT "sub_items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "health_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_scores" ADD CONSTRAINT "vital_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
