-- Migration: Add User Management Fields
-- Date: November 28, 2025
-- Purpose: Add designation and twilio_phone_number fields to users table
--          to support comprehensive user management system
--
-- Context: New User Management page requires additional fields beyond
-- basic profile information. These fields support:
-- - Designation: Job title/role in dealership (Sales, Manager, BDC Rep, etc.)
-- - Twilio Phone Number: Business line for outbound calling (separate from personal phone)

-- ============================================================================
-- ADD COLUMNS: designation and twilio_phone_number
-- ============================================================================

-- Add designation column (job title/role)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- Add twilio_phone_number column (business phone line)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twilio_phone_number VARCHAR(20);

-- ============================================================================
-- COMMENTS: Document column purposes
-- ============================================================================

COMMENT ON COLUMN users.designation IS 'Job title or role in dealership (e.g., Sales, Finance Manager, BDC Rep)';
COMMENT ON COLUMN users.twilio_phone_number IS 'Business phone number from Twilio for outbound calling (separate from personal phone)';

-- ============================================================================
-- VERIFICATION: Check columns were added successfully
-- ============================================================================
-- Run this AFTER the migration to verify:
--
-- SELECT
--   column_name,
--   data_type,
--   character_maximum_length,
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
--   AND column_name IN ('designation', 'twilio_phone_number');
--
-- Expected result: 2 rows showing both new columns
