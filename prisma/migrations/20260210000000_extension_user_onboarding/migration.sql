-- AlterTable: ExtensionDevice - add onboarding fields
ALTER TABLE "extension_devices" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);
ALTER TABLE "extension_devices" ADD COLUMN "onboarding_email" TEXT;

-- AlterTable: ExtensionUsage - add userId
ALTER TABLE "extension_usages" ADD COLUMN "user_id" TEXT;

-- AlterTable: ExtensionLoginEvent - add userId
ALTER TABLE "extension_login_events" ADD COLUMN "user_id" TEXT;

-- AlterTable: Organization - add extension management fields
ALTER TABLE "organizations" ADD COLUMN "inactive_threshold_minutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "organizations" ADD COLUMN "extension_auto_deployed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "extension_usages_user_id_idx" ON "extension_usages"("user_id");

-- CreateIndex
CREATE INDEX "extension_login_events_user_id_idx" ON "extension_login_events"("user_id");

-- AddForeignKey
ALTER TABLE "extension_usages" ADD CONSTRAINT "extension_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_login_events" ADD CONSTRAINT "extension_login_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
