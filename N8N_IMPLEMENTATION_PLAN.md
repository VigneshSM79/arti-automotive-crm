# n8n Implementation Plan - High Level

## Analysis Date: November 20, 2025

---

## ✅ WHAT'S ALREADY BUILT (Existing Workflows)

### **Workflow 1: Tag-Based SMS (1 - Tag based SMS.json)**

**Purpose:** Send first campaign message when a lead is tagged

**Current Flow:**
```
1. Webhook receives tag update from Supabase
2. Get campaign by tag from tag_campaigns table
3. Check if conversation exists
4. Create conversation if needed
5. Get conversation ID
6. Check if already enrolled in campaign
7. IF NOT enrolled:
   - Get Day 1 campaign message
   - Format message with lead name
   - Send SMS via Twilio
   - Create message record in database
   - Update conversation timestamp
   - Create campaign enrollment
```

**What Works:**
✅ Tag-based campaign triggering
✅ Conversation creation/finding
✅ Campaign enrollment tracking
✅ Message template formatting
✅ SMS sending via Twilio
✅ Database record keeping

**What's Missing for New Requirements:**
- No initial outbound message when lead is created
- Only sends Day 1 message, no Day 3/5/7 cadence
- No AI tag classification
- No qualification logic

---

### **Workflow 2: Incoming SMS Reply (2 - Incoming SMS Reply.json)**

**Purpose:** Handle inbound SMS from leads and generate AI responses

**Current Flow:**
```
1. Twilio webhook receives inbound SMS
2. Find lead by phone number
3. IF lead doesn't exist: Create new lead auto
4. Merge lead data
5. Find active conversation
6. IF conversation doesn't exist: Create new conversation
7. Prepare conversation data
8. Save inbound message to database
9. Update conversation (increment unread_count)
10. Get conversation history from messages table
11. Format message history for AI
12. Check if lead has active campaigns
13. IF has active campaigns: Mark them as completed
14. Merge data for AI
15. AI Agent (Google Gemini) generates response
16. Prepare AI response
17. Send AI SMS via Twilio
18. Save AI response message
19. Update conversation timestamp
```

**What Works:**
✅ Inbound SMS handling
✅ Auto-create leads from inbound SMS
✅ Conversation management
✅ Message history tracking
✅ AI response generation (Google Gemini)
✅ Campaign completion on response
✅ Full database integration

**What's Missing for New Requirements:**
- No tag classification logic
- No buying intent detection
- No handoff trigger
- No agent SMS broadcast
- No DNC detection
- No 4-message cadence for non-responders
- No conversation summary generation
- AI prompt not optimized for tag classification

---

## 🚧 WHAT NEEDS TO BE IMPLEMENTED

Based on N8N_WORKFLOW_SPEC.md and your requirements:

---

### **1. Initial Outbound Message Workflow** ⚡ HIGH PRIORITY

**Purpose:** Send Day 1 message when lead is created/uploaded

**New Workflow Needed:**
```
TRIGGER: Supabase webhook on lead INSERT
↓
1. Check if lead has owner_id = NULL (unassigned)
2. Get lead details
3. Create conversation if doesn't exist
4. Generate Day 1 message (generic outreach)
5. Send SMS via Twilio
6. Save message record
7. Set lead status = 'contacted'
8. Schedule Day 3 follow-up (if no response)
```

**Why New Workflow:**
- Current tag-based workflow only triggers on tag UPDATE
- Need to trigger on lead CREATION
- Need to send BEFORE tags are assigned

---

### **2. Enhanced AI Tag Classification** ⚡ HIGH PRIORITY

**Modify Existing:** Workflow 2 (Incoming SMS Reply)

**Add After:** "Format Message History" node

**New Logic:**
```
1. Get conversation history (already done)
2. NEW: AI Classification Agent
   - Analyze messages for 14 tag categories
   - Detect buying intent (positive/none/opt-out)
   - Generate conversation summary
   - Output: tags[], engagement_type, summary
3. NEW: Update lead tags in database
4. NEW: Conditional branching based on engagement_type:
   - IF opt-out → DNC workflow
   - IF positive → Lead Pool workflow
   - IF no_intent → Lead Pool with summary workflow
   - IF need_more_info → Continue AI conversation
```

**Changes to AI Prompt:**
- Add tag classification instructions
- Add 14 tag definitions
- Add buying intent detection
- Add summary generation
- Keep human-like response generation

---

### **3. Lead Pool & Agent Notification Workflow** ⚡ HIGH PRIORITY

**Purpose:** Move qualified leads to pool and notify agents

**New Workflow Needed:**
```
TRIGGER: Called from Enhanced AI workflow

INPUT: lead_id, tags[], engagement_type, summary

1. Update lead:
   - owner_id = NULL (move to pool)
   - tags = [assigned tags]

2. Update conversation:
   - requires_human_handoff = true
   - handoff_triggered_at = NOW()
   - Increment ai_message_count

3. Query active agents:
   - SELECT * FROM users
   - WHERE receive_sms_notifications = true
   - AND phone_number IS NOT NULL
   - AND is_active = true

4. Generate SMS message:
   - IF positive engagement:
     "New qualified lead: [Name] [Phone]. Claim: [Link]"
   - IF no buying intent:
     "Lead responded - No buying intent yet
      Summary: [AI summary]
      Tags: [tags]
      Review: [Link]"

5. Loop through agents:
   - Send SMS via Twilio to each agent
   - Log notification sent
```

