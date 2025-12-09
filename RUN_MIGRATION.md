# Database Migration Instructions

## ⚡ LATEST MIGRATIONS (Run in Order)

### Migration 1: Enable Real-Time Updates
**File:** `supabase/migrations/20251209000000_enable_realtime_replication.sql`

**What This Does:**
- Enables REPLICA IDENTITY on conversations and messages tables
- Adds tables to Supabase real-time publication
- Allows real-time subscriptions to work

### Migration 2: Fix Message Ordering (Source of Truth)
**File:** `supabase/migrations/20251209000001_use_messages_created_at_for_ordering.sql`

**What This Does:**
- Creates index on `messages(conversation_id, created_at)` for performance
- Creates `conversation_list` VIEW that computes `last_message_at` from `messages.created_at`
- Removes dependency on denormalized `conversations.last_message_at` field

### Migration 3: Manual AI Override (NEW - Dec 9, 2025)
**File:** `supabase/migrations/20251209000002_add_manual_ai_override.sql`

**What This Does:**
- Adds `ai_controlled` (BOOLEAN) - Master switch to enable/disable AI
- Adds `takeover_at` (TIMESTAMPTZ) - When admin took over
- Adds `takeover_by` (UUID) - Which admin took over
- Creates performance indexes

**Note:** Manual SMS sending uses frontend-direct n8n calls (not database triggers) for immediate user feedback and better UX.

### Migration 4: Update conversation_list VIEW (NEW - Dec 9, 2025)
**File:** `supabase/migrations/20251209000003_update_conversation_list_view.sql`

**What This Does:**
- Updates `conversation_list` VIEW to include the new AI control fields
- Adds `ai_controlled`, `takeover_at`, `takeover_by` to the VIEW
- Fixes "no conversations showing" issue in frontend

**Why This Is Needed:**
Migration 3 added new columns to the `conversations` table, but the `conversation_list` VIEW (created in Migration 2) didn't include them. The frontend queries these fields from the VIEW, causing SQL errors and no conversations to display.

**After this migration:**
- ✅ Frontend can query AI control fields from conversation_list VIEW
- ✅ Conversations display correctly in Conversations page
- ✅ AI status badge shows "AI Active" vs "Manual Control"
- ✅ "Take Over from AI" button works properly

### Migration 5: Enable Real-Time for Leads Table (NEW - Dec 9, 2025)
**File:** `supabase/migrations/20251209000004_enable_realtime_for_leads.sql`

**What This Does:**
- Enables REPLICA IDENTITY on leads table
- Adds leads table to Supabase real-time publication
- Enables automatic table updates without refresh

**Why This Is Needed:**
The Leads page already has real-time subscriptions implemented in code (line 140-144 in Leads.tsx), but the leads table didn't have real-time replication enabled in the database. This caused the leads table to require manual refresh to see updates.

**After this migration:**
- ✅ New leads appear immediately after creation (CSV import, manual entry)
- ✅ Tag changes update without refresh
- ✅ Status changes show instantly
- ✅ Deletions remove rows in real-time
- ✅ No more manual page refresh needed

---

**Why This Is Needed:**

Client feedback: *"Manual override of the AI is a must - If a conversation is headed south, glitch in the AI or a client who is messing around and having long conversations just for the fun of it but not a serious buyer. We could potentially lose clients this way and it will increase our operating costs of AI."*

**Problems without manual override:**
- ❌ AI can waste money on time-wasters
- ❌ Agent can't stop AI if conversation going south
- ❌ No way to take control when AI messes up
- ❌ Risk losing real buyers if AI gives wrong info

**After this migration:**
- ✅ Admin can click "Take Over from AI" button
- ✅ AI immediately stops responding to that conversation
- ✅ Admin can send manual messages (Workflow 6 - to be implemented)
- ✅ Audit trail of who took over and when
- ✅ Cost control - stop AI for time wasters

---

**Why Real-Time Updates Needed:**

Client reported: *"Real time updating on the Auto AI is a must, I was working a conversation and I didn't notice the pass off because I didn't refresh my screen."*

**Problems with old approach:**
- ❌ `conversations.last_message_at` was manually set, not automatically updated
- ❌ New messages didn't move conversation to top of list
- ❌ Required complex triggers to keep in sync
- ❌ Could get out of sync if trigger failed

**After these migrations:**
- ✅ Orange "Action Required" badge appears immediately when AI triggers handoff
- ✅ New messages show up without refresh
- ✅ Conversation automatically moves to top when new message arrives
- ✅ First conversation auto-selected on page load
- ✅ Auto-scrolls to latest message
- ✅ Single source of truth: `messages.created_at`

---

## Previous Migration: UNIQUE Phone Constraint

### Migration File
`supabase/migrations/20251130000001_add_unique_phone_and_claimed_at.sql`

### What This Migration Does

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
