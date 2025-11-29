# How to Add UNIQUE Constraint to Phone Column

## Migration File Created
`supabase/migrations/20251130000001_add_unique_phone_and_claimed_at.sql`

## What This Migration Does

1. **Adds `claimed_at` column** - Timestamp when lead is claimed by an agent
2. **Adds UNIQUE constraint on `phone`** - Prevents duplicate phone numbers (hard stop)
3. **Creates performance index** - Speeds up queries on claimed_at

## How to Run Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**: https://rozuvsztctizlyfzezgb.supabase.co
2. **Go to**: SQL Editor (left sidebar)
3. **Copy entire contents** of `supabase/migrations/20251130000001_add_unique_phone_and_claimed_at.sql`
4. **Paste** into SQL Editor
5. **Click "Run"**
6. **Check results**: Should see 3 verification queries returning successful results

### Option 2: Supabase CLI (If you have it installed)

```bash
cd D:\Dev\Kaiden_Arti_Lovable
supabase db push
```

## Verification After Migration

Run these queries in SQL Editor to confirm success:

```sql
-- 1. Check UNIQUE constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'leads'::regclass
AND conname = 'unique_phone_number';
-- Expected: 1 row

-- 2. Check claimed_at column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name = 'claimed_at';
-- Expected: 1 row with data_type = 'timestamp with time zone'

-- 3. Test duplicate rejection (optional)
-- Get an existing phone
SELECT phone FROM leads LIMIT 1;

-- Try to insert that same phone (should FAIL)
INSERT INTO leads (phone, first_name, last_name, user_id)
VALUES ('<paste-phone-from-above>', 'Test', 'Duplicate', '00000000-0000-0000-0000-000000000000');

-- Expected error: duplicate key value violates unique constraint "unique_phone_number"
-- This confirms the constraint is working! ✅
```

## What Happens After Migration

### Database Behavior
- ✅ Any INSERT with duplicate phone → **Error 23505** (UNIQUE constraint violation)
- ✅ Any UPDATE changing phone to existing value → **Error 23505**
- ✅ claimed_at column available for tracking claim timestamps

### Next Steps (Frontend Code)
After migration succeeds:
1. Update Lead Pool claim mutation to set `claimed_at`
2. Add phone input with "+1" prefix in Leads.tsx
3. Add duplicate check function
4. Create duplicate warning popup
5. Update CSV import error handling

## Rollback (If Needed)

If something goes wrong, run this SQL:

```sql
-- Remove UNIQUE constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS unique_phone_number;

-- Remove claimed_at column
ALTER TABLE leads DROP COLUMN IF EXISTS claimed_at;

-- Remove index
DROP INDEX IF EXISTS idx_leads_claimed_at;
```

## Error Code Reference

When frontend tries to insert duplicate phone, Supabase will return:
- **Error code**: `23505`
- **Error message**: `duplicate key value violates unique constraint "unique_phone_number"`

Your frontend code will catch this error and show user-friendly message.
