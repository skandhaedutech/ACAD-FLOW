-- ============================================
-- Fix: Refresh active_leads View
-- Run this in your Supabase SQL Editor
-- ============================================

-- In PostgreSQL, when you add a new column to a table, existing views 
-- defined with "SELECT *" do not automatically pick up the new column.
-- We must drop and recreate the view to include student_id.

DROP VIEW IF EXISTS active_leads;

CREATE VIEW active_leads AS
SELECT *
FROM leads
WHERE deleted_at IS NULL;

-- Verify it works by selecting from the view:
-- SELECT id, name, student_id FROM active_leads LIMIT 5;
