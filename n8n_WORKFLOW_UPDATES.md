# n8n Workflow Updates for Manual AI Override

**Date:** December 9, 2025
**Phase:** Phase 2 - n8n Workflows
**Related Migration:** `20251209000002_add_manual_ai_override.sql`

---

## Overview

This document provides step-by-step instructions for updating existing n8n workflows and creating a new workflow to support manual AI override functionality.

**Changes Required:**
1. **Update Workflow 2** - Add `ai_controlled` check before AI processing
2. **Create Workflow 6** - New workflow for sending manual SMS messages

---

## 📋 Workflow 2 Update: AI Tag Classification

**File:** `2-enhanced-ai-tag-classification.json`
**Current Purpose:** Receives inbound SMS, AI analyzes, AI responds
**New Purpose:** Same, BUT skip AI if admin has taken over manually

### What to Change

**ADD THIS AS THE FIRST NODE** after the webhook trigger:

---

### **New Node 1A: Supabase - Check AI Control Status**

**Node Type:** Supabase (Query)
**Name:** "Check if AI is Enabled"
**Position:** Immediately after Webhook node, before any AI processing

**Configuration:**
```javascript
Operation: Search
Table: conversations
Filters:
  - Field: id
    Operator: equals
    Value: {{ $json.body.conversation_id }}

Return Fields: ai_controlled, assigned_to, takeover_by

Limit: 1
```

**Output Example:**
```json
{
  "ai_controlled": false,
  "assigned_to": "uuid-of-agent",
  "takeover_by": "uuid-of-admin"
}
```

---

### **New Node 1B: IF - AI Control Check**

**Node Type:** IF Conditional
**Name:** "Is AI Controlled?"
**Position:** After "Check if AI is Enabled"

**Configuration:**
```javascript
Condition 1:
  - Field: {{ $json.ai_controlled }}
  - Operation: equals (boolean)
  - Value: true

If true → Proceed to existing AI processing nodes
If false → Go to "Log Manual Override" node
```

---

### **New Node 1C: Supabase - Log Manual Override (FALSE branch)**

**Node Type:** Supabase (Insert)
**Name:** "Log Inbound Message (Manual Mode)"
**Position:** FALSE branch of IF node

**Configuration:**
```javascript
Operation: Insert
Table: messages

Fields:
  - conversation_id: {{ $json.body.conversation_id }}
  - direction: 'inbound'
  - content: {{ $json.body.message_body }}
  - sender: {{ $json.body.from_number }}
  - recipient: {{ $json.body.to_number }}
  - is_ai_generated: false
  - status: 'received'
  - created_at: {{ $now }}

Return Fields: id, conversation_id, content
```

**Then:** Add "Stop and Error" node to exit workflow gracefully

---

### **New Node 1D: Stop and Error (Manual Control Active)**

**Node Type:** Stop and Error
**Name:** "Manual Control Active - AI Skipped"
**Position:** After "Log Inbound Message (Manual Mode)"

**Configuration:**
```javascript
Error Message: "AI is disabled for this conversation. Admin has manual control. Message logged but no AI response sent."

Error Type: Info (not a real error, just workflow exit)
```

---

### **Updated Flow Diagram:**

```
[Webhook: Inbound SMS]
         ↓
[Supabase: Check AI Enabled] ← NEW
         ↓
[IF: ai_controlled = true?] ← NEW
         ↓
    ┌────┴────┐
    ↓         ↓
  TRUE      FALSE ← NEW
    ↓         ↓
[Existing  [Log Message Only] ← NEW
 AI Flow]      ↓
    ↓      [Stop: Manual Mode] ← NEW
[OpenAI]
    ↓
[Twilio Send]
    ↓
[Update DB]
```

---

### **Complete Node Configuration (TRUE branch - existing flow)**

After the IF node's TRUE branch, your existing nodes continue unchanged:

1. OpenAI - Analyze Message
2. OpenAI - Generate Response
3. Supabase - Update Tags
4. Twilio - Send SMS
5. Supabase - Log AI Message
6. etc.

---

### **Testing Workflow 2 Update:**

**Test Case 1: AI Enabled (Normal Operation)**
1. Set conversation: `UPDATE conversations SET ai_controlled = true WHERE id = 'test-id';`
2. Send test SMS to Twilio number
3. Expected: AI processes normally, sends response

