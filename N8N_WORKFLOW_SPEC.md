# n8n AI Agent Workflow Specification

## Overview
Complete specification for the n8n AI Agent that handles lead qualification, tag classification, and handoff management for the automotive CRM system.

**Date Created:** November 20, 2025
**Last Updated:** November 20, 2025

---

## 1. Complete Process Flow

### **STEP 1: Lead Creation & Initial Outreach**

**Trigger:** New lead uploaded/created in system
- Sources: CSV upload, showroom visit, database reactivation, web form
- Lead stored in `leads` table with `owner_id = NULL`

**Action:** System sends **Message 1 (Day 1)**
- Outbound SMS from dealership number
- Purpose: Initiate conversation, attempt to engage lead
- Example: "Hey! Saw you were interested in a vehicle. What are you looking for?"

---

### **STEP 2: Lead Response Analysis**

n8n AI Agent monitors for lead response and analyzes conversation history.

---

## 2. Response Scenarios

### **SCENARIO A: Positive Engagement (Buying Intent)**

**Indicators:**
- Lead responds with interest
- Asks questions about vehicles, financing, pricing
- Shows intent to purchase or move forward
- Engages in 1-3 back-and-forth exchanges

**AI Actions:**
1. **Analyze conversation** (1-3 message exchanges)
2. **Classify into tags** from 14 categories based on issues/needs mentioned
3. **Generate human-like responses** to build rapport and gather more context

**Tag Examples:**
- ["Payment Too High"]
- ["Credit Declined Previously", "Needed a Cosigner"]
- ["Couldn't Find the Right Vehicle", "Timing Not Right"]

**When Positive Engagement Confirmed:**
1. ✅ Assign tags to lead (`leads.tags` array)
2. ✅ Move to Lead Pool (`owner_id = NULL` - stays null)
3. ✅ Set `requires_human_handoff = true`
4. ✅ Set `handoff_triggered_at = NOW()`
5. ✅ Increment `ai_message_count`
6. ✅ **SMS Broadcast to ALL Active Agents:**
   - Message: "New qualified lead available: [Name] [Phone]. Claim now: [Link to Lead Pool]"
   - Query: `WHERE receive_sms_notifications = true AND phone_number IS NOT NULL AND is_active = true`

**Result:**
- Lead visible in Lead Pool page (all agents can see)
- First agent to claim wins
- **NO campaign auto-enrollment yet** (campaigns start AFTER agent claims)

---

### **SCENARIO B: No Response (Ghosted Lead)**

**Indicators:**
- Lead does not respond to messages

**4-Message Cadence:**

| Day | Action | Purpose |
|-----|--------|---------|
| Day 1 | Send Message 1 | Initial outreach |
| Day 3 | Send Message 2 | First follow-up (if no response) |
| Day 5 | Send Message 3 | Second follow-up (if no response) |
| Day 7 | Send Message 4 | Final attempt (if no response) |

**After Day 7 (No Response):**
1. ✅ Tag lead: ["Ghosted / No Response"]
2. ✅ Move to Lead Pool
3. ✅ Notify sales team via SMS with conversation summary
4. ✅ Lead available for manual agent claiming
5. ✅ Agent can start manual outreach OR wait for campaign re-engagement

**Note:** Check campaigns.md for "check after 30 days" or "check after 90 days" tags for long-term ghosted leads

---

### **SCENARIO C: Not Interested (Opt-Out)**

**Indicators:**
- Lead explicitly says: "Not interested", "Stop", "Remove me", "Don't contact me"
- AI detects clear rejection/opt-out

**Immediate Actions:**
1. ✅ Move lead to **DNC (Do Not Contact) stage** in Pipeline
2. ✅ Set `pipeline_stage_id = [DNC_STAGE_ID]`
3. ✅ **STOP all contact immediately**
4. ✅ No SMS notifications to agents
5. ✅ No campaigns ever
6. ✅ No manual outreach allowed
7. ✅ Conversation ends permanently

**DNC Stage:**
- Already exists in `pipeline_stages` table
- Permanent exclusion list
- Compliance with opt-out regulations

---

