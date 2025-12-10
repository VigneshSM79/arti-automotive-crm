# Database Schema - Version 1

**Last Updated:** 2025-11-16
**Status:** Planning Phase

---

## Overview

Complete database schema for Automotive AI Platform Version 1, designed for Supabase (PostgreSQL).

**Total Tables:** 10 core tables

---

## Table Definitions

### 1. `users` (Authentication & Team Management)

**Purpose:** Store user/team member information for authentication and ownership tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | User ID (Supabase auth.users reference) |
| `| VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| `full_naemail` me` | VARCHAR(255) | NOT NULL | User's full name |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'user' | Role: 'admin', 'user', 'manager' |
| `avatar_url` | TEXT | NULL | Profile picture URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `role`

**Relationships:**
- Referenced by: `leads.owner_id`, `conversations.assigned_to`

---

### 2. `leads` (Lead/Contact Management)

**Purpose:** Store all lead/contact information with tags for triggering campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Lead ID |
| `first_name` | VARCHAR(100) | NOT NULL | Lead's first name |
| `last_name` | VARCHAR(100) | NULL | Lead's last name |
| `phone_number` | VARCHAR(20) | NOT NULL, UNIQUE | Phone in E.164 format (+1234567890) |
| `email` | VARCHAR(255) | NULL | Email address |
| `tags` | TEXT[] | DEFAULT '{}' | Array of tag strings (triggers campaigns) |
| `lead_source` | VARCHAR(100) | NULL | Source: 'Incoming Call', 'Contact Form', 'Referral' |
| `status` | VARCHAR(50) | DEFAULT 'new' | Status: 'new', 'contacted', 'qualified', 'lost' |
| `pipeline_stage_id` | UUID | NULL, FOREIGN KEY → pipeline_stages(id) | Current pipeline stage |
| `owner_id` | UUID | NULL, FOREIGN KEY → users(id) | Assigned sales rep |
| `notes` | TEXT | NULL | Internal notes about the lead |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Lead creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `phone_number`
- INDEX on `tags` (GIN index for array operations)
- INDEX on `status`
- INDEX on `pipeline_stage_id`
- INDEX on `owner_id`
- INDEX on `created_at`

**Relationships:**
- FOREIGN KEY: `pipeline_stage_id` → `pipeline_stages(id)`
- FOREIGN KEY: `owner_id` → `users(id)`
- Referenced by: `conversations.lead_id`, `campaign_enrollments.lead_id`

**Triggers:**
- Webhook on UPDATE when `tags` column changes → Triggers n8n workflow

---

### 3. `conversations` (Conversation Threads)

**Purpose:** Group messages into conversation threads per lead 

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Conversation ID |
| `lead_id` | UUID | NOT NULL, FOREIGN KEY → leads(id) | Associated lead |
| `channel` | VARCHAR(50) | NOT NULL, DEFAULT 'sms' | Channel: 'sms', 'facebook', 'email' |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | Status: 'active', 'closed', 'archived' |
| `assigned_to` | UUID | NULL, FOREIGN KEY → users(id) | Assigned team member |
| `last_message_at` | TIMESTAMPTZ | NULL | Timestamp of last message |
| `unread_count` | INTEGER | DEFAULT 0 | Number of unread messages |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Conversation start timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `lead_id`
- INDEX on `channel`
- INDEX on `status`
- INDEX on `assigned_to`
- INDEX on `last_message_at` (DESC for sorting)

**Relationships:**
- FOREIGN KEY: `lead_id` → `leads(id)` ON DELETE CASCADE
- FOREIGN KEY: `assigned_to` → `users(id)`
- Referenced by: `messages.conversation_id`

---

### 4. `messages` (SMS/Message Records)

**Purpose:** Store all messages (inbound and outbound) for conversations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Message ID |
| `conversation_id` | UUID | NOT NULL, FOREIGN KEY → conversations(id) | Parent conversation |
| `direction` | VARCHAR(20) | NOT NULL | Direction: 'inbound', 'outbound' |
| `content` | TEXT | NOT NULL | Message text content |
| `sender` | VARCHAR(20) | NOT NULL | Sender phone number |
| `recipient` | VARCHAR(20) | NOT NULL | Recipient phone number |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'sent' | Status: 'sent', 'delivered', 'failed', 'read' |
| `twilio_sid` | VARCHAR(100) | NULL | Twilio message SID for tracking |
| `is_ai_generated` | BOOLEAN | DEFAULT false | Whether message was AI-generated |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Message timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `conversation_id`
- INDEX on `direction`
- INDEX on `status`
- INDEX on `created_at` (DESC for sorting)
- INDEX on `twilio_sid`

