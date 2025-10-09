/*
  Warnings:

  - A unique constraint covering the columns `[urlHash]` on the table `Source` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `urlHash` to the `Source` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastSeenAt` to the `Topic` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "urlHash" TEXT NOT NULL,
ADD COLUMN     "urlNorm" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "titleEmbedding" JSONB,
ADD COLUMN     "vectorId" TEXT;

-- CreateTable
CREATE TABLE "TopicThread" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "summary" TEXT,
    "timeline" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_urlHash_key" ON "Source"("urlHash");

-- AddForeignKey
ALTER TABLE "TopicThread" ADD CONSTRAINT "TopicThread_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
