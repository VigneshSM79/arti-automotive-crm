-- ============================================
-- MESSAGE QUEUE TABLE FOR DEBOUNCING
-- Created: December 2, 2025
-- Purpose: Handle multiple SMS messages in quick succession
-- ============================================

-- Create message queue table
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message_body TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Processing state
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ NULL,
    batch_id UUID NULL,

    -- Error handling
    retry_count INTEGER DEFAULT 0,
    error_message TEXT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_queue_unprocessed
    ON message_queue(conversation_id, processed, received_at)
    WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_message_queue_received_at
    ON message_queue(received_at)
    WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_message_queue_conversation
    ON message_queue(conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_queue_batch
    ON message_queue(batch_id)
    WHERE batch_id IS NOT NULL;

-- Add processing state to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS processing_state TEXT DEFAULT 'idle';

-- Possible values: 'idle', 'accumulating', 'processing', 'locked'
COMMENT ON COLUMN conversations.processing_state IS
    'State machine for message batching: idle -> accumulating -> processing -> idle';

-- Add index for processing state
CREATE INDEX IF NOT EXISTS idx_conversations_processing_state
    ON conversations(processing_state)
    WHERE processing_state != 'idle';

-- Enable RLS
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Admins can view message queue" ON message_queue;
DROP POLICY IF EXISTS "Service role full access" ON message_queue;

-- RLS Policies (admins can see all, regular users can't access directly)
CREATE POLICY "Admins can view message queue"
    ON message_queue
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Service role can do everything (for Edge Function and n8n)
CREATE POLICY "Service role full access"
    ON message_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE message_queue IS
    'Queue for inbound SMS messages to enable batching of multiple messages sent in quick succession';
