# Frontend Manual Override - Testing Guide

**Date:** December 9, 2025
**Feature:** Manual AI Override & Direct SMS Sending

---

## What Was Implemented

### Frontend Changes (✅ COMPLETED)

**File:** `src/pages/Conversations.tsx`

**New Features:**
1. ✅ "Take Over from AI" button (admin only)
2. ✅ AI status badge (green "AI Active" vs orange "Manual Control")
3. ✅ Send manual SMS via n8n direct call (frontend → n8n → Twilio)
4. ✅ Conditional message input (disabled until admin takes over)
5. ✅ Loading states (spinner while sending)
6. ✅ Error handling with toast notifications

**New Fields Queried:**
- `ai_controlled` - Master AI switch
- `takeover_at` - When admin took over
- `takeover_by` - Which admin took over

---

## Environment Variables Required

**Already configured in your `.env.local`:**
```env
VITE_N8N_MANUAL_SMS_WEBHOOK=https://n8n.realside.xyz/webhook/send-manual-sms
VITE_N8N_WEBHOOK_TOKEN=e5a9a236ba92f57c68a577f7fb717eab278950b43ea1038a4b9924b37616057b
VITE_TWILIO_PHONE_NUMBER=<your-twilio-number>
```

**Same variables needed in Vercel:**
- Ensure these are also set in Vercel environment variables
- Will be used when deployed to production

---

## How to Test (Step-by-Step)

### Prerequisites:
1. ✅ Migration 3 applied: `20251209000002_add_manual_ai_override.sql`
2. ✅ Migration 4 applied: `20251209000003_update_conversation_list_view.sql`
3. ✅ Migration 5 applied: `20251209000004_enable_realtime_for_leads.sql` (for real-time lead updates)
4. ✅ n8n Workflow 6 created and activated
5. ✅ n8n Workflow 2 updated with AI control check
6. ✅ User logged in as admin

---

### Test Scenario 1: Take Over from AI

**Steps:**
1. Start dev server: `npm run dev`
2. Log in as admin user
3. Navigate to Conversations page
4. Select any conversation

**Expected UI (Before Takeover):**
- ✅ Green badge: "AI Active" with Bot icon
- ✅ "Take Over from AI" button visible (admin only)
- ✅ Message input **disabled** with placeholder: "AI is handling this conversation..."
- ✅ Send button disabled

**Action:**
5. Click "Take Over from AI" button

**Expected (During Takeover):**
- ✅ Button shows spinner: "Taking over..."

**Expected (After Takeover):**
- ✅ Toast notification: "AI disabled - You now have manual control of this conversation"
- ✅ Badge changes to orange: "Manual Control" with User icon
- ✅ Shows timestamp: "(X minutes ago)"
- ✅ "Take Over from AI" button disappears
- ✅ Message input **enabled** with placeholder: "Type your message..."
- ✅ Send button enabled (when text entered)

---

### Test Scenario 2: Send Manual SMS

**Prerequisite:** Admin has taken over (from Test Scenario 1)

**Steps:**
1. Type a message in the input field (e.g., "Hi, this is Sarah from the dealership")
2. Click Send button (or press Enter)

**Expected (During Send):**
- ✅ Send button shows loading spinner
- ✅ Input field disabled while sending

**Expected (Success):**
- ✅ Message input clears
- ✅ Toast notification: "Message sent successfully!" with Twilio SID
- ✅ New message appears in thread immediately
- ✅ Message shows as outbound (blue bubble on right)
- ✅ NO "AI" badge on message (is_ai_generated = false)

**Expected (If n8n Workflow 6 fails):**
- ✅ Toast notification: "Failed to send message: {error details}"
- ✅ Message stays in input field (not cleared)
- ✅ No message inserted to database (clean failure)

---

### Test Scenario 3: Verify n8n Call

**Check n8n Execution Logs:**
1. Go to n8n → Executions tab
2. Find latest "send-manual-sms" execution
3. Verify webhook received payload:
   ```json
   {
     "conversation_id": "uuid",
     "content": "your message text",
     "sender": "+1234567890",
     "recipient": "+lead-phone",
     "sent_by": "admin-user-id"
   }
   ```
4. Verify Twilio node executed successfully
5. Verify Supabase insert executed
6. Verify 200 response returned to frontend

