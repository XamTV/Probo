/*
  Warnings:

  - Changed the type of `action` on the `audit_entry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `entity_type` on the `audit_entry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('USER_LOGGED_IN', 'USER_LOGIN_FAILED', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'CAMPAIGN_CREATED', 'CAMPAIGN_UPDATED', 'REFERENCE_PROFILE_UPDATED', 'BATCH_IMPORTED', 'BATCH_REJECTED', 'ARCHIVE_ENTRY_REJECTED', 'IDENTITY_RECONCILED', 'ANALYSIS_VERDICT_OVERRIDDEN', 'APPLICATION_DELETED', 'APPLICATION_PURGED', 'RANKING_EXPORTED');

-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('INSTITUTION', 'USER', 'CAMPAIGN', 'REFERENCE_PROFILE', 'IMPORT_BATCH', 'APPLICATION', 'DOCUMENT', 'SESSION');

-- AlterTable
ALTER TABLE "audit_entry" DROP COLUMN "action",
ADD COLUMN     "action" "audit_action" NOT NULL,
DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" "audit_entity_type" NOT NULL;

-- AlterTable
ALTER TABLE "document_analysis" ADD COLUMN     "overridden_at" TIMESTAMP(3),
ADD COLUMN     "overridden_by_id" UUID,
ADD COLUMN     "overridden_type" "document_type",
ADD COLUMN     "override_rationale" TEXT;

-- AddForeignKey
ALTER TABLE "document_analysis" ADD CONSTRAINT "document_analysis_overridden_by_id_fkey" FOREIGN KEY ("overridden_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
