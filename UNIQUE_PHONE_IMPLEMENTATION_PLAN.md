# Implementation Plan: Unique Phone Number Constraint + Frontend Validation

**Date:** November 29, 2025
**Feature:** Prevent duplicate contacts based on phone number with user-friendly validation

---

## 🎯 Goals

1. ✅ Prevent duplicate phone numbers at database level (UNIQUE constraint)
2. ✅ Add `claimed_at` timestamp to track when leads are claimed
3. ✅ Show friendly popup when user tries to add existing phone number
4. ✅ Handle duplicates gracefully in CSV imports
5. ✅ Provide options to view/update existing contact

---

## 📋 Implementation Steps

### **Phase 1: Database Preparation**

#### Step 1: Check for Existing Duplicates
**Action:** Query live Supabase database to find duplicate phone numbers

**SQL Query:**
```sql
-- Find all duplicate phone numbers
SELECT
  phone,
  COUNT(*) as count,
  ARRAY_AGG(id) as lead_ids,
  ARRAY_AGG(first_name || ' ' || last_name) as names,
  ARRAY_AGG(created_at) as created_dates
FROM leads
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

**Expected Output:**
- List of duplicate phone numbers
- How many times each appears
- Lead IDs and names for each duplicate

**Decision Point:**
- If duplicates found → Proceed to Step 2
- If no duplicates → Skip to Step 3

---

#### Step 2: Clean Up Duplicates (If Found)
**Action:** Resolve existing duplicates before adding constraint

**Strategy Options:**

**Option A: Keep Most Recent, Mark Others as 'lost'**
```sql
-- For each duplicate, keep newest, mark others as lost
UPDATE leads
SET status = 'lost',
    notes = CONCAT(COALESCE(notes, ''), '\n[Auto-marked as duplicate - kept most recent entry]')
WHERE id IN (
  -- Subquery to find older duplicates
);
```

**Option B: Manual Review**
- Export duplicates to CSV
- Client reviews and decides which to keep
- Manual cleanup via Supabase dashboard

**Option C: Merge Data**
- Combine tags, notes from all duplicates
- Keep most complete record
- Delete others

**Recommended:** Option A (automated) + notify client of changes

---

#### Step 3: Create Database Migration - UNIQUE Constraint
**File:** `supabase/migrations/YYYYMMDD_add_unique_phone_constraint.sql`

**Migration Content:**
```sql
-- ============================================================================
-- Migration: Add Unique Phone Constraint + claimed_at Column
-- Date: 2025-11-29
-- Purpose: Prevent duplicate phone numbers and track lead claim timestamps
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add claimed_at timestamp column
-- ============================================================================
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.claimed_at IS 'Timestamp when lead was claimed by an agent (owner_id set from NULL to user_id)';

-- Create index for querying recently claimed leads
CREATE INDEX IF NOT EXISTS idx_leads_claimed_at
ON leads(claimed_at)
WHERE claimed_at IS NOT NULL;

-- ============================================================================
-- STEP 2: Normalize existing phone numbers (ensure E.164 format)
-- ============================================================================
-- Remove any spaces, dashes, parentheses
UPDATE leads
SET phone = REGEXP_REPLACE(phone, '[^0-9+]', '', 'g');

-- Add +1 prefix to 10-digit US numbers (if not already prefixed)
UPDATE leads
SET phone = '+1' || phone
WHERE LENGTH(phone) = 10 AND phone NOT LIKE '+%';

-- Add + prefix to 11-digit numbers starting with 1
UPDATE leads
SET phone = '+' || phone
WHERE LENGTH(phone) = 11 AND phone LIKE '1%' AND phone NOT LIKE '+%';

-- ============================================================================
-- STEP 3: Add UNIQUE constraint on phone column
-- ============================================================================
ALTER TABLE leads
ADD CONSTRAINT unique_phone_number UNIQUE (phone);

