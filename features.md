# Features

## Feature 1: Automated SMS on Lead Tag

### Description
When a user tags a lead in the CRM, an automated SMS is sent to the lead's phone number using a pre-defined template linked to that tag.

---

### User Flow
1. User views a lead in the React dashboard
2. User adds a tag to the lead (e.g., "interested-camry")
3. User saves the tag
4. System automatically sends templated SMS to lead
5. Conversation is recorded in database

---

### Technical Flow

```
React Frontend
   ↓ (Updates tags in database)
Supabase Database
   ↓ (Database webhook detects tag change)
n8n Workflow
   ↓ (Fetches template, sends SMS, saves conversation)
Twilio → Customer Phone
   ↓
Supabase Database (records conversation & message)
```

---

### Database Tables

**`leads`**
- id
- first_name
- last_name
- phone_number
- email
- tags (array)
- created_at
- updated_at

**`message_templates`**
- id
- tag (e.g., "interested-camry")
- template (e.g., "Hi {first_name}! Thanks for interest in the Camry...")
- created_at

**`conversations`**
- id
- lead_id (foreign key to leads)
- status (active, completed, escalated)
- created_at

**`messages`**
- id
- conversation_id (foreign key to conversations)
- direction (inbound, outbound)
- content (message text)
- sender (phone number)
- recipient (phone number)
- status (sent, delivered, failed)
- created_at

---

### Frontend Responsibility 

**What React does:**
1. Display leads list
2. Allow user to add/edit tags
3. Make API call to Supabase:
   ```
   UPDATE leads SET tags = ['interested-camry'] WHERE id = 123
   ```
4. That's it - frontend only updates database

**Frontend does NOT:**
- Call n8n directly
- Send SMS
- Know about Twilio

---

### Database Webhook Configuration

**Trigger:** When `tags` column in `leads` table changes (UPDATE event)

**Webhook URL:** `https://your-n8n.app/webhook/lead-tagged`

**Payload sent to n8n:**
```json
{
  "type": "UPDATE",
  "table": "leads",
  "record": {
    "id": "123",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "tags": ["interested-camry"]
  },
  "old_record": {
    "tags": []
  }
}
```

---

### n8n Workflow Steps

**Node 1: Webhook Trigger**
- Receives lead data from Supabase webhook

**Node 2: Supabase Query - Get Template**
- Query: `SELECT * FROM message_templates WHERE tag = 'interested-camry'`
- Returns template: "Hi {first_name}! Thanks for interest in the Camry..."

**Node 3: Function - Format Message**
- Replace `{first_name}` with actual name (John)
- Replace `{last_name}` with actual last name (Doe)
- Result: "Hi John! Thanks for interest in the Camry..."

**Node 4: Twilio - Send SMS**
- To: Lead's phone number
- From: Your Twilio number
- Message: Formatted template

**Node 5: Supabase Insert - Create Conversation**
- Insert into `conversations` table:
  - lead_id: 123
  - status: "active"

**Node 6: Supabase Insert - Save Message**
- Insert into `messages` table:
  - conversation_id: (from previous node)
  - direction: "outbound"
  - content: The SMS text sent
  - sender: Your Twilio number
  - recipient: Lead's phone number
  - status: "sent"

---

### Why This Approach?

**Advantages:**
- ✅ Frontend only talks to database (clean separation)
- ✅ Easy to replace n8n with custom API later (no frontend changes)
- ✅ Database is source of truth
- ✅ Workflow logic isolated in n8n (easy to debug visually)
- ✅ All business logic in one place

**Migration Path:**
- Later: Replace database webhook to call custom API instead of n8n
- Frontend code stays exactly the same
- Zero changes to React app

---

### Example Scenario

**Setup:**
- Lead: John Doe, +1234567890
- Tag added: "interested-camry"
- Template: "Hi {first_name}! Thanks for your interest in the Toyota Camry. Do you have any questions?"

