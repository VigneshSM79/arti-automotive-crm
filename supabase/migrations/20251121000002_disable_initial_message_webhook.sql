-- Migration: Disable Supabase Webhook for Initial Message
-- Date: November 21, 2025
-- Reason: Switching to frontend webhook approach (hybrid architecture)

-- ============================================================================
-- IMPORTANT: This migration disables database-triggered webhooks for
-- Initial_Message tag additions. The new architecture uses:
-- 1. Frontend → n8n webhook (primary path)
-- 2. n8n backup polling workflow (catches missed messages)
-- ============================================================================

-- Drop the trigger if it exists (from WEBHOOK_SETUP_GUIDE.md)
DROP TRIGGER IF EXISTS trigger_initial_message_added ON leads;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS notify_initial_message_added();

-- ============================================================================
-- NOTE: If you were using Supabase UI Webhooks instead of PostgreSQL triggers:
--
-- 1. Go to Supabase Dashboard → Database → Webhooks
-- 2. Find webhook named "Initial Message Tag Added" or similar
-- 3. Delete or disable the webhook
--
-- This SQL migration only removes PostgreSQL-based triggers, not UI webhooks.
-- ============================================================================

-- Add comment to document the change
COMMENT ON TABLE leads IS 'Initial_Message webhook removed in favor of frontend-triggered workflow. See n8n/new-workflows/1-initial-outbound-message.json';
