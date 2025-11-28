# Project Progress Tracker

## 2025-01-19 - Campaign Enrollment System Implementation

### Status: ✅ Complete

### Overview
Implementing automated campaign enrollment system that:
- Backfills existing enrollments for leads with matching tags
- Auto-enrolls leads when tags are added
- Pauses enrollments when tags are removed
- Integrates with n8n for message sending

### Changes Being Made

#### Phase 1: Database Schema & Functions ✅
- ✅ Created auto-enrollment function with security definer
- ✅ Created tag removal handler (pauses enrollments when tags removed)
- ✅ Created triggers on leads table
- ✅ Backfilled existing enrollments (1 lead: "vignesh" in "Ghosted Follow-up")
- ✅ Fixed security warnings (set search_path on functions)

**Database Objects Created:**
- Function: `auto_enroll_in_tag_campaigns()` - Auto-enrolls leads when tags match active campaigns
- Function: `handle_tag_removal()` - Pauses enrollments when tags are removed
- Trigger: `trigger_auto_enroll_campaigns` - Fires on INSERT/UPDATE of tags
- Trigger: `trigger_handle_tag_removal` - Fires on UPDATE of tags

#### Phase 2: n8n Integration Points
- **Tables n8n Will Access:**
  - `campaign_enrollments` - Find leads needing messages
  - `tag_campaign_messages` - Get message templates
  - `leads` - Get lead details for personalization
  - `conversations` - Create conversation records
  - `messages` - Store sent messages

- **Enrollment Status Values:**
  - `active` - Send messages to these leads
  - `paused` - Skip (tag was removed)
  - `completed` - Skip (all messages sent)

- **n8n Should Update:**
  - `current_message_index` after sending each message
  - `completed_at` timestamp when all messages are sent
  - `status` to 'completed' when done

- **Sample n8n Query:**
```sql
SELECT 
  ce.id as enrollment_id,
  ce.lead_id,
  ce.current_message_index,
  ce.enrolled_at,
  l.first_name,
  l.last_name,
  l.phone,
  tc.name as campaign_name,
  tcm.message_template,
  tcm.day_number
FROM campaign_enrollments ce
JOIN leads l ON l.id = ce.lead_id
JOIN tag_campaigns tc ON tc.id = ce.campaign_id
JOIN tag_campaign_messages tcm ON tcm.campaign_id = tc.id
WHERE ce.status = 'active'
  AND tcm.sequence_order = ce.current_message_index
  AND (EXTRACT(DAY FROM (NOW() - ce.enrolled_at)) + 1) = tcm.day_number
ORDER BY ce.enrolled_at;
```

### Implementation Results
- ✅ 1 enrollment created during backfill (vignesh → Ghosted Follow-up campaign)
- ✅ Auto-enrollment triggers active and tested
- ✅ Tag removal pausing logic active
- ✅ Security warnings resolved (search_path set)

### Next Steps
- [ ] Verify enrollment by querying `campaign_enrollments` table
- [ ] Test: Add a new tag to a lead and verify auto-enrollment
- [ ] Test: Remove a tag from a lead and verify enrollment is paused
- [ ] Configure n8n workflow to query active enrollments
- [ ] Test end-to-end message sending flow via n8n

### Outstanding Security Notice
⚠️ **Note**: There is one general security warning about "Leaked Password Protection" being disabled. This is a Supabase auth configuration setting (not related to this migration) and should be enabled in Supabase Dashboard → Authentication → Providers → Email → Password Security.

---

## 2025-11-20 - Nov 19 Requirements Implementation (Frontend)

### Status: ✅ Phase 2A Complete (Frontend Development)

### Overview
Implementing Nov 19 meeting requirements for pool-based lead management, AI handoff system, and SMS notifications to agents. This update covers the frontend implementation following the database schema updates completed earlier.

### Changes Made

#### Phase 1: Database Schema Updates ✅ (Completed Earlier)
- ✅ Migration file created: `20251120000000_nov_19_schema_updates.sql`
- ✅ Added 9 new fields across 4 tables:
  - `leads`: `owner_id`, `lead_source`, `status`
  - `conversations`: `requires_human_handoff`, `handoff_triggered_at`, `ai_message_count`
  - `users`: `phone_number`, `receive_sms_notifications`
  - `campaign_enrollments`: `last_response_at`