**What happens:**
1. Sales person tags John as "interested-camry" in dashboard
2. React updates database: `tags = ['interested-camry']`
3. Database webhook fires, calls n8n
4. n8n fetches template for "interested-camry"
5. n8n formats: "Hi John! Thanks for your interest in the Toyota Camry..."
6. n8n sends SMS via Twilio
7. n8n creates conversation record
8. n8n saves outbound message record
9. John receives SMS on his phone

**Result:** Fully automated, tracked conversation initiated by a simple tag.

---

## Feature 2: Automated Drip Campaigns (Multi-Day Sequences)

### Description
When a lead is tagged with a campaign tag (e.g., "Ghosted", "Payment Too High"), they are enrolled in a multi-day SMS drip sequence. Messages are sent automatically on scheduled days (Day 1, Day 2, Day 4, Day 6, etc.) only if the lead hasn't responded.

**14 Campaign Tags:**
1. Ghosted / No Response
2. Payment Too High
3. Credit Declined Previously
4. Waiting / Timing Not Right
5. Couldn't Find the Right Vehicle
6. Needed More Info / Confusion About Terms
7. Process Took Too Long
8. Bought Elsewhere
9. Wanted to Improve Credit First
10. Negative Equity / Trade-In Issue
11. Needed a Cosigner
12. Didn't Like the Approved Vehicle
13. Rate Too High
14. Missing Documents

---

### User Flow
1. User tags lead with campaign tag (e.g., "Ghosted")
2. Day 1 message sent immediately
3. Lead enrolled in drip campaign
4. System checks daily: Did lead respond?
   - **No response:** Continue sending scheduled messages
   - **Responded:** Pause or complete campaign
5. Campaign completes after final message or when lead responds

---

### Technical Flow

```
React Frontend
   ↓ UPDATE leads SET tags = ['Ghosted']
Supabase Database
   ↓ Database webhook detects tag change
n8n Workflow 1 (existing)
   ├─ Send Day 1 message immediately
   └─ Insert into campaign_enrollments (enroll lead)

n8n Workflow 3 (NEW - Scheduled, runs every hour/day)
   ├─ Query active campaign_enrollments
   ├─ Calculate days since enrollment
   ├─ Find messages due today (Day 2, 4, 6, etc.)
   ├─ Check if lead responded (query messages for inbound)
   ├─ If NO response → Send scheduled message
   ├─ If responded → Mark enrollment as completed
   └─ Update last_message_sent_at
```

---

### Database Tables

**New Tables:**

**`campaigns`**
- id
- tag (e.g., "Ghosted")
- name (e.g., "Ghosted / No Response")
- description
- created_at

**`campaign_messages`**
- id
- campaign_id (foreign key to campaigns)
- day_number (1, 2, 4, 6, etc.)
- message_template
- sequence_order (1, 2, 3, 4)
- created_at

**`campaign_enrollments`**
- id
- lead_id (foreign key to leads)
- campaign_id (foreign key to campaigns)
- enrolled_at (timestamp when enrolled)
- status (active, paused, completed)
- last_message_sent_at
- last_message_day (which day message was last sent)
- last_response_at (when lead last responded)
- created_at
- updated_at

**Existing tables used:**
- `leads` - For lead information
- `messages` - To check if lead responded (inbound messages)
- `conversations` - Link messages to conversations

---

### Frontend Responsibility

**What React does:**
1. Display campaign tags as options
2. Tag lead with campaign tag (e.g., "Ghosted")
3. Make API call to Supabase:
   ```
   UPDATE leads SET tags = ['Ghosted'] WHERE id = 123
   ```
4. Optionally: Display campaign enrollment status and progress

**Frontend does NOT:**
- Schedule messages (n8n handles this)
- Know about drip logic
- Calculate days or send messages

---

### Database Webhook Configuration

**Same as Feature 1** - Tags column update triggers n8n Workflow 1

---

### n8n Workflow 1 Updates (Tag → Enroll in Campaign)

**Modified nodes to handle campaign enrollment:**

**Node 1-4:** Same as Feature 1 (send Day 1 message)

**Node 5 (NEW): Check if Tag is Campaign**
- Query: `SELECT * FROM campaigns WHERE tag = 'Ghosted'`
- If campaign exists → proceed to enrollment

