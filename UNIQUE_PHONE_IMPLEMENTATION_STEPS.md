# Unique Phone Number Implementation - Step-by-Step Plan

## Current Situation

**Database Analysis Results:**
- 3 unique phone numbers with 15 duplicates each
- Total: 45 records, need to keep 3 (delete 42 duplicates)
- Phone numbers found:
  - `+17785552345` (15 duplicates)
  - `+16045551234` (15 duplicates)
  - `+16043334444` (15 duplicates)

## User Requirements

1. **Database UNIQUE constraint** - Hard stop, do not allow duplicate phone numbers
2. **UI phone normalization** - Hardcode "+1" prefix in UI, user enters only 10 digits
3. **Duplicate detection popup** - Warn user before manual entry if phone exists
4. **Graceful CSV handling** - Skip duplicates with clear error message

---

## Implementation Steps

### **PHASE 1: Database Cleanup (CRITICAL - DO FIRST)**

#### Step 1.1: Identify Records to Keep
Run this SQL to see which records will be kept (oldest created_at per phone):

```sql
-- See which records will be KEPT (oldest per phone)
SELECT DISTINCT ON (phone)
  id,
  phone,
  first_name,
  last_name,
  email,
  created_at,
  owner_id
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
ORDER BY phone, created_at ASC;
```

**Action:** Review output, confirm these are the correct records to keep

#### Step 1.2: Backup Duplicate Records (Safety)
```sql
-- Create backup table of duplicates before deletion
CREATE TABLE leads_duplicates_backup AS
SELECT *
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
AND id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM leads
  WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
  ORDER BY phone, created_at ASC
);

-- Verify backup count (should be 42 records)
SELECT COUNT(*) FROM leads_duplicates_backup;
```

**Expected Result:** 42 records backed up

#### Step 1.3: Delete Duplicate Records
```sql
-- Delete duplicates, keeping oldest record per phone
DELETE FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
AND id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM leads
  WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
  ORDER BY phone, created_at ASC
);

-- Should delete 42 records
```

**Expected Output:** `DELETE 42`

#### Step 1.4: Verify Cleanup
```sql
-- Verify no duplicates remain
SELECT phone, COUNT(*) as count
FROM leads
GROUP BY phone
HAVING COUNT(*) > 1;

-- Should return 0 rows
```

**Action:** If returns 0 rows, cleanup successful ✅

---

### **PHASE 2: Database Migration**

#### Step 2.1: Create Migration File
Create: `supabase/migrations/YYYYMMDDHHMMSS_add_unique_phone_and_claimed_at.sql`

```sql
-- Migration: Add UNIQUE constraint on phone + claimed_at timestamp

-- 1. Add claimed_at column (for tracking when leads are claimed)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.claimed_at IS 'Timestamp when lead was claimed by a sales agent';

-- 2. Add UNIQUE constraint on phone column
ALTER TABLE leads
ADD CONSTRAINT unique_phone_number UNIQUE (phone);

COMMENT ON CONSTRAINT unique_phone_number ON leads IS 'Prevents duplicate contacts with same phone number';

-- 3. Create index for performance on claimed_at queries
CREATE INDEX IF NOT EXISTS idx_leads_claimed_at ON leads(claimed_at)
WHERE claimed_at IS NOT NULL;
```

#### Step 2.2: Apply Migration
- **Option A:** Run SQL in Supabase Dashboard SQL Editor
- **Option B:** Use Supabase CLI: `supabase db push`

**Expected Result:** Migration succeeds, no errors

#### Step 2.3: Verify Migration
```sql
-- Check UNIQUE constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'leads'::regclass
AND conname = 'unique_phone_number';

-- Check claimed_at column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name = 'claimed_at';
```

**Action:** Both queries should return results ✅

---

### **PHASE 3: Frontend Phone Input with +1 Prefix**

#### Step 3.1: Update Manual Lead Creation Form (Leads.tsx)

**Changes needed in the form:**

1. **Phone input field** - Show "+1" prefix, user enters 10 digits only
2. **Validation** - Exactly 10 digits required
3. **Submission** - Concatenate "+1" + user input before saving

**UI Design:**
```
┌─────────────────────────────────────┐
│ Phone Number *                      │
│ ┌────────┬──────────────────────┐  │
│ │  +1    │ (778) 555-2345       │  │
│ └────────┴──────────────────────┘  │
│ Enter 10-digit phone number         │
└─────────────────────────────────────┘
```

**Implementation approach:**
- Use Input component with `prefix="+1"` (styled as disabled/gray)
- User types only digits: "7785552345"
- Auto-format as user types: "(778) 555-2345" (optional UX improvement)
- Before submit: `phone = "+1" + digits.replace(/\D/g, '')`

**Validation rules:**
```typescript
// Remove all non-digits
const digits = phoneInput.replace(/\D/g, '');

// Must be exactly 10 digits
if (digits.length !== 10) {
  return "Phone number must be exactly 10 digits";
}

// Create E.164 format
const e164Phone = `+1${digits}`;
```

#### Step 3.2: Update CSV Import Phone Normalization (Leads.tsx)

