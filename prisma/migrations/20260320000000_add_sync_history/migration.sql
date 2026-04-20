-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('CARD_SYNC', 'CSV_IMPORT', 'REMATCH');

-- AlterTable
ALTER TABLE "corporate_cards" ADD COLUMN "consecutive_fail_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sync_histories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "corporate_card_id" TEXT,
    "file_name" TEXT,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unmatched_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_details" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "triggered_by" TEXT NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "sync_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_histories_organization_id_idx" ON "sync_histories"("organization_id");

-- CreateIndex
CREATE INDEX "sync_histories_corporate_card_id_idx" ON "sync_histories"("corporate_card_id");

-- CreateIndex
CREATE INDEX "sync_histories_type_status_idx" ON "sync_histories"("type", "status");

-- CreateIndex
CREATE INDEX "sync_histories_started_at_idx" ON "sync_histories"("started_at");

-- AddForeignKey
ALTER TABLE "sync_histories" ADD CONSTRAINT "sync_histories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_histories" ADD CONSTRAINT "sync_histories_corporate_card_id_fkey" FOREIGN KEY ("corporate_card_id") REFERENCES "corporate_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_histories" ADD CONSTRAINT "sync_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