**Node 6 (NEW): Enroll in Campaign**
- Insert into `campaign_enrollments`:
  - lead_id: 123
  - campaign_id: (from Node 5)
  - enrolled_at: NOW()
  - status: "active"
  - last_message_sent_at: NOW()
  - last_message_day: 1

**Node 7-8:** Same as Feature 1 (save conversation and message)

---

### n8n Workflow 3: Scheduled Drip Campaign (NEW)

**Trigger:** Schedule (runs every hour or once daily at specific time)

**Node 1: Get Active Enrollments**
- Query: `SELECT * FROM campaign_enrollments WHERE status = 'active'`

**Node 2: Loop Through Each Enrollment**
- Iterate over all active enrollments

**Node 3: Calculate Days Since Enrollment**
- Function: `days_elapsed = floor((NOW() - enrolled_at) / 86400)`
- Example: Enrolled 3 days ago → days_elapsed = 3

**Node 4: Get Next Scheduled Message**
- Query:
  ```
  SELECT * FROM campaign_messages
  WHERE campaign_id = ?
  AND day_number = days_elapsed
  AND day_number > last_message_day
  ```
- Returns message if one is scheduled for today

**Node 5: Check if Lead Responded**
- Query:
  ```
  SELECT * FROM messages
  WHERE conversation_id = ?
  AND direction = 'inbound'
  AND created_at > enrolled_at
  ORDER BY created_at DESC LIMIT 1
  ```
- If inbound message found → lead responded

**Node 6: Decision Branch**
- **If lead responded:**
  - Update enrollment: `status = 'completed'`, `last_response_at = NOW()`
  - Skip to next enrollment
- **If no response and message due:**
  - Proceed to send message

**Node 7: Get Lead Info**
- Query: `SELECT * FROM leads WHERE id = ?`

**Node 8: Format Message**
- Replace placeholders: `{first_name}`, `{last_name}`

**Node 9: Send SMS via Twilio**
- Send scheduled message

**Node 10: Update Enrollment**
- Update `campaign_enrollments`:
  - last_message_sent_at: NOW()
  - last_message_day: current day_number

**Node 11: Save Message Record**
- Insert into `messages` table (direction: outbound)

**Node 12: Check if Campaign Complete**
- If this was the last message → Update status: "completed"

---

### Campaign Data Structure Example

**Campaign: "Ghosted / No Response"**

**campaigns table:**
```
id: 1
tag: "Ghosted"
name: "Ghosted / No Response"
```

**campaign_messages table:**
```
| id | campaign_id | day_number | sequence_order | message_template |
|----|-------------|------------|----------------|------------------|
| 1  | 1           | 1          | 1              | "Hey, just checking in. Are you still exploring vehicle options or did plans change?" |
| 2  | 1           | 2          | 2              | "I've got a couple options that fit what you were originally looking for. Want me to send them over?" |
| 3  | 1           | 4          | 3              | "If the right payment and the right vehicle came up, would you be open to taking another look?" |
| 4  | 1           | 6          | 4              | "Before I close out your file, want me to keep sending options or pause it for now?" |
```

---

### Response Detection Logic

**Key logic in Node 5:**

```javascript
// Check if lead responded after enrollment
const hasResponded = inboundMessages.length > 0;

if (hasResponded) {
  // Lead replied - complete the campaign
  status = 'completed';
  last_response_at = inboundMessages[0].created_at;
} else {
  // No response - continue campaign
  status = 'active';
}
```

---

### Example Scenario

**Setup:**
- Lead: John Doe, +1234567890
- Tag added: "Ghosted"
- Campaign: 4 messages on Day 1, 2, 4, 6

**Timeline:**

**Day 0 (Jan 1, 2PM):** User tags John as "Ghosted"
- Workflow 1 sends Day 1 message immediately
- Enrollment created: `enrolled_at = Jan 1 2PM`, `last_message_day = 1`

