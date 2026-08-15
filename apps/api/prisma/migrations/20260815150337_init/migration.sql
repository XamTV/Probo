-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'ADMISSIONS_OFFICER');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('RESUME', 'COVER_LETTER', 'RECOMMENDATION_LETTER', 'PORTFOLIO', 'OTHER');

-- CreateEnum
CREATE TYPE "criterion_type" AS ENUM ('KEYWORD', 'REQUIRED_LEVEL', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "import_source" AS ENUM ('ZIP', 'GOOGLE_DRIVE');

-- CreateEnum
CREATE TYPE "import_batch_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('PENDING', 'RUNNING', 'ANALYSED', 'FAILED');

-- CreateEnum
CREATE TYPE "extraction_method" AS ENUM ('NATIVE', 'OCR', 'FAILED');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('PENDING', 'EXTRACTING', 'LEVEL_1_ANALYSIS', 'LEVEL_2_ANALYSIS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "atypical_reason" AS ENUM ('LOW_CONFIDENCE', 'UNEXPECTED_TYPE', 'UNREADABLE');

-- CreateTable
CREATE TABLE "institution" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "siret" VARCHAR(14),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'ADMISSIONS_OFFICER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_connection" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "expected_types" "document_type"[],
    "confidence_threshold" INTEGER NOT NULL DEFAULT 70,
    "relevance_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "clarity_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "formal_quality_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "opens_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" "criterion_type" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID,
    "drive_connection_id" UUID,
    "source" "import_source" NOT NULL,
    "status" "import_batch_status" NOT NULL DEFAULT 'PENDING',
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_file_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_email" TEXT,
    "external_ref" TEXT,
    "status" "application_status" NOT NULL DEFAULT 'PENDING',
    "overall_score" DOUBLE PRECISION,
    "atypical_document_count" INTEGER NOT NULL DEFAULT 0,
    "purge_due_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extraction_method" "extraction_method",
    "status" "document_status" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_text" (
    "document_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_text_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "document_analysis" (
    "document_id" UUID NOT NULL,
    "detected_type" "document_type",
    "confidence" INTEGER,
    "is_atypical" BOOLEAN NOT NULL DEFAULT false,
    "atypical_reason" "atypical_reason",
    "level1_rationale" TEXT,
    "relevance_score" INTEGER,
    "clarity_score" INTEGER,
    "formal_quality_score" INTEGER,
    "relevance_rationale" TEXT,
    "clarity_rationale" TEXT,
    "formal_quality_rationale" TEXT,
    "document_score" DOUBLE PRECISION,
    "level1_model" TEXT,
    "level2_model" TEXT,
    "prompt_version" TEXT NOT NULL,
    "level1_tokens" INTEGER,
    "level2_tokens" INTEGER,
    "duration_ms" INTEGER,
    "analysed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_analysis_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "audit_entry" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_institution_id_idx" ON "user"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_connection_institution_id_folder_id_key" ON "drive_connection"("institution_id", "folder_id");

-- CreateIndex
CREATE INDEX "campaign_institution_id_status_idx" ON "campaign"("institution_id", "status");

-- CreateIndex
CREATE INDEX "criterion_campaign_id_idx" ON "criterion"("campaign_id");

-- CreateIndex
CREATE INDEX "import_batch_campaign_id_idx" ON "import_batch"("campaign_id");

-- CreateIndex
CREATE INDEX "application_campaign_id_overall_score_idx" ON "application"("campaign_id", "overall_score" DESC);

-- CreateIndex
CREATE INDEX "application_purge_due_at_idx" ON "application"("purge_due_at");

-- CreateIndex
CREATE INDEX "application_institution_id_idx" ON "application"("institution_id");

-- CreateIndex
CREATE INDEX "document_application_id_idx" ON "document"("application_id");

-- CreateIndex
CREATE INDEX "document_sha256_idx" ON "document"("sha256");

-- CreateIndex
CREATE INDEX "document_status_idx" ON "document"("status");

-- CreateIndex
CREATE INDEX "document_analysis_is_atypical_idx" ON "document_analysis"("is_atypical");

-- CreateIndex
CREATE INDEX "audit_entry_institution_id_occurred_at_idx" ON "audit_entry"("institution_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_connection" ADD CONSTRAINT "drive_connection_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion" ADD CONSTRAINT "criterion_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_drive_connection_id_fkey" FOREIGN KEY ("drive_connection_id") REFERENCES "drive_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_text" ADD CONSTRAINT "document_text_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_analysis" ADD CONSTRAINT "document_analysis_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entry" ADD CONSTRAINT "audit_entry_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entry" ADD CONSTRAINT "audit_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
