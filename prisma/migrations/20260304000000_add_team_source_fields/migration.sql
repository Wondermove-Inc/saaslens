-- CreateEnum
CREATE TYPE "TeamSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'GOOGLE_WORKSPACE', 'AD_SYNC', 'HR_SYNC');

-- AlterTable
ALTER TABLE "teams" ADD COLUMN "external_id" TEXT,
ADD COLUMN "source" "TeamSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_external_id_key" ON "teams"("organization_id", "external_id");
