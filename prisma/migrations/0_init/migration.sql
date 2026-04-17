-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'DOMAIN', 'SUBDOMAIN', 'REGEX');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AppSource" AS ENUM ('SSO_DISCOVERY', 'MANUAL', 'CSV_IMPORT', 'API_SYNC');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DAYS_30', 'DAYS_60', 'DAYS_90', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccessSource" AS ENUM ('SSO_LOG', 'MANUAL', 'HR_SYNC', 'FLEET_DM');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEWER', 'USER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('GOOGLE_WORKSPACE', 'OKTA', 'MICROSOFT_ENTRA', 'HR_SYSTEM', 'FLEETDM');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMatchStatus" AS ENUM ('PENDING', 'AUTO_MATCHED', 'MANUAL', 'CONFIRMED', 'REJECTED', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "MatchSource" AS ENUM ('PATTERN', 'CATALOG', 'LLM', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "MerchantMatchType" AS ENUM ('EXACT', 'CONTAINS', 'REGEX');

-- CreateEnum
CREATE TYPE "CardTransactionType" AS ENUM ('APPROVAL', 'PURCHASE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('COST_ANALYSIS', 'RENEWAL', 'TERMINATED_USERS');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('WINDOWS', 'MACOS', 'LINUX', 'IOS', 'ANDROID', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ONLINE', 'OFFLINE', 'RETIRED');

