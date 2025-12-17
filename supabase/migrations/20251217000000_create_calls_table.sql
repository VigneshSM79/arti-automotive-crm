-- ============================================
-- CALLS TABLE FOR VOICE CALL TRACKING
-- Created: December 17, 2025
-- Purpose: Track voice calls between agents and leads via Twilio
-- ============================================

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Relationships
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NULL REFERENCES conversations(id) ON DELETE SET NULL,

    -- Twilio integration
    twilio_call_sid TEXT NULL UNIQUE,

    -- Call details
    direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL DEFAULT 'initiated',
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,

    -- Call lifecycle timestamps
    answered_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,

    -- Call results (filled by Webhook C)
    duration INTEGER NULL,
    recording_url TEXT NULL,
    recording_duration INTEGER NULL,

    -- Business fields
    call_outcome TEXT NULL,
    notes TEXT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for lead-based queries (call history for a lead)
CREATE INDEX IF NOT EXISTS idx_calls_lead_id
    ON calls(lead_id, created_at DESC);

-- Index for agent-based queries (calls made by an agent)
CREATE INDEX IF NOT EXISTS idx_calls_agent_id
    ON calls(agent_id, created_at DESC);

-- Index for Twilio SID lookups (when Webhook C updates call)
CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid
    ON calls(twilio_call_sid)
    WHERE twilio_call_sid IS NOT NULL;

-- Index for status queries (find all in-progress calls)
CREATE INDEX IF NOT EXISTS idx_calls_status
    ON calls(status, created_at DESC)
    WHERE status NOT IN ('completed', 'failed', 'no-answer');

-- Index for conversation-based queries (show calls in conversation view)
CREATE INDEX IF NOT EXISTS idx_calls_conversation_id
    ON calls(conversation_id, created_at DESC)
    WHERE conversation_id IS NOT NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE calls IS
    'Tracks voice calls between agents and leads via Twilio Call Bridge';

COMMENT ON COLUMN calls.lead_id IS
    'The lead who was called (CASCADE DELETE when lead deleted)';

COMMENT ON COLUMN calls.agent_id IS
    'The agent who initiated the call (CASCADE DELETE when user deleted)';

COMMENT ON COLUMN calls.conversation_id IS
    'Optional link to conversation thread (SET NULL if conversation deleted)';

COMMENT ON COLUMN calls.twilio_call_sid IS
    'Twilio unique call identifier (e.g., CA1234...) - filled by Webhook C';

COMMENT ON COLUMN calls.direction IS
    'Call direction: outbound (agent calls lead) or inbound (lead calls in)';

COMMENT ON COLUMN calls.status IS
    'Twilio call status: initiated, queued, ringing, in-progress, completed, no-answer, busy, failed, canceled';

COMMENT ON COLUMN calls.from_number IS
    'Caller phone number (usually dealership Twilio number for outbound)';

COMMENT ON COLUMN calls.to_number IS
    'Recipient phone number (usually lead phone for outbound)';

COMMENT ON COLUMN calls.answered_at IS
    'Timestamp when call was answered by recipient';

COMMENT ON COLUMN calls.ended_at IS
    'Timestamp when call ended (either party hung up)';

COMMENT ON COLUMN calls.duration IS
    'Total call duration in seconds (from answered to ended)';

COMMENT ON COLUMN calls.recording_url IS
    'Twilio recording URL (if recording enabled)';

COMMENT ON COLUMN calls.recording_duration IS
    'Recording length in seconds';

COMMENT ON COLUMN calls.call_outcome IS
    'Business outcome: interested, callback, not-interested, etc. (filled by agent after call)';

COMMENT ON COLUMN calls.notes IS
    'Agent notes about the call (filled by agent in UI)';

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on row changes
DROP TRIGGER IF EXISTS trigger_update_calls_updated_at ON calls;
CREATE TRIGGER trigger_update_calls_updated_at
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_calls_updated_at();

COMMENT ON FUNCTION update_calls_updated_at() IS
    'Auto-updates calls.updated_at timestamp on every UPDATE';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Calls table created successfully!';
  RAISE NOTICE '  - Table: calls';
  RAISE NOTICE '  - Indexes: 5 performance indexes added';
  RAISE NOTICE '  - Triggers: updated_at auto-update enabled';
  RAISE NOTICE '  - RLS: Not enabled yet (add later)';
END $$;

-- ============================================
-- ROLLBACK (If needed)
-- ============================================

-- To undo this migration:
--
-- DROP TRIGGER IF EXISTS trigger_update_calls_updated_at ON calls;
-- DROP FUNCTION IF EXISTS update_calls_updated_at();
-- DROP TABLE IF EXISTS calls CASCADE;
