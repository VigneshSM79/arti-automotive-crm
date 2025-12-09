# Manual AI Override System - Implementation Guide

**Created:** December 9, 2025
**Client Requirement:** "Manual override of the AI is a must"

---

## Problem Statement

**Client Feedback:**
> "If a conversation is headed south, glitch in the AI or a client who is messing around and having long conversations just for the fun of it but not a serious buyer. We could potentially lose clients this way and it will increase our operating costs of AI."

**Current Issues:**
- AI can waste money on time-wasters (non-serious buyers)
- No way for admin to stop AI mid-conversation
- Risk losing real buyers if AI gives wrong information
- No manual control when AI malfunctions

---

## Solution Architecture (Updated Dec 9, 2025)

### **Architecture Pattern: Frontend-First Direct Calls**

**Key Decision:** Manual SMS sending uses **frontend → n8n** direct calls (not database triggers)

**Why:**
- ✅ Immediate user feedback ("Sending..." → "Sent!" or "Failed")
- ✅ Loading states and error handling
- ✅ Better UX - admin sees what's happening in real-time
- ✅ No orphaned messages (message only inserted if SMS succeeds)
- ✅ Simple debugging (check n8n logs + browser console)

### Database Layer (✅ COMPLETED - Migration 3)

**New Columns in `conversations` table:**
```sql
ai_controlled    BOOLEAN      DEFAULT true    -- Master AI switch
takeover_at      TIMESTAMPTZ  NULL            -- When admin took over
takeover_by      UUID         NULL            -- Which admin took over
```

**Existing Columns (Already There):**
```sql
assigned_to      UUID         NULL            -- Manual agent assignment
```

**No database trigger needed** - Frontend calls n8n directly!

---

## Workflow Changes Required

### 1. Update Existing Workflow 2 (AI Classification)

**Current Behavior:**
- Receives inbound SMS webhook
- AI analyzes message
- AI responds automatically

**New Behavior (ADD THIS CHECK):**
```javascript
// At the start of Workflow 2, before AI processing:

// 1. Query Supabase for conversation
const conversation = await supabase
  .from('conversations')
  .select('ai_controlled')
  .eq('id', conversationId)
  .single();

// 2. Check if AI is disabled
if (conversation.ai_controlled === false) {
  // AI is disabled - admin has taken over
  console.log('AI disabled for this conversation. Skipping AI processing.');

  // Just log the message to database, don't respond
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'inbound',
    content: messageBody,
    is_ai_generated: false
  });

  // Exit workflow - do NOT send AI response
  return;
}

// 3. If ai_controlled = true, proceed with normal AI processing
// ... existing AI logic here ...
```

---

### 2. Create New Workflow 6: Send Manual Agent SMS (Frontend-First)

**Purpose:** Send SMS when admin types and sends manual message

**Trigger:** Webhook called DIRECTLY from frontend (not database trigger)

**Webhook URL:** `https://your-n8n-instance.com/webhook/send-manual-sms`

**Workflow 6 Nodes:**

**Node 1: Webhook (Frontend Direct Call)**
- Receives payload from frontend
- **Auth:** Validates `Authorization: Bearer token` header
- **Payload:**
  ```json
  {
    "conversation_id": "uuid",
    "content": "message text",
    "sender": "+1234567890",
    "recipient": "+9876543210",
    "sent_by": "admin-user-id"
  }
  ```

**Node 2: Twilio - Send SMS**
- Phone number from: `{{$json.body.sender}}`
- Phone number to: `{{$json.body.recipient}}`
- Message: `{{$json.body.content}}`

**Node 3: Supabase - Insert Message (SUCCESS branch)**
```javascript
// Only insert if Twilio succeeds
await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    direction: 'outbound',
    content: content,
    sender: sender,
    recipient: recipient,
    status: 'sent',
    twilio_sid: twilioResponse.sid,
    is_ai_generated: false
  });
```

**Node 4: Return Success Response**
```json
{
  "success": true,
  "message_id": "uuid",
  "twilio_sid": "SMxxxx",
  "status": "sent"
}
```

**Node 5: Return Error Response (ERROR branch)**
```json
{
  "success": false,
  "error": "Twilio error message"
}
```

**Key Difference:** n8n returns response to frontend, enabling immediate user feedback

---

## Frontend Changes Required

### 1. Conversations Page Header (Admin Only)

