# AI Handoff Auto-Move Implementation

## Overview

When AI determines a lead needs human intervention (sets `requires_human_handoff = true`), the lead should automatically move from **"New Contact"** stage to **"Working Lead / Claimed Lead"** stage.

## Changes Implemented

### 1. **Rename Pipeline Stage**
- **Old Name**: "Working Lead"
- **New Name**: "Working Lead / Claimed Lead"
- **Reason**: Clarifies that this stage contains both AI-qualified leads (in pool) and claimed leads

### 2. **Auto-Move Trigger**
When n8n AI workflow updates `conversations.requires_human_handoff` to `true`, a database trigger automatically:
1. Checks if lead is currently in "New Contact" stage
2. Moves lead to "Working Lead / Claimed Lead" stage
3. Lead becomes visible in Lead Pool (ready for claiming)

## How It Works

### Current Flow (Before Migration):
```
1. Lead created → "New Contact" stage (owner_id = NULL)
2. AI qualifies via SMS
3. AI sets requires_human_handoff = true
4. Lead stays in "New Contact" stage ❌ (wrong)
5. Lead appears in Lead Pool
```

### New Flow (After Migration):
```
1. Lead created → "New Contact" stage (owner_id = NULL)
2. AI qualifies via SMS
3. AI sets requires_human_handoff = true
4. Trigger fires → Lead auto-moves to "Working Lead / Claimed Lead" ✅
5. Lead appears in Lead Pool
6. Agent claims → owner_id set, stays in "Working Lead / Claimed Lead"
```

## Technical Details

### Database Trigger

**Table**: `conversations`
**Event**: `AFTER UPDATE OF requires_human_handoff`
**Function**: `auto_move_handoff_leads()`

**Logic**:
```sql
IF requires_human_handoff changes from false/null to true THEN
  IF lead is in "New Contact" stage THEN
    Move lead to "Working Lead / Claimed Lead" stage
  END IF
END IF
```

### Migration File

**File**: `supabase/migrations/20251130000002_auto_move_handoff_leads.sql`

**Contains**:
1. Rename "Working Lead" → "Working Lead / Claimed Lead"
2. Create `auto_move_handoff_leads()` function
3. Create trigger on `conversations` table
4. Verification queries
5. Test scenario (optional)
6. Rollback instructions

## Installation

### Step 1: Run the Migration

1. Open Supabase Dashboard: https://rozuvsztctizlyfzezgb.supabase.co
2. Go to: SQL Editor (left sidebar)
3. Copy contents of: `supabase/migrations/20251130000002_auto_move_handoff_leads.sql`
4. Paste and click "Run"

### Step 2: Verify Installation

After running the migration, verify with these queries:

```sql
-- 1. Check stage was renamed
SELECT name FROM pipeline_stages WHERE name LIKE '%Claimed%';
-- Expected: "Working Lead / Claimed Lead"

-- 2. Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_move_handoff_leads';
-- Expected: 1 row

-- 3. Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'auto_move_handoff_leads';
-- Expected: 1 row
```

## Testing

### Test Scenario 1: New Lead AI Handoff

1. Create a new lead (will be in "New Contact" stage)
2. Get the lead's ID
3. Create or update conversation:
   ```sql
   INSERT INTO conversations (lead_id, requires_human_handoff)
   VALUES ('<lead-id>', false);
   ```
4. Trigger AI handoff:
   ```sql
   UPDATE conversations
   SET requires_human_handoff = true
   WHERE lead_id = '<lead-id>';
   ```
5. Verify lead moved:
   ```sql
   SELECT l.first_name, l.last_name, ps.name as stage
   FROM leads l
   JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
   WHERE l.id = '<lead-id>';
   ```
6. **Expected**: stage = "Working Lead / Claimed Lead" ✅

### Test Scenario 2: n8n Integration

1. Use n8n AI workflow to qualify a lead
2. n8n sets `requires_human_handoff = true`
3. Check lead in frontend:
   - Should appear in Lead Pool
   - Should show "Working Lead / Claimed Lead" badge
4. Claim the lead
5. **Expected**: Lead stays in "Working Lead / Claimed Lead" stage ✅