**Relationships:**
- FOREIGN KEY: `conversation_id` → `conversations(id)` ON DELETE CASCADE

**Triggers:**
- Webhook on INSERT when `direction = 'inbound'` → Triggers AI response workflow

---

### 5. `campaigns` (Drip Campaign Definitions)

**Purpose:** Define campaign tags and their metadata (14 predefined + custom)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Campaign ID |
| `tag` | VARCHAR(100) | NOT NULL, UNIQUE | Tag identifier (e.g., "Ghosted") |
| `name` | VARCHAR(255) | NOT NULL | Display name (e.g., "Ghosted / No Response") |
| `description` | TEXT | NULL | Campaign description |
| `is_predefined` | BOOLEAN | DEFAULT false | Whether this is a predefined campaign (locked) |
| `is_active` | BOOLEAN | DEFAULT true | Campaign active status |
| `created_by` | UUID | NULL, FOREIGN KEY → users(id) | User who created the campaign |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Campaign creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `tag`
- INDEX on `is_active`
- INDEX on `created_by`

**Relationships:**
- FOREIGN KEY: `created_by` → `users(id)`
- Referenced by: `campaign_messages.campaign_id`, `campaign_enrollments.campaign_id`

**Pre-populated Data:**
- 14 predefined campaigns with `is_predefined = true`:
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

### 6. `campaign_messages` (Drip Sequence Messages)

**Purpose:** Store individual messages for each campaign's drip sequence

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Message ID |
| `campaign_id` | UUID | NOT NULL, FOREIGN KEY → campaigns(id) | Parent campaign |
| `day_number` | INTEGER | NOT NULL | Day to send (1, 2, 4, 6, etc.) |
| `sequence_order` | INTEGER | NOT NULL | Order in sequence (1, 2, 3, 4) |
| `message_template` | TEXT | NOT NULL | Message text with placeholders |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Message creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `campaign_id`
- INDEX on `day_number`
- UNIQUE INDEX on (`campaign_id`, `day_number`)

**Relationships:**
- FOREIGN KEY: `campaign_id` → `campaigns(id)` ON DELETE CASCADE

**Constraints:**
- CHECK: `day_number > 0`
- CHECK: `sequence_order > 0`

---

### 7. `campaign_enrollments` (Lead Campaign Tracking)