-- CreateEnum
CREATE TYPE "DeviceAppApprovalStatus" AS ENUM ('UNKNOWN', 'APPROVED', 'SHADOW_IT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ExtensionWhitelistSource" AS ENUM ('MANUAL', 'GOOGLE_SYNC', 'ADMIN_IMPORT');

-- CreateEnum
CREATE TYPE "ExtensionConfigCategory" AS ENUM ('GENERAL', 'SYNC_INTERVALS', 'FEATURES', 'FILTERS', 'SECURITY');

-- CreateEnum
CREATE TYPE "ExtensionConfigValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "ExtensionPlatform" AS ENUM ('CHROME', 'WINDOWS_EXE', 'WINDOWS_MSI', 'MAC_PKG', 'MAC_DMG');

-- CreateEnum
CREATE TYPE "ExtensionBuildStatus" AS ENUM ('PENDING', 'BUILDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExtensionDeviceStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExtensionAuthType" AS ENUM ('PASSWORD', 'MAGIC_LINK', 'OAUTH', 'SSO');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "google_customer_id" TEXT,
    "google_primary_domain" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "employee_id" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "terminated_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "organization_id" TEXT,
    "team_id" TEXT,
    "manager_id" TEXT,
    "is_google_admin" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invited_by_id" TEXT,
    "team_id" TEXT,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "vendor_name" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_patterns" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "match_type" "MatchType" NOT NULL DEFAULT 'DOMAIN',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "catalog_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AppSource" NOT NULL DEFAULT 'MANUAL',
    "catalog_id" TEXT,
    "custom_logo_url" TEXT,
    "custom_website" TEXT,
    "category" TEXT,
    "owner_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "risk_score" INTEGER DEFAULT 0,
    "discovered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_teams" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "app_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_users" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "subscription_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "total_licenses" INTEGER,
    "used_licenses" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "auto_renewal" BOOLEAN NOT NULL DEFAULT true,
    "renewal_alert_30" BOOLEAN NOT NULL DEFAULT true,
    "renewal_alert_60" BOOLEAN NOT NULL DEFAULT false,
    "renewal_alert_90" BOOLEAN NOT NULL DEFAULT false,
    "contract_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_alerts" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_app_accesses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "access_level" "AccessLevel",
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "source" "AccessSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_app_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "items_created" INTEGER NOT NULL DEFAULT 0,
    "items_updated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "card_last_4" TEXT,
    "approval_number" TEXT,
    "category" TEXT,
    "memo" TEXT,
    "matched_app_id" TEXT,
    "match_confidence" DOUBLE PRECISION,
    "match_status" "PaymentMatchStatus" NOT NULL DEFAULT 'PENDING',
    "match_source" "MatchSource",
    "linked_subscription_id" TEXT,
    "team_id" TEXT,
    "user_id" TEXT,
    "import_batch_id" TEXT NOT NULL,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_inference_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "normalized_name" TEXT,
    "llm_provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "is_saas" BOOLEAN NOT NULL,
    "suggested_name" TEXT,
    "category" TEXT,
    "website" TEXT,
    "reasoning" TEXT,
    "raw_result" JSONB,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "error_code" TEXT,
    "catalog_id" TEXT,
    "app_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_inference_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_patterns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "match_type" "MerchantMatchType" NOT NULL DEFAULT 'EXACT',
    "app_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_cards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "card_cd" TEXT NOT NULL,
    "card_no" TEXT NOT NULL,
    "card_nm" TEXT,
    "card_last_4" TEXT,
    "encrypted_credentials" TEXT NOT NULL,
    "login_method" TEXT NOT NULL,
    "biz_no" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "team_id" TEXT,
    "assigned_user_id" TEXT,

    CONSTRAINT "corporate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_transactions" (
    "id" TEXT NOT NULL,
    "corporate_card_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "use_dt" TEXT NOT NULL,
    "use_tm" TEXT,
    "appr_no" TEXT NOT NULL,
    "use_store" TEXT NOT NULL,
    "use_amt" DECIMAL(12,2) NOT NULL,
    "pch_dt" TEXT,
    "pch_no" TEXT,
    "settle_dt" TEXT,
    "store_biz_no" TEXT,
    "store_type" TEXT,
    "store_addr" TEXT,
    "use_div" TEXT,
    "inst_mon" TEXT,
    "add_tax" DECIMAL(12,2),
    "matched_app_id" TEXT,
    "match_confidence" DOUBLE PRECISION,
    "match_source" "MatchSource",
    "transaction_type" "CardTransactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'WEEKLY',
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "recipients" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "next_send_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "fleet_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "os_version" TEXT,
    "hardware_model" TEXT,
    "hardware_serial" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "last_seen_at" TIMESTAMP(3),
    "enrolled_at" TIMESTAMP(3),
    "agent_version" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_apps" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "bundle_identifier" TEXT,
    "install_path" TEXT,
    "installed_at" TIMESTAMP(3),
    "matched_app_id" TEXT,
    "match_confidence" DOUBLE PRECISION,
    "match_source" "MatchSource",
    "approval_status" "DeviceAppApprovalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_used_at" TIMESTAMP(3),
    "usage_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_saas_vendors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "transaction_count" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_saas_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_default_apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bundle_id" TEXT,
    "name_pattern" TEXT,
    "platform" "DevicePlatform" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_default_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "google_org_unit_id" TEXT,
    "google_org_unit_path" TEXT,
    "parent_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_whitelists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" "ExtensionWhitelistSource" NOT NULL DEFAULT 'MANUAL',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_blacklists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_blacklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" TEXT NOT NULL,
    "category" "ExtensionConfigCategory" NOT NULL DEFAULT 'GENERAL',
    "value_type" "ExtensionConfigValueType" NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_builds" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" "ExtensionPlatform" NOT NULL DEFAULT 'CHROME',
    "status" "ExtensionBuildStatus" NOT NULL DEFAULT 'PENDING',
    "server_url" TEXT,
    "download_url" TEXT,
    "checksum" TEXT,
    "file_size" INTEGER,
    "build_log" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "extension_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_usages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "total_seconds" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_devices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "device_key" TEXT NOT NULL,
    "browser_info" TEXT,
    "os_info" TEXT,
    "extension_version" TEXT,
    "status" "ExtensionDeviceStatus" NOT NULL DEFAULT 'PENDING',
    "last_seen_at" TIMESTAMP(3),
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_api_tokens" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "device_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_login_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "auth_type" "ExtensionAuthType" NOT NULL DEFAULT 'PASSWORD',
    "captured_at" TIMESTAMP(3) NOT NULL,
    "hibp_checked" BOOLEAN NOT NULL DEFAULT false,
    "hibp_breached" BOOLEAN NOT NULL DEFAULT false,
    "hibp_breach_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_browsing_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "is_whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_browsing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_block_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "block_reason" TEXT NOT NULL,
    "blocked_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_block_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_email_idx" ON "email_verification_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_email_token_key" ON "email_verification_tokens"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_token_key" ON "password_reset_tokens"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_google_customer_id_key" ON "organizations"("google_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_team_id_idx" ON "users"("team_id");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_organization_id_idx" ON "invitations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_organization_id_email_key" ON "invitations"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "saas_catalog_name_key" ON "saas_catalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "saas_catalog_slug_key" ON "saas_catalog"("slug");

-- CreateIndex
CREATE INDEX "saas_catalog_category_idx" ON "saas_catalog"("category");

-- CreateIndex
CREATE INDEX "saas_patterns_pattern_idx" ON "saas_patterns"("pattern");

-- CreateIndex
CREATE UNIQUE INDEX "saas_patterns_pattern_catalog_id_key" ON "saas_patterns"("pattern", "catalog_id");

-- CreateIndex
CREATE INDEX "apps_organization_id_idx" ON "apps"("organization_id");

-- CreateIndex
CREATE INDEX "apps_status_idx" ON "apps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "apps_organization_id_name_key" ON "apps"("organization_id", "name");

-- CreateIndex
CREATE INDEX "app_teams_app_id_idx" ON "app_teams"("app_id");

-- CreateIndex
CREATE INDEX "app_teams_team_id_idx" ON "app_teams"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_teams_app_id_team_id_key" ON "app_teams"("app_id", "team_id");

-- CreateIndex
CREATE INDEX "subscription_users_subscription_id_idx" ON "subscription_users"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_users_user_id_idx" ON "subscription_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_users_subscription_id_user_id_key" ON "subscription_users"("subscription_id", "user_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_renewal_date_idx" ON "subscriptions"("renewal_date");

-- CreateIndex
CREATE INDEX "subscriptions_team_id_idx" ON "subscriptions"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_app_id_organization_id_key" ON "subscriptions"("app_id", "organization_id");

-- CreateIndex
CREATE INDEX "renewal_alerts_scheduled_for_idx" ON "renewal_alerts"("scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_alerts_subscription_id_alert_type_key" ON "renewal_alerts"("subscription_id", "alert_type");

-- CreateIndex
CREATE INDEX "user_app_accesses_user_id_idx" ON "user_app_accesses"("user_id");

-- CreateIndex
CREATE INDEX "user_app_accesses_app_id_idx" ON "user_app_accesses"("app_id");

-- CreateIndex
CREATE INDEX "user_app_accesses_last_used_at_idx" ON "user_app_accesses"("last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_app_accesses_user_id_app_id_key" ON "user_app_accesses"("user_id", "app_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_organization_id_type_key" ON "integrations"("organization_id", "type");

-- CreateIndex
CREATE INDEX "sync_logs_integration_id_idx" ON "sync_logs"("integration_id");

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "payment_records_organization_id_idx" ON "payment_records"("organization_id");

-- CreateIndex
CREATE INDEX "payment_records_transaction_date_idx" ON "payment_records"("transaction_date");

-- CreateIndex
CREATE INDEX "payment_records_match_status_idx" ON "payment_records"("match_status");

-- CreateIndex
CREATE INDEX "payment_records_import_batch_id_idx" ON "payment_records"("import_batch_id");

-- CreateIndex
CREATE INDEX "payment_records_matched_app_id_idx" ON "payment_records"("matched_app_id");

-- CreateIndex
CREATE INDEX "payment_records_team_id_idx" ON "payment_records"("team_id");

-- CreateIndex
CREATE INDEX "payment_records_user_id_idx" ON "payment_records"("user_id");

-- CreateIndex
CREATE INDEX "vendor_inference_logs_organization_id_idx" ON "vendor_inference_logs"("organization_id");

-- CreateIndex
CREATE INDEX "vendor_inference_logs_catalog_id_idx" ON "vendor_inference_logs"("catalog_id");

-- CreateIndex
CREATE INDEX "vendor_inference_logs_app_id_idx" ON "vendor_inference_logs"("app_id");

-- CreateIndex
CREATE INDEX "vendor_inference_logs_created_at_idx" ON "vendor_inference_logs"("created_at");

-- CreateIndex
CREATE INDEX "merchant_patterns_organization_id_idx" ON "merchant_patterns"("organization_id");

-- CreateIndex
CREATE INDEX "merchant_patterns_pattern_idx" ON "merchant_patterns"("pattern");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_patterns_organization_id_pattern_key" ON "merchant_patterns"("organization_id", "pattern");

-- CreateIndex
CREATE INDEX "corporate_cards_organization_id_idx" ON "corporate_cards"("organization_id");

-- CreateIndex
CREATE INDEX "corporate_cards_team_id_idx" ON "corporate_cards"("team_id");

-- CreateIndex
CREATE INDEX "corporate_cards_assigned_user_id_idx" ON "corporate_cards"("assigned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_cards_organization_id_card_no_key" ON "corporate_cards"("organization_id", "card_no");

-- CreateIndex
CREATE INDEX "card_transactions_organization_id_idx" ON "card_transactions"("organization_id");

-- CreateIndex
CREATE INDEX "card_transactions_use_dt_idx" ON "card_transactions"("use_dt");

-- CreateIndex
CREATE INDEX "card_transactions_matched_app_id_idx" ON "card_transactions"("matched_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_transactions_corporate_card_id_appr_no_use_dt_key" ON "card_transactions"("corporate_card_id", "appr_no", "use_dt");

-- CreateIndex
CREATE INDEX "report_schedules_organization_id_idx" ON "report_schedules"("organization_id");

-- CreateIndex
CREATE INDEX "report_schedules_next_send_at_idx" ON "report_schedules"("next_send_at");

-- CreateIndex
CREATE INDEX "report_schedules_is_active_idx" ON "report_schedules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "devices_fleet_id_key" ON "devices"("fleet_id");

-- CreateIndex
CREATE INDEX "devices_organization_id_idx" ON "devices"("organization_id");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "devices_organization_id_fleet_id_key" ON "devices"("organization_id", "fleet_id");

-- CreateIndex
CREATE INDEX "device_apps_device_id_idx" ON "device_apps"("device_id");

-- CreateIndex
CREATE INDEX "device_apps_matched_app_id_idx" ON "device_apps"("matched_app_id");

-- CreateIndex
CREATE INDEX "device_apps_approval_status_idx" ON "device_apps"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "device_apps_device_id_name_version_key" ON "device_apps"("device_id", "name", "version");

-- CreateIndex
CREATE INDEX "non_saas_vendors_organization_id_idx" ON "non_saas_vendors"("organization_id");

-- CreateIndex
CREATE INDEX "non_saas_vendors_normalized_name_idx" ON "non_saas_vendors"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "non_saas_vendors_organization_id_normalized_name_key" ON "non_saas_vendors"("organization_id", "normalized_name");

-- CreateIndex
CREATE INDEX "os_default_apps_platform_idx" ON "os_default_apps"("platform");

-- CreateIndex
CREATE INDEX "os_default_apps_bundle_id_idx" ON "os_default_apps"("bundle_id");

-- CreateIndex
CREATE INDEX "os_default_apps_is_active_idx" ON "os_default_apps"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "os_default_apps_name_platform_key" ON "os_default_apps"("name", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "teams_google_org_unit_id_key" ON "teams"("google_org_unit_id");

-- CreateIndex
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");

-- CreateIndex
CREATE INDEX "teams_parent_id_idx" ON "teams"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_google_org_unit_path_key" ON "teams"("organization_id", "google_org_unit_path");

-- CreateIndex
CREATE INDEX "extension_whitelists_organization_id_idx" ON "extension_whitelists"("organization_id");

-- CreateIndex
CREATE INDEX "extension_whitelists_enabled_idx" ON "extension_whitelists"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "extension_whitelists_organization_id_pattern_key" ON "extension_whitelists"("organization_id", "pattern");

-- CreateIndex
CREATE INDEX "extension_blacklists_organization_id_idx" ON "extension_blacklists"("organization_id");

-- CreateIndex
CREATE INDEX "extension_blacklists_enabled_idx" ON "extension_blacklists"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "extension_blacklists_organization_id_pattern_key" ON "extension_blacklists"("organization_id", "pattern");

-- CreateIndex
CREATE INDEX "extension_configs_organization_id_idx" ON "extension_configs"("organization_id");

-- CreateIndex
CREATE INDEX "extension_configs_category_idx" ON "extension_configs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "extension_configs_organization_id_config_key_key" ON "extension_configs"("organization_id", "config_key");

-- CreateIndex
CREATE INDEX "extension_builds_organization_id_idx" ON "extension_builds"("organization_id");

-- CreateIndex
CREATE INDEX "extension_builds_status_idx" ON "extension_builds"("status");

-- CreateIndex
CREATE INDEX "extension_builds_created_at_idx" ON "extension_builds"("created_at");

-- CreateIndex
CREATE INDEX "extension_usages_organization_id_idx" ON "extension_usages"("organization_id");

-- CreateIndex
CREATE INDEX "extension_usages_domain_idx" ON "extension_usages"("domain");

-- CreateIndex
CREATE INDEX "extension_usages_date_idx" ON "extension_usages"("date");

-- CreateIndex
CREATE UNIQUE INDEX "extension_usages_organization_id_device_id_domain_date_key" ON "extension_usages"("organization_id", "device_id", "domain", "date");

-- CreateIndex
CREATE UNIQUE INDEX "extension_devices_device_key_key" ON "extension_devices"("device_key");

-- CreateIndex
CREATE INDEX "extension_devices_organization_id_idx" ON "extension_devices"("organization_id");

-- CreateIndex
CREATE INDEX "extension_devices_user_id_idx" ON "extension_devices"("user_id");

-- CreateIndex
CREATE INDEX "extension_devices_status_idx" ON "extension_devices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "extension_api_tokens_token_key" ON "extension_api_tokens"("token");

-- CreateIndex
CREATE INDEX "extension_api_tokens_organization_id_idx" ON "extension_api_tokens"("organization_id");

-- CreateIndex
CREATE INDEX "extension_api_tokens_is_active_idx" ON "extension_api_tokens"("is_active");

-- CreateIndex
CREATE INDEX "extension_login_events_organization_id_idx" ON "extension_login_events"("organization_id");

-- CreateIndex
CREATE INDEX "extension_login_events_domain_idx" ON "extension_login_events"("domain");

-- CreateIndex
CREATE INDEX "extension_login_events_device_id_idx" ON "extension_login_events"("device_id");

-- CreateIndex
CREATE INDEX "extension_login_events_captured_at_idx" ON "extension_login_events"("captured_at");

-- CreateIndex
CREATE INDEX "extension_browsing_logs_organization_id_visited_at_idx" ON "extension_browsing_logs"("organization_id", "visited_at");

-- CreateIndex
CREATE INDEX "extension_browsing_logs_user_id_visited_at_idx" ON "extension_browsing_logs"("user_id", "visited_at");

-- CreateIndex
CREATE INDEX "extension_browsing_logs_domain_idx" ON "extension_browsing_logs"("domain");

-- CreateIndex
CREATE INDEX "extension_browsing_logs_device_id_idx" ON "extension_browsing_logs"("device_id");

-- CreateIndex
CREATE INDEX "extension_block_logs_organization_id_blocked_at_idx" ON "extension_block_logs"("organization_id", "blocked_at");

-- CreateIndex
CREATE INDEX "extension_block_logs_user_id_blocked_at_idx" ON "extension_block_logs"("user_id", "blocked_at");

-- CreateIndex
CREATE INDEX "extension_block_logs_domain_idx" ON "extension_block_logs"("domain");

-- CreateIndex
CREATE INDEX "extension_block_logs_device_id_idx" ON "extension_block_logs"("device_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_patterns" ADD CONSTRAINT "saas_patterns_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "saas_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "saas_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_teams" ADD CONSTRAINT "app_teams_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_teams" ADD CONSTRAINT "app_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_users" ADD CONSTRAINT "subscription_users_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_users" ADD CONSTRAINT "subscription_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_app_accesses" ADD CONSTRAINT "user_app_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_app_accesses" ADD CONSTRAINT "user_app_accesses_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_matched_app_id_fkey" FOREIGN KEY ("matched_app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_linked_subscription_id_fkey" FOREIGN KEY ("linked_subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_inference_logs" ADD CONSTRAINT "vendor_inference_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_inference_logs" ADD CONSTRAINT "vendor_inference_logs_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "saas_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_inference_logs" ADD CONSTRAINT "vendor_inference_logs_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_patterns" ADD CONSTRAINT "merchant_patterns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_patterns" ADD CONSTRAINT "merchant_patterns_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_cards" ADD CONSTRAINT "corporate_cards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_cards" ADD CONSTRAINT "corporate_cards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_cards" ADD CONSTRAINT "corporate_cards_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_corporate_card_id_fkey" FOREIGN KEY ("corporate_card_id") REFERENCES "corporate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_matched_app_id_fkey" FOREIGN KEY ("matched_app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_apps" ADD CONSTRAINT "device_apps_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_apps" ADD CONSTRAINT "device_apps_matched_app_id_fkey" FOREIGN KEY ("matched_app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_saas_vendors" ADD CONSTRAINT "non_saas_vendors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_whitelists" ADD CONSTRAINT "extension_whitelists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_blacklists" ADD CONSTRAINT "extension_blacklists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_configs" ADD CONSTRAINT "extension_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_builds" ADD CONSTRAINT "extension_builds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_usages" ADD CONSTRAINT "extension_usages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_devices" ADD CONSTRAINT "extension_devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_devices" ADD CONSTRAINT "extension_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_api_tokens" ADD CONSTRAINT "extension_api_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_login_events" ADD CONSTRAINT "extension_login_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_browsing_logs" ADD CONSTRAINT "extension_browsing_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_browsing_logs" ADD CONSTRAINT "extension_browsing_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_block_logs" ADD CONSTRAINT "extension_block_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_block_logs" ADD CONSTRAINT "extension_block_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