### **SCENARIO D: No Buying Intent (Engaged but Not Ready)**

**Indicators:**
- Lead responds and engages
- BUT shows no immediate buying intent
- Examples:
  - "Just looking around"
  - "Maybe in 6 months"
  - "Not ready yet"
  - "Just browsing"

**AI Actions:**
1. ✅ Analyze conversation for context
2. ✅ Tag appropriately based on reason:
   - ["Waiting / Timing Not Right"]
   - ["Wanted to Improve Credit First"]
   - ["No Buying Intent"] (new tag to be created)
3. ✅ Move to Lead Pool
4. ✅ **SMS Broadcast to ALL Active Agents with conversation summary:**
   - Message: "Lead responded but no buying intent yet: [Name] [Phone]
     Summary: [AI-generated 1-2 sentence summary of conversation]
     Tags: [List of tags]
     Review: [Link to Lead Pool]"
   - Query: Same as Scenario A (all active agents)

**Result:**
- Lead in Lead Pool with tags
- Agents see conversation summary
- **Human decides next action:**
  - Claim immediately for nurturing
  - Wait for campaign to re-engage later
  - Mark for future follow-up

---

## 3. The 14 Tag Categories

From `campaigns.md` file and `tag_campaigns` table:

1. **Ghosted / No Response**
2. **Payment Too High**
3. **Credit Declined Previously**
4. **Waiting / Timing Not Right**
5. **Couldn't Find the Right Vehicle**
6. **Needed More Info / Confusion About Terms**
7. **Process Took Too Long**
8. **Bought Elsewhere**
9. **Wanted to Improve Credit First**
10. **Negative Equity / Trade-In Issue**
11. **Needed a Cosigner**
12. **Didn't Like the Approved Vehicle**
13. **Rate Too High**
14. **Missing Documents**

**Additional Tags to Create:**
- **No Buying Intent** (for Scenario D)
- **Check After 30 Days** (for long-term ghosted leads)
- **Check After 90 Days** (for long-term ghosted leads)

---

## 4. Tag Classification Logic

### **AI Analysis Process:**

**Input:** Conversation history (1-3 message exchanges)

**AI Analyzes For:**
1. **Issues mentioned** by lead
2. **Concerns expressed** by lead
3. **Questions asked** by lead
4. **Objections raised** by lead
5. **Buying signals** or lack thereof

**Examples:**

| Lead Says | AI Assigns Tags |
|-----------|----------------|
| "I need a truck but payment was too high last time" | ["Payment Too High", "Couldn't Find the Right Vehicle"] |
| "I was denied credit before, can't afford much monthly" | ["Credit Declined Previously", "Payment Too High"] |
| "I need to bring my credit score up first" | ["Wanted to Improve Credit First"] |
| "My trade-in has negative equity" | ["Negative Equity / Trade-In Issue"] |
| "I'm waiting until summer to buy" | ["Waiting / Timing Not Right"] |
| "I bought a car somewhere else already" | ["Bought Elsewhere"] |
| "Just looking, not ready yet" | ["No Buying Intent"] |
| *No response at all* | ["Ghosted / No Response"] |

**Multiple Tags:** Lead can have multiple tags based on multiple issues mentioned

---

## 5. AI Response Generation

### **Goals:**
1. Sound **human-like and conversational** (not robotic)
2. Build **rapport** with lead
3. Ask **clarifying questions** to understand tag classification
4. Gather **context** about lead's situation
5. Detect **buying intent** or lack thereof

### **Response Style:**
- Natural, friendly, empathetic
- Short and concise (SMS-friendly)
- Ask open-ended questions
- Mirror lead's communication style
- Avoid sales pressure

### **Example AI Responses:**

**For Payment Concerns:**
- "I totally understand payment is important. What monthly range works best for you?"
- "Got it. If I could get you closer to your ideal payment, would that help?"

**For Credit Issues:**
- "No worries, I work with all credit situations. What happened before?"
- "We have lenders who specialize in rebuilding credit. Want me to check your options?"

**For Timing Issues:**
- "Makes sense. When were you thinking?"
- "I can keep you updated when the right deal comes up. What's your timeline looking like?"