**Purpose:** Track which leads are enrolled in which campaigns and their progress

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Enrollment ID |
| `lead_id` | UUID | NOT NULL, FOREIGN KEY → leads(id) | Enrolled lead |
| `campaign_id` | UUID | NOT NULL, FOREIGN KEY → campaigns(id) | Campaign enrolled in |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | Status: 'active', 'paused', 'completed', 'qualified', 'cancelled' |
| `enrolled_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Enrollment timestamp |
| `last_message_sent_at` | TIMESTAMPTZ | NULL | When last message was sent |
| `last_message_day` | INTEGER | DEFAULT 0 | Last day number sent (0, 1, 2, 4, 6) |
| `last_response_at` | TIMESTAMPTZ | NULL | When lead last responded (completes campaign) |
| `completed_at` | TIMESTAMPTZ | NULL | Campaign completion timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `lead_id`
- INDEX on `campaign_id`
- INDEX on `status`
- INDEX on `enrolled_at`
- INDEX on `last_message_sent_at`
- UNIQUE INDEX on (`lead_id`, `campaign_id`) WHERE status IN ('active', 'paused')

**Relationships:**
- FOREIGN KEY: `lead_id` → `leads(id)` ON DELETE CASCADE
- FOREIGN KEY: `campaign_id` → `campaigns(id)` ON DELETE CASCADE

**Business Logic:**
- n8n scheduled workflow queries this table to find enrollments needing messages
- Automatically marks as 'completed' when `last_response_at` is set
- Only one active enrollment per lead per campaign
- Status lifecycle:
  - `active`: on enrollment creation
  - `qualified`: set by n8n Workflow 2 when AI determines the lead is qualified (no further follow-up messages should be sent)
  - `paused`: on opt-out/DNC (Workflow 4) or manual pause
  - `completed`: when the lead responds or the cadence finishes
  - `cancelled`: manual termination
- Scheduler should send follow-ups only when `status = 'active'`; it must skip enrollments with `status = 'qualified'` (or other non-active states).

---

### 8. `pipeline_stages` (Sales Pipeline Stages)

**Purpose:** Define pipeline stages for Kanban board

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Stage ID |
| `name` | VARCHAR(100) | NOT NULL | Stage name |
| `order_position` | INTEGER | NOT NULL | Display order (1, 2, 3, 4) |
| `color` | VARCHAR(50) | NULL | Badge color |
| `is_default` | BOOLEAN | DEFAULT false | Whether this is the default stage for new leads |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Stage creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `order_position`

**Relationships:**
- Referenced by: `leads.pipeline_stage_id`

**Pre-populated Data (V1):**
1. New Contact (order: 1, is_default: true)
2. Working Lead (order: 2)
3. Needs A Call (order: 3)
4. I Accept (order: 4)

---

### 9. `dashboard_metrics` (Materialized View - Optional)

**Purpose:** Pre-calculated metrics for dashboard performance (optional optimization)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Metric ID |
| `metric_date` | DATE | NOT NULL | Date of metrics |
| `total_messages` | INTEGER | DEFAULT 0 | Total messages sent |
| `inbound_messages` | INTEGER | DEFAULT 0 | Inbound messages received |
| `outbound_messages` | INTEGER | DEFAULT 0 | Outbound messages sent |
| `unread_texts` | INTEGER | DEFAULT 0 | Unread message count |
| `active_conversations` | INTEGER | DEFAULT 0 | Active conversations |
| `new_leads` | INTEGER | DEFAULT 0 | New leads created |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Metric calculation timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `metric_date`

**Note:** This is optional for V1. Can calculate metrics in real-time initially, then add this materialized view for performance optimization if needed.

---

### 10. `message_templates` (Simple Message Templates - Deprecated in V1)

**Purpose:** Simple one-off message templates (NOTE: Replaced by campaigns in V1, kept for future single-message tags)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Template ID |
| `tag` | VARCHAR(100) | NOT NULL, UNIQUE | Tag identifier |
| `template` | TEXT | NOT NULL | Message template with placeholders |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Template creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `tag`

**Note:** In V1, this table is mostly superseded by `campaigns` + `campaign_messages`. Keep for simple one-off tags that don't need drip sequences.

---

## Database Relationships Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ (owner_id, assigned_to, created_by)
       │
       ├─────────────────┬─────────────────┬──────────────────┐
       │                 │                 │                  │
       ▼                 ▼                 ▼                  ▼
┌─────────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   leads     │   │conversations │  │  campaigns   │  │pipeline_stages│
└──────┬──────┘   └──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                 │                  │
       │ (lead_id)       │                 │                  │ (pipeline_stage_id)
       │                 │                 │                  │
       ├─────────────────┤                 │                  │
       │                 │                 │                  │
       ▼                 ▼                 ▼                  │
┌──────────────┐  ┌─────────────┐  ┌─────────────────┐       │
│conversations │  │  messages   │  │campaign_messages│       │
└──────┬───────┘  └─────────────┘  └─────────────────┘       │
       │                                    │                 │
       │ (conversation_id)                  │                 │
       │                                    │                 │
       ▼                                    ▼                 │
┌─────────────┐              ┌──────────────────────┐        │
│  messages   │              │campaign_enrollments  │◄───────┘
└─────────────┘              └──────────────────────┘
                                     │
                                     │ (lead_id, campaign_id)
                                     │
                             ┌───────┴────────┐
                             ▼                ▼
                      ┌─────────────┐  ┌──────────┐
                      │   leads     │  │campaigns │
                      └─────────────┘  └──────────┘
```

---

## Table Relationships Summary

### One-to-Many Relationships:

1. **users → leads** (one user owns many leads)
   - `leads.owner_id` → `users.id`

2. **users → conversations** (one user assigned to many conversations)
   - `conversations.assigned_to` → `users.id`

3. **users → campaigns** (one user creates many campaigns)
   - `campaigns.created_by` → `users.id`

4. **leads → conversations** (one lead has many conversations)
   - `conversations.lead_id` → `leads.id`

5. **leads → campaign_enrollments** (one lead enrolled in many campaigns)
   - `campaign_enrollments.lead_id` → `leads.id`

6. **conversations → messages** (one conversation has many messages)
   - `messages.conversation_id` → `conversations.id`