**Current Header:**
```tsx
<div className="conversation-header">
  <div>Lead Name</div>
  {requires_human_handoff && <Badge>Handoff</Badge>}
</div>
```

**New Header (With Admin Controls):**
```tsx
<div className="conversation-header">
  <div>Lead Name</div>

  {/* AI Status Indicator */}
  {ai_controlled ? (
    <Badge variant="success">
      <Bot /> AI Active
    </Badge>
  ) : (
    <Badge variant="warning">
      <User /> Manual Control
      <span className="text-xs">by {takeoverBy.full_name}</span>
    </Badge>
  )}

  {/* Admin-Only Controls */}
  {userRole?.isAdmin && (
    <div className="admin-controls">
      {/* Take Over Button */}
      {ai_controlled ? (
        <Button onClick={handleTakeover}>
          Take Over from AI
        </Button>
      ) : (
        <span className="text-xs text-muted">
          Taken over {formatDistanceToNow(takeover_at)} ago
        </span>
      )}

      {/* Assign to Agent Dropdown */}
      <Select onValueChange={handleAssignAgent}>
        <SelectTrigger>Assign to Agent</SelectTrigger>
        <SelectContent>
          {salespeople.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quick Pipeline Stage Change */}
      <Select onValueChange={handleMoveStage}>
        <SelectTrigger>Move to Stage</SelectTrigger>
        <SelectContent>
          <SelectItem value="disqualified">Disqualified</SelectItem>
          <SelectItem value="time-waster">Time Waster</SelectItem>
          <SelectItem value="lost">Lost</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}
</div>
```

### 2. Message Input Field (Conditional Enable)

**Current:** Always enabled for all users

**New:** Only enabled after admin takeover

```tsx
const canSendManualMessage = userRole?.isAdmin && !ai_controlled;

<Textarea
  placeholder={
    ai_controlled
      ? "AI is handling this conversation..."
      : "Type your message..."
  }
  value={messageText}
  onChange={(e) => setMessageText(e.target.value)}
  disabled={!canSendManualMessage}  // KEY CHANGE
  className={ai_controlled ? 'opacity-50' : ''}
/>

<Button
  onClick={handleSend}
  disabled={!canSendManualMessage || !messageText.trim()}
>
  <Send />
</Button>
```

### 3. Mutations Required

**Take Over from AI:**
```typescript
const takeoverMutation = useMutation({
  mutationFn: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('conversations')
      .update({
        ai_controlled: false,
        takeover_at: new Date().toISOString(),
        takeover_by: user.id
      })
      .eq('id', conversationId);

    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: 'AI disabled - You now have manual control' });
    queryClient.invalidateQueries(['conversations']);
  }
});
```

**Assign to Agent:**
```typescript
const assignAgentMutation = useMutation({
  mutationFn: async ({ conversationId, agentId }) => {
    const { error } = await supabase
      .from('conversations')
      .update({
        assigned_to: agentId,
        ai_controlled: false  // Auto-disable AI when manually assigned
      })
      .eq('id', conversationId);

    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: 'Conversation assigned to agent' });
  }
});
```

**Move to Pipeline Stage:**
```typescript
const moveStageMutation = useMutation({
  mutationFn: async ({ leadId, stageId }) => {
    const { error } = await supabase
      .from('leads')
      .update({ pipeline_stage_id: stageId })
      .eq('id', leadId);

    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: 'Lead moved to new stage' });
  }
});
```

**Send Manual Message (Frontend → n8n Direct Call):**
```typescript
const sendManualMessageMutation = useMutation({
  mutationFn: async ({ conversationId, content, recipient, sender }) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Call n8n webhook DIRECTLY from frontend
    const response = await fetch(import.meta.env.VITE_N8N_MANUAL_SMS_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: content,
        sender: sender,
        recipient: recipient,
        sent_by: user.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send SMS');
    }

    const data = await response.json();
    return data; // { success: true, message_id, twilio_sid }
  },
  onSuccess: (data) => {
    setMessageText('');
    toast({
      title: 'Message sent successfully!',
      description: `Twilio SID: ${data.twilio_sid}`
    });
    queryClient.invalidateQueries(['messages', conversationId]);
  },
  onError: (error: Error) => {
    toast({
      title: 'Failed to send message',
      description: error.message,
      variant: 'destructive'
    });
  }
});
```