**For Vehicle Search:**
- "What kind of vehicle are you looking for?"
- "What features are must-haves for you?"

---

## 6. Agent Claim & Campaign Activation

### **When Agent Claims Lead:**

**Trigger:** Agent clicks "Claim Lead" button in Lead Pool

**Actions:**
1. ✅ Set `owner_id = agent.id`
2. ✅ Lead removed from Lead Pool (no longer visible to other agents)
3. ✅ Lead appears in agent's Pipeline (first stage)
4. ✅ **NOW campaigns auto-enroll** based on assigned tags
5. ✅ Campaign drip sequences begin (Day 1, Day 2, Day 4, Day 6, etc.)

**Campaign Auto-Enrollment Logic:**
```sql
-- Already implemented from earlier work
INSERT INTO campaign_enrollments (lead_id, campaign_id, status)
SELECT lead.id, tc.id, 'active'
FROM leads
JOIN tag_campaigns tc ON tc.tag = ANY(lead.tags)
WHERE lead.id = [CLAIMED_LEAD_ID]
  AND tc.is_active = true
```

---

## 7. Database Updates

### **Fields Used:**

#### `leads` table:
- `owner_id` (UUID, nullable): Agent assigned (NULL = in pool)
- `tags` (TEXT[]): Array of assigned tags
- `pipeline_stage_id` (UUID): Current pipeline stage (DNC stage for opt-outs)
- `status` (TEXT): Lead status (new, contacted, qualified, lost)

#### `conversations` table:
- `requires_human_handoff` (BOOLEAN): Handoff flag
- `handoff_triggered_at` (TIMESTAMPTZ): When handoff triggered
- `ai_message_count` (INTEGER): Number of AI messages sent
- `status` (TEXT): active, archived, etc.

#### `messages` table:
- `conversation_id` (UUID): FK to conversations
- `direction` (TEXT): inbound or outbound
- `content` (TEXT): Message text
- `is_ai_generated` (BOOLEAN): True if AI sent it
- `created_at` (TIMESTAMPTZ): Message timestamp

#### `campaign_enrollments` table:
- `lead_id` (UUID): FK to leads
- `campaign_id` (UUID): FK to tag_campaigns
- `status` (TEXT): active, paused, completed
- `current_message_index` (INTEGER): Which message in sequence

---

## 8. SMS Notification Messages

### **Scenario A: Positive Engagement (Qualified Lead)**

**To:** All active agents
**Message:**
```
New qualified lead available!

Name: [First] [Last]
Phone: [Phone Number]
Tags: [Tag1, Tag2]

Claim now: [Link to Lead Pool]
```

---

### **Scenario D: No Buying Intent**

**To:** All active agents
**Message:**
```
Lead responded - No buying intent yet

Name: [First] [Last]
Phone: [Phone Number]

Summary: [AI 1-2 sentence conversation summary]

Tags: [Tag1, Tag2]

Review: [Link to Lead Pool]
```

**Summary Examples:**
- "Lead is interested in a truck but wants to wait 3 months to buy."
- "Lead mentioned credit issues and wants to improve score first before applying."
- "Lead is just browsing and not ready to commit yet."

---

## 9. n8n Workflow Components Needed

### **Workflow 1: Outbound Message Scheduler**
- Trigger: New lead created OR day-based schedule
- Action: Send Day 1, 3, 5, 7 messages if no response
- Tools: Supabase, Twilio, Schedule Trigger

### **Workflow 2: Inbound Message Handler**
- Trigger: Webhook from Twilio (inbound SMS)
- Action: Store message in database, trigger AI analysis
- Tools: Webhook, Supabase

### **Workflow 3: AI Tag Classification & Response**
- Trigger: New inbound message
- Actions:
  1. Fetch conversation history
  2. Call OpenAI/Claude for tag classification
  3. Detect buying intent / opt-out / ghosted
  4. Generate AI response
  5. Send response via Twilio
  6. Update database with tags
- Tools: Supabase, OpenAI/Claude API, Twilio

