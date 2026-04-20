-- AlterTable: Add pricing model fields to SaaSCatalog
ALTER TABLE "saas_catalog" ADD COLUMN "pricing_model" TEXT;
ALTER TABLE "saas_catalog" ADD COLUMN "base_price_per_seat" DECIMAL;
ALTER TABLE "saas_catalog" ADD COLUMN "base_price_currency" TEXT DEFAULT 'USD';

-- CreateIndex
CREATE INDEX "saas_catalog_pricing_model_idx" ON "saas_catalog"("pricing_model");

-- Seed known PER_SEAT SaaS pricing models (ILIKE for partial matching)
-- DB에서 LLM 분류를 통해 생성된 이름(e.g. "Notion Labs Inc")과 매칭하기 위해
-- ILIKE 패턴 매칭 사용. 각 패턴은 오매칭 방지를 위해 충분히 구체적으로 작성.
UPDATE "saas_catalog" SET "pricing_model" = 'PER_SEAT' WHERE
  "name" ILIKE '%slack%'
  OR "name" ILIKE '%notion%'
  OR "name" ILIKE '%figma%'
  OR "name" ILIKE '%github%'
  OR "name" ILIKE '%gitlab%'
  OR "name" ILIKE '%jira%'
  OR "name" ILIKE '%confluence%'
  OR "name" ILIKE '%asana%'
  OR "name" ILIKE '%monday%'
  OR "name" ILIKE '%linear%'
  OR "name" ILIKE '%zoom%'
  OR "name" ILIKE '%microsoft 365%'
  OR "name" ILIKE '%google workspace%'
  OR "name" ILIKE '%dropbox%'
  OR "name" ILIKE '%1password%'
  OR "name" ILIKE '%lastpass%'
  OR "name" ILIKE '%salesforce%'
  OR "name" ILIKE '%hubspot%'
  OR "name" ILIKE '%zendesk%'
  OR "name" ILIKE '%intercom%'
  OR "name" ILIKE '%datadog%'
  OR "name" ILIKE '%new relic%'
  OR "name" ILIKE '%pagerduty%'
  OR "name" ILIKE '%okta%'
  OR "name" ILIKE '%auth0%'
  OR "name" ILIKE '%atlassian%'
  OR "name" ILIKE '%trello%'
  OR "name" ILIKE '%miro%'
  OR "name" ILIKE '%loom%'
  OR "name" ILIKE '%canva%'
  OR "name" ILIKE '%adobe creative cloud%'
  OR "name" ILIKE '%invision%'
  OR "name" ILIKE '%postman%'
  OR "name" ILIKE '%sentry%';

-- Seed known USAGE_BASED SaaS (ILIKE for partial matching)
UPDATE "saas_catalog" SET "pricing_model" = 'USAGE_BASED' WHERE
  "name" ILIKE '%amazon web services%' OR "name" ILIKE '% aws %' OR "name" ILIKE 'aws %' OR "name" ILIKE '% aws'
  OR "name" ILIKE '%vercel%'
  OR "name" ILIKE '%netlify%'
  OR "name" ILIKE '%google cloud%'
  OR "name" ILIKE '%microsoft azure%' OR "name" ILIKE '%azure%'
  OR "name" ILIKE '%heroku%'
  OR "name" ILIKE '%digitalocean%'
  OR "name" ILIKE '%cloudflare%'
  OR "name" ILIKE '%openai%'
  OR "name" ILIKE '%anthropic%'
  OR "name" ILIKE '%twilio%'
  OR "name" ILIKE '%sendgrid%'
  OR "name" ILIKE '%stripe%';

-- Seed base price per seat for well-known SaaS (USD, ILIKE for partial matching)
UPDATE "saas_catalog" SET "base_price_per_seat" = 7.25 WHERE "name" ILIKE '%slack%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 8.00 WHERE "name" ILIKE '%notion%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 15.00 WHERE "name" ILIKE '%figma%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 4.00 WHERE "name" ILIKE '%github%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 29.00 WHERE "name" ILIKE '%gitlab%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 8.15 WHERE "name" ILIKE '%jira%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 6.05 WHERE "name" ILIKE '%confluence%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 10.99 WHERE "name" ILIKE '%asana%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 9.00 WHERE "name" ILIKE '%monday%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 8.00 WHERE "name" ILIKE '%linear%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 13.33 WHERE "name" ILIKE '%zoom%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 12.50 WHERE "name" ILIKE '%microsoft 365%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 7.20 WHERE "name" ILIKE '%google workspace%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 15.00 WHERE "name" ILIKE '%dropbox%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 7.99 WHERE "name" ILIKE '%1password%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 4.00 WHERE "name" ILIKE '%lastpass%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 25.00 WHERE "name" ILIKE '%salesforce%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 15.00 WHERE "name" ILIKE '%hubspot%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 19.00 WHERE "name" ILIKE '%zendesk%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 39.00 WHERE "name" ILIKE '%intercom%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 15.00 WHERE "name" ILIKE '%miro%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 12.50 WHERE "name" ILIKE '%loom%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 10.00 WHERE "name" ILIKE '%canva%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 59.99 WHERE "name" ILIKE '%adobe creative cloud%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 12.00 WHERE "name" ILIKE '%postman%' AND "pricing_model" = 'PER_SEAT';
UPDATE "saas_catalog" SET "base_price_per_seat" = 26.00 WHERE "name" ILIKE '%sentry%' AND "pricing_model" = 'PER_SEAT';
