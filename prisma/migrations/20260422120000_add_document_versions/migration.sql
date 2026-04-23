-- CreateEnum
CREATE TYPE "VersionTrigger" AS ENUM ('MANUAL', 'AI_EDIT', 'TEMPLATE_LOAD', 'RESTORE', 'AUTO');

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "yamlContent" TEXT,
    "trigger" "VersionTrigger" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_idx" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: copy previousSource into DocumentVersion before dropping
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "DocumentVersion" ("id", "documentId", "version", "source", "yamlContent", "trigger", "label", "createdAt")
SELECT
  gen_random_uuid()::text,
  "id",
  1,
  "previousSource",
  "yamlContent",
  'MANUAL'::"VersionTrigger",
  'Migrated from previous version',
  "updatedAt" - interval '1 second'
FROM "Document"
WHERE "previousSource" IS NOT NULL AND "previousSource" != '';

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "previousSource";