**Enhance existing `normalizePhoneNumber()` function:**

```typescript
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return cleaned; // Already E.164: +1XXXXXXXXXX
  } else if (cleaned.startsWith('+1')) {
    // Has +1 but wrong length - strip and reprocess
    return normalizePhoneNumber(cleaned.substring(2));
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`; // 1XXXXXXXXXX -> +1XXXXXXXXXX
  } else if (cleaned.length === 10) {
    return `+1${cleaned}`; // XXXXXXXXXX -> +1XXXXXXXXXX
  } else {
    // Invalid format - return as-is, will fail validation
    return phone;
  }
};
```

**CSV validation adds:**
- Check normalized phone length is exactly 12 characters
- Check starts with "+1"
- Flag invalid formats as errors

---

### **PHASE 4: Duplicate Detection Popup**

#### Step 4.1: Create Duplicate Check Utility Function

Create: `src/lib/duplicatePhoneCheck.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface ExistingLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingLead?: ExistingLead;
}

/**
 * Check if a phone number already exists in the database
 * @param phone - Phone number in E.164 format (+1XXXXXXXXXX)
 */
export async function checkDuplicatePhone(
  phone: string
): Promise<DuplicateCheckResult> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, phone, email, status, owner_id, created_at')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error checking duplicate phone:', error);
      return { isDuplicate: false };
    }

    return {
      isDuplicate: !!data,
      existingLead: data || undefined,
    };
  } catch (error) {
    console.error('Unexpected error in checkDuplicatePhone:', error);
    return { isDuplicate: false };
  }
}
```

#### Step 4.2: Create DuplicateContactDialog Component

Create: `src/components/leads/DuplicateContactDialog.tsx`

**Features:**
- Shows existing contact details (name, email, phone, status, created date)
- Shows who owns the lead (agent name or "Unassigned")
- Two action buttons:
  - **"View Existing Contact"** - Navigate to lead detail or Pipeline
  - **"Cancel"** - Close dialog, stay on form

**UI Design:**
```
┌──────────────────────────────────────────────┐
│  ⚠️  Duplicate Contact Detected              │
│                                              │
│  This phone number already exists:           │
│                                              │
│  📞 +1 (778) 555-2345                        │
│  👤 John Smith                               │
│  📧 john.smith@example.com                   │
│  📊 Status: Contacted                        │
│  🗓️  Created: Nov 15, 2025                   │
│  👨‍💼 Owner: Sarah Johnson (Sales Agent)      │
│                                              │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │ View Existing    │  │     Cancel      │  │
│  └──────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────┘
```

#### Step 4.3: Integrate Duplicate Check in Manual Lead Form

**In Leads.tsx, update form submission:**

1. Before calling `createLeadMutation.mutate()`:
   - Call `checkDuplicatePhone(e164Phone)`
   - If `isDuplicate === true`, show DuplicateContactDialog
   - User clicks "Cancel" → stays on form, can edit phone number
   - User clicks "View Existing" → navigate away, form discarded

2. Only submit if no duplicate found

**Flow:**
```
User fills form → Clicks "Create Lead"
  ↓
Validate phone (10 digits) → Convert to E.164 (+1XXXXXXXXXX)
  ↓
Check duplicate via checkDuplicatePhone()
  ↓
  ├─ No duplicate → Create lead ✅
  └─ Duplicate found → Show popup ⚠️
       ↓
       ├─ User clicks "Cancel" → Close popup, stay on form
       └─ User clicks "View Existing" → Navigate to Pipeline
```

---

### **PHASE 5: Update CSV Import Duplicate Handling**

#### Step 5.1: Modify CSV Import Logic (Leads.tsx)

**Current behavior:** CSV import shows validation errors for bad data, but no duplicate check

**New behavior:**
1. During CSV upload, check each phone against database
2. Flag duplicates as **warnings** (not errors - user can still import)
3. On import, catch database UNIQUE constraint errors gracefully
4. Show summary: "Imported 45 leads, skipped 3 duplicates"

**Implementation approach:**

**Option A: Pre-check duplicates (slower but better UX)**
- Before import, query database for all phone numbers in CSV
- Mark rows with existing phones as "duplicate"
- User sees: `⚠️ Duplicate: +17785552345 (already exists)`
- User can deselect duplicates before import

**Option B: Try and catch (faster)**
- Import all rows, catch UNIQUE constraint violations
- Database rejects duplicates automatically
- Show toast: "Imported 45 leads, 3 duplicates skipped"

**Recommendation:** Option B (simpler, leverages database constraint)

**Error handling:**
```typescript
// Wrap insert in try-catch
try {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...leadData, phone: e164Phone });

  if (error) {
    if (error.code === '23505') { // Postgres UNIQUE constraint violation
      // Skip this lead, track as duplicate
      duplicateCount++;
    } else {
      throw error;
    }
  } else {
    successCount++;
  }
} catch (err) {
  console.error('Import error:', err);
  errorCount++;
}
```

**Summary toast after import:**
```
✅ CSV Import Complete
• 45 leads imported successfully
• 3 duplicates skipped (phone already exists)
• 2 errors (invalid data)
```

---

### **PHASE 6: Update Lead Pool Claim Mutation**

#### Step 6.1: Add claimed_at Timestamp (LeadPool.tsx)

**Current code:**
```typescript
const { error } = await supabase
  .from('leads')
  .update({ owner_id: user.id })
  .eq('id', leadId);