### **Workflow 4: Handoff & Lead Pool Automation**
- Trigger: Positive engagement detected
- Actions:
  1. Set requires_human_handoff = true
  2. Query active agents for notifications
  3. Send SMS broadcast to agents
  4. Log handoff event
- Tools: Supabase, Twilio

### **Workflow 5: DNC Handler**
- Trigger: Opt-out keywords detected
- Actions:
  1. Move to DNC stage
  2. Stop all workflows for this lead
  3. Log opt-out event
- Tools: Supabase

---

## 10. AI Prompt Template (Draft)

```
You are an AI sales assistant for an automotive dealership. Your goal is to:
1. Engage leads in natural, human-like conversation
2. Understand their needs and concerns
3. Classify leads into appropriate tag categories
4. Detect buying intent

CONVERSATION HISTORY:
[Message history here]

YOUR TASKS:
1. Analyze the conversation and identify which of these 14 tag categories apply:
   - Ghosted / No Response
   - Payment Too High
   - Credit Declined Previously
   - Waiting / Timing Not Right
   - Couldn't Find the Right Vehicle
   - Needed More Info / Confusion About Terms
   - Process Took Too Long
   - Bought Elsewhere
   - Wanted to Improve Credit First
   - Negative Equity / Trade-In Issue
   - Needed a Cosigner
   - Didn't Like the Approved Vehicle
   - Rate Too High
   - Missing Documents

2. Detect if lead shows:
   - POSITIVE ENGAGEMENT: Asking questions, showing interest, wants to move forward
   - NO BUYING INTENT: Just browsing, not ready, far future timeline
   - OPT-OUT: Explicitly says "not interested", "stop", "remove me"

3. Generate a natural, conversational SMS response (max 160 chars) that:
   - Builds rapport
   - Asks clarifying questions
   - Sounds human (not robotic)
   - Gathers more context

OUTPUT FORMAT:
{
  "tags": ["Tag1", "Tag2"],
  "engagement_type": "positive|no_intent|opt_out|need_more_info",
  "response": "Your SMS response here",
  "summary": "1-2 sentence summary of conversation"
}
```

---

## 11. Key Business Rules

### **Lead Pool Entry:**
- Positive engagement → Lead Pool + SMS all agents
- No buying intent → Lead Pool + SMS all agents (with summary)
- Ghosted (after Day 7) → Lead Pool + SMS all agents
- Not interested → DNC stage (NO Lead Pool, NO SMS)

### **Campaign Enrollment:**
- Only happens AFTER agent claims lead
- Based on assigned tags
- Multiple tags = Multiple campaign enrollments

### **Notification Priority:**
- Positive engagement: High priority, immediate claim encouraged
- No buying intent: Medium priority, human review needed
- Ghosted: Low priority, manual outreach or campaign re-engagement

---

## 12. Success Metrics

**AI Performance:**
- Tag classification accuracy
- Buying intent detection accuracy
- Lead engagement rate (% who respond)
- Time to tag assignment

**Business Metrics:**
- Lead Pool claim speed
- Agent response time after handoff
- Lead-to-sale conversion rate
- Campaign effectiveness per tag

---

## 13. Next Steps for Implementation

### **Phase 1: Setup**
- [ ] Set up n8n instance
- [ ] Configure Twilio webhook integration
- [ ] Set up OpenAI/Claude API credentials
- [ ] Test Supabase database connections

### **Phase 2: Build Workflows**
- [ ] Workflow 1: Outbound scheduler
- [ ] Workflow 2: Inbound handler
- [ ] Workflow 3: AI classification
- [ ] Workflow 4: Handoff automation
- [ ] Workflow 5: DNC handler

### **Phase 3: Testing**
- [ ] Test tag classification with sample conversations
- [ ] Test 4-message cadence
- [ ] Test handoff triggers
- [ ] Test SMS notifications
- [ ] Test DNC opt-outs

### **Phase 4: Refinement**
- [ ] Tune AI prompts for accuracy
- [ ] Adjust response generation style
- [ ] Optimize notification messages
- [ ] Add error handling and logging

---

**Document Status:** Complete specification ready for implementation
**Next Action:** Begin n8n workflow development
