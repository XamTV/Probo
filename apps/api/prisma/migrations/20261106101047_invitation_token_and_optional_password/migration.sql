-- AlterTable
ALTER TABLE "user" ADD COLUMN     "invitation_expires_at" TIMESTAMP(3),
ADD COLUMN     "invitation_token_hash" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;
