-- Debug: Check why leads aren't showing in Lead Pool

-- 1. Check if the leads exist
SELECT id, first_name, last_name, owner_id, pipeline_stage_id
FROM leads
WHERE first_name IN ('Vignesh', 'Kaiden')
ORDER BY created_at DESC;

-- 2. Check if they have conversation records
SELECT
  l.id,
  l.first_name,
  l.last_name,
  c.id as conversation_id,
  c.requires_human_handoff
FROM leads l
LEFT JOIN conversations c ON l.id = c.lead_id
WHERE l.first_name IN ('Vignesh', 'Kaiden')
ORDER BY l.created_at DESC;

-- 3. Check what the Lead Pool query would return (with INNER join)
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.owner_id,
  c.id as conversation_id,
  c.requires_human_handoff
FROM leads l
INNER JOIN conversations c ON l.id = c.lead_id
WHERE l.first_name IN ('Vignesh', 'Kaiden')
  AND c.requires_human_handoff = true
ORDER BY l.created_at DESC;

-- 4. Check all leads with requires_human_handoff = true
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.owner_id,
  c.requires_human_handoff
FROM leads l
INNER JOIN conversations c ON l.id = c.lead_id
WHERE c.requires_human_handoff = true
ORDER BY l.created_at DESC;