**Test Case 2: AI Disabled (Manual Override)**
1. Set conversation: `UPDATE conversations SET ai_controlled = false WHERE id = 'test-id';`
2. Send test SMS to Twilio number
3. Expected:
   - Workflow logs message to database
   - Workflow stops with "Manual Control Active" message
   - NO AI response sent
   - Message appears in database with `is_ai_generated = false`

---

## 🆕 Workflow 6 Creation: Send Manual SMS

**File:** `6-send-manual-agent-sms.json` (NEW)
**Purpose:** Send SMS when admin manually types and sends message
**Trigger:** Webhook called DIRECTLY from frontend (not database trigger)

**⚠️ ARCHITECTURE CHANGE (Dec 9, 2025):**
- Frontend calls n8n webhook directly for immediate feedback
- n8n sends SMS via Twilio, then inserts message to Supabase
- Returns success/error to frontend for toast notifications
- Better UX: loading states, immediate error handling

### Workflow 6 Architecture

```
[Webhook: Frontend Call] ← Direct from frontend (not database trigger)
         ↓
[Twilio: Send SMS]
         ↓
    ┌────┴────┐
    ↓         ↓
 SUCCESS    FAIL
    ↓         ↓
[Supabase:  [Return 400 Error]
 Insert          ↓
 Message]   Frontend shows
    ↓       error toast
[Return 200 Success]
    ↓
Frontend shows
"Message sent!"
```

**Key Difference from Original Design:**
- ❌ OLD: Database trigger → n8n → Insert message
- ✅ NEW: Frontend → n8n → Twilio → Insert message → Return to frontend
- **Why:** Immediate user feedback, loading states, better error handling

---

### **Node 1: Webhook Trigger**

**Node Type:** Webhook
**Name:** "Manual Message Webhook (Frontend Direct Call)"
**Method:** POST
**Path:** `/webhook/send-manual-sms`

**Authentication:**
- **Header:** `Authorization: Bearer <secret-token>`
- **Validation:** Check header matches `process.env.N8N_WEBHOOK_AUTH_TOKEN`
- **If invalid:** Return 401 Unauthorized

**Expected Payload from Frontend:**
```json
{
  "conversation_id": "uuid",
  "content": "Hello, this is admin responding...",
  "recipient": "+19876543210",
  "sender": "+12345678901",
  "sent_by": "admin-user-id"
}
```

**Note:** Frontend sends this directly (not via database trigger)
**Environment Variable Needed:**
- Vercel: `VITE_N8N_MANUAL_SMS_WEBHOOK=https://your-n8n.com/webhook/send-manual-sms`
- n8n: `N8N_WEBHOOK_AUTH_TOKEN=your-secret-token` (for validation)

---

### **Node 2: Twilio - Send SMS**

**Node Type:** Twilio (Send SMS)
**Name:** "Send Manual SMS via Twilio"

**Configuration:**
```javascript
From Number: {{ $json.body.sender }}
  // Frontend sends the Twilio number

To Number: {{ $json.body.recipient }}
  // Frontend sends the lead's phone

Message: {{ $json.body.content }}
  // The exact message admin typed
```

**Error Handling:** If this node fails, route to "Return Error Response" node

---

### **Node 3: Supabase - Insert Message (SUCCESS branch)**

**Node Type:** Supabase (Insert)
**Name:** "Insert Message to Database"
**Position:** After successful Twilio send

**Configuration:**
```javascript
Operation: Insert
Table: messages

Fields:
  - conversation_id: {{ $json.body.conversation_id }}
  - direction: 'outbound'
  - content: {{ $json.body.content }}
  - sender: {{ $json.body.sender }}
  - recipient: {{ $json.body.recipient }}
  - status: 'sent'
  - twilio_sid: {{ $node["Send Manual SMS via Twilio"].json.sid }}
  - is_ai_generated: false
  - created_at: {{ $now }}

Return Fields: id, conversation_id, content, status
```

**Note:** Message only inserted if Twilio succeeds (no orphaned messages!)

---

### **Node 4: Return Success Response**

**Node Type:** Respond to Webhook
**Name:** "Return Success to Frontend"
**Position:** After message inserted