**Day 1 (Jan 2, 2PM):** Scheduled workflow runs
- Days elapsed: 1
- Message due: Day 2 message
- Check: Did John reply? No
- Action: Send Day 2 message
- Update: `last_message_day = 2`, `last_message_sent_at = Jan 2 2PM`

**Day 2 (Jan 3):** John replies "Yes, I'm still interested" at 10AM
- Workflow 2 (existing AI response) handles reply
- Message saved to database with `direction = 'inbound'`

**Day 3 (Jan 4, 2PM):** Scheduled workflow runs
- Days elapsed: 3 (no Day 3 message, next is Day 4)

**Day 4 (Jan 5, 2PM):** Scheduled workflow runs
- Days elapsed: 4
- Message due: Day 4 message
- Check: Did John reply? **Yes (on Jan 3)**
- Action: Mark enrollment as `completed`, **do NOT send Day 4 message**
- Update: `status = 'completed'`, `last_response_at = Jan 3 10AM`

**Result:** Campaign stopped because lead responded. Messages 3 and 4 were never sent.

---

### Alternative Scenario (No Response)

**Day 0:** Tag "Ghosted", Day 1 sent
**Day 1:** Day 2 sent (no response)
**Day 3:** Day 4 sent (no response)
**Day 5:** Day 6 sent (no response)
**Day 6+:** Campaign complete, status = "completed"

---

### Why This Approach?

**Advantages:**
- ✅ Fully automated drip campaigns
- ✅ Respects customer responses (stops if they reply)
- ✅ Each lead has independent schedule
- ✅ Can handle 100s of enrollments simultaneously
- ✅ Easy to add new campaigns (just add to database)
- ✅ Scheduled workflow is campaign-agnostic (works for all 14 campaigns)

**Business Value:**
- Re-engages cold leads automatically
- Saves sales team hours of manual follow-up
- Consistent messaging across all leads
- Higher conversion from ghosted leads

---

### Campaign Management

**Adding New Campaign:**
1. Insert into `campaigns` table (tag, name)
2. Insert 4 messages into `campaign_messages` (day_number: 1, 2, 4, 6)
3. Tag is now available in frontend
4. Workflows automatically handle new campaign

**Pausing Campaign for Lead:**
- Update enrollment: `status = 'paused'`
- Scheduled workflow skips paused enrollments

**Resuming Campaign:**
- Update enrollment: `status = 'active'`
- Continues from where it left off

---

## Feature 3: CSV Bulk Lead Upload

### Description
Users can upload a CSV file containing multiple leads. The system parses the CSV, validates the data, and imports all leads into the database. Imported leads are immediately visible in the frontend dashboard.

---

### User Flow
1. User clicks "Upload Leads" button in dashboard
2. User selects CSV file from their computer
3. System validates CSV format and data
4. Leads imported to database
5. Success message shown with count of imported leads
6. Dashboard refreshes to show newly imported leads

---

### Technical Flow

```
React Frontend
   ├─ User clicks "Upload CSV" button
   ├─ File picker opens
   ├─ User selects CSV file
   ↓
Frontend CSV Parser (Papa Parse library)
   ├─ Parse CSV into JSON
   ├─ Validate: phone_number, first_name required
   ├─ Format phone numbers (add +1 if missing)
   ↓
Supabase API (Bulk Insert)
   ├─ INSERT INTO leads (first_name, last_name, phone_number, email, tags)
   ├─ Handle duplicates (skip or update)
   ↓
Frontend Refresh
   ├─ Query updated leads list
   └─ Display in dashboard table
```

---

### CSV Format

**Required columns:**
- `first_name`
- `phone_number`

**Optional columns:**
- `last_name`
- `email`
- `tags` (comma-separated, e.g., "Ghosted,high-priority")

**Example CSV:**
```csv
first_name,last_name,phone_number,email,tags
John,Doe,+1234567890,john@example.com,Ghosted
Jane,Smith,2345678901,jane@example.com,Payment Too High
Mike,Johnson,+13456789012,mike@example.com,
```

---

### Frontend Responsibility

