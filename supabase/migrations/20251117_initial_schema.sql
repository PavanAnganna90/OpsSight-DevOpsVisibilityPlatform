-- OpsSight Initial Schema Migration to Supabase
-- Generated: 2025-11-17
-- 
-- This migration sets up the initial database schema for OpsSight
-- Run this after importing the schema from your existing PostgreSQL database
--
-- Note: This is a placeholder. Replace with actual schema export from pg_dump

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: TimescaleDB extension may not be available in Supabase
-- Consider using native PostgreSQL partitioning or Supabase's time-series features
-- CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Example: Organizations table (replace with your actual schema)
-- CREATE TABLE IF NOT EXISTS organizations (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) UNIQUE NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Enable Row-Level Security
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- CREATE POLICY "Users can access their organization"
--   ON organizations
--   FOR SELECT
--   USING (id IN (
--     SELECT organization_id FROM users WHERE id = auth.uid()
--   ));

-- Add your actual schema here after exporting from pg_dump
-- This file should be populated by running:
-- pg_dump --schema-only --no-owner --no-privileges > supabase/migrations/20251117_initial_schema.sql

