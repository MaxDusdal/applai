-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'ADDITIONAL';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "isUploadedPdf" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "pdfUrl" TEXT;