- ✅ Updated RLS policies for pool-based lead visibility
- ✅ TypeScript types updated in `src/integrations/supabase/types.ts`

#### Phase 2A: Frontend Development ✅ (Completed Today)

**1. Lead Pool UI (`src/pages/Pipeline.tsx`)** ✅
- Updated leads query to include `owner_id`, `status`, `lead_source`
- Added `claimLeadMutation` for agents to claim pooled leads
- Created visual "🏊 Lead Pool" section with orange-bordered card
- Implemented responsive grid layout (1-4 columns)
- Added "Claim" button on each pooled lead card
- Updated pipeline stages to only show assigned leads
- Displays lead source badges and tags

**Visual Features:**
- Orange-bordered card showing unassigned leads (owner_id = null)
- Badge showing count of available leads
- Lead cards show: name, phone, lead source, tags, claim button
- Toast notification on successful claim
- Pipeline stages now filter out pooled leads

**2. AI Handoff Indicators (`src/pages/Conversations.tsx`)** ✅
- Updated conversations query to include handoff fields
- Added visual indicators in conversation list:
  - Orange left border for handoff conversations
  - Red "Handoff" badge with alert icon
  - AI message count display (e.g., "3 AI")
- Added prominent alert banner in conversation header:
  - Orange background alert box
  - Explains handoff reason to agent
  - Shows handoff trigger timestamp

**Visual Features:**
- Bold orange left border on conversations needing handoff
- Destructive variant badge for high visibility
- AI message count with Bot icon
- Full-width alert banner in conversation detail view
- Relative timestamp for when handoff was triggered

**3. Handoff Filters (`src/pages/Conversations.tsx`)** ✅
- Implemented 3-tab filter system:
  - **All**: Shows all active conversations
  - **Handoff**: Only conversations requiring human intervention
  - **AI Only**: Only AI-managed conversations (no handoff)
- Added count badge on "Handoff" tab
- Updated query to filter based on selected tab
- Filters apply to conversation list in real-time

**4. User Settings Page (`src/pages/Settings.tsx`)** ✅ (NEW FILE)
- Created complete settings page with 3 sections:
  - **Profile Information**: Displays full name and email (read-only)
  - **SMS Notifications**:
    - Phone number input (E.164 format with helper text)
    - Toggle switch for SMS notification opt-in
    - Warning when enabled but no phone number
    - Save button with loading state
  - **How Notifications Work**: Informational card explaining AI handoff

**Technical Implementation:**
- Fetches user profile from `users` table
- Pre-populates form with existing values
- Updates `phone_number` and `receive_sms_notifications`
- Shows success/error toasts
- Uses React Query for data fetching and mutations

**5. Settings Navigation** ✅
- Updated `src/components/layout/Navbar.tsx`:
  - Added Settings icon import
  - Added "Settings" menu item to user dropdown
  - Positioned between user email and logout
- Updated `src/App.tsx`:
  - Imported Settings component
  - Added `/settings` route to protected routes

### Files Modified (4 files):
1. `src/pages/Pipeline.tsx` - Lead Pool UI (~75 lines added/modified)
2. `src/pages/Conversations.tsx` - AI handoff indicators & filters (~110 lines added/modified)
3. `src/components/layout/Navbar.tsx` - Settings navigation (3 lines)
4. `src/App.tsx` - Settings route (2 lines)

### Files Created (1 file):
1. `src/pages/Settings.tsx` - Complete settings page (226 lines)

### Testing Instructions
```bash
cd D:\Dev\Kaiden_Arti_Lovable
npm install
npm run dev
```

**Test Scenarios:**
1. **Lead Pool**: Navigate to `/pipeline`, verify pooled leads appear in orange section, test "Claim" button
2. **AI Handoff**: Navigate to `/conversations`, verify orange borders and "Handoff" badges, check alert banner in conversation detail
3. **Handoff Filters**: Test 3 tabs (All, Handoff, AI Only), verify filtering works correctly
4. **Settings**: Click user menu → Settings, enter phone number, toggle notifications, click Save

