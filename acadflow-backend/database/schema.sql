-- Drop existing tables to start fresh (Optional, run with caution)
-- DROP TABLE IF EXISTS ai_insights CASCADE;
-- DROP TABLE IF EXISTS admissions CASCADE;
-- DROP TABLE IF EXISTS follow_ups CASCADE;
-- DROP TABLE IF EXISTS leads CASCADE;
-- DROP TABLE IF EXISTS counselors CASCADE;

-- 1. Counselors Table
CREATE TABLE counselors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    branch VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Counselor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Leads Table
CREATE TABLE leads (
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

-- 3. FollowUps Table
CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    followup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    followup_type VARCHAR(50), -- e.g., 'Call', 'WhatsApp', 'Email'
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_by UUID REFERENCES counselors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admissions Table
CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    course VARCHAR(255) NOT NULL,
    fees NUMERIC(10, 2),
    payment_status VARCHAR(50) DEFAULT 'Pending',
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI Insights Table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50), -- e.g., 'Warning', 'Opportunity', 'Trend'
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to automatically update the 'updated_at' timestamp on the leads table
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_modtime
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