---

### **4. DNC (Do Not Contact) Workflow** ⚡ HIGH PRIORITY

**Purpose:** Handle opt-outs immediately

**New Workflow Needed:**
```
TRIGGER: Called from Enhanced AI workflow when opt-out detected

INPUT: lead_id, conversation_id

1. Get DNC pipeline stage ID from pipeline_stages table

2. Update lead:
   - pipeline_stage_id = [DNC_STAGE_ID]
   - status = 'dnc'

3. Update all active campaign enrollments:
   - status = 'paused'
   - is_paused = true

4. Update conversation:
   - status = 'archived'
   - requires_human_handoff = false

5. Send final acknowledgment SMS:
   "You've been removed from our contact list. Thank you."

6. Log opt-out event
```

---

### **5. 4-Message Cadence Scheduler** 🔶 MEDIUM PRIORITY

**Purpose:** Send Day 3, 5, 7 messages if no response

**New Workflow Needed:**
```
TRIGGER: Schedule (runs daily at specific time)

1. Query leads:
   - WHERE status = 'contacted'
   - AND owner_id IS NULL
   - AND last_contact calculated = Day 3, 5, or 7

2. For each lead:
   - Check if they responded (check messages table)
   - IF NO RESPONSE:
     - Get appropriate message for day number
     - Send via Twilio
     - Update last_contact timestamp

3. After Day 7 with no response:
   - Tag lead: ["Ghosted / No Response"]
   - Trigger Lead Pool workflow
   - Notify agents with summary
```

---

### **6. Campaign Auto-Enrollment on Claim** ✅ ALREADY WORKS

**Current State:**
- Tag-based campaign enrollment is already implemented
- Triggers on tag UPDATE

**What Happens:**
- Agent claims lead (owner_id updated)
- Tags already assigned by AI
- Existing tag triggers in Supabase cause Workflow 1 to run
- Campaign enrollments created
- Drip sequences begin

**No changes needed** - this already works!

---

## 📊 HIGH-LEVEL IMPLEMENTATION SUMMARY

### **What to Build:**

1. **New Workflow: Initial Outbound Message**
   - Trigger: Lead creation
   - Action: Send Day 1 message

2. **Modify Workflow 2: Add AI Tag Classification**
   - Add OpenAI/Claude node for classification
   - Add tag update logic
   - Add engagement detection branching

3. **New Workflow: Lead Pool & Notifications**
   - Move lead to pool
   - SMS broadcast to agents
   - Handle positive vs no-intent scenarios

4. **New Workflow: DNC Handler**
   - Immediate opt-out processing
   - Stop all contact
   - Move to DNC stage

5. **New Workflow: 4-Message Cadence**
   - Scheduled trigger
   - Day 3, 5, 7 follow-ups
   - Ghosted lead handling

---

## 🔧 TECHNICAL REQUIREMENTS

### **AI Model Changes:**
- **Current:** Google Gemini Flash Lite (only for responses)
- **Needed:**
  - Add OpenAI GPT-4 or Claude for tag classification (more reliable)
  - Or enhance Gemini prompt with structured output

### **New Supabase Queries:**
- Query users for agent notifications
- Update lead tags
- Update handoff fields
- Get DNC stage ID
- Query non-responders for cadence

### **New Twilio Operations:**
- SMS broadcast to multiple recipients
- Track notification sends

### **Database Updates Needed:**
- Ensure `owner_id`, `tags`, `requires_human_handoff`, etc. fields exist
- Already done in Nov 19 migration ✅

---

## 🎯 IMPLEMENTATION ORDER (Recommended)

### **Phase 1: Core Functionality** (Week 1)
1. Build Initial Outbound Message workflow
2. Enhance AI Tag Classification in Workflow 2
3. Build Lead Pool & Notification workflow

**Result:** Basic flow works end-to-end

### **Phase 2: Edge Cases** (Week 2)
4. Build DNC Handler workflow
5. Build 4-Message Cadence scheduler

**Result:** Complete system operational

### **Phase 3: Optimization** (Week 3)
6. Tune AI prompts for accuracy
7. Add error handling and logging
8. Monitor and adjust based on real data

---

## 📝 NOTES

### **What's Already Working Well:**
- Supabase integration
- Twilio SMS sending/receiving
- Conversation management
- Message history tracking
- AI response generation
- Campaign enrollment

### **What Needs Most Work:**
- Tag classification logic (completely new)
- Buying intent detection (completely new)
- Agent notification broadcast (completely new)
- DNC handling (completely new)
- Multi-day cadence (completely new)

### **Estimated Effort:**
- **Phase 1:** 15-20 hours
- **Phase 2:** 10-15 hours
- **Phase 3:** 5-10 hours
- **Total:** 30-45 hours of n8n development

---

**Ready to proceed with implementation when you approve!**
