-- =====================================================================
-- ACADFLOW CRM DATABASE-FIRST ENTERPRISE MIGRATION (V3)
-- =====================================================================
-- Paste and execute this script in your Supabase SQL Editor.
-- This script is fully idempotent and self-contained: it creates base
-- tables if they do not exist, and then applies multi-tenancy, soft deletes,
-- audit logs, triggers, notifications, views, and RLS.

BEGIN;

-- 1. Create Base/Tenant Tables if missing
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'Starter', -- 'Starter', 'Growth', 'Enterprise'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert Default Tenant & Branch
INSERT INTO organizations (id, name, plan_type) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Academy', 'Starter')
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, organization_id, name, location) 
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Primary Branch', 'Main Office')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Core CRM Tables if missing
CREATE TABLE IF NOT EXISTS counselors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    branch VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Counselor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    course_interested VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'New',
    lead_score INTEGER DEFAULT 0,
    counselor_id UUID REFERENCES counselors(id) ON DELETE SET NULL,
    notes TEXT,
    last_followup TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    followup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    followup_type VARCHAR(50), -- e.g., 'Call', 'WhatsApp', 'Email'
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_by UUID REFERENCES counselors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    course VARCHAR(255) NOT NULL,
    fees NUMERIC(10, 2),
    payment_status VARCHAR(50) DEFAULT 'Pending',
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50), -- e.g., 'Warning', 'Opportunity', 'Trend'
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Helper Triggers (for auto-updating leads modified timestamps)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_modtime ON leads;
CREATE TRIGGER update_leads_modtime
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 5. Alter Counselors Table (Upgrade to Multi-Tenant)
ALTER TABLE counselors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE counselors ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE counselors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

UPDATE counselors SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE counselors SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE branch_id IS NULL;

-- 6. Alter Leads Table (Upgrade to Multi-Tenant & Lead Form Inputs)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fees_discussed NUMERIC(10, 2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_time VARCHAR(50) DEFAULT 'One Day';

UPDATE leads SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE leads SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE branch_id IS NULL;

-- 7. Alter FollowUps Table (Upgrade to Multi-Tenant)
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

UPDATE follow_ups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE follow_ups SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE branch_id IS NULL;

-- 8. Alter Admissions Table (Upgrade to Multi-Tenant)
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

UPDATE admissions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE admissions SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE branch_id IS NULL;

-- 9. Alter AI Insights Table (Upgrade to Multi-Tenant)
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

UPDATE ai_insights SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE ai_insights SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE branch_id IS NULL;

-- 10. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- 'LEAD_ALERT', 'ADMISSION_ALERT', 'PAYMENT_ALERT', 'AI_INSIGHT', 'SYSTEM_ALERT'
    priority VARCHAR(50) DEFAULT 'Low', -- 'Low', 'Medium', 'High'
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    action_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 11. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    user_id UUID,
    action VARCHAR(255) NOT NULL, -- 'CREATE_LEAD', 'UPDATE_LEAD', 'DELETE_LEAD', etc.
    entity_type VARCHAR(100) NOT NULL, -- 'leads', 'admissions', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Enforce constraints
ALTER TABLE counselors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE follow_ups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE admissions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ai_insights ALTER COLUMN organization_id SET NOT NULL;

-- 13. Create Active Views (filters soft-deleted records)
CREATE OR REPLACE VIEW active_counselors AS 
SELECT * FROM counselors WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_leads AS 
SELECT * FROM leads WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_follow_ups AS 
SELECT * FROM follow_ups WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_admissions AS 
SELECT * FROM admissions WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_ai_insights AS 
SELECT * FROM ai_insights WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_notifications AS 
SELECT * FROM notifications WHERE deleted_at IS NULL;

-- 14. Enable Row-Level Security (RLS)
ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 15. Tenancy RLS Policies with Fallbacks for Local Development
DROP POLICY IF EXISTS org_counselor_isolation ON counselors;
DROP POLICY IF EXISTS org_lead_isolation ON leads;
DROP POLICY IF EXISTS org_followup_isolation ON follow_ups;
DROP POLICY IF EXISTS org_admission_isolation ON admissions;
DROP POLICY IF EXISTS org_insight_isolation ON ai_insights;
DROP POLICY IF EXISTS org_notification_isolation ON notifications;
DROP POLICY IF EXISTS org_auditlog_isolation ON audit_logs;

CREATE POLICY org_counselor_isolation ON counselors
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_lead_isolation ON leads
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_followup_isolation ON follow_ups
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_admission_isolation ON admissions
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_insight_isolation ON ai_insights
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_notification_isolation ON notifications
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

CREATE POLICY org_auditlog_isolation ON audit_logs
    FOR ALL
    USING (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'))
    WITH CHECK (organization_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid, '00000000-0000-0000-0000-000000000001'));

COMMIT;
