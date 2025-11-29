wh# Testing Plan - Automotive AI CRM

**Project:** Kaiden_Arti_Lovable (Automotive AI CRM)
**Created:** November 29, 2025
**Purpose:** Comprehensive testing checklist before client delivery

---

## 🔍 Critical Path Testing (Must Test First)

### 1. **Authentication & Role-Based Access**
- [ ] User can sign up with email/password
- [ ] User can log in successfully
- [ ] User can log out
- [ ] Admin role is correctly assigned in `user_roles` table
- [ ] Agent role is correctly assigned (or default behavior)
- [ ] `useUserRole()` hook correctly identifies admin vs agent

### 2. **Lead Pool Flow (Core Business Logic)**
- [ ] Create test lead with `owner_id = NULL`
- [ ] Lead appears in Lead Pool page for ALL agents
- [ ] Agent A can claim lead → lead disappears from their pool view
- [ ] Agent B no longer sees claimed lead in their pool (verify RLS)
- [ ] Claimed lead appears in Agent A's Pipeline
- [ ] Admin can see claimed lead when filtering by Agent A

### 3. **Pipeline Kanban Board**
- [ ] **Agent view**: Only sees their own leads (`owner_id = current_user.id`)
- [ ] **Admin view**: Sees salesperson dropdown filter
- [ ] **Admin view**: Can filter by specific salesperson
- [ ] **Admin view**: "All Salespeople" shows all claimed leads
- [ ] Drag-and-drop updates `pipeline_stage_id` correctly
- [ ] Stage changes persist after page refresh

---

## 📋 Feature-by-Feature Testing

### 4. **CSV Lead Import (Leads Page)**
- [ ] Upload CSV with valid data → preview shows green checkmarks
- [ ] Upload CSV with invalid phone numbers → shows error badges
- [ ] Upload CSV with missing required fields → shows validation errors
- [ ] Upload CSV with duplicates within file → shows warnings
- [ ] Phone numbers normalized to E.164 format (`+1` prefix)
- [ ] Import only imports valid rows, skips invalid ones
- [ ] Imported leads appear in database with correct data
- [ ] Cost estimate calculates correctly (`$0.0075 × lead count`)

### 5. **Manual Initial Message Trigger**
- [ ] Select leads in Leads page → "Send 1st Message" button enabled
- [ ] Click button → leads tagged with `'Initial_Message'`
- [ ] Leads status changed to `'contacted'`
- [ ] Existing tags are preserved (additive tagging)
- [ ] Success toast appears after operation
- [ ] **Critical**: Database webhook fires to n8n Workflow 1 (check n8n execution logs)

### 6. **Message Templates (Tag Campaigns)**
- [ ] **Admin**: Can see "Edit Sequence" button for Initial Message (enabled)
- [ ] **Admin**: Can edit Initial Message template
- [ ] **Admin**: Can create new tag campaigns
- [ ] **Agent**: Sees "Admin Only" button for Initial Message (disabled, lock icon)
- [ ] **Agent**: Cannot edit system-level campaigns (`user_id = NULL`)
- [ ] Template saves correctly in `tag_campaigns` table
- [ ] Templates display in preview with variables like `{{first_name}}`

### 7. **Conversations Page**
- [ ] SMS threads load correctly for claimed leads
- [ ] Messages display in chronological order
- [ ] Orange "AI Handoff" indicator appears when `requires_human_handoff = true`
- [ ] Agent can send manual SMS reply
- [ ] Sent message appears in thread immediately
- [ ] `ai_message_count` increments correctly
- [ ] `handoff_triggered_at` timestamp set when handoff occurs

### 8. **Settings Page**
- [ ] **Admin**: Sees "Team Notification Settings" section
- [ ] **Admin**: Can toggle `receive_sms_notifications` for each agent
- [ ] **Agent**: Does NOT see Team Notification Settings
- [ ] User can update their own profile (name, phone, email)
- [ ] Phone number validation works (E.164 format)

### 9. **Analytics Dashboard**
- [ ] Metrics load correctly (total leads, claimed leads, conversion rate)
- [ ] Charts render without errors
- [ ] Date filters work (today, last 7 days, last 30 days)
- [ ] **Admin**: Sees team-wide metrics
- [ ] **Agent**: Sees only their own metrics

---

## 🔐 Row-Level Security (RLS) Testing

### 10. **Database Access Control**
Test with two browser profiles (Agent A and Agent B) + one admin:

