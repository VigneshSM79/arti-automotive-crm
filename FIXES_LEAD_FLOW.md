# Lead Flow Fixes - November 29, 2025

## 🎯 Corrected Lead Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LEAD CREATION (owner_id = NULL)                          │
│    - CSV Import OR Manual Entry                             │
│    - All leads created with owner_id = NULL                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PIPELINE "NEW CONTACT" STAGE                             │
│    - ALL unassigned leads (owner_id = NULL)                 │
│    - Visible to EVERYONE (agents + admins)                  │
│    - Waiting for AI qualification                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AI QUALIFICATION (n8n Backend)                           │
│    - 2-3 SMS exchanges via Twilio                           │
│    - AI analyzes responses (GPT-4)                          │
│    - Sets: conversations.requires_human_handoff = TRUE      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. LEAD POOL PAGE                                           │
│    - Qualified leads: owner_id = NULL AND                   │
│      conversations.requires_human_handoff = TRUE            │
│    - Competitive claiming (first-come-first-served)         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. AGENT CLAIMS LEAD                                        │
│    - owner_id = <agent_user_id>                             │
│    - Lead disappears from Lead Pool                         │
│    - Lead disappears from other agents' Pipeline views      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. AGENT'S PIPELINE (All Stages)                            │
│    - Claimed lead appears in agent's Pipeline               │
│    - Agent moves lead through stages (Kanban)               │
│    - Only visible to owning agent + admins                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Files Changed

### 1. **src/pages/Leads.tsx** (Manual Lead Creation)

**Problem:**
```typescript
owner_id: user?.id, // ❌ Manually created leads went directly to creator's pipeline
```

**Fixed:**
```typescript
owner_id: null, // ✅ All leads start unassigned in "New Contact" stage
```

**Location:** Line 305

---

### 2. **src/pages/Pipeline.tsx** (Pipeline View)

**Problem:**
```typescript
.not('owner_id', 'is', null); // ❌ Filtered out unassigned leads
```

**Fixed:**
```typescript
// ✅ Show unassigned leads to everyone, assigned leads only to owner/admin

// For Regular Agents:
query.or(`owner_id.is.null,owner_id.eq.${user.id}`);

// For Admins (when salesperson selected):
query.or(`owner_id.is.null,owner_id.eq.${selectedSalesperson}`);
```

**What This Means:**
- **ALL agents** see unassigned leads (owner_id = NULL) in "New Contact" stage
- **Each agent** sees ONLY their own claimed leads (owner_id = their ID)
- **Admins** see all leads when "All Salespeople" selected, or filtered leads + unassigned

**Location:** Lines 90-103

---

### 3. **src/pages/LeadPool.tsx** (Lead Pool View)

**Problem:**
```typescript
.eq('campaign_enrollments.status', 'qualified') // ❌ Wrong field
```

**Fixed:**
```typescript
.eq('conversations.requires_human_handoff', true) // ✅ Correct AI handoff flag
```

**What This Means:**
- Lead Pool shows ONLY leads where AI determined human intervention needed
- Filters by: `owner_id = NULL AND conversations.requires_human_handoff = TRUE`
- This is a **subset** of unassigned leads (not all unassigned leads appear here)

**Location:** Line 53

---

## 📊 Key Database Fields

### **leads.owner_id**
- `NULL` → Unassigned (in Pool/Pipeline "New Contact")
- `<user_id>` → Claimed by agent (in agent's Pipeline)

### **conversations.requires_human_handoff**
- `FALSE` → AI still qualifying (not in Lead Pool)
- `TRUE` → AI qualified, ready for claiming (appears in Lead Pool)

### **conversations.handoff_triggered_at**
- Timestamp when AI set `requires_human_handoff = TRUE`

### **conversations.ai_message_count**
- Number of AI messages sent (typically 2-3 before handoff)

---

## ✅ Verification Checklist

After these fixes, test the following flow:

### Test 1: CSV Import
- [ ] Import CSV with 5 leads
- [ ] All leads have `owner_id = NULL` in database
- [ ] All leads appear in Pipeline "New Contact" stage (visible to all agents)
- [ ] None appear in Lead Pool (requires_human_handoff still FALSE)

### Test 2: Manual Lead Creation
- [ ] Create lead manually in Leads page
- [ ] Lead has `owner_id = NULL` in database
- [ ] Lead appears in Pipeline "New Contact" stage (visible to all agents)
- [ ] Does NOT appear in Lead Pool yet

### Test 3: AI Qualification (n8n)
- [ ] n8n Workflow 2 analyzes SMS response
- [ ] n8n sets `conversations.requires_human_handoff = TRUE`
- [ ] Lead appears in Lead Pool page
- [ ] Lead still shows in Pipeline "New Contact" stage

### Test 4: Lead Claiming
- [ ] Agent A clicks "Claim Lead" in Lead Pool
- [ ] Lead's `owner_id` updates to Agent A's ID
- [ ] Lead disappears from Lead Pool
- [ ] Lead disappears from Agent B's Pipeline view
- [ ] Lead still shows in Agent A's Pipeline (now movable through stages)

### Test 5: Admin View
- [ ] Admin logs in
- [ ] Admin sees ALL leads in Pipeline (assigned + unassigned)
- [ ] Admin filters by "Agent A" → sees Agent A's leads + unassigned leads
- [ ] Admin filters by "All Salespeople" → sees all leads

---

## 🚨 Important Notes

### CSV Import vs Manual Entry
**Both now behave identically:**
- Both set `owner_id = NULL` on creation
- Both appear in Pipeline "New Contact" stage
- Both wait for AI qualification before appearing in Lead Pool

### Pipeline vs Lead Pool
**Pipeline Page:**
- Shows **ALL unassigned** leads (owner_id = NULL) to everyone
- Shows **assigned** leads only to owner/admin
- Purpose: Visual kanban board for managing leads through stages

**Lead Pool Page:**
- Shows **ONLY qualified unassigned** leads (requires_human_handoff = TRUE)
- Purpose: Competitive claiming interface for AI-qualified leads
- This is a **filtered subset** of unassigned leads

### RLS Policies
Ensure Supabase RLS policies allow:
- **Agents** can see leads where `owner_id = NULL OR owner_id = auth.uid()`
- **Admins** can see all leads (detected via `has_role(auth.uid(), 'admin')`)

---

## 📝 SQL Queries for Testing

### Check Unassigned Leads
```sql
SELECT id, first_name, last_name, owner_id, status
FROM leads
WHERE owner_id IS NULL
ORDER BY created_at DESC;
```

### Check Qualified Leads (Should Appear in Lead Pool)
```sql
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.owner_id,
  c.requires_human_handoff,
  c.ai_message_count
FROM leads l
LEFT JOIN conversations c ON c.lead_id = l.id
WHERE l.owner_id IS NULL
  AND c.requires_human_handoff = TRUE;
```

### Check Agent's Claimed Leads
```sql
SELECT id, first_name, last_name, owner_id
FROM leads
WHERE owner_id = '[agent-user-id]';
```

---

**Date:** November 29, 2025
**Status:** ✅ Fixed and ready for testing
