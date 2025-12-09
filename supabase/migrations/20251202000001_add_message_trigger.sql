-- ============================================
-- DATABASE TRIGGER FOR EVENT-DRIVEN PROCESSING
-- Created: December 2, 2025
-- Purpose: Fire n8n webhook when first message arrives in a burst
-- ============================================

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger n8n workflow
CREATE OR REPLACE FUNCTION trigger_message_processing()
RETURNS TRIGGER AS $$
DECLARE
  unprocessed_count INTEGER;
  webhook_url TEXT;
  payload JSONB;
BEGIN
  -- Count unprocessed messages for this conversation (including current one)
  SELECT COUNT(*) INTO unprocessed_count
  FROM message_queue
  WHERE conversation_id = NEW.conversation_id
    AND processed = FALSE;

  -- Only trigger if this is the FIRST message in the burst
  IF unprocessed_count = 1 THEN
    -- Update conversation state to 'accumulating'
    UPDATE conversations
    SET processing_state = 'accumulating'
    WHERE id = NEW.conversation_id;

    -- Build payload
    payload := jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'lead_id', NEW.lead_id,
      'phone_number', NEW.phone_number,
      'first_message', NEW.message_body,
      'triggered_at', NOW()
    );

    -- Get n8n webhook URL from environment variable or use default
    -- TODO: Replace with your actual n8n webhook URL after workflow creation
    webhook_url := current_setting('app.n8n_webhook_url', true);

    -- If not set in config, use a default (you'll update this)
    IF webhook_url IS NULL OR webhook_url = '' THEN
      webhook_url := 'https://your-n8n-instance.com/webhook/process-message-batch';
    END IF;

    -- Fire async webhook to n8n (non-blocking)
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := payload::text,
      timeout_milliseconds := 5000
    );

    -- Log the trigger (optional, for debugging)
    RAISE NOTICE 'Triggered n8n webhook for conversation % with % unprocessed messages',
      NEW.conversation_id, unprocessed_count;
  ELSE
    -- Not the first message, just accumulating
    RAISE NOTICE 'Message added to queue for conversation % (total unprocessed: %)',
      NEW.conversation_id, unprocessed_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to message_queue table
DROP TRIGGER IF EXISTS on_message_queued ON message_queue;

CREATE TRIGGER on_message_queued
  AFTER INSERT ON message_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_message_processing();

-- Add setting for n8n webhook URL (configure this after n8n workflow is created)
-- Usage: ALTER DATABASE postgres SET app.n8n_webhook_url = 'https://your-n8n.com/webhook/process-message-batch';

COMMENT ON FUNCTION trigger_message_processing() IS
  'Fires n8n webhook when first unprocessed message arrives for a conversation. Subsequent messages accumulate without triggering.';
