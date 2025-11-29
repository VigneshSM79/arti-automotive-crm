-- Check current pipeline stages
SELECT
  id,
  name,
  order_position,
  color
FROM pipeline_stages
ORDER BY order_position;

-- Find the "Working Lead" stage ID
SELECT id, name
FROM pipeline_stages
WHERE name LIKE '%Working%' OR name LIKE '%Claimed%';

-- Find the "New Contact" stage ID
SELECT id, name
FROM pipeline_stages
WHERE name LIKE '%New%Contact%';