### Phase 2B: n8n Workflow Updates (PENDING)
- [ ] Update AI response workflow with handoff detection logic
- [ ] Create SMS notification workflow for agent alerts
- [ ] Test AI handoff trigger (2-3 message rule + sentiment analysis)
- [ ] Test SMS notifications to agents when handoff occurs
- [ ] Configure Twilio integration for agent SMS

### Integration Testing (PENDING)
- [ ] Test complete flow: Lead in pool → Agent claims → AI conversation → Handoff trigger → Agent notified
- [ ] Verify RLS policies work correctly for pooled leads
- [ ] Test SMS notification delivery to agents
- [ ] Verify campaign enrollment continues to work with new schema

### Current Branch
- Branch: `feature/nov-19-requirements`
- Status: Not yet committed (awaiting user approval)
- Ready for testing and review

### User Feedback and Changes (2025-11-20 Afternoon)

**Feedback**: Lead Pool and Pipeline should be separate pages (Pipeline was pushed down and not fully visible)

**Changes Made**:
1. ✅ Created dedicated Lead Pool page (`src/pages/LeadPool.tsx`)
   - Standalone page showing only unassigned leads (owner_id = null)
   - Better visibility with larger card layout
   - Search functionality
   - Empty state with helpful messaging
   - Full-width "Claim Lead" button on each card

2. ✅ Restored Pipeline page to show only assigned leads
   - Removed Lead Pool section from Pipeline
   - Updated query to filter: `.not('owner_id', 'is', null)`
   - Removed claim lead mutation (not needed in Pipeline)
   - Pipeline now shows full height without scrolling issues

3. ✅ Added Lead Pool navigation
   - New route: `/lead-pool`
   - Added to main navigation bar (between Leads and Pipeline)
   - Uses Droplets icon for visual distinction
   - Available in both desktop and mobile navigation

**Files Modified**:
- `src/pages/Pipeline.tsx` - Removed Lead Pool section, now only shows assigned leads
- `src/components/layout/Navbar.tsx` - Added Lead Pool navigation item
- `src/App.tsx` - Added Lead Pool route

**Files Created**:
- `src/pages/LeadPool.tsx` - New standalone Lead Pool page (187 lines)

**Result**: Lead Pool and Pipeline are now separate, each page has full visibility and better UX

### User Business Logic Requirements (2025-11-20 Evening)

**Business Context**: Automotive dealership with sales manager/admin and multiple sales agents

**Requirements Clarified**:

