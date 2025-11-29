-- Migration: Auto-move AI handoff leads to Working Lead stage + Rename stage
-- Created: 2025-11-30
-- Purpose: When AI sets requires_human_handoff=true, auto-move lead to "Working Lead / Claimed Lead" stage

-- =================================================================
-- STEP 1: Rename "Working Lead" to "Working Lead / Claimed Lead"
-- =================================================================

-- First, check if the stage exists
DO $$
DECLARE
  working_lead_id UUID;
BEGIN
  -- Find the "Working Lead" stage
  SELECT id INTO working_lead_id
  FROM pipeline_stages
  WHERE name = 'Working Lead'
  LIMIT 1;

  -- If found, rename it
  IF working_lead_id IS NOT NULL THEN
    UPDATE pipeline_stages
    SET name = 'Working Lead / Claimed Lead'
    WHERE id = working_lead_id;

    RAISE NOTICE 'Renamed "Working Lead" to "Working Lead / Claimed Lead"';
  ELSE
    RAISE NOTICE 'Stage "Working Lead" not found, skipping rename';
  END IF;
END $$;

-- =================================================================
-- STEP 2: Create function to auto-move leads on AI handoff
-- =================================================================

CREATE OR REPLACE FUNCTION auto_move_handoff_leads()
RETURNS TRIGGER AS $$
DECLARE
  new_contact_stage_id UUID;
  working_lead_stage_id UUID;
BEGIN
  -- Only proceed if requires_human_handoff changed from false/null to true
  IF NEW.requires_human_handoff = true AND (OLD.requires_human_handoff IS NULL OR OLD.requires_human_handoff = false) THEN

    -- Get the "New Contact" stage ID
    SELECT id INTO new_contact_stage_id
    FROM pipeline_stages
    WHERE name = 'New Contact'
    LIMIT 1;

    -- Get the "Working Lead / Claimed Lead" stage ID
    SELECT id INTO working_lead_stage_id
    FROM pipeline_stages
    WHERE name = 'Working Lead / Claimed Lead'
    LIMIT 1;

    -- Update the lead's pipeline_stage_id if it's currently in "New Contact"
    IF new_contact_stage_id IS NOT NULL AND working_lead_stage_id IS NOT NULL THEN
      UPDATE leads
      SET pipeline_stage_id = working_lead_stage_id
      WHERE id = NEW.lead_id
        AND pipeline_stage_id = new_contact_stage_id;

      RAISE NOTICE 'Moved lead % from New Contact to Working Lead / Claimed Lead', NEW.lead_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_move_handoff_leads() IS 'Automatically moves leads from New Contact to Working Lead / Claimed Lead when AI sets requires_human_handoff=true';

-- =================================================================
-- STEP 3: Create trigger on conversations table
-- =================================================================

DROP TRIGGER IF EXISTS trigger_auto_move_handoff_leads ON conversations;

CREATE TRIGGER trigger_auto_move_handoff_leads
  AFTER UPDATE OF requires_human_handoff ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION auto_move_handoff_leads();

COMMENT ON TRIGGER trigger_auto_move_handoff_leads ON conversations IS 'Triggers auto-movement of leads to Working Lead / Claimed Lead stage when AI handoff occurs';

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Check pipeline stages
SELECT
  id,
  name,
  order_position,
  color
FROM pipeline_stages
ORDER BY order_position;

-- Check trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_move_handoff_leads';

-- Check function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'auto_move_handoff_leads';

-- =================================================================
-- TEST SCENARIO (Optional - run after migration)
-- =================================================================

-- Test: Update a conversation to require handoff and verify lead moves
--
-- 1. Find a test lead in "New Contact" stage:
-- SELECT l.id, l.first_name, l.last_name, ps.name as stage
-- FROM leads l
-- JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
-- WHERE ps.name = 'New Contact'
-- LIMIT 1;
--
-- 2. Find or create conversation for that lead:
-- INSERT INTO conversations (lead_id, requires_human_handoff)
-- VALUES ('<lead-id>', false)
-- ON CONFLICT (lead_id) DO UPDATE SET requires_human_handoff = false;
--
-- 3. Trigger handoff (should auto-move stage):
-- UPDATE conversations
-- SET requires_human_handoff = true
-- WHERE lead_id = '<lead-id>';
--
-- 4. Verify lead moved to "Working Lead / Claimed Lead":
-- SELECT l.id, l.first_name, ps.name as stage
-- FROM leads l
-- JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
-- WHERE l.id = '<lead-id>';
--
-- Expected: stage should be "Working Lead / Claimed Lead"

-- =================================================================
-- ROLLBACK (If needed)
-- =================================================================

-- To undo this migration:
--
-- DROP TRIGGER IF EXISTS trigger_auto_move_handoff_leads ON conversations;
-- DROP FUNCTION IF EXISTS auto_move_handoff_leads();
--
-- UPDATE pipeline_stages
-- SET name = 'Working Lead'
-- WHERE name = 'Working Lead / Claimed Lead';
