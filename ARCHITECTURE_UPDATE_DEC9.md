# Architecture Update: Frontend-First for Manual SMS

**Date:** December 9, 2025
**Change Type:** Architecture Pattern Update
**Scope:** Manual AI Override Feature

---

## Summary

Changed manual SMS sending from **database trigger pattern** to **frontend-first direct calls** for better user experience and immediate feedback.

---

## What Changed

### ❌ OLD Architecture (Database Trigger)
```
Admin sends message
  → Frontend inserts to messages table
  → Database trigger fires
  → n8n webhook called
  → Twilio sends SMS
  → Message status updated
  → (Frontend has no idea if it worked)
```

**Problems:**
- No immediate feedback to user
- No loading states
- Can't show error messages
- Orphaned messages if Twilio fails
- Silent failures

---

### ✅ NEW Architecture (Frontend-First)
```
Admin sends message
  → Frontend shows "Sending..." spinner
  → Frontend calls n8n webhook directly
  → n8n sends via Twilio
  → If success: n8n inserts message to DB → Returns 200
  → If fail: n8n returns 400 error
  → Frontend shows "Sent!" or "Failed: {error}"
```

**Benefits:**
- ✅ Immediate user feedback
- ✅ Loading states ("Sending...")
- ✅ Error messages shown to user
- ✅ No orphaned messages (insert only if SMS succeeds)
- ✅ Easy debugging (browser console + n8n logs)

---

## Files Updated

### 1. **CLAUDE.md** ✅
- Added "Hybrid Webhook Architecture" section
- Documents Pattern 1 (Database Triggers) for automated flows
- Documents Pattern 2 (Frontend Direct Calls) for manual actions
- Explains when to use each pattern

### 2. **n8n_WORKFLOW_UPDATES.md** ✅
- Updated Workflow 6 specifications
- Removed database trigger dependency
- Added auth header validation (`Authorization: Bearer token`)
- Updated node configuration (5 nodes instead of 8)
- Simplified: Webhook → Twilio → Insert → Return Response
- Updated testing instructions (curl/Postman instead of SQL)

### 3. **MANUAL_OVERRIDE_WORKFLOW.md** ✅
- Updated architecture pattern explanation
- Changed frontend code from database insert to fetch() call
- Added environment variable requirements
- Updated implementation checklist

### 4. **RUN_MIGRATION.md** ✅
- Removed Migration 4 (database trigger)
- Added note about frontend-first approach
- Clarified only Migration 3 needed

### 5. **Migration Deleted** ✅
- Deleted `20251209000003_add_manual_message_trigger.sql`
- Not needed with frontend-first approach

---

## What Stayed the Same

### ✅ Still Using Database Triggers For:
- **AI qualification** (Workflow 2) - Inbound SMS → Database → n8n AI processing
- **Campaign enrollment** - Tag changes → Database → n8n workflows
- **Initial messages** (Workflow 1) - Lead tagged → Database → n8n

**Why:** These are automated background processes where users aren't waiting for feedback.

---

## Configuration Required

### Environment Variables

**Vercel (Frontend):**
```env
VITE_N8N_MANUAL_SMS_WEBHOOK=https://your-n8n.com/webhook/send-manual-sms
VITE_N8N_WEBHOOK_AUTH_TOKEN=your-secret-token
```

**n8n (Backend):**
```env
N8N_WEBHOOK_AUTH_TOKEN=your-secret-token
```

**Note:** Use same token value for auth validation.

---

## n8n Workflow 6 Changes

### Simplified to 5 Nodes:

1. **Webhook** - Receives from frontend (validates auth header)
2. **Twilio** - Send SMS
3. **Supabase Insert** - Insert message (SUCCESS branch only)
4. **Return 200** - Success response to frontend
5. **Return 400** - Error response (FAIL branch)

**Key:** n8n returns response to frontend, enabling immediate feedback.

---

## Testing Changes

### OLD Testing (Database Trigger):
```sql
-- Insert message via SQL to trigger webhook
INSERT INTO messages (...) VALUES (...);
```

### NEW Testing (Frontend Direct):
```bash
# Test with curl/Postman
curl -X POST https://n8n.../webhook/send-manual-sms \
  -H "Authorization: Bearer token" \
  -d '{"conversation_id": "...", "content": "..."}'
```

**Expected Response:**
```json
{
  "success": true,
  "message_id": "uuid",
  "twilio_sid": "SMxxxx"
}
```

---

## Migration Impact

### What You Need to Run:
- ✅ Migration 3: `20251209000002_add_manual_ai_override.sql` (already done)

### What You DON'T Need:
- ❌ Migration 4: Database trigger (deleted)

---

## Next Steps (Phase 3: Frontend UI)

After n8n Workflows are implemented:

1. **Add "Take Over from AI" Button**
   - Admin only
   - Sets `ai_controlled = false`

2. **Implement Send Message Function**
   - Calls `VITE_N8N_MANUAL_SMS_WEBHOOK`
   - Shows loading spinner
   - Displays success/error toast

3. **Add Admin Controls**
   - Assign to agent dropdown
   - Move to pipeline stage
   - AI status indicator

4. **Test End-to-End**
   - Admin takes over
   - Sends manual message
   - Sees "Sending..." → "Sent!"
   - Lead responds
   - AI stays disabled

---

## Documentation References

- **Architecture:** `CLAUDE.md` → "Hybrid Webhook Architecture"
- **n8n Implementation:** `n8n_WORKFLOW_UPDATES.md`
- **Frontend Code:** `MANUAL_OVERRIDE_WORKFLOW.md`
- **Migrations:** `RUN_MIGRATION.md`

---

**Status:** Phase 2 documentation complete, ready for n8n implementation.

**Last Updated:** December 9, 2025