**Lead Pool Access:**
- [ ] Agent A sees unassigned leads (`owner_id = NULL`)
- [ ] Agent B sees same unassigned leads
- [ ] Admin sees same unassigned leads

**Pipeline Access:**
- [ ] Agent A claims lead → only sees it in their pipeline
- [ ] Agent B does NOT see Agent A's claimed lead in their pipeline
- [ ] Admin can filter and see Agent A's claimed lead

**Conversations Access:**
- [ ] Agent A can only see conversations for their claimed leads
- [ ] Agent B cannot see Agent A's conversations
- [ ] Admin can see all conversations

**Tag Campaigns Access:**
- [ ] Agent A can create personal campaigns (`user_id = A's ID`)
- [ ] Agent B cannot edit Agent A's campaigns
- [ ] Only admin can edit system campaigns (`user_id = NULL`)

---

## 🔗 Integration Testing (n8n Workflows)

### 11. **Database → n8n Webhook Integration**

**Workflow 1: Initial Outbound Message**
- [ ] Create lead with `'Initial_Message'` tag → webhook fires
- [ ] n8n execution log shows successful run
- [ ] Day 1 SMS sent via Twilio (check Twilio logs)
- [ ] Lead's `status` updated to `'contacted'`

**Workflow 2: AI Tag Classification**
- [ ] Simulate inbound SMS (Twilio webhook to n8n)
- [ ] AI analyzes message and assigns tags
- [ ] Tags appear in `leads.tags` array
- [ ] Qualified leads set `requires_human_handoff = true`

**Workflow 3: Lead Pool Agent Notifications**
- [ ] Qualified lead moved to pool (`owner_id = NULL`)
- [ ] SMS sent to agents with `receive_sms_notifications = true`
- [ ] Agents receive notification with lead details

**Workflow 4: DNC Handler**
- [ ] Simulate "STOP" SMS reply
- [ ] Lead marked as `do_not_contact = true`
- [ ] No further SMS sent to that lead

**Workflow 5: Four-Message Cadence**
- [ ] Lead created with Initial Message
- [ ] No response from lead after Day 1
- [ ] Day 3, 5, 7 SMS sent automatically
- [ ] Sequence stops if lead responds

---

## 🧪 Edge Cases & Error Scenarios

### 12. **Data Integrity**
- [ ] Cannot claim already-claimed lead (race condition)
- [ ] Cannot delete lead with active conversations
- [ ] Phone number uniqueness enforced (if applicable)
- [ ] Invalid phone format rejected
- [ ] Empty CSV upload shows error
- [ ] Malformed CSV shows parsing error

### 13. **Network & API Errors**
- [ ] Supabase connection error shows user-friendly message
- [ ] n8n webhook timeout handled gracefully
- [ ] Twilio API error logged and user notified
- [ ] OpenAI API error doesn't crash workflow

### 14. **State Management**
- [ ] Lead Pool updates in real-time when lead claimed (React Query invalidation)
- [ ] Pipeline updates when stage changed
- [ ] Conversations update when new SMS arrives
- [ ] User logout clears cached data

---

## 📱 User Experience Testing

### 15. **UI/UX Validation**
- [ ] All pages load within 2 seconds
- [ ] Mobile responsive design works (320px - 1920px)
- [ ] Toast notifications appear for all user actions
- [ ] Loading states show during async operations
- [ ] Empty states display correctly (no leads, no conversations)
- [ ] Error states show helpful messages
- [ ] Forms validate input before submission
- [ ] Buttons disabled during submission (prevent double-click)

---

## 🚨 Pre-Deployment Checklist

### 16. **Final Validation**
- [ ] All console errors resolved
- [ ] No TypeScript compilation errors
- [ ] Production build succeeds (`npm run build`)
- [ ] Environment variables configured correctly (`.env`)
- [ ] Supabase RLS policies reviewed and tested
- [ ] n8n workflows activated in correct order (4→3→5→2→1)
- [ ] Twilio phone number verified and active
- [ ] OpenAI API key has sufficient credits
- [ ] Database backups configured
- [ ] User acceptance testing (UAT) with client completed

---

## 📝 Testing Priority Order

