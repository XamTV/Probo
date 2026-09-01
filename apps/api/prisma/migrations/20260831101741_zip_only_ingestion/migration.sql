/*
  Warnings:

  - You are about to drop the column `drive_connection_id` on the `import_batch` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `import_batch` table. All the data in the column will be lost.
  - You are about to drop the `drive_connection` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `archive_name` to the `import_batch` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "drive_connection" DROP CONSTRAINT "drive_connection_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "import_batch" DROP CONSTRAINT "import_batch_drive_connection_id_fkey";

-- AlterTable
ALTER TABLE "import_batch" DROP COLUMN "drive_connection_id",
DROP COLUMN "source",
ADD COLUMN     "archive_name" TEXT NOT NULL;

-- DropTable
DROP TABLE "drive_connection";

-- DropEnum
DROP TYPE "import_source";
