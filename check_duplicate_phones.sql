-- Check for duplicate phone numbers in the leads table
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Find all duplicate phone numbers with details
SELECT
  phone,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) as lead_ids,
  ARRAY_AGG(first_name || ' ' || last_name ORDER BY created_at) as names,
  ARRAY_AGG(email ORDER BY created_at) as emails,
  ARRAY_AGG(created_at ORDER BY created_at) as created_dates,
  ARRAY_AGG(owner_id ORDER BY created_at) as owner_ids
FROM leads
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, phone;

-- 2. Get total count of duplicate phone numbers
SELECT
  COUNT(DISTINCT phone) as total_duplicate_phone_numbers,
  SUM(duplicate_count - 1) as total_extra_records
FROM (
  SELECT phone, COUNT(*) as duplicate_count
  FROM leads
  GROUP BY phone
  HAVING COUNT(*) > 1
) as duplicates;

-- 3. Check phone number formats (to identify normalization issues)
SELECT
  phone,
  LENGTH(phone) as phone_length,
  CASE
    WHEN phone LIKE '+1%' THEN 'E.164 Format (+1XXXXXXXXXX)'
    WHEN phone LIKE '+%' THEN 'International Format (Non-US)'
    WHEN LENGTH(phone) = 10 THEN '10 digits (needs +1)'
    WHEN LENGTH(phone) = 11 AND phone LIKE '1%' THEN '11 digits (needs +)'
    ELSE 'Unknown Format'
  END as format_type,
  COUNT(*) as count
FROM leads
GROUP BY phone, LENGTH(phone)
ORDER BY count DESC
LIMIT 20;

-- 4. Sample of leads that would need phone normalization
SELECT
  id,
  first_name,
  last_name,
  phone,
  LENGTH(phone) as phone_length,
  CASE
    WHEN phone LIKE '+1%' THEN phone
    WHEN LENGTH(phone) = 10 THEN '+1' || phone
    WHEN LENGTH(phone) = 11 AND phone LIKE '1%' THEN '+' || phone
    ELSE phone
  END as normalized_phone,
  created_at
FROM leads
WHERE phone NOT LIKE '+1%' OR LENGTH(phone) != 12
ORDER BY created_at DESC
LIMIT 10;