**Configuration:**
```javascript
Status Code: 200

Response Body:
{
  "success": true,
  "message_id": "{{ $node['Insert Message to Database'].json.id }}",
  "twilio_sid": "{{ $node['Send Manual SMS via Twilio'].json.sid }}",
  "status": "sent"
}
```

**Frontend receives this and shows:** ✅ "Message sent!" toast

---

### **Node 5: Return Error Response (ERROR branch)**

**Node Type:** Respond to Webhook
**Name:** "Return Error to Frontend"
**Position:** ERROR branch from Twilio node

**Configuration:**
```javascript
Status Code: 400

Response Body:
{
  "success": false,
  "error": "{{ $node['Send Manual SMS via Twilio'].json.error || 'Failed to send SMS' }}",
  "details": "{{ $node['Send Manual SMS via Twilio'].json }}"
}
```

**Frontend receives this and shows:** ❌ "Failed to send message: {error}" toast

---

### **Error Handling Configuration**

**On Twilio Node:**
- On Error → Route to "Update Message Status - Failed" node
- Continue workflow execution: Yes
- Error output: Include full error details

---

### **Testing Workflow 6:**

**Test 1: Happy Path (Manual SMS Sends Successfully)**

**Test with curl or Postman:**
```bash
curl -X POST https://your-n8n.com/webhook/send-manual-sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "conversation_id": "<test-conversation-id>",
    "content": "Test manual message from admin",
    "sender": "+12345678901",
    "recipient": "+19876543210",
    "sent_by": "<admin-user-id>"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message_id": "uuid",
  "twilio_sid": "SMxxxxx",
  "status": "sent"
}
```

**Verify:**
1. Check n8n execution logs:
   - ✅ Webhook received from frontend
   - ✅ Twilio SMS sent successfully
   - ✅ Message inserted to database
   - ✅ 200 response returned

2. Check Twilio logs:
   - ✅ SMS delivered to test number

3. Verify in Supabase:
```sql
SELECT id, content, status, twilio_sid, is_ai_generated
FROM messages
WHERE conversation_id = '<test-conversation-id>'
ORDER BY created_at DESC
LIMIT 5;
```
Expected: `status = 'sent'`, `twilio_sid` populated, `is_ai_generated = false`

---

**Test 2: Error Path (Twilio Fails)**

**Test with invalid phone number:**
```bash
curl -X POST https://your-n8n.com/webhook/send-manual-sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "conversation_id": "<test-conversation-id>",
    "content": "Test message",
    "sender": "+12345678901",
    "recipient": "+1INVALID",
    "sent_by": "<admin-user-id>"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid phone number format",
  "details": {...}
}
```

**Verify:**
1. Check n8n execution logs:
   - ✅ Webhook received
   - ✅ Twilio node failed
   - ✅ Error branch taken
   - ✅ 400 error returned (NOT 500)
   - ✅ NO message inserted to database (clean failure)

---

**Test 3: Auth Header Validation**

**Test without auth header:**
```bash
curl -X POST https://your-n8n.com/webhook/send-manual-sms \
  -H "Content-Type: application/json" \
  -d '{"content": "Test"}'
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized - Invalid or missing auth token"
}
```

---

## 🔧 Configuration After Workflow Creation

### Step 1: Get Workflow 6 Webhook URL

After creating Workflow 6 in n8n:
1. Click on the Webhook node
2. Copy the webhook URL (e.g., `https://your-n8n.com/webhook/send-manual-sms`)

### Step 2: Add Environment Variables

**Vercel (Frontend):**
Add to Vercel environment variables:
```
VITE_N8N_MANUAL_SMS_WEBHOOK=https://your-n8n.com/webhook/send-manual-sms
VITE_N8N_WEBHOOK_AUTH_TOKEN=your-secret-token-here
```

**n8n (Backend):**
Add to n8n environment variables:
```
N8N_WEBHOOK_AUTH_TOKEN=your-secret-token-here
```

**Note:** Use the same token value in both places for auth validation.

### Step 3: Redeploy Frontend

After adding Vercel environment variables:
1. Trigger redeploy in Vercel
2. Or wait for next git push (auto-redeploys)

---

## 📊 Workflow Activation Order

**Important:** Activate workflows in this order:

1. ✅ Workflow 4 (DNC Handler) - if not already active
2. ✅ Workflow 3 (Lead Pool Notifications) - if not already active
3. ✅ **Workflow 6 (Manual SMS)** ← NEW - Activate this first
4. ✅ **Workflow 2 (AI Classification)** ← UPDATED - Activate after testing
5. ✅ Workflow 5 (4-Message Cadence) - if not already active
6. ✅ Workflow 1 (Initial Message) - if not already active

---

## 🧪 End-to-End Testing

### Test Scenario: Admin Takes Over and Sends Manual Message

**Step 1: Set up test conversation**
```sql
-- Create test lead
INSERT INTO leads (first_name, last_name, phone_number, status)
VALUES ('John', 'Test', '+19876543210', 'new')
RETURNING id;  -- Note this ID

-- Create test conversation
INSERT INTO conversations (lead_id, status, ai_controlled)
VALUES ('<lead-id>', 'active', true)
RETURNING id;  -- Note this ID
```

**Step 2: Admin takes over**
```sql
UPDATE conversations
SET ai_controlled = false,
    takeover_at = NOW(),
    takeover_by = '<admin-user-id>'
WHERE id = '<conversation-id>';
```

**Step 3: Simulate inbound SMS (test Workflow 2 skip)**
- Send test SMS to your Twilio number
- Expected: Workflow 2 logs message but does NOT send AI response

**Step 4: Admin sends manual message**
```sql
INSERT INTO messages (conversation_id, direction, content, sender, recipient, is_ai_generated)
VALUES (
  '<conversation-id>',
  'outbound',
  'Hi John, this is Sarah from Consumer Genius. How can I help?',
  '+12345678901',
  '+19876543210',
  false
);
```

**Step 5: Verify SMS sent**
- Check Twilio logs: SMS delivered
- Check message status: `status = 'sent'`
- Check n8n Workflow 6 execution: Success

**Step 6: Lead responds**
- Send another test SMS
- Expected: Workflow 2 still skips AI (ai_controlled still false)
- Message logged but no AI response

**✅ If all steps pass, manual override is working correctly!**

---

## 🚨 Common Issues & Troubleshooting

### Issue 1: Webhook Not Firing

**Symptom:** Insert message, but Workflow 6 doesn't execute

**Check:**
```sql
-- Verify trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_manual_message_inserted';

-- Check webhook URL configured
SHOW app.n8n_manual_sms_webhook_url;

-- Check pg_net extension enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**Fix:** Run migration `20251209000003_add_manual_message_trigger.sql`

---

### Issue 2: Workflow 2 Still Sends AI Responses

**Symptom:** Even with `ai_controlled = false`, AI still responds

**Check:**
- Is the IF node configured correctly?
- Is the Supabase query returning `ai_controlled` field?
- Is workflow using cached data?

**Fix:**
- Verify IF condition: `{{ $json.ai_controlled }} equals true`
- Check Supabase query includes `ai_controlled` in return fields
- Restart n8n workflow

---

### Issue 3: Twilio Send Fails

**Symptom:** Workflow 6 executes but SMS not sent

**Check Twilio Logs:**
- Invalid phone number format?
- Insufficient credits?
- Phone number not verified (sandbox mode)?

**Check n8n Error Output:**
- What error code did Twilio return?
- Is phone number in E.164 format (+1234567890)?

---

## 📝 Summary Checklist

**Before Testing:**
- [ ] Run Migration 2: `20251209000002_add_manual_ai_override.sql`
- [ ] Run Migration 3: `20251209000003_add_manual_message_trigger.sql`
- [ ] Update Workflow 2 with AI control check
- [ ] Create Workflow 6 for manual SMS
- [ ] Configure webhook URL in database
- [ ] Activate Workflow 6
- [ ] Activate updated Workflow 2

**Testing:**
- [ ] Test Workflow 2: AI enabled → AI responds normally
- [ ] Test Workflow 2: AI disabled → No AI response
- [ ] Test Workflow 6: Manual message → SMS sent successfully
- [ ] Test Workflow 6: Twilio fails → Status updated to 'failed'
- [ ] Test end-to-end: Takeover → Send manual → Lead responds → AI still disabled

**After Testing:**
- [ ] Document actual webhook URLs used
- [ ] Set up error monitoring/alerts
- [ ] Train admins on manual override feature

---

**Next:** Phase 3 - Frontend UI Implementation