-- ============================================================================
-- STEP 4: Create function to auto-normalize phone on insert/update (Optional)
-- ============================================================================
CREATE OR REPLACE FUNCTION normalize_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove non-numeric characters except +
  NEW.phone := REGEXP_REPLACE(NEW.phone, '[^0-9+]', '', 'g');

  -- Add +1 for 10-digit US numbers
  IF LENGTH(NEW.phone) = 10 AND NEW.phone NOT LIKE '+%' THEN
    NEW.phone := '+1' || NEW.phone;
  END IF;

  -- Add + for 11-digit numbers starting with 1
  IF LENGTH(NEW.phone) = 11 AND NEW.phone LIKE '1%' AND NEW.phone NOT LIKE '+%' THEN
    NEW.phone := '+' || NEW.phone;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-normalize phone numbers
DROP TRIGGER IF EXISTS normalize_phone_before_insert ON leads;
CREATE TRIGGER normalize_phone_before_insert
  BEFORE INSERT OR UPDATE OF phone ON leads
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_number();

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check if constraint was added
-- SELECT conname, contype
-- FROM pg_constraint
-- WHERE conrelid = 'leads'::regclass AND conname = 'unique_phone_number';

-- Check if claimed_at column exists
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'leads' AND column_name = 'claimed_at';
```

---

### **Phase 2: Frontend Validation**

#### Step 4: Create Duplicate Check Utility Function
**File:** `src/utils/leadValidation.ts` (new file)

**Function:**
```typescript
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingLead?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    status: string;
    owner_id?: string;
    created_at: string;
  };
}

/**
 * Check if a phone number already exists in the database
 * @param phone - Phone number to check (will be normalized)
 * @returns DuplicateCheckResult with existing lead info if found
 */
export async function checkDuplicatePhone(
  phone: string
): Promise<DuplicateCheckResult> {
  // Normalize phone number (same logic as in Leads.tsx)
  const normalizedPhone = normalizePhoneNumber(phone);

  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, phone, email, status, owner_id, created_at')
    .eq('phone', normalizedPhone)
    .maybeSingle(); // Returns null if not found, doesn't throw error

  if (error) {
    console.error('Error checking duplicate phone:', error);
    return { isDuplicate: false };
  }

  return {
    isDuplicate: !!data,
    existingLead: data || undefined,
  };
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  return phone; // Return as-is if can't normalize
}
```

---

#### Step 5: Create Duplicate Warning Dialog Component
**File:** `src/components/leads/DuplicateContactDialog.tsx` (new file)

**Component:**
```typescript
interface DuplicateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLead: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    status: string;
    owner_id?: string;
    created_at: string;
  };
  onViewExisting: () => void;
  onCancel: () => void;
}