### Test Scenario 3: Lead Already in Different Stage

1. Move a lead to "Appointment Set" stage
2. Update conversation to set `requires_human_handoff = true`
3. **Expected**: Lead does NOT move (stays in "Appointment Set") ✅
   - Trigger only moves leads from "New Contact", not other stages

## Frontend Impact

### Pipeline Page (src/pages/Pipeline.tsx)

**Before**: Stages showed "Working Lead"
**After**: Stages show "Working Lead / Claimed Lead"

**No code changes needed** - stage name updates automatically from database.

### Lead Pool Page (src/pages/LeadPool.tsx)

**No changes needed** - filter logic already correct:
```typescript
.is('owner_id', null) // Unassigned leads
.eq('conversations.requires_human_handoff', true) // AI-qualified
```

Leads will now correctly show "Working Lead / Claimed Lead" stage badge.

## Edge Cases Handled

### 1. **Lead already in non-New Contact stage**
- Trigger checks: `pipeline_stage_id = new_contact_stage_id`
- If lead is in "Appointment Set", "Sold", etc. → No move
- Only moves from "New Contact" → "Working Lead / Claimed Lead"

### 2. **requires_human_handoff already true**
- Trigger checks: `OLD.requires_human_handoff IS NULL OR OLD.requires_human_handoff = false`
- Only fires when changing FROM false/null TO true
- Prevents duplicate moves

### 3. **Pipeline stages not found**
- Function checks: `IF new_contact_stage_id IS NOT NULL AND working_lead_stage_id IS NOT NULL`
- Fails gracefully if stages missing
- Logs notice in database logs

### 4. **Multiple leads updated simultaneously**
- Trigger runs `FOR EACH ROW`
- Each lead processed independently
- No race conditions

## Expected User Experience

### Agent's Perspective:

**Before (Old Flow)**:
1. AI qualifies lead
2. Lead appears in Lead Pool
3. Stage badge shows "New Contact" (confusing)
4. Agent claims lead
5. Agent manually moves to "Working Lead" (extra step)

**After (New Flow)**:
1. AI qualifies lead
2. Lead automatically moves to "Working Lead / Claimed Lead"
3. Lead appears in Lead Pool
4. Stage badge shows "Working Lead / Claimed Lead" ✅ (correct)
5. Agent claims lead
6. Lead stays in "Working Lead / Claimed Lead" (no manual move needed)

### Benefits:
- ✅ Clearer pipeline stage progression
- ✅ No manual stage changes needed after claiming
- ✅ Automatic workflow, reduces human error
- ✅ Better tracking of AI-qualified leads

## Monitoring

To track auto-moved leads:

```sql
-- Find leads that were auto-moved today
SELECT
  l.id,
  l.first_name,
  l.last_name,
  c.handoff_triggered_at,
  ps.name as current_stage
FROM leads l
JOIN conversations c ON l.id = c.lead_id
JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
WHERE c.requires_human_handoff = true
  AND c.handoff_triggered_at::date = CURRENT_DATE
  AND ps.name = 'Working Lead / Claimed Lead'
ORDER BY c.handoff_triggered_at DESC;
```

## Rollback

If you need to undo this migration:

```sql
-- 1. Remove trigger
DROP TRIGGER IF EXISTS trigger_auto_move_handoff_leads ON conversations;

-- 2. Remove function
DROP FUNCTION IF EXISTS auto_move_handoff_leads();

-- 3. Rename stage back
UPDATE pipeline_stages
SET name = 'Working Lead'
WHERE name = 'Working Lead / Claimed Lead';
```

## Next Steps

After running the migration:

1. ✅ Verify pipeline stage renamed in Pipeline page
2. ✅ Test AI handoff with a real lead
3. ✅ Check Lead Pool displays correct stage badges
4. ✅ Claim a lead and verify it stays in "Working Lead / Claimed Lead"
5. ✅ Monitor n8n workflow logs for any errors

---

**Created**: November 30, 2025
**Migration File**: `supabase/migrations/20251130000002_auto_move_handoff_leads.sql`