**What React does:**
1. Display "Upload CSV" button
2. File input component (accept=".csv")
3. Parse CSV using Papa Parse library
4. Validate data:
   - Check required fields (first_name, phone_number)
   - Validate phone format (10-11 digits)
   - Format phone to E.164 (+1234567890)
5. Bulk insert to Supabase:
   ```javascript
   const { data, error } = await supabase
     .from('leads')
     .insert(parsedLeads)
   ```
6. Show progress indicator during upload
7. Display success/error message
8. Refresh leads list to show imported leads

**Error Handling:**
- Invalid CSV format → Show error message
- Missing required fields → Show which rows failed
- Duplicate phone numbers → Skip or update existing
- Network error → Retry option

---

### Database Behavior

**Duplicate Detection:**
- Check if `phone_number` already exists
- **Option 1 (Recommended):** Skip duplicates, show count
- **Option 2:** Update existing lead with new data
- **Option 3:** Add to existing tags array

**Bulk Insert:**
- Use Supabase batch insert (up to 1000 rows at once)
- For larger files, batch in chunks of 1000

---

### Frontend Components

**Upload Button:**
```
[Upload CSV] button in header or leads table toolbar
```

**Upload Modal/Drawer:**
- Drag & drop zone
- Or click to select file
- Show file name after selection
- Preview first 5 rows (optional)
- [Cancel] [Import] buttons

**Progress Indicator:**
- "Uploading 250 leads..."
- Progress bar (optional)

**Success Message:**
- "Successfully imported 250 leads"
- "Skipped 10 duplicates"
- [View Leads] button

**Error Message:**
- "Failed to import: Invalid CSV format"
- "Row 5: Missing required field 'phone_number'"
- [Try Again] button

---

### Validation Rules

**Phone Number:**
- Must be 10-11 digits
- Auto-format: Remove spaces, dashes, parentheses
- Add country code if missing: `2345678901` → `+12345678901`

**Email (optional):**
- Basic email validation: contains `@` and `.`

**Tags (optional):**
- Parse comma-separated values
- Trim whitespace
- Convert to array: `"Ghosted, Payment Too High"` → `["Ghosted", "Payment Too High"]`

**First Name:**
- Required, cannot be empty
- Trim whitespace

---

### Example Scenario

**Setup:**
- User has CSV with 100 leads
- 5 leads already exist in database (duplicate phone numbers)

**What happens:**
1. User clicks "Upload CSV"
2. Selects file: `leads_export.csv`
3. Frontend parses CSV → 100 rows
4. Frontend validates:
   - All rows have first_name and phone_number ✓
   - Formats phone numbers to E.164 format
5. Frontend sends batch insert to Supabase
6. Supabase checks duplicates:
   - 5 duplicates found (skip)
   - 95 new leads inserted
7. Frontend shows:
   - "Successfully imported 95 leads"
   - "Skipped 5 duplicates"
8. Dashboard table refreshes showing 95 new leads

**Result:** Bulk import saves hours of manual data entry.

---

### Why This Approach?

**Advantages:**
- ✅ Fast bulk import (100s of leads in seconds)
- ✅ Client-side parsing (no server needed)
- ✅ Supabase handles batch inserts efficiently
- ✅ Immediate validation feedback
- ✅ Duplicate prevention
- ✅ Standard CSV format (works with Excel, Google Sheets)

**Business Value:**
- Import leads from ads, CRM exports, spreadsheets
- Onboard new customers faster
- Reduce manual data entry errors
- Scale to 1000s of leads easily

---

### Future Enhancements

**Phase 2 (Optional):**
- Export leads to CSV
- Map custom CSV columns (flexible column names)
- Schedule recurring imports from URL
- Integration with Google Sheets
- Automatic tagging based on CSV data

---

## Feature Status

| Feature | Status | Priority |
|---------|--------|----------|
| Automated SMS on Tag | Planned | P0 (Must-have) |
| Drip Campaigns (Multi-Day Sequences) | Planned | P0 (Must-have) |
| CSV Bulk Lead Upload | Planned | P1 (Should-have) |
