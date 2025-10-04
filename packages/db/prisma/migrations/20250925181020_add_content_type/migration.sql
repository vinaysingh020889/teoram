-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('LAUNCH', 'SPECIFICATION', 'COMPARISON', 'SALES', 'REVIEW', 'HOWTO', 'ANALYSIS', 'RUMOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourceKind" ADD VALUE 'LAUNCH';
ALTER TYPE "SourceKind" ADD VALUE 'COMPARISON';
ALTER TYPE "SourceKind" ADD VALUE 'SALES';
ALTER TYPE "SourceKind" ADD VALUE 'REVIEW';
ALTER TYPE "SourceKind" ADD VALUE 'HOWTO';
ALTER TYPE "SourceKind" ADD VALUE 'ANALYSIS';
ALTER TYPE "SourceKind" ADD VALUE 'RUMOR';

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "contentType" "ContentType";
