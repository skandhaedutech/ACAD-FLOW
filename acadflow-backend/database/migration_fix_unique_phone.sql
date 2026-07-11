-- ============================================
-- Migration: Fix Unique Constraint for Leads Phone
-- Allow reuse of phone numbers from soft-deleted leads
-- ============================================

BEGIN;

-- 1. Drop existing unique constraint on phone
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_phone_key;

-- 2. Create a new partial unique index that only applies to non-deleted leads
--    This ensures phone uniqueness per organization only for active leads
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_lead_phone_per_org 
ON leads (phone, organization_id) 
WHERE deleted_at IS NULL;

COMMIT;
