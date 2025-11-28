# Version 1 Scope - Automotive AI Platform

**Last Updated:** 2025-11-16
**Status:** Planning Phase

---

## Overview

Version 1 focuses on the **core SMS automation workflow**: Tag a lead → Automated SMS sent → View conversations → Manage pipeline.

**Primary Goal:** Deliver a working MVP that automates SMS communication with leads through tagging and basic campaign enrollment.

---

## ✅ Included in Version 1

### 1. Dashboard Page
- **SMS Analytics Only** (Call analytics deferred to V2)
- Metrics displayed:
  - Total Messages
  - Inbound Messages
  - Outbound Messages
  - Unread Texts
- Message Activity chart
- Date range picker
- Team member selector
- **Note:** Will add SMS/Calls toggle in V2

### 2. Conversations Page
- Two channel tabs: **SMS** 
- Left panel: Conversation list with search
- Right panel: Message thread view
- Basic filters
- Pagination
- View conversation history
- Real-time message updates

### 3. Leads Page
- Simplified table with columns:
  - Name
  - Phone Number
  - Email
  - Tags
  - Lead Source
  - Status
  - Actions
- **Tag Management:** Add/remove tags (triggers SMS automation)
- Search by name or phone
- Basic filters (Filter by Owner, Advanced Filters)
- **Inline Editing:** Admin-only feature
- Add new lead manually
- Pagination

### 4. Pipelines Page
- Kanban board with 4 stages:
  1. New Contact
  2. Working Lead
  3. Needs A Call
  4. I Accept
- Drag-and-drop contact cards between stages
- Search contacts
- Basic filters
- Contact card shows: Name, Owner, Phone, Email, Notes
- Quick actions: Message, Call, Email icons

### 5. Tag Templates Page
- **Page Name:** Tag Templates (renamed from "Templates")
- View all 14 predefined campaign tags with their drip sequences
- Each tag card displays:
  - Tag name (e.g., "Ghosted / No Response")
  - Tag identifier badge (e.g., "Ghosted")
  - All 4 messages with day numbers (Day 1, 2, 4, 6)

- **Create New Tag Flow:**
  - Click "Add New Tag" button (top left corner)
  - Step 1: Enter tag name, tag identifier, select number of messages (2-6)
  - Step 2: Enter messages for each day with day numbers
  - Placeholder helper ({first_name}, {last_name})
  - Preview timeline showing all messages
  - Save to create new campaign tag
- **Edit/Delete Tags:**
  - Edit custom tags only (predefined tags are locked)
  - Delete custom tags only
- **Validation:**
  - Tag identifier must be unique
  - At least 2 messages required
  - Day numbers must be sequential
  - First message must be Day 1


### 6. Core Backend Features
- **Automated SMS on Tag**
  - User tags lead → Database webhook → n8n → Twilio → SMS sent
  - Message templates linked to tags
  - Conversation and message records saved
- **Drip Campaign Enrollment**
  - Tag lead with campaign tag → Enroll in multi-day sequence
  - n8n scheduled workflow sends Day 1, 2, 4, 6 messages
  - Stops if lead responds
- **AI-Powered Responses** (Basic)
  - Customer replies → n8n → OpenAI → Automated response
  - Basic context (last 10 messages + lead info)

### 6. Database Tables (Essential)
- `leads` - Lead information with tags
- `message_templates` - Tag-to-message mapping
- `conversations` - Conversation records
- `messages` - All SMS messages (inbound/outbound)
- `campaigns` - 14 predefined campaigns
- `campaign_messages` - Day-by-day campaign messages
- `campaign_enrollments` - Track which leads are in campaigns

---

## ❌ Deferred to Version 2+

### Features Not in V1:

**Dashboard:**
- Call analytics metrics
- SMS/Calls toggle tabs
- Advanced analytics tab with detailed breakdowns
- Team performance metrics

