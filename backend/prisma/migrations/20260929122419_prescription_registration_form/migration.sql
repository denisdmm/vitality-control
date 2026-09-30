/*
  Warnings:

  - You are about to drop the column `uploaded_by_id` on the `prescriptions` table. All the data in the column will be lost.
  - Added the required column `created_by_id` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_uploaded_by_id_fkey";

-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "duration_days" INTEGER;

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "uploaded_by_id",
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ALTER COLUMN "file_stored_name" DROP NOT NULL,
ALTER COLUMN "file_display_name" DROP NOT NULL,
ALTER COLUMN "file_mime_type" DROP NOT NULL,
ALTER COLUMN "file_size" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
