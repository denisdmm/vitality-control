-- CreateEnum
CREATE TYPE "PatientAuditAction" AS ENUM ('LINK_ADDED', 'LINK_REMOVED', 'PATIENT_TRANSFERRED', 'CHART_VIEWED');

-- AlterTable
ALTER TABLE "patient_doctors" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_audit_events" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "subject_doctor_id" TEXT,
    "action" "PatientAuditAction" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_notes_patient_id_created_at_idx" ON "clinical_notes"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_audit_events_patient_id_created_at_idx" ON "patient_audit_events"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_doctors_patient_id_idx" ON "patient_doctors"("patient_id");

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_audit_events" ADD CONSTRAINT "patient_audit_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_audit_events" ADD CONSTRAINT "patient_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_audit_events" ADD CONSTRAINT "patient_audit_events_subject_doctor_id_fkey" FOREIGN KEY ("subject_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
