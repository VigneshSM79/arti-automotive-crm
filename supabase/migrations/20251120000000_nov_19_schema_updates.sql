-- ============================================================================
-- Migration: Nov 19 Requirements - Schema Updates
-- Date: 2025-11-20
-- Purpose: Implement Nov 19 meeting requirements for pool-based lead management,
--          AI handoff system, and SMS notifications to agents
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: LEADS TABLE UPDATES
-- ============================================================================
-- Purpose: Enable pool-based lead management and source tracking

-- Add owner_id for lead assignment (NULL = in pool, awaiting engagement)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Add lead source tracking
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Add lead status tracking
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check'
  ) THEN
    ALTER TABLE leads
    ADD CONSTRAINT leads_status_check
    CHECK (status IN ('new', 'contacted', 'qualified', 'lost'));
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);

-- Add column comments for clarity
COMMENT ON COLUMN leads.user_id IS 'User who uploaded/created the lead (for RLS and audit trail)';
COMMENT ON COLUMN leads.owner_id IS 'Sales agent assigned to lead after engagement (NULL = in pool, available for claiming)';
COMMENT ON COLUMN leads.lead_source IS 'Origin of lead: CSV Import, Inbound SMS, Contact Form, Referral, etc.';
COMMENT ON COLUMN leads.status IS 'Lead lifecycle status: new, contacted, qualified, lost';

-- ============================================================================
-- SECTION 2: CONVERSATIONS TABLE UPDATES
-- ============================================================================
-- Purpose: Enable AI handoff system (2-3 message rule + positive engagement detection)

-- Add AI handoff flag
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS requires_human_handoff BOOLEAN DEFAULT false;

-- Add handoff timestamp
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS handoff_triggered_at TIMESTAMPTZ;

-- Add AI message counter
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS ai_message_count INTEGER DEFAULT 0;

