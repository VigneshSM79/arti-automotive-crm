-- ============================================================================
-- Migration: Add Twilio Delivery Status Tracking to Messages Table
-- Created: 2025-12-18
-- Purpose: Track SMS delivery status (queued, sent, delivered, failed) from Twilio callbacks
-- ============================================================================

-- Add delivery tracking columns to messages table
-- These columns will be populated for OUTBOUND messages only
-- Inbound messages will have these fields as NULL

-- Add delivery_status column (tracks Twilio delivery state)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- Add error tracking for failed deliveries
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add timestamps for delivery events
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- ============================================================================
-- Add check constraint for delivery_status values
-- ============================================================================
ALTER TABLE messages
ADD CONSTRAINT messages_delivery_status_check
CHECK (delivery_status IS NULL OR delivery_status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered'));

-- ============================================================================
-- Create index on delivery_status for analytics queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);

-- Create index on twilio_sid for fast lookups during status callbacks
CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- ============================================================================
-- Add comments to document the schema
-- ============================================================================
COMMENT ON COLUMN messages.delivery_status IS 'Twilio delivery status: queued, sent, delivered, failed, undelivered. NULL for inbound messages.';
COMMENT ON COLUMN messages.error_code IS 'Twilio error code (e.g., 30006 for landline). Populated only when delivery_status is failed or undelivered.';
COMMENT ON COLUMN messages.error_message IS 'Human-readable error message from Twilio. Populated only when delivery fails.';
COMMENT ON COLUMN messages.delivered_at IS 'Timestamp when message was successfully delivered to recipient. NULL until delivery confirmed.';
COMMENT ON COLUMN messages.failed_at IS 'Timestamp when message delivery failed. NULL unless delivery_status is failed or undelivered.';

-- ============================================================================
-- Migration complete
-- ============================================================================