7. **campaigns → campaign_messages** (one campaign has many messages)
   - `campaign_messages.campaign_id` → `campaigns.id`

8. **campaigns → campaign_enrollments** (one campaign has many enrollments)
   - `campaign_enrollments.campaign_id` → `campaigns.id`

9. **pipeline_stages → leads** (one stage contains many leads)
   - `leads.pipeline_stage_id` → `pipeline_stages.id`

### Many-to-Many Relationships:

1. **leads ↔ campaigns** (through `campaign_enrollments`)
   - A lead can be enrolled in multiple campaigns (at different times)
   - A campaign can have multiple leads enrolled

---

## Key Database Features

### Triggers & Webhooks:

1. **leads table - UPDATE trigger on tags column**
   - Fires webhook to n8n when tags array changes
   - n8n checks if tag matches a campaign
   - n8n sends Day 1 SMS and creates enrollment

2. **messages table - INSERT trigger on inbound messages**
   - Fires webhook to n8n when new inbound message arrives
   - n8n generates AI response
   - n8n sends reply via Twilio

3. **Timestamp triggers (ALL tables)**
   - Automatically update `updated_at` on every UPDATE

### Indexes:

- GIN index on `leads.tags` for fast array operations
- B-tree indexes on all foreign keys
- Indexes on frequently filtered columns (status, created_at, etc.)

### Constraints:

- UNIQUE constraint on `leads.phone_number` (no duplicate phone numbers)
- UNIQUE constraint on `campaigns.tag` (no duplicate tags)
- CHECK constraints on day_number and sequence_order (must be positive)
- UNIQUE partial index on campaign_enrollments to prevent duplicate active enrollments

---

## Data Migration / Seed Data

### Required Seed Data for V1:

1. **pipeline_stages** - 4 stages:
   - New Contact (order: 1)
   - Working Lead (order: 2)
   - Needs A Call (order: 3)
   - I Accept (order: 4)

2. **campaigns** - 14 predefined campaigns (from campaigns.md)

3. **campaign_messages** - 4 messages per campaign (56 total messages)

---

## Estimated Storage Requirements

**For 10,000 leads with moderate activity:**

| Table | Estimated Rows | Estimated Size |
|-------|----------------|----------------|
| users | 10-50 | < 1 MB |
| leads | 10,000 | ~5 MB |
| conversations | 5,000 | ~2 MB |
| messages | 50,000 | ~25 MB |
| campaigns | 20 | < 1 MB |
| campaign_messages | 80 | < 1 MB |
| campaign_enrollments | 3,000 | ~2 MB |
| pipeline_stages | 4 | < 1 KB |
| message_templates | 10 | < 1 KB |
| **TOTAL** | | **~35 MB** |

**Supabase Free Tier:** 500 MB database size (plenty for V1)

---

## Performance Considerations

### Query Optimization:

1. **Dashboard metrics** - Use COUNT(*) with filters or materialized view
2. **Conversations list** - Index on last_message_at for sorting
3. **Campaign checks** - n8n scheduled job batches enrollments efficiently
4. **Tag array operations** - GIN index on leads.tags for fast lookups

### Caching Strategy:

- Frontend: React Query caches API responses (5 minutes default)
- Backend: No caching needed in V1 (direct Supabase queries)
- Future: Add Redis for hot data (active conversations, metrics)

---

## Security & RLS (Row Level Security)

### Supabase RLS Policies:

1. **users table**
   - Users can read their own profile
   - Only admins can read all users

2. **leads table**
   - Users can read leads they own (`owner_id = auth.uid()`)
   - Admins can read all leads

3. **conversations table**
   - Users can read conversations assigned to them
   - Admins can read all conversations

4. **messages table**
   - Users can read messages in their assigned conversations
   - All users can insert (for manual replies)

5. **campaigns/campaign_messages**
   - All authenticated users can read
   - Only admins can create/update/delete

6. **campaign_enrollments**
   - Users can read enrollments for their leads
   - System can insert/update (n8n service role)

---

## Next Steps

1. Create Supabase project
2. Run SQL migrations to create all tables
3. Seed predefined data (stages, campaigns, messages)
4. Configure database webhooks for n8n
5. Set up RLS policies
6. Test CRUD operations from frontend

---

**Status:** Ready for Implementation
**Total Tables:** 10 core tables
**Relationships:** 9 one-to-many, 1 many-to-many