**Environment Variables Needed:**
```env
VITE_N8N_MANUAL_SMS_WEBHOOK=https://your-n8n.com/webhook/send-manual-sms
VITE_N8N_WEBHOOK_AUTH_TOKEN=your-secret-token
```

---

## Implementation Checklist

### Phase 1: Database (✅ COMPLETED)
- [x] Run Migration 3: `20251209000002_add_manual_ai_override.sql`
- [x] Verify columns added: `ai_controlled`, `takeover_at`, `takeover_by`
- [x] Set all existing conversations to `ai_controlled = true`

### Phase 2: n8n Workflows (🔲 TO DO - Updated for Frontend-First)
- [ ] Update Workflow 2: Add `ai_controlled` check at start
- [ ] Create Workflow 6: Manual SMS sending (with auth header validation)
- [ ] **No database trigger needed** - Frontend calls n8n directly
- [ ] Configure environment variables (Vercel + n8n)
- [ ] Test with curl/Postman: Manual message → Twilio SMS sent
- [ ] Test: AI disabled → Workflow 2 skips processing
- [ ] Test: Auth header validation (401 if missing)

### Phase 3: Frontend UI (🔲 TO DO)
- [ ] Add "Take Over from AI" button (admin only)
- [ ] Add AI status badge (green "AI Active" vs orange "Manual Control")
- [ ] Add "Assign to Agent" dropdown (admin only)
- [ ] Add "Move to Stage" dropdown (admin only)
- [ ] Disable message input when `ai_controlled = true`
- [ ] Enable message input after admin takeover
- [ ] Update conversation query to include new fields
- [ ] Add mutations: takeover, assign, move stage, send manual message

### Phase 4: Testing (🔲 TO DO)
- [ ] Test: Admin clicks takeover → AI stops responding
- [ ] Test: Admin sends manual message → SMS delivered
- [ ] Test: AI message arrives while manual control → No AI response
- [ ] Test: Assign to agent → Conversation appears in agent's list
- [ ] Test: Move to "Time Waster" stage → Lead pipeline updates
- [ ] Test: Audit trail → Can see who took over and when

---

## User Experience Flow

### Scenario 1: AI Going South

1. Admin monitoring conversations sees AI giving wrong info
2. Admin clicks **"Take Over from AI"**
3. Badge changes to orange "Manual Control"
4. Message input unlocks
5. Admin types correct response and sends
6. Database trigger fires → n8n Workflow 6 → Twilio sends SMS
7. AI continues to ignore this conversation (checks `ai_controlled = false`)

### Scenario 2: Time Waster Detection

1. Admin sees lead having long pointless conversation (20+ messages, no intent)
2. Admin clicks **"Move to Stage"** → selects "Time Waster"
3. Lead moves to "Time Waster" stage in pipeline
4. AI automatically disabled (`ai_controlled = false`)
5. Lead no longer costs AI credits

### Scenario 3: Manual Agent Assignment

1. Admin sees qualified lead that needs specific agent
2. Admin clicks **"Assign to Agent"** → selects "John Doe"
3. Conversation assigned to John (`assigned_to = john_id`)
4. AI disabled (`ai_controlled = false`)
5. John can now manually work this lead

---

## Cost Savings Calculation

**Without Manual Override:**
- Time waster sends 20 messages → AI responds 20 times
- Cost: 20 responses × $0.01 per GPT-4 call = **$0.20 per time waster**
- 10 time wasters per week = **$2/week = $104/year wasted**

**With Manual Override:**
- Admin detects time waster after 3 messages → Disables AI
- Cost: 3 responses × $0.01 = **$0.03 per time waster**
- Savings: **85% cost reduction on time wasters**

---

## Security Considerations

**Admin-Only Access:**
- Only users with `role = 'admin'` can take over AI
- Regular agents cannot disable AI
- Frontend checks `useUserRole()` hook
- Backend RLS policies enforce admin role

**Audit Trail:**
- `takeover_by` tracks which admin took over
- `takeover_at` tracks when takeover happened
- Can query: "Show me all conversations John took over this week"

---

**Next Steps:**
1. Run Migration 3 in Supabase (if not done yet)
2. Implement n8n Workflow 6 and update Workflow 2
3. Build frontend UI for admin controls
4. Test end-to-end manual override flow

---

**Last Updated:** December 9, 2025