```

**Updated code:**
```typescript
const { error } = await supabase
  .from('leads')
  .update({
    owner_id: user.id,
    claimed_at: new Date().toISOString(), // Add timestamp
  })
  .eq('id', leadId);
```

**Purpose:** Track when lead was claimed (for analytics, reporting, claimed leads display)

---

### **PHASE 7: Testing Plan**

#### Test 7.1: Manual Lead Creation Duplicate Detection
1. Open Leads page → "New Lead" button
2. Enter phone: `7785552345` (existing duplicate)
3. Fill other fields → Click "Create Lead"
4. **Expected:** Popup shows "Duplicate Contact Detected" with John Smith details
5. Click "Cancel" → Popup closes, form still has data
6. Change phone to `7785559999` → Click "Create Lead"
7. **Expected:** Lead created successfully ✅

#### Test 7.2: CSV Import with Duplicates
1. Create CSV with 5 leads:
   - 2 new unique phones
   - 3 existing phones (duplicates)
2. Upload CSV → Preview shows all 5 valid
3. Click "Import"
4. **Expected:** Toast shows "2 leads imported, 3 duplicates skipped" ✅
5. Verify database: Only 2 new leads created

#### Test 7.3: Database UNIQUE Constraint Enforcement
1. Attempt direct SQL insert of duplicate:
   ```sql
   INSERT INTO leads (phone, first_name, last_name, user_id)
   VALUES ('+17785552345', 'Test', 'User', 'some-user-id');
   ```
2. **Expected:** Error: `duplicate key value violates unique constraint "unique_phone_number"` ✅

#### Test 7.4: claimed_at Timestamp
1. Go to Lead Pool page
2. Claim an unassigned lead
3. Query database:
   ```sql
   SELECT owner_id, claimed_at FROM leads WHERE id = '<lead-id>';
   ```
4. **Expected:** claimed_at has recent timestamp ✅

#### Test 7.5: Phone Input Validation
1. Manual lead form, phone field:
   - Enter `778555` (6 digits) → **Error:** "Must be 10 digits"
   - Enter `77855512345` (11 digits) → **Error:** "Must be 10 digits"
   - Enter `7785551234` (10 digits) → **Valid** ✅
2. Verify submitted as `+17785551234` in database

---

## Rollback Plan (If Something Goes Wrong)

### If migration fails:
```sql
-- Remove UNIQUE constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS unique_phone_number;

-- Remove claimed_at column
ALTER TABLE leads DROP COLUMN IF EXISTS claimed_at;
```

### If need to restore deleted duplicates:
```sql
-- Restore from backup table
INSERT INTO leads
SELECT * FROM leads_duplicates_backup;

-- Verify restoration
SELECT COUNT(*) FROM leads WHERE phone IN ('+17785552345', '+16045551234', '+16043334444');
-- Should return 45
```

---

## Summary of Changes

### Database
- ✅ Clean up 42 duplicate records (keep oldest per phone)
- ✅ Add UNIQUE constraint on `phone` column
- ✅ Add `claimed_at` TIMESTAMPTZ column

### Frontend Files Modified
1. **src/pages/Leads.tsx**
   - Phone input with "+1" prefix (manual entry)
   - 10-digit validation
   - Duplicate check before insert
   - CSV import duplicate handling

2. **src/pages/LeadPool.tsx**
   - Update claimLeadMutation to set `claimed_at`

3. **src/lib/duplicatePhoneCheck.ts** (NEW)
   - checkDuplicatePhone() utility function

4. **src/components/leads/DuplicateContactDialog.tsx** (NEW)
   - Popup showing existing contact details
   - "View Existing" and "Cancel" buttons

### User Experience
- ✅ User only enters 10 digits, system adds "+1"
- ✅ Clear error if duplicate detected (manual entry)
- ✅ Graceful skipping of duplicates (CSV import)
- ✅ Database enforces uniqueness (hard stop)
- ✅ claimed_at tracks when leads are claimed

---

## Estimated Implementation Time

- **Phase 1:** Database cleanup - 10 minutes (manual SQL execution)
- **Phase 2:** Migration - 5 minutes (SQL execution)
- **Phase 3:** Frontend phone input - 30 minutes (UI + validation)
- **Phase 4:** Duplicate popup - 45 minutes (component + integration)
- **Phase 5:** CSV duplicate handling - 20 minutes (error handling)
- **Phase 6:** claimed_at update - 5 minutes (one-line change)
- **Phase 7:** Testing - 30 minutes (all scenarios)

**Total:** ~2.5 hours

---

## Next Steps

1. ✅ Review this plan
2. Run Phase 1 SQL queries (database cleanup)
3. Confirm cleanup successful before proceeding
4. Begin Phase 2 (migration)
5. Implement frontend changes (Phases 3-6)
6. Test thoroughly (Phase 7)