**Contacts Page (Full Version):**
- Dedicated Contacts page with full CRUD
- CSV bulk upload functionality
- Bulk contact operations (bulk tag, bulk delete)
- Export contacts to CSV
- Advanced column customization

**Bulk SMS Page:**
- Mass messaging to multiple contacts
- Template selector for bulk messages
- Recipient filtering and selection
- Message preview and cost estimation

**Templates Page:**
- Full template management UI
- Template editor with live preview
- Template categories and organization
- Template analytics (usage stats)

**Campaigns Page (Full Version):**
- Campaign management dashboard
- Campaign performance metrics
- Campaign timeline visualization
- Enrollment management interface
- Create/edit campaigns via UI
- Pause/resume enrollments

**Agents Page:**
- AI configuration interface
- System prompt editor
- Model selection (GPT-3.5 vs GPT-4)
- Temperature and token settings
- Test conversation panel

**Followups Page:**
- Scheduled followup management
- Calendar view
- Manual followup creation

**Automations Page:**
- Automation rule builder
- Trigger-action configuration
- Enable/disable automations

**Advanced Features:**
- Multi-channel support beyond SMS (Discord, etc.)
- Advanced filtering and segmentation
- Lead scoring
- Custom pipeline stages
- Workflow automation builder
- Role-based permissions (beyond admin inline editing)
- Advanced reporting and exports
- Integration with other CRMs
- Mobile app

---

## Version 1 User Flows

### Flow 1: Tag Lead → Automated SMS Sent ✅
```
1. User navigates to /leads
2. User searches for or finds lead "John Doe"
3. User clicks on lead row to expand details
4. User clicks "Add Tag" button
5. Tag selector appears with autocomplete
6. User types "Ghosted" and selects tag
7. User clicks "Save"
8. Frontend updates lead in database
9. Success toast: "Lead tagged successfully. SMS will be sent."
10. Tag appears on lead row with badge
11. (Backend) Database webhook triggers n8n
12. (Backend) n8n sends Day 1 SMS
13. (Backend) n8n enrolls lead in Ghosted campaign
```

### Flow 2: View Conversation and Reply ✅
```
1. User navigates to /conversations
2. List shows all conversations sorted by latest message
3. User sees notification badge "3" on SMS channel tab
4. User clicks on conversation "Harry Ott"
5. Right panel loads full message thread
6. Messages displayed as bubbles (inbound blue, outbound gray)
7. User scrolls to read history
8. Customer's last message: "What colors does it come in?"
9. User can:
   Option A: Type manual reply and click send
   Option B: Let AI auto-reply (already sent)
10. User sees AI's response in thread
11. Conversation marked as "handled"
```

### Flow 3: Move Lead in Pipeline ✅
```
1. User navigates to /pipelines
2. User sees Kanban board with 4 stages
3. User finds "John Doe" card in "New Contact" column
4. User drags John's card to "Working Lead" column
5. Card animates to new position
6. Database updated with new pipeline stage
7. Success indicator (visual feedback)
```

### Flow 4: Create Custom Tag Template ✅
```
1. User navigates to /tag-templates
2. User sees all 14 predefined campaign tags displayed as cards
3. User clicks "Add New Tag" button (top left corner)
4. Step 1 modal opens - Create New Tag Template
5. User enters:
   - Tag Name: "Interested in Accord"
   - Tag Identifier: "interested-accord"
   - Number of Messages: 4 (from dropdown)
6. User clicks "Next: Add Messages"
7. Step 2 modal opens - Add Messages
8. User enters 4 messages:
   - Message 1 (Day 1): "Hi {first_name}! Thanks for your interest..."
   - Message 2 (Day 3): "Just following up..."
   - Message 3 (Day 5): "Still interested in the Accord?"
   - Message 4 (Day 7): "Last call before closing your file..."
9. Preview timeline shows all 4 messages with day markers
10. User clicks "Save Tag Template"
11. Frontend inserts campaign and messages to database
12. Success toast: "Tag template created successfully"
13. Modal closes
14. New tag card appears in the grid with other tags
15. Tag is now available when tagging leads
```

