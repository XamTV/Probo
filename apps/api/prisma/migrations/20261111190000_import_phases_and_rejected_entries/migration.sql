-- Lot 3. RUNNING splits into one value per phase of the import screen.
-- No row can hold RUNNING: nothing wrote an import batch before this lot, so
-- the cast below has nothing to map. See the 2026-11-06 journal entries.

-- CreateEnum
CREATE TYPE "archive_limit" AS ENUM ('FILE_COUNT', 'EXTRACTED_SIZE', 'DECOMPRESSION_RATIO');

-- CreateEnum
CREATE TYPE "rejection_reason" AS ENUM ('PATH_ESCAPE', 'NOT_REGULAR_FILE', 'FORBIDDEN_TYPE', 'SYSTEM_ENTRY', 'FILE_TOO_LARGE', 'ARCHIVE_LIMIT');

-- AlterEnum
BEGIN;
CREATE TYPE "import_batch_status_new" AS ENUM ('PENDING', 'UNPACKING', 'READING_IDENTITY', 'AWAITING_RECONCILIATION', 'ANALYSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."import_batch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "import_batch" ALTER COLUMN "status" TYPE "import_batch_status_new" USING ("status"::text::"import_batch_status_new");
ALTER TYPE "import_batch_status" RENAME TO "import_batch_status_old";
ALTER TYPE "import_batch_status_new" RENAME TO "import_batch_status";
DROP TYPE "public"."import_batch_status_old";
ALTER TABLE "import_batch" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "document" DROP COLUMN "mime_type",
ALTER COLUMN "application_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "import_batch" ADD COLUMN     "archive_limit" "archive_limit",
ADD COLUMN     "archive_size_bytes" BIGINT,
ADD COLUMN     "extracted_bytes_at_abort" BIGINT,
ADD COLUMN     "observed_ratio" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "rejected_entry" (
    "id" UUID NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "reason" "rejection_reason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rejected_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rejected_entry_import_batch_id_idx" ON "rejected_entry"("import_batch_id");

-- AddForeignKey
ALTER TABLE "rejected_entry" ADD CONSTRAINT "rejected_entry_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