**Check Supabase:**
```sql
SELECT id, content, direction, is_ai_generated, status, twilio_sid
FROM messages
WHERE conversation_id = '<conversation-id>'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- Latest message has `is_ai_generated = false`
- `status = 'sent'`
- `twilio_sid` populated (e.g., "SMxxxxx")

**Check Twilio:**
- Go to Twilio Console → Messaging → Logs
- Verify SMS was delivered to lead's phone

---

### Test Scenario 4: Real-Time AI Control Status

**Test with 2 browser windows (simulating 2 users):**

**Window 1 (Admin A):**
1. Open Conversations page
2. Select a conversation
3. See "AI Active" badge

**Window 2 (Admin B or Agent):**
1. Open same Conversations page
2. Select same conversation
3. See "AI Active" badge

**Action in Window 1:**
4. Admin A clicks "Take Over from AI"

**Expected in Window 2:**
- ✅ Badge updates to "Manual Control" **without page refresh**
- ✅ Real-time subscription updates the conversation

---

### Test Scenario 5: Permissions (Non-Admin User)

**Steps:**
1. Log out
2. Log in as non-admin user (regular agent)
3. Navigate to Conversations page
4. Select any conversation

**Expected:**
- ❌ "Take Over from AI" button **NOT visible** (admin only)
- ❌ Message input **disabled** with placeholder: "Only admins can send manual messages"
- ❌ Send button disabled

---

### Test Scenario 6: AI Still Active for Other Conversations

**After taking over one conversation:**

**Steps:**
1. Conversation A: Admin took over (`ai_controlled = false`)
2. Conversation B: AI still active (`ai_controlled = true`)
3. Simulate inbound SMS to Conversation B via Twilio

**Expected:**
- ✅ Workflow 2 processes Conversation B normally
- ✅ AI responds to Conversation B
- ✅ Workflow 2 skips Conversation A (ai_controlled = false)
- ✅ No AI response sent to Conversation A

**Verification:**
Check n8n Workflow 2 execution logs:
- For Conversation A: Should see "AI disabled" log and workflow stops
- For Conversation B: Should see full AI processing and response

---

## Common Issues & Debugging

### Issue 1: "Take Over from AI" Button Not Showing

**Check:**
- User is logged in as admin (`useUserRole()` returns `isAdmin: true`)
- Conversation has `ai_controlled = true`
- Run query:
  ```sql
  SELECT role FROM user_roles WHERE user_id = '<your-user-id>';
  ```
  Expected: `role = 'admin'`

---

### Issue 2: Message Input Disabled Even After Takeover

**Check:**
1. Conversation status in database:
   ```sql
   SELECT ai_controlled, takeover_at, takeover_by
   FROM conversations
   WHERE id = '<conversation-id>';
   ```
   Expected: `ai_controlled = false`

2. Check browser console for errors
3. Hard refresh page (Ctrl + Shift + R)

---

### Issue 3: "Failed to send message" Error

**Check n8n webhook URL:**
```javascript
// In browser console
console.log(import.meta.env.VITE_N8N_MANUAL_SMS_WEBHOOK);
// Should output: https://n8n.realside.xyz/webhook/send-manual-sms
```

**Check auth token:**
```javascript
console.log(import.meta.env.VITE_N8N_WEBHOOK_TOKEN);
// Should output: e5a9a236ba92f57c68a577f7fb717eab278950b43ea1038a4b9924b37616057b
```

**Check n8n Workflow 6:**
- Is it activated?
- Does webhook path match?
- Is auth header validation configured?

**Check browser Network tab:**
- Look for POST request to n8n webhook
- Status code 200 = success
- Status code 400 = Twilio error (check response body)
- Status code 401 = Auth token mismatch
- Status code 500 = n8n workflow error

---

### Issue 4: Message Sent But Not Appearing in Thread

**Check real-time subscription:**
Browser console should show:
```
Subscribed to public:messages:INSERT
Real-time update received for messages: {...}
```

If not, check:
- Migration 1 applied: `20251209000000_enable_realtime_replication.sql`
- Supabase real-time enabled for messages table

---

## Success Criteria

**All tests pass when:**

✅ Admin can click "Take Over from AI" button
✅ Badge changes from "AI Active" to "Manual Control"
✅ Message input unlocks after takeover
✅ Admin can type and send manual SMS
✅ Loading spinner shows while sending
✅ Success toast appears with Twilio SID
✅ Message appears in thread immediately
✅ n8n Workflow 6 executes successfully
✅ Twilio sends SMS to lead's phone
✅ Message inserted to database with `is_ai_generated = false`
✅ Non-admin users cannot send messages
✅ Real-time updates work for AI control status
✅ AI continues to work for other conversations

---

## Next Steps After Testing

Once all tests pass:

1. **Commit frontend changes:**
   ```bash
   git add src/pages/Conversations.tsx
   git commit -m "feat: Add manual AI override and direct SMS sending

   - Add 'Take Over from AI' button (admin only)
   - Implement direct n8n webhook calls for manual SMS
   - Add AI status badge (AI Active vs Manual Control)
   - Conditional message input based on admin + takeover status
   - Loading states and error handling
   - Real-time AI control status updates

   🤖 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. **Deploy to Vercel:**
   - Push to GitHub → Auto-deploys to Vercel
   - Verify environment variables are set in Vercel dashboard

3. **Test on production:**
   - Repeat all test scenarios on deployed app
   - Verify n8n webhook is accessible from Vercel

4. **Monitor in production:**
   - Watch n8n execution logs
   - Monitor Twilio delivery rates
   - Check Supabase for failed messages

---

**Questions or Issues?** Check:
- `CLAUDE.md` - Architecture overview
- `n8n_WORKFLOW_UPDATES.md` - Workflow 6 specs
- `MANUAL_OVERRIDE_WORKFLOW.md` - Complete implementation guide

---

**Last Updated:** December 9, 2025
