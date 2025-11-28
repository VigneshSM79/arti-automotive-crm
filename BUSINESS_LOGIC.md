# Business Logic - Automotive CRM System

## Overview
This document outlines the core business logic for the automotive dealership CRM system as defined by the client (Emile) on November 20, 2025.

---

## 1. User Roles & Access Control

### Admin (Sales Manager/Owner)
- **Pipeline Access**: Can view ANY salesperson's pipeline via dropdown filter
- **Purpose**: Track individual agent performance, coaching, forecasting
- **Team Management**: Control which agents receive SMS notifications
- **Settings Access**: Can enable/disable notifications for any team member

### Sales Agent
- **Pipeline Access**: Only see their OWN claimed leads (auto-filtered by owner_id)
- **Lead Pool Access**: See ALL qualified leads available for claiming
- **Settings Access**: Manage personal phone number and notification preferences

---

## 2. Lead Flow & Qualification Process

### Stage 1: Raw Lead Entry
**Entry Points:**
- CSV upload
- Website contact form
- Inbound SMS
- Manual entry

**Status:** Unqualified
**Storage:** `leads` table
**Visibility:** Visible in Leads page, NOT in Pipeline or Lead Pool
**owner_id:** NULL (unassigned)

---

### Stage 2: AI Qualification (n8n Workflow)

**Process:**
1. AI engages lead via SMS with 2-3 qualifying questions
2. AI analyzes responses for:
   - Buying intent
   - Interest level
   - Engagement quality
   - Timeline indicators

**Qualification Criteria:**
- Positive responses indicating interest
- Questions about vehicles/financing
- Requests for more information
- Shows buying intent

**If QUALIFIED:**
- Lead moves to Lead Pool
- `owner_id` remains NULL
- SMS notification triggered to all active agents

**If NOT QUALIFIED:**
- Remains in Leads table
- Can be manually reviewed by admin
- May be re-engaged later

---

### Stage 3: Lead Pool (Competitive Claiming)

**Purpose:** Hot, qualified leads ready for agent engagement

**Characteristics:**
- `owner_id = NULL` (unassigned)
- Already qualified by AI
- Shows buying intent
- Visible to ALL sales agents

**SMS Notification Logic:**
```
Query: SELECT * FROM users
       WHERE receive_sms_notifications = true
       AND phone_number IS NOT NULL
       AND is_active = true

Message: "New qualified lead available: [Lead Name] - [Phone Number]
          Claim now: [Link to Lead Pool]"
```

**Claiming Process:**
1. Multiple agents see the same lead simultaneously
2. First agent to click "Claim Lead" wins
3. On claim: `owner_id` is set to claiming agent's user ID
4. Lead immediately disappears from Lead Pool for other agents
5. Lead appears in claiming agent's Pipeline

---

### Stage 4: Sales Pipeline

**Access Control:**
- **Agents:** Only see leads where `owner_id = current_user.id`
- **Admins:** Can filter by salesperson or view all

**Pipeline Stages:**
1. New Contact
2. Appointment Scheduled
3. Test Drive
4. Negotiation
5. Closed Won/Lost

**Drag & Drop:** Agents move their leads through stages

---

## 3. AI Handoff System

### Trigger Conditions
After 2-3 AI messages, if lead shows:
- Positive engagement
- Buying intent
- Questions requiring human expertise
- Request for personal assistance

### Handoff Process
1. Set `requires_human_handoff = true`
2. Set `handoff_triggered_at = NOW()`
3. Increment `ai_message_count`
4. Visual indicators appear in Conversations page:
   - Orange left border
   - "Handoff" badge
   - Alert banner with explanation

### Agent Response
- Agent sees handoff alert
- Takes over conversation manually
- Continues SMS thread with lead

---

## 4. Notification Control (Admin Feature)

### Purpose
Allow admin to control notification flow and prevent agent overwhelm

### Use Cases
- ✅ Disable for agents on vacation
- ✅ Disable during training/onboarding
- ✅ Control workload distribution
- ✅ Manage underperforming agents
- ✅ Prevent notification fatigue

### Settings Location
Admin → Settings → Team Notification Settings

### Toggle Per Agent
- Shows: Name, Email, Phone, Current Status
- Warning if notifications enabled but no phone number
- Real-time toggle with immediate effect

---

## 5. Database Schema Key Fields

### `leads` table
- `owner_id` (UUID, nullable): Agent assigned to lead (NULL = in pool)
- `lead_source` (TEXT): Origin of lead (CSV, SMS, Web Form, etc.)
- `status` (TEXT): Lead lifecycle status (new, contacted, qualified, lost)

### `conversations` table
- `requires_human_handoff` (BOOLEAN): AI handoff flag
- `handoff_triggered_at` (TIMESTAMPTZ): When handoff was triggered
- `ai_message_count` (INTEGER): Number of AI messages sent

### `users` table
- `phone_number` (TEXT): Agent phone for SMS notifications (E.164 format)
- `receive_sms_notifications` (BOOLEAN): Opt-in flag for SMS alerts

### `user_roles` table
- `role` (ENUM): 'admin' or 'user'
- Used for access control throughout system

---

## 6. Key Business Rules

### Lead Assignment
1. **Pool-Based**: Leads start unassigned (owner_id = NULL)
2. **First-Come-First-Served**: No lead reservation, fastest agent wins
3. **Permanent Assignment**: Once claimed, lead stays with agent
4. **No Reassignment**: Agents cannot transfer leads (admin feature TBD)

### Notification Rules
1. Only active users receive notifications (`is_active = true`)
2. Must have phone number set
3. Must have `receive_sms_notifications = true`
4. Admin controls per-agent notification settings

### Pipeline Visibility
1. Agents see ONLY their claimed leads
2. Admins see all leads (filtered by salesperson)
3. Lead Pool visible to ALL agents
4. Raw unqualified leads visible only in Leads page

---

## 7. Future Enhancements (Not Yet Implemented)

### Phase 2B: n8n Workflows
- [ ] AI qualification workflow (sentiment analysis)
- [ ] Qualified lead → Lead Pool automation
- [ ] SMS broadcast to agents
- [ ] Twilio integration

### Phase 3: Advanced Features (TBD)
- [ ] Lead reassignment (admin feature)
- [ ] Team performance dashboard
- [ ] Lead response time tracking
- [ ] Conversion rate analytics
- [ ] Agent leaderboard
- [ ] Automated follow-up reminders

---

## 8. Client Context

**Industry:** Automotive Dealership
**Team Size:** 1 Sales Manager/Admin + Multiple Sales Agents
**Primary Goal:** Convert qualified leads to sales efficiently
**Key Metric:** Lead-to-sale conversion rate
**Pain Point:** Too many unqualified leads wasting agent time

**Solution:** AI pre-qualifies leads before agents engage, competitive claiming ensures fast response times.

---

**Document Created:** November 20, 2025
**Last Updated:** November 20, 2025
**Source:** Client meeting transcript and clarification discussion