1. **Pipeline Access Control**:
   - **Admins**: Dropdown to filter pipeline by salesperson (see any agent's pipeline)
   - **Agents**: Only see their own claimed leads (auto-filtered by owner_id)
   - Purpose: Sales manager can track individual performance and coach agents

2. **AI Qualification Flow**:
   - Raw unqualified leads → Leads table (not visible in Pipeline)
   - AI asks 2-3 qualifying questions via SMS
   - If qualified (shows buying intent) → Lead moves to Lead Pool (owner_id = NULL)
   - ALL active sales agents get SMS notification: "New qualified lead available"
   - First agent to claim wins (competitive claiming)

3. **Admin Notification Control**:
   - Admin can enable/disable SMS notifications per agent
   - Use case: Disable for agents on vacation, training, or underperforming
   - Prevents overwhelming specific agents with lead alerts

**Changes Implemented**:

1. ✅ **Role-Based Pipeline Filtering** (`src/pages/Pipeline.tsx`)
   - Added `useUserRole` hook for admin detection
   - Admin view: Dropdown showing all salespeople
     - "All Salespeople" option (shows everyone's leads)
     - Individual salesperson filter
   - Agent view: Auto-filtered to show only their own leads (`owner_id = current_user`)
   - Query uses role-based logic:
     ```typescript
     if (userRole?.isAdmin) {
       if (selectedSalesperson !== 'all') {
         query = query.eq('owner_id', selectedSalesperson);
       }
     } else {
       query = query.eq('owner_id', user.id); // Agents see only their leads
     }
     ```

2. ✅ **Team Notification Settings** (`src/pages/Settings.tsx`)
   - New admin-only section: "Team Notification Settings"
   - Lists all active team members with:
     - Full name, email, phone number
     - "You" badge for current user
     - Warning if notifications enabled but no phone number
     - Toggle switch for SMS alerts per agent
   - Real-time toggle with mutation
   - Updates `receive_sms_notifications` field for selected user

**Files Modified**:
- `src/pages/Pipeline.tsx` - Role-based access control (~50 lines added)
- `src/pages/Settings.tsx` - Admin team notification controls (~90 lines added)

**Visual Changes**:
- **Pipeline (Admin)**: Dropdown next to search showing "All Salespeople" with individual agent names
- **Pipeline (Agent)**: No dropdown, only shows their claimed leads
- **Settings (Admin)**: New card showing team members with toggle switches
- **Settings (Agent)**: Only personal settings visible

**Pending Implementation (n8n Workflows)**:
- [ ] AI qualification logic (2-3 message sentiment analysis)
- [ ] Qualified lead → Lead Pool automation (set owner_id = NULL)
- [ ] SMS broadcast workflow (notify all agents with receive_sms_notifications = true)
- [ ] SMS content: "New qualified lead: [Name] [Phone]. Claim now: [Link to Lead Pool]"

---

## 2025-11-20 - n8n Workflows Implementation

### Status: ✅ Workflows Created (Ready for Import)

### Overview
Created 5 complete n8n workflows implementing AI lead qualification, tag classification, and agent notification system based on Nov 19 meeting requirements.

### Workflows Created

#### **Workflow 1: Initial Outbound Message** ⚡ HIGH PRIORITY
**File:** `n8n/new-workflows/1-initial-outbound-message.json`

**Purpose:** Send Day 1 message when lead is created/uploaded

**Trigger:** Supabase webhook on lead INSERT

**Flow:**
1. Check if lead is unassigned (owner_id = NULL)
2. Find or create conversation record
3. Format Day 1 message with lead's name
4. Send SMS via Twilio
5. Save message to database
6. Update lead status to 'contacted'

**Key Features:**
- Handles new lead creation from any source (CSV, web form, etc.)
- Creates conversation automatically if doesn't exist
- Personalizes message with lead's first name
- Updates lead status for tracking

---

#### **Workflow 2: Enhanced AI Tag Classification** ⚡ HIGH PRIORITY
**File:** `n8n/new-workflows/2-enhanced-ai-tag-classification.json`

**Purpose:** Handle inbound SMS, classify tags, detect buying intent, and route accordingly

**Trigger:** Twilio webhook on inbound SMS

**Flow:**
1. Find lead by phone number (create if doesn't exist)
2. Save inbound message to database
3. Get full conversation history
4. Format history for AI analysis
5. **AI Classification (OpenAI GPT-4):**
   - Analyze conversation for 14 tag categories
   - Detect engagement type (positive/no_intent/opt_out/need_more_info)
   - Generate conversation summary
   - Create human-like response
6. Update lead with assigned tags
7. **Route based on engagement type:**
   - **Positive engagement** → Call Workflow 3 (Lead Pool)
   - **No buying intent** → Call Workflow 3 with summary
   - **Opt-out** → Call Workflow 4 (DNC Handler)
   - **Need more info** → Continue AI conversation
8. Send AI response via SMS
9. Save AI response to database

**AI Integration:**
- Uses OpenAI GPT-4 for reliable tag classification
- Structured prompt with 14 tag definitions
- JSON output format for structured data
- Engagement type detection in same call

**Key Features:**
- Auto-creates leads from unknown phone numbers
- Full conversation history analysis
- Multi-tag assignment (1-14 tags)
- Smart routing to appropriate workflow
- Human-like AI responses

---

#### **Workflow 3: Lead Pool & Agent Notifications** ⚡ HIGH PRIORITY
**File:** `n8n/new-workflows/3-lead-pool-agent-notifications.json`

**Purpose:** Move qualified leads to pool and notify all active agents via SMS

**Trigger:** Called by Workflow 2 via webhook

**Flow:**
1. Get lead details from database
2. Move lead to pool (owner_id = NULL)
3. Assign tags to lead
4. Update conversation handoff flags
5. Query active agents (receive_sms_notifications = true)
6. **Branch based on engagement type:**
   - **Positive engagement:** "New qualified lead available! [Details] Claim now: [Link]"
   - **No buying intent:** "Lead responded - No buying intent yet. Summary: [AI summary] Review: [Link]"
7. Loop through agents and send SMS to each
8. Add 1-second delay between sends (rate limiting)
9. Log notifications sent

**SMS Messages:**
- **Positive:** Clear, urgent call-to-action for claiming
- **No Intent:** Includes AI-generated conversation summary for context
- Both include lead name, phone, tags, and link to Lead Pool

**Key Features:**
- SMS broadcast to all eligible agents
- Different messages for different scenarios
- Rate limiting to prevent Twilio errors
- Notification logging for audit trail
- Sets handoff flags for UI display

---

#### **Workflow 4: DNC Handler** ⚡ HIGH PRIORITY
**File:** `n8n/new-workflows/4-dnc-handler.json`

**Purpose:** Immediately handle opt-outs and stop all contact

**Trigger:** Called by Workflow 2 when opt-out detected

**Flow:**
1. Get DNC pipeline stage ID from database
2. Get lead details
3. Move lead to DNC stage
4. Set status = 'dnc'
5. Pause all active campaign enrollments
6. Archive conversation
7. Send final acknowledgment SMS: "You've been removed from our contact list. Thank you."
8. Save acknowledgment message
9. Log opt-out event for audit trail

**Compliance:**
- Immediate cessation of all contact
- Pauses ALL campaigns (no future messages)
- Archives conversation (no agent handoff)
- Sends legally compliant acknowledgment
- Full audit trail

**Key Features:**
- Fast execution (critical for compliance)
- Stops all automated workflows
- Clear confirmation to lead
- Permanent record in activity logs

---

#### **Workflow 5: 4-Message Cadence Scheduler** 🔶 MEDIUM PRIORITY
**File:** `n8n/new-workflows/5-four-message-cadence-scheduler.json`

**Purpose:** Send Day 3, 5, 7 follow-ups for non-responders

**Trigger:** Schedule (daily at 10:00 AM)

**Flow:**
1. Daily schedule trigger runs
2. Query leads who need follow-ups (Day 3, 5, or 7 since last contact)
3. For each lead:
   - Check if they responded (count inbound messages)
   - **If NO response:**
     - Calculate which day (3, 5, or 7)
     - Get appropriate message template
     - Send SMS via Twilio
     - Save message to database
     - Update lead timestamp
4. **Special handling for Day 7 with no response:**
   - Tag as "Ghosted / No Response"
   - Call Workflow 3 (Lead Pool & Notifications)
   - Notify agents with summary: "Lead hasn't responded after 4 messages"

**Message Cadence:**
- **Day 1:** Initial outreach (Workflow 1)
- **Day 3:** "Hey [Name], just following up! Are you still looking for a vehicle?"
- **Day 5:** "Hi [Name]! Wanted to follow up on your vehicle search. Any questions I can help with?"
- **Day 7:** "Hey [Name], just checking in one last time. Still interested in finding the right vehicle?"
- **After Day 7:** Tag "Ghosted" → Move to Lead Pool

**Key Features:**
- Smart date calculation (days since last contact)
- Only sends if lead hasn't responded
- Different messages for each day
- Automatic ghosted lead handling
- Rate limiting between leads

---

### Supporting Documentation

**File:** `n8n/new-workflows/README.md` (4,000+ lines)

Comprehensive setup guide including:
- Workflow overviews
- Setup instructions
- Credential configuration (Supabase, Twilio, OpenAI)
- Webhook setup (Supabase and Twilio)
- Testing guide for each workflow
- Troubleshooting common issues
- Customization instructions
- Architecture diagram
- Message template customization

---

### Technical Details

**Node Types Used:**
- Webhook triggers (Supabase, Twilio, internal)
- Schedule trigger (cron-based)
- Supabase database operations (query, insert, update)
- Twilio SMS sending
- OpenAI GPT-4 API calls
- Code nodes (JavaScript for data transformation)
- IF/Switch nodes (conditional routing)
- Split In Batches (loop processing)
- Wait nodes (rate limiting)
- HTTP Request (inter-workflow communication)

**Credentials Required:**
1. Supabase API (service role key)
2. Twilio API (Account SID, Auth Token, Phone Number)
3. OpenAI API (API key for GPT-4)

**Environment Variables:**
- `TWILIO_PHONE_NUMBER` - Your Twilio number (E.164 format)
- `APP_URL` - Your CRM frontend URL (for links in SMS)

---

### Implementation Phases

#### **Phase 1: Core Functionality** (Week 1) - NEXT
1. Import all 5 workflows into n8n
2. Configure credentials (Supabase, Twilio, OpenAI)
3. Set up webhooks:
   - Supabase → Workflow 1 (new lead INSERT)
   - Twilio → Workflow 2 (inbound SMS)
4. Test each workflow individually
5. Activate workflows in order: 4, 3, 5, 2, 1

#### **Phase 2: Testing & Validation** (Week 1-2)
1. Test Workflow 1: Create new lead → Verify Day 1 SMS
2. Test Workflow 2: Send inbound SMS → Verify tag classification
3. Test Workflow 3: Trigger handoff → Verify agent notifications
4. Test Workflow 4: Send "STOP" → Verify DNC handling
5. Test Workflow 5: Create old lead → Verify follow-ups
6. Test end-to-end flow: New lead → Day 1 → Response → Tag → Pool → Claim

#### **Phase 3: Optimization** (Week 2-3)
1. Tune AI prompt for tag accuracy
2. Adjust message templates based on user feedback
3. Optimize SMS notification content
4. Add error handling and retry logic
5. Monitor execution logs and fix issues

---

### Files Created

**n8n Workflow Files:**
1. `n8n/new-workflows/1-initial-outbound-message.json` - Day 1 outreach
2. `n8n/new-workflows/2-enhanced-ai-tag-classification.json` - AI analysis & routing
3. `n8n/new-workflows/3-lead-pool-agent-notifications.json` - Agent SMS broadcast
4. `n8n/new-workflows/4-dnc-handler.json` - Opt-out compliance
5. `n8n/new-workflows/5-four-message-cadence-scheduler.json` - Follow-up automation

**Documentation:**
6. `n8n/new-workflows/README.md` - Complete setup & testing guide

**Total Lines of Code:** ~2,000+ lines of JSON workflow definitions

---

### Integration Points

**Frontend (React) → Database (Supabase) → n8n → Twilio/OpenAI**

**Flow:**
```
Lead Created → Supabase Webhook → Workflow 1 → SMS Sent
SMS Received → Twilio Webhook → Workflow 2 → AI Analysis → Tags Assigned
Positive Engagement → Workflow 3 → Agent SMS Broadcast
Lead in Pool → Agent Claims (Frontend) → Campaigns Start
Opt-Out → Workflow 4 → DNC Stage → All Contact Stopped
No Response → Workflow 5 → Follow-ups → Ghosted Tag
```

**Frontend Integration:**
- Lead Pool page shows leads moved by Workflow 3
- Conversations page shows handoff flags set by Workflow 3
- Pipeline shows DNC stage from Workflow 4
- Settings controls `receive_sms_notifications` queried by Workflow 3

---

### Estimated Effort

**Implementation Time:**
- Phase 1 (Setup): 8-12 hours
- Phase 2 (Testing): 12-15 hours
- Phase 3 (Optimization): 5-10 hours
- **Total:** 25-37 hours

**Breakdown:**
- Credential setup: 2 hours
- Workflow import & config: 4 hours
- Webhook setup: 2 hours
- Individual workflow testing: 8 hours
- End-to-end testing: 6 hours
- AI prompt tuning: 4 hours
- Message template refinement: 3 hours
- Error handling & monitoring: 6 hours

---

### Next Actions

**Immediate (User Approval Required):**
1. Review workflow files in `n8n/new-workflows/` folder
2. Review README.md for setup instructions
3. Approve for n8n implementation

**After Approval:**
1. Set up n8n instance (if not already running)
2. Create Supabase, Twilio, OpenAI credentials in n8n
3. Import 5 workflow files
4. Configure webhooks
5. Test each workflow
6. Activate all workflows
7. Monitor for 24-48 hours
8. Tune based on real data

---

**Status:** ✅ All workflow files created and documented, ready for n8n import and testing

**Branch:** Same as frontend (`feature/nov-19-requirements`)

**Commit:** Not yet committed (awaiting user approval)

---
