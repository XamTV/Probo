/*
  Warnings:

  - You are about to drop the `criterion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `identity_source` to the `application` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "identity_source" AS ENUM ('FOLDER', 'FILENAME', 'CONTENT', 'MANUAL');

-- AlterEnum
ALTER TYPE "import_batch_status" ADD VALUE 'AWAITING_RECONCILIATION';

-- DropForeignKey
ALTER TABLE "criterion" DROP CONSTRAINT "criterion_campaign_id_fkey";

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "identity_source" "identity_source" NOT NULL;

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "detected_candidate_name" TEXT,
ADD COLUMN     "detected_name_confidence" INTEGER;

-- DropTable
DROP TABLE "criterion";

-- DropEnum
DROP TYPE "criterion_type";

-- CreateTable
CREATE TABLE "reference_profile" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "text" TEXT,
    "file_name" TEXT,
    "storage_key" TEXT,
    "extracted_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reference_profile_campaign_id_document_type_key" ON "reference_profile"("campaign_id", "document_type");

-- AddForeignKey
ALTER TABLE "reference_profile" ADD CONSTRAINT "reference_profile_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
