/*
  Warnings:

  - The primary key for the `exam_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `health_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `medications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `patient_doctors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sub_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vaccines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vital_scores` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "health_records" DROP CONSTRAINT "health_records_user_id_fkey";

-- DropForeignKey
ALTER TABLE "medications" DROP CONSTRAINT "medications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_doctors" DROP CONSTRAINT "patient_doctors_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_doctors" DROP CONSTRAINT "patient_doctors_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "sub_items" DROP CONSTRAINT "sub_items_record_id_fkey";

-- DropForeignKey
ALTER TABLE "vaccines" DROP CONSTRAINT "vaccines_user_id_fkey";

-- DropForeignKey
ALTER TABLE "vital_scores" DROP CONSTRAINT "vital_scores_user_id_fkey";

-- AlterTable
ALTER TABLE "exam_types" DROP CONSTRAINT "exam_types_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "health_records" DROP CONSTRAINT "health_records_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "health_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "medications" DROP CONSTRAINT "medications_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "medications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "patient_doctors" DROP CONSTRAINT "patient_doctors_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "patient_id" SET DATA TYPE TEXT,
ALTER COLUMN "doctor_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "patient_doctors_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "shared_data" ADD COLUMN     "bp_diastolic" INTEGER,
ADD COLUMN     "bp_systolic" INTEGER;

-- AlterTable
ALTER TABLE "sub_items" DROP CONSTRAINT "sub_items_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "record_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "sub_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vaccines" DROP CONSTRAINT "vaccines_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vital_scores" DROP CONSTRAINT "vital_scores_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "vital_scores_pkey" PRIMARY KEY ("id");

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