export function DuplicateContactDialog({
  open,
  onOpenChange,
  existingLead,
  onViewExisting,
  onCancel,
}: DuplicateContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Contact Already Exists
          </DialogTitle>
          <DialogDescription>
            A contact with this phone number already exists in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Existing Contact:</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {existingLead.first_name} {existingLead.last_name}</p>
              <p><strong>Phone:</strong> {existingLead.phone}</p>
              {existingLead.email && (
                <p><strong>Email:</strong> {existingLead.email}</p>
              )}
              <p><strong>Status:</strong> {existingLead.status}</p>
              <p><strong>Created:</strong> {new Date(existingLead.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            You cannot add a duplicate contact. Would you like to view or update the existing contact instead?
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onViewExisting}>
            View Existing Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### Step 6: Integrate Duplicate Check in Lead Creation Form
**File:** `src/pages/Leads.tsx`

**Changes:**

**1. Add State for Duplicate Dialog:**
```typescript
const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
const [duplicateLead, setDuplicateLead] = useState<any>(null);
```

**2. Modify leadMutation to Check for Duplicates BEFORE Insert:**
```typescript
mutationFn: async (data: typeof formData) => {
  // STEP 1: Check for duplicate phone (only for NEW leads, not edits)
  if (!editingLead) {
    const duplicateCheck = await checkDuplicatePhone(data.phone);

    if (duplicateCheck.isDuplicate) {
      // Store duplicate info and show dialog
      setDuplicateLead(duplicateCheck.existingLead);
      setDuplicateDialogOpen(true);

      // Throw error to stop mutation
      throw new Error('DUPLICATE_PHONE');
    }
  }

  // STEP 2: Continue with normal insert/update logic
  const leadData = { ...data, owner_id: null, ... };

  // ... rest of existing logic
}
```

**3. Handle Duplicate Error in onError:**
```typescript
onError: (error: any) => {
  if (error.message === 'DUPLICATE_PHONE') {
    // Dialog already shown, just return
    return;
  }

  // Show other errors
  toast.error(`Failed to ${editingLead ? 'update' : 'create'} lead: ${error.message}`);
},
```

**4. Add "View Existing" Handler:**
```typescript
const handleViewDuplicate = () => {
  if (duplicateLead) {
    // Close both dialogs
    setDuplicateDialogOpen(false);
    handleCloseDialog();

    // Open edit dialog with existing lead
    // (Could navigate to Pipeline or open in edit mode)
    setEditingLead(duplicateLead);
    setFormData({
      first_name: duplicateLead.first_name,
      last_name: duplicateLead.last_name,
      phone: duplicateLead.phone,
      // ... populate form
    });
    setDialogOpen(true);
  }
};
```

**5. Render Duplicate Dialog:**
```typescript
<DuplicateContactDialog
  open={duplicateDialogOpen}
  onOpenChange={setDuplicateDialogOpen}
  existingLead={duplicateLead}
  onViewExisting={handleViewDuplicate}
  onCancel={() => setDuplicateDialogOpen(false)}
/>
```

---

#### Step 7: Update CSV Import Duplicate Handling
**File:** `src/pages/Leads.tsx`

**Changes in bulkImportMutation:**

**Option A: Skip Duplicates with Warning**
```typescript
mutationFn: async (validatedLeads: ValidationResult[]) => {
  const leadsToInsert = [];
  const skippedDuplicates = [];

  for (const result of validatedLeads.filter(r => r.isValid)) {
    const normalizedPhone = normalizePhoneNumber(result.data.phone);

    // Check if phone already exists
    const duplicateCheck = await checkDuplicatePhone(normalizedPhone);

    if (duplicateCheck.isDuplicate) {
      skippedDuplicates.push({
        name: `${result.data.first_name} ${result.data.last_name}`,
        phone: normalizedPhone,
      });
      continue; // Skip this lead
    }

    leadsToInsert.push({ ...result.data, owner_id: null, ... });
  }

  // Insert non-duplicate leads
  if (leadsToInsert.length > 0) {
    const { error } = await supabase.from('leads').insert(leadsToInsert);
    if (error) throw error;
  }

  return {
    inserted: leadsToInsert.length,
    skipped: skippedDuplicates,
  };
},
onSuccess: (result) => {
  if (result.skipped.length > 0) {
    toast({
      title: 'Import completed with warnings',
      description: `${result.inserted} leads imported. ${result.skipped.length} duplicates skipped.`,
      variant: 'warning',
    });
  } else {
    toast.success(`Successfully imported ${result.inserted} leads`);
  }
},
```

**Option B: Update Existing (More Complex)**
- Match by phone
- Update fields if new data is more complete
- Preserve existing tags, notes

---

#### Step 8: Update Claim Mutation to Set claimed_at
**File:** `src/pages/LeadPool.tsx`

**Change:**
```typescript
const claimLeadMutation = useMutation({
  mutationFn: async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('leads')
      .update({
        owner_id: user.id,
        claimed_at: new Date().toISOString(), // ← Add this
      })
      .eq('id', leadId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
    toast({ title: 'Lead claimed!', description: 'This lead has been assigned to you.' });
  },
});
```

---

### **Phase 3: Testing**

#### Step 9: Test Manual Lead Creation
**Test Cases:**

1. **Add New Lead (Unique Phone)**
   - ✅ Should succeed
   - ✅ Lead created in database

2. **Add Lead with Existing Phone**
   - ✅ Popup appears showing existing contact
   - ✅ Shows existing contact details
   - ✅ Offers "View Existing" and "Cancel" options
   - ✅ Database insert blocked

3. **View Existing Contact from Popup**
   - ✅ Clicking "View Existing" opens contact in edit mode
   - ✅ Can update existing contact details

4. **Edge Case: Different Format, Same Number**
   - Add: `604-555-1234`
   - Already exists: `+16045551234`
   - ✅ Should detect as duplicate (normalization working)

---

#### Step 10: Test CSV Import
**Test Cases:**

1. **CSV with All Unique Phones**
   - ✅ All leads imported successfully

2. **CSV with Some Duplicates**
   - ✅ Unique leads imported
   - ✅ Duplicates skipped
   - ✅ Toast shows: "X imported, Y duplicates skipped"

3. **CSV with Internal Duplicates**
   - Row 1: `604-555-1234`
   - Row 5: `+1-604-555-1234`
   - ✅ Only first occurrence imported
   - ✅ Second skipped as duplicate

4. **CSV with Database Duplicates**
   - CSV contains phone already in database
   - ✅ Skipped with warning

---

#### Step 11: Test Database Constraint
**Test Cases:**

1. **Direct SQL Insert (Bypass Frontend)**
   ```sql
   INSERT INTO leads (phone, first_name, last_name, ...)
   VALUES ('+16045551234', 'Test', 'User', ...);
   ```
   - First insert: ✅ Success
   - Second insert with same phone: ❌ Error: "duplicate key violates unique constraint"

2. **API/External Insert**
   - Any external system trying to insert duplicate
   - ✅ Database blocks it

---

### **Phase 4: User Documentation**

#### Update User Guide
**Add Section: Duplicate Contact Prevention**

```markdown
## Duplicate Contact Prevention

The system automatically prevents duplicate contacts based on phone numbers.

### When Adding Contacts Manually:
- If you enter a phone number that already exists, you'll see a warning popup
- The popup shows the existing contact's details
- You can:
  - **View Existing Contact**: Opens the existing contact for editing
  - **Cancel**: Close the dialog and modify your entry

### When Importing CSV:
- Duplicate phone numbers are automatically skipped
- You'll see a summary: "X leads imported, Y duplicates skipped"
- Duplicates are identified by phone number (format doesn't matter)

### Phone Number Formats:
All these formats are treated as the SAME number:
- 6045551234
- 604-555-1234
- (604) 555-1234
- +16045551234
```

---

## 📊 Rollback Plan

**If Issues Occur:**

### Remove UNIQUE Constraint:
```sql
ALTER TABLE leads DROP CONSTRAINT unique_phone_number;
```

### Remove claimed_at Column:
```sql
ALTER TABLE leads DROP COLUMN claimed_at;
```

### Remove Trigger:
```sql
DROP TRIGGER IF EXISTS normalize_phone_before_insert ON leads;
DROP FUNCTION IF EXISTS normalize_phone_number();
```

---

## 🎯 Success Criteria

- ✅ No duplicate phone numbers possible in database
- ✅ Friendly popup shown when user tries to add duplicate
- ✅ CSV imports skip duplicates gracefully
- ✅ Phone normalization works consistently
- ✅ `claimed_at` timestamp set when leads are claimed
- ✅ No existing duplicates in database
- ✅ All tests passing

---

## 📅 Estimated Timeline

- **Phase 1 (Database):** 1 hour
  - Check duplicates: 15 min
  - Cleanup (if needed): 30 min
  - Create migration: 15 min

- **Phase 2 (Frontend):** 2 hours
  - Utility function: 15 min
  - Dialog component: 30 min
  - Integrate in form: 45 min
  - CSV handling: 30 min

- **Phase 3 (Testing):** 1 hour
  - Manual tests: 30 min
  - CSV tests: 20 min
  - Database tests: 10 min

**Total: ~4 hours**

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing duplicates block constraint | High | Check first, cleanup before migration |
| Phone format inconsistency | Medium | Add normalization trigger |
| Race condition (2 users add same phone) | Low | Database constraint prevents it |
| User confusion from popup | Low | Clear messaging, offer helpful actions |
| CSV imports fail silently | Medium | Show clear summary of skipped duplicates |

---

**Date Created:** November 29, 2025
**Status:** Ready for Implementation
**Approved By:** [Pending]