---

## Version 1 Pages Summary

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| Dashboard | `/dashboard` | V1 (SMS only) | P0 |
| Conversations | `/conversations` | V1 (SMS only) | P0 |
| Leads | `/leads` | V1 (Simplified) | P0 |
| Pipelines | `/pipelines` | V1 (4 stages) | P0 |
| Tag Templates | `/tag-templates` | V1 (Create/View/Edit) | P0 |
| Contacts | `/contacts` | V2 | P1 |
| Bulk SMS | `/bulk-sms` | V2 | P1 |
| Campaigns | `/campaigns` | V2 | P1 |
| Agents | `/agents` | V2 | P2 |
| Followups | `/followups` | V2 | P2 |
| Automations | `/automations` | V2 | P2 |

**Legend:**
- P0 = Must-have for V1
- P1 = High priority for V2
- P2 = Future enhancement

---

## Technical Implementation for V1

### Frontend (React)
- 5 main pages: Dashboard, Conversations, Leads, Pipelines, Tag Templates
- Shadcn UI components
- Tailwind CSS styling
- React Query for data fetching
- Supabase JS client for database
- React Router for navigation
- Dark theme design

### Backend (Supabase + n8n)
- Supabase PostgreSQL database
- Database webhooks to trigger n8n
- n8n workflows:
  - Workflow 1: Tag → Send SMS
  - Workflow 2: SMS Reply → AI Response
  - Workflow 3: Scheduled Drip Campaigns
- Twilio for SMS
- OpenAI for AI responses

### Database (Essential Tables Only)
- `leads`
- `message_templates`
- `conversations`
- `messages`
- `campaigns`
- `campaign_messages`
- `campaign_enrollments`

---

## V1 Feature Restrictions

**What Users CAN Do:**
- Add leads manually (one at a time)
- Tag leads to trigger SMS
- View all conversations
- Reply to messages manually
- See AI-generated responses
- Move leads through pipeline stages
- Search leads and conversations
- View SMS analytics
- View all 14 predefined campaign tag templates
- Create custom campaign tags with drip sequences
- Edit/delete custom tag templates (predefined ones are locked)

**What Users CANNOT Do (V2+):**
- Upload CSV bulk contacts
- Send bulk SMS to multiple leads at once
- Configure AI settings
- View call analytics
- Advanced automation rules
- Export data to CSV

---

## Success Criteria for V1

**MVP is successful if:**
1. ✅ User can add a lead manually
2. ✅ User can tag a lead and SMS is automatically sent within 30 seconds
3. ✅ Lead is enrolled in correct drip campaign
4. ✅ Scheduled messages sent on Day 2, 4, 6 (if no response)
5. ✅ User can view all conversations in Conversations page
6. ✅ User can see AI-generated responses in conversation threads
7. ✅ User can drag lead cards between pipeline stages
8. ✅ Dashboard shows accurate SMS metrics
9. ✅ All pages load in < 2 seconds
10. ✅ Mobile responsive design works on phones/tablets

---

## Estimated Development Time (V1 Only)

**With 1-2 developers:**
- Week 1-2: Setup + Database + Backend workflows
- Week 3-4: Core frontend pages (Dashboard, Leads)
- Week 5-6: Conversations + Pipelines pages
- Week 7: Testing + Bug fixes
- Week 8: Deployment + Launch

**Total: 6-8 weeks for V1 MVP**

---

## Migration Path to V2

**Easy additions in V2:**
- Add Contacts page (similar to Leads)
- Add Bulk SMS page (new UI, reuse Supabase)
- Add Templates page (CRUD for message_templates)
- Add Campaigns page (CRUD for campaigns)
- Add call analytics (new metrics queries)

**All V1 code remains unchanged, just additive features**

---

**Status:** Defined and Ready for Implementation
**Next Step:** Finalize design system and start frontend development
