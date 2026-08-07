-- Migration: add paid_date column to installments table
-- Run this after the initial installments migration
ALTER TABLE installments ADD COLUMN IF NOT EXISTS paid_date date;
