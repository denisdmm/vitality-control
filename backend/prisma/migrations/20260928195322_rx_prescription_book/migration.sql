/*
  Migration destrutiva: o receituário substitui a lista solta de medicamentos.
  As 4 linhas existentes em `medications` são descartadas (decisão de produto
  registrada em docs/migration-plan/LOG.md; dump em ~/backups/).

  O script gerado por `prisma migrate dev` não é aplicável, porque tentava
  `ADD COLUMN prescription_id TEXT NOT NULL` em tabela com dados. Aqui a tabela é
  derrubada e recriada, então `prescriptions` precisa existir antes das FKs.

  Rollback: ~/backups/rx-rollback.sql
*/

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('ATIVA', 'ENCERRADA');

-- DropTable
DROP TABLE "medications";

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ATIVA',
    "file_stored_name" TEXT NOT NULL,
    "file_display_name" TEXT NOT NULL,
    "file_mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "continuous_use" BOOLEAN NOT NULL DEFAULT false,
    "prescribed_by_id" TEXT,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_schedules" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "time" TEXT NOT NULL,

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_status_idx" ON "prescriptions"("patient_id", "status");

-- CreateIndex
CREATE INDEX "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "medication_schedules_medication_id_time_key" ON "medication_schedules"("medication_id", "time");

-- CreateIndex
CREATE INDEX "medications_user_id_idx" ON "medications"("user_id");

-- CreateIndex
CREATE INDEX "medications_prescription_id_idx" ON "medications"("prescription_id");

-- CreateIndex
CREATE INDEX "medications_user_id_continuous_use_idx" ON "medications"("user_id", "continuous_use");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescribed_by_id_fkey" FOREIGN KEY ("prescribed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
