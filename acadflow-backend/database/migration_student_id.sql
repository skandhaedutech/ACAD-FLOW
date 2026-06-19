-- ============================================
-- Migration: Add Student ID to Leads Table
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add the student_id column (idempotent)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS student_id VARCHAR(20) UNIQUE;

-- Step 2: Backfill existing leads that don't have a student_id yet
-- This assigns SKEDU000001, SKEDU000002, etc. in chronological order
WITH numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM leads
  WHERE student_id IS NULL
)
UPDATE leads
SET student_id = 'SKEDU' || LPAD(nl.rn::text, 6, '0')
FROM numbered_leads nl
WHERE leads.id = nl.id;

-- Step 3: Refresh the active_leads view so SELECT * includes student_id
-- (The view is already SELECT * FROM leads WHERE deleted_at IS NULL, 
--  so it automatically picks up the new column. No action needed.)

-- Verify:
-- SELECT id, name, student_id FROM leads ORDER BY student_id;