-- Add index for handoff queries (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_conversations_requires_handoff
ON conversations(requires_human_handoff)
WHERE requires_human_handoff = true;

-- Add column comments
COMMENT ON COLUMN conversations.requires_human_handoff IS 'True when lead shows positive engagement and needs human agent intervention';
COMMENT ON COLUMN conversations.handoff_triggered_at IS 'Timestamp when handoff was triggered (for tracking response time)';
COMMENT ON COLUMN conversations.ai_message_count IS 'Number of AI-generated messages sent in this conversation (for 2-3 message rule)';

-- ============================================================================
-- SECTION 3: USERS TABLE UPDATES
-- ============================================================================
-- Purpose: Enable SMS notifications to sales agents when leads engage

-- Add phone number for SMS notifications
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add SMS notification opt-in flag
ALTER TABLE users
ADD COLUMN IF NOT EXISTS receive_sms_notifications BOOLEAN DEFAULT true;

-- Add index for notification queries (partial index for active recipients)
CREATE INDEX IF NOT EXISTS idx_users_sms_notifications
ON users(receive_sms_notifications)
WHERE receive_sms_notifications = true AND phone_number IS NOT NULL;

-- Add column comments
COMMENT ON COLUMN users.phone_number IS 'Agent phone number for SMS notifications (E.164 format: +1234567890)';
COMMENT ON COLUMN users.receive_sms_notifications IS 'Whether agent wants to receive SMS notifications when leads engage';

-- ============================================================================
-- SECTION 4: CAMPAIGN ENROLLMENTS TABLE UPDATES
-- ============================================================================
-- Purpose: Track when leads respond to campaigns (for effectiveness metrics)

-- Add response timestamp
ALTER TABLE campaign_enrollments
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;

-- Add index for response queries
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_last_response
ON campaign_enrollments(last_response_at)
WHERE last_response_at IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN campaign_enrollments.last_response_at IS 'Timestamp when lead last responded to campaign message';

-- ============================================================================
-- SECTION 5: RLS POLICY UPDATES
-- ============================================================================
-- Purpose: Enable pool-based lead visibility (all agents see unassigned leads)

-- ============================================================================
-- 5.1 LEADS TABLE POLICIES
-- ============================================================================

-- Drop old policy that restricts leads to only user_id
DROP POLICY IF EXISTS "Users can view leads based on role" ON leads;

-- Create new policy allowing users to see:
-- 1. Leads they uploaded (user_id = auth.uid())
-- 2. Pooled leads (owner_id IS NULL)
-- 3. Leads assigned to them (owner_id = auth.uid())
-- 4. All leads if admin
CREATE POLICY "Users can view their leads and pooled leads"
ON leads FOR SELECT
USING (
  auth.uid() = user_id                           -- Leads I uploaded
  OR owner_id IS NULL                            -- Pooled leads (available for claiming)
  OR auth.uid() = owner_id                       -- Leads assigned to me
  OR public.has_role(auth.uid(), 'admin')       -- Admins see everything
);

-- Drop old update policy
DROP POLICY IF EXISTS "Users can update leads based on role" ON leads;

-- Create new policy allowing users to:
-- 1. Update leads they uploaded
-- 2. Claim pooled leads (set owner_id to themselves)
-- 3. Update leads assigned to them
-- 4. Admins can update everything
CREATE POLICY "Users can update their leads and claim pooled leads"
ON leads FOR UPDATE
USING (
  auth.uid() = user_id                           -- Update leads I uploaded
  OR (owner_id IS NULL AND public.has_role(auth.uid(), 'user'))  -- Claim pooled leads
  OR auth.uid() = owner_id                       -- Update leads assigned to me
  OR public.has_role(auth.uid(), 'admin')       -- Admins can update everything
);

-- ============================================================================
-- 5.2 CONVERSATIONS TABLE POLICIES (No changes needed)
-- ============================================================================
-- Note: Existing policies already support assigned_to field for agent claiming
-- No changes required for Nov 19 requirements

-- ============================================================================
-- SECTION 6: DATA MIGRATION & BACKFILL
-- ============================================================================
-- Purpose: Set default values for existing records

-- Set status for existing leads (default to 'new')
UPDATE leads
SET status = 'new'
WHERE status IS NULL;

-- Set lead_source for existing leads (mark as legacy data)
UPDATE leads
SET lead_source = 'Legacy Data'
WHERE lead_source IS NULL;

-- Initialize ai_message_count for existing conversations
UPDATE conversations
SET ai_message_count = 0
WHERE ai_message_count IS NULL;

-- ============================================================================
-- SECTION 7: VERIFICATION
-- ============================================================================

-- Verify all columns were added successfully
DO $$
DECLARE
  missing_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ')
  INTO missing_columns
  FROM (
    SELECT 'leads.owner_id' as column_name WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'owner_id'
    )
    UNION ALL
    SELECT 'leads.lead_source' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'lead_source'
    )
    UNION ALL
    SELECT 'leads.status' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'status'
    )
    UNION ALL
    SELECT 'conversations.requires_human_handoff' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name = 'requires_human_handoff'
    )
    UNION ALL
    SELECT 'conversations.handoff_triggered_at' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name = 'handoff_triggered_at'
    )
    UNION ALL
    SELECT 'conversations.ai_message_count' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name = 'ai_message_count'
    )
    UNION ALL
    SELECT 'users.phone_number' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone_number'
    )
    UNION ALL
    SELECT 'users.receive_sms_notifications' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'receive_sms_notifications'
    )
    UNION ALL
    SELECT 'campaign_enrollments.last_response_at' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaign_enrollments' AND column_name = 'last_response_at'
    )
  ) missing;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Migration failed: Missing columns: %', missing_columns;
  END IF;

  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Schema updates:';
  RAISE NOTICE '   - leads: +3 columns (owner_id, lead_source, status)';
  RAISE NOTICE '   - conversations: +3 columns (requires_human_handoff, handoff_triggered_at, ai_message_count)';
  RAISE NOTICE '   - users: +2 columns (phone_number, receive_sms_notifications)';
  RAISE NOTICE '   - campaign_enrollments: +1 column (last_response_at)';
  RAISE NOTICE '🔒 RLS policies updated for pool-based lead management';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (FOR REFERENCE - DO NOT RUN)
-- ============================================================================
-- In case migration needs to be reversed, use these commands:
--
-- BEGIN;
--
-- -- Remove added columns
-- ALTER TABLE leads DROP COLUMN IF EXISTS owner_id;
-- ALTER TABLE leads DROP COLUMN IF EXISTS lead_source;
-- ALTER TABLE leads DROP COLUMN IF EXISTS status;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS requires_human_handoff;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS handoff_triggered_at;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS ai_message_count;
-- ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
-- ALTER TABLE users DROP COLUMN IF EXISTS receive_sms_notifications;
-- ALTER TABLE campaign_enrollments DROP COLUMN IF EXISTS last_response_at;
--
-- -- Restore old RLS policies (refer to previous migration for exact policy text)
--
-- COMMIT;
-- ============================================================================