### Day 1 - Critical Path
1. Authentication & Roles (#1)
2. Lead Pool claiming (#2)
3. Pipeline access control (#3)
4. RLS policies (#10)

### Day 2 - Core Features
5. CSV import (#4)
6. Initial Message trigger (#5)
7. Message Templates (#6)
8. Conversations (#7)

### Day 3 - n8n Integration
9. Workflow 1 webhook (#11)
10. Workflow 2 AI classification (#11)
11. Workflow 3 notifications (#11)
12. End-to-end SMS flow (#11)

### Day 4 - Polish
13. Edge cases (#12)
14. UI/UX validation (#15)
15. Final deployment checklist (#16)

---

## 🔧 Testing Tools & Setup

### Required Tools
1. **Multiple Browser Profiles**: Test different user roles simultaneously
   - Chrome Profile 1: Admin user
   - Chrome Profile 2: Agent A
   - Chrome Profile 3: Agent B

2. **Supabase Dashboard**: Monitor database changes in real-time
   - URL: `https://supabase.com/dashboard/project/[your-project-id]`
   - Check: Table Editor, SQL Editor, Database Webhooks

3. **n8n Execution Logs**: Verify workflows trigger correctly
   - Access: n8n instance → Executions tab
   - Filter by workflow name and date

4. **Twilio Console**: Check SMS delivery status
   - URL: `https://console.twilio.com/`
   - Check: Messaging → Logs

5. **React Query DevTools**: Debug cache invalidation issues
   - Already installed in dev mode
   - Toggle with keyboard shortcut

6. **Browser DevTools**: Network tab and console
   - Network: Monitor API requests/responses
   - Console: Check for JavaScript errors

---

## 📊 Test Data Setup

### Create Test Users

**Admin User:**
```sql
-- Create admin user (sign up via UI first, then run this SQL)
INSERT INTO user_roles (user_id, role)
VALUES ('[admin-user-uuid]', 'admin');
```

**Agent Users:**
```sql
-- Agent A and Agent B (sign up via UI)
-- Default role is 'agent', no SQL needed
```

### Create Test Leads

**Unassigned Lead (for Lead Pool):**
```sql
INSERT INTO leads (first_name, last_name, phone, email, owner_id)
VALUES
  ('John', 'Doe', '+14155551234', 'john@example.com', NULL),
  ('Jane', 'Smith', '+14155555678', 'jane@example.com', NULL);
```

**Claimed Lead (for Pipeline Testing):**
```sql
INSERT INTO leads (first_name, last_name, phone, email, owner_id, pipeline_stage_id)
VALUES
  ('Bob', 'Johnson', '+14155559999', 'bob@example.com', '[agent-a-uuid]', '[stage-uuid]');
```

### Create Test Conversations

```sql
-- Conversation with AI handoff
INSERT INTO conversations (lead_id, requires_human_handoff, ai_message_count)
VALUES ('[lead-uuid]', true, 3);

-- Add messages
INSERT INTO messages (conversation_id, sender_type, message_content, sent_at)
VALUES
  ('[conversation-uuid]', 'ai', 'Hi John, this is Consumer Genius...', NOW() - INTERVAL '2 days'),
  ('[conversation-uuid]', 'customer', 'Yes, I am interested', NOW() - INTERVAL '1 day');
```

---

## 🐛 Bug Tracking Template

### Issue Report Format

```markdown
**Bug Title:** [Short description]

**Severity:** Critical / High / Medium / Low

**Test Case:** #[Test number from this document]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Logs:**
[Attach if available]

**Environment:**
- Browser:
- User Role: Admin / Agent
- Date/Time:

**Status:** Open / In Progress / Fixed / Verified
```

---

## ✅ Testing Sign-Off

### Team Sign-Off

- [ ] **Developer Testing Complete** - Date: ________ - Signature: ________
- [ ] **QA Testing Complete** - Date: ________ - Signature: ________
- [ ] **Client UAT Complete** - Date: ________ - Signature: ________
- [ ] **Production Deployment Approved** - Date: ________ - Signature: ________

---

## 📞 Support & Escalation

**Critical Issues (P0 - System Down):**
- Escalate immediately to development team
- Document in bug tracker with "Critical" severity
- Halt deployment until resolved

**High Priority Issues (P1 - Core Feature Broken):**
- Document with screenshots/logs
- Fix within 24 hours
- Retest affected area

**Medium/Low Priority Issues (P2/P3):**
- Add to backlog
- Fix in next sprint
- Does not block deployment

---

## 📚 Related Documentation

- `BUSINESS_LOGIC.md` - Business rules and requirements
- `CLAUDE.md` - Development guidelines and architecture
- `database-schema-v1.md` - Complete database schema
- `PROGRESS.md` - Implementation history
- `n8n/new-workflows/README.md` - n8n setup guide
- `n8n/new-workflows/VALIDATION_REPORT.md` - Workflow validation

---

**Last Updated:** November 29, 2025
**Version:** 1.0
**Maintained By:** Development Team
