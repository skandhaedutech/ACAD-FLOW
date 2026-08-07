-- Migration: create installments table for per-installment tracking
-- Run this against the tenant database (Postgres)
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional index for lookups
CREATE INDEX IF NOT EXISTS idx_installments_admission_id ON installments(admission_id);
