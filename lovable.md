# Automotive AI CRM Platform - Complete Project Specification

Build a complete automotive dealership CRM platform focused on SMS-based lead nurturing with AI-powered drip campaigns and pipeline management.

---

## Project Overview

**Project Name:** Automotive AI CRM (Kaiden Arti)

**Purpose:** Help automotive dealerships manage leads through automated SMS drip campaigns, AI-powered responses, and visual pipeline management.

**Version:** 1.0 (MVP)

**Target Users:** Automotive dealership sales teams and managers

---

## Tech Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** Shadcn UI components
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** TanStack Query (React Query) for server state
- **Form Handling:** React Hook Form with Zod validation
- **Drag & Drop:** @dnd-kit/core for Kanban board

### Backend & Services
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email/password)
- **Real-time:** Supabase Realtime subscriptions
- **SMS Gateway:** Twilio (webhook integration)
- **Automation:** n8n (external workflows via webhooks)
- **AI Responses:** Handled by n8n (not in frontend)

### Build Tools
- **Build Tool:** Vite
- **Package Manager:** npm
- **Linting:** ESLint with TypeScript support

---

## Design System

### Color Palette (Consumer Genius Inspired - Light Theme)

```css
/* Brand Colors */
--primary: #E74C3C;        /* Coral Red - Brand accent, highlights */
--primary-hover: #C0392B;  /* Darker coral for hover states */
--secondary: #F39C12;      /* Orange - Primary CTA buttons */
--secondary-hover: #E67E22; /* Darker orange for hover */
--success: #00C851;        /* Bright Green - Secondary CTA, success states */
--success-hover: #00A844;  /* Darker green for hover */

/* Background Colors */
--background: #FFFFFF;     /* Main background - White */
--card: #FFFFFF;           /* Card background - White with shadow */
--card-dark: #2B2B2B;      /* Dark card variant */
--muted: #F5F5F5;          /* Muted backgrounds, disabled states */

/* Text Colors */
--foreground: #2B2B2B;     /* Primary text - Dark charcoal */
--muted-foreground: #7F8C8D; /* Secondary text - Gray */
--card-foreground: #2B2B2B; /* Text on cards */

/* Border & Outline */
--border: #E0E0E0;         /* Borders, dividers */
--input: #E0E0E0;          /* Input borders */
--ring: #E74C3C;           /* Focus ring - Primary color */

/* Status Colors */
--destructive: #E74C3C;    /* Error, delete actions */
--warning: #F39C12;        /* Warning states */
--info: #3498DB;           /* Info states */
```

### Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing

Use Tailwind's default spacing scale (4px base unit):
- `space-1` = 4px
- `space-2` = 8px
- `space-4` = 16px
- `space-6` = 24px
- `space-8` = 32px

### Border Radius

```css
--radius-sm: 0.25rem;  /* 4px - Small elements */
--radius-md: 0.375rem; /* 6px - Cards, inputs */
--radius-lg: 0.5rem;   /* 8px - Modals, containers */
--radius-full: 9999px; /* Pills, badges */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

## Database Schema (Supabase PostgreSQL)

### Table 1: `users` (Authentication & Team Management)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Roles:** 'admin', 'user', 'manager'

---

### Table 2: `leads` (Lead/Contact Management)

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  lead_source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  owner_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_leads_phone ON leads(phone_number);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_pipeline_stage ON leads(pipeline_stage_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

**Statuses:** 'new', 'contacted', 'qualified', 'lost'

**Lead Sources:** 'Incoming Call', 'Contact Form', 'Referral', 'Manual Entry'

**Phone Format:** E.164 format (+1234567890)

**Tags:** Array of strings that trigger campaigns (e.g., ['Ghosted', 'Payment Too High'])

---

### Table 3: `conversations` (Conversation Threads)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL DEFAULT 'sms',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id),
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

**Channels:** 'sms' (only SMS in V1)

**Statuses:** 'active', 'closed', 'archived'

---

### Table 4: `messages` (SMS/Message Records)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  sender VARCHAR(20) NOT NULL,
  recipient VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  twilio_sid VARCHAR(100),
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_twilio_sid ON messages(twilio_sid);
```

**Directions:** 'inbound', 'outbound'

**Statuses:** 'sent', 'delivered', 'failed', 'read'

**Message Ordering:** Sort by `created_at ASC` to display oldest to newest in chat thread

---

### Table 5: `campaigns` (Drip Campaign Definitions)

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_predefined BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  target_pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_campaigns_tag ON campaigns(tag);
CREATE INDEX idx_campaigns_active ON campaigns(is_active);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
```

**Predefined Tags (14 campaigns):**
1. Ghosted
2. PaymentTooHigh
3. CreditDeclined
4. Waiting
5. NoRightVehicle
6. NeededMoreInfo
7. ProcessTooLong
8. BoughtElsewhere
9. ImproveCreditFirst
10. NegativeEquity
11. NeededCosigner
12. DislikedVehicle
13. RateTooHigh
14. MissingDocuments

**target_pipeline_stage_id:** Which stage to move lead to when they reply (e.g., "Needs A Call")

---

### Table 6: `campaign_messages` (Drip Sequence Messages)

```sql
CREATE TABLE campaign_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_day_positive CHECK (day_number > 0),
  CONSTRAINT check_order_positive CHECK (sequence_order > 0)
);

CREATE INDEX idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_day ON campaign_messages(day_number);
CREATE UNIQUE INDEX idx_campaign_messages_unique ON campaign_messages(campaign_id, day_number);
```

**Day Numbers:** Each campaign has 4 messages (typically Day 1, 2, 4, 6 or 1, 3, 5, 7)

**Sequence Order:** 1, 2, 3, 4 (order in the drip sequence)

**Message Template:** Text with placeholders like {first_name}, {last_name}

**Example:**
- Campaign: "Ghosted" (tag: "Ghosted")
- Message 1: Day 1, "Hey {first_name}, just checking in. Are you still exploring vehicle options or did plans change?"
- Message 2: Day 2, "I've got a couple options that fit what you were originally looking for. Want me to send them over?"
- Message 3: Day 4, "If the right payment and the right vehicle came up, would you be open to taking another look?"
- Message 4: Day 6, "Before I close out your file, want me to keep sending options or pause it for now?"

---

### Table 7: `campaign_enrollments` (Lead Campaign Tracking)

```sql
CREATE TABLE campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_sent_at TIMESTAMPTZ,
  last_message_day INTEGER DEFAULT 0,
  last_response_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollments_lead ON campaign_enrollments(lead_id);
CREATE INDEX idx_enrollments_campaign ON campaign_enrollments(campaign_id);
CREATE INDEX idx_enrollments_status ON campaign_enrollments(status);
CREATE INDEX idx_enrollments_enrolled_at ON campaign_enrollments(enrolled_at);
CREATE INDEX idx_enrollments_last_sent ON campaign_enrollments(last_message_sent_at);
CREATE UNIQUE INDEX idx_enrollments_unique_active ON campaign_enrollments(lead_id, campaign_id)
  WHERE status IN ('active', 'paused');
```

**Statuses:** 'active', 'paused', 'completed', 'cancelled'

**Business Logic:**
- When lead is tagged → Create enrollment with status='active'
- When lead replies → Set last_response_at, status='completed', completed_at
- When reply detected → Auto-move lead to campaign's target_pipeline_stage_id

---

### Table 8: `pipeline_stages` (Sales Pipeline Stages)

```sql
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  order_position INTEGER NOT NULL UNIQUE,
  color VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_stages_order ON pipeline_stages(order_position);
```

**V1 Stages (Seed Data):**
1. New Contact (order: 1, is_default: true, color: '#3498DB')
2. Working Lead (order: 2, color: '#F39C12')
3. Needs A Call (order: 3, color: '#E74C3C')
4. I Accept (order: 4, color: '#00C851')

---

### Table 9: `dashboard_metrics` (Optional - Materialized View)

```sql
CREATE TABLE dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL UNIQUE,
  total_messages INTEGER DEFAULT 0,
  inbound_messages INTEGER DEFAULT 0,
  outbound_messages INTEGER DEFAULT 0,
  unread_texts INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metrics_date ON dashboard_metrics(metric_date);
```

**Note:** For V1, calculate metrics in real-time with queries. Add this table later for performance optimization.

---

## Database Triggers & Webhooks

### Trigger 1: Update `updated_at` timestamp (All Tables)

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for all tables with updated_at column
```

### Trigger 2: Webhook on `leads.tags` update → n8n

**Purpose:** When user adds a tag to a lead, trigger n8n to start campaign

**Setup in Supabase:**
- Database Webhooks → Create webhook
- Table: `leads`
- Events: `UPDATE`
- Filter: `OLD.tags != NEW.tags`
- Webhook URL: `https://your-n8n-instance.com/webhook/tag-changed`

**Payload sent to n8n:**
```json
{
  "type": "UPDATE",
  "table": "leads",
  "record": {
    "id": "uuid",
    "tags": ["Ghosted"],
    "phone_number": "+1234567890",
    "first_name": "John",
    "last_name": "Doe"
  },
  "old_record": {
    "tags": []
  }
}
```

**n8n workflow:**
1. Receive webhook
2. Find new tags: `NEW.tags - OLD.tags`
3. For each new tag:
   - Find campaign where `tag = new_tag`
   - Find first message (day_number = 1)
   - Send SMS via Twilio
   - Create campaign_enrollment record
   - Insert message record

### Trigger 3: Webhook on `messages` INSERT (inbound) → n8n

**Purpose:** When inbound SMS arrives, trigger n8n to:
1. Check if lead is in active campaign
2. If yes → Complete campaign + Move pipeline stage + Generate AI response
3. If no → Just generate AI response

**Setup in Supabase:**
- Database Webhooks → Create webhook
- Table: `messages`
- Events: `INSERT`
- Filter: `record.direction = 'inbound'`
- Webhook URL: `https://your-n8n-instance.com/webhook/inbound-message`

**n8n workflow:**
1. Receive inbound message webhook
2. Check if lead has active campaign enrollment
3. If active enrollment exists:
   - Update enrollment: status='completed', last_response_at=NOW()
   - Get campaign's target_pipeline_stage_id
   - Update lead's pipeline_stage_id
4. Generate AI response (using conversation context)
5. Send AI response via Twilio
6. Insert AI response into messages table (is_ai_generated=true)

---

## Row Level Security (RLS) Policies

### Users Table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Leads Table

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Users can read leads they own
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (owner_id = auth.uid());

-- Admins can read all leads
CREATE POLICY "Admins can view all leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own leads
CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (owner_id = auth.uid());

-- Users can insert leads
CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  WITH CHECK (true);
```

### Conversations & Messages Tables

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read conversations for their leads
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- Users can read messages in their conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN leads ON leads.id = conversations.lead_id
      WHERE conversations.id = messages.conversation_id
      AND leads.owner_id = auth.uid()
    )
  );

-- Users can insert messages (manual replies)
CREATE POLICY "Users can create messages"
  ON messages FOR INSERT
  WITH CHECK (true);
```

### Campaigns & Campaign Messages

```sql
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read campaigns
CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can read campaign messages
CREATE POLICY "Authenticated users can view campaign messages"
  ON campaign_messages FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete campaigns
CREATE POLICY "Admins can manage campaigns"
  ON campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Page Specifications

### Page 1: Dashboard (`/dashboard`)

**Route:** `/dashboard`

**Layout:**
- Top: 4 metric cards in a row (responsive: 2x2 on mobile)
- Bottom: Recent conversations list (last 10)

**Metric Cards:**
1. **Total Messages** (Today)
   - Icon: MessageSquare
   - Color: Blue (#3498DB)
   - Query: `COUNT(*) FROM messages WHERE DATE(created_at) = CURRENT_DATE`

2. **Unread Texts**
   - Icon: MessageCircle
   - Color: Orange (#F39C12)
   - Query: `SUM(unread_count) FROM conversations WHERE status = 'active'`

3. **Active Conversations**
   - Icon: Users
   - Color: Green (#00C851)
   - Query: `COUNT(*) FROM conversations WHERE status = 'active'`

4. **New Leads** (This Week)
   - Icon: UserPlus
   - Color: Red (#E74C3C)
   - Query: `COUNT(*) FROM leads WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)`

**Recent Conversations Section:**
- Card showing last 10 conversations
- Each row: Lead name, last message preview (30 chars), timestamp, unread badge
- Click → Navigate to `/conversations?id={conversation_id}`
- Real-time updates via Supabase subscription

**Supabase Queries:**
```typescript
// Fetch metrics
const { data: todayMessages } = await supabase
  .from('messages')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', new Date().toISOString().split('T')[0]);

const { data: conversations } = await supabase
  .from('conversations')
  .select('unread_count')
  .eq('status', 'active');

const unreadCount = conversations?.reduce((sum, c) => sum + c.unread_count, 0);

// Fetch recent conversations
const { data: recentConversations } = await supabase
  .from('conversations')
  .select(`
    id,
    last_message_at,
    unread_count,
    leads (
      id,
      first_name,
      last_name
    ),
    messages (
      content,
      created_at
    )
  `)
  .order('last_message_at', { ascending: false })
  .limit(10);
```

**Real-time Subscription:**
```typescript
supabase
  .channel('dashboard-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    () => queryClient.invalidateQueries(['dashboard-metrics'])
  )
  .subscribe();
```

---

### Page 2: Conversations (`/conversations`)

**Route:** `/conversations`

**Layout:** Split view (desktop) / Stacked (mobile)

**Left Sidebar (40% width):**
- Search bar at top
- List of conversations sorted by `last_message_at DESC`
- Each conversation card shows:
  - Lead name (first_name + last_name)
  - Last message preview (50 chars)
  - Timestamp (relative: "2m ago", "1h ago", "Yesterday")
  - Unread badge (if unread_count > 0)
  - Click → Load conversation in right panel

**Right Panel (60% width):**
- Header: Lead name, phone number, "View Lead Profile" link
- Message thread (scrollable, auto-scroll to bottom)
- Messages displayed as chat bubbles:
  - Inbound: Left-aligned, gray background
  - Outbound: Right-aligned, primary color background
  - AI-generated: Small "AI" badge
  - Timestamp below each message
- Reply box at bottom:
  - Textarea with character counter (160 max for SMS)
  - Send button (disabled if empty or > 160 chars)

**Supabase Queries:**
```typescript
// Fetch conversations list
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    id,
    last_message_at,
    unread_count,
    status,
    leads (
      id,
      first_name,
      last_name,
      phone_number
    )
  `)
  .eq('status', 'active')
  .order('last_message_at', { ascending: false });

// Fetch messages for selected conversation
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', selectedConversationId)
  .order('created_at', { ascending: true });

// Send manual reply
const { data: newMessage } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    direction: 'outbound',
    content: messageText,
    sender: twilioPhoneNumber,
    recipient: leadPhoneNumber,
    status: 'sent',
    is_ai_generated: false
  })
  .select()
  .single();

// Update conversation unread count to 0 when opened
await supabase
  .from('conversations')
  .update({ unread_count: 0 })
  .eq('id', conversationId);
```

**Real-time Subscription:**
```typescript
// Subscribe to new messages
supabase
  .channel(`conversation-${conversationId}`)
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      // Add new message to thread
      setMessages(prev => [...prev, payload.new]);
      // Scroll to bottom
      scrollToBottom();
    }
  )
  .subscribe();
```

**Features:**
- Search conversations by lead name
- Mark as read/unread
- Auto-scroll to latest message
- Character counter for SMS (160 limit)
- Disable send if over limit

---

### Page 3: Sales Pipeline (`/pipeline`)

**Route:** `/pipeline`

**Layout:** Horizontal Kanban board with 4 columns

**Columns (from left to right):**
1. New Contact (default stage)
2. Working Lead
3. Needs A Call
4. I Accept

**Lead Cards:**
- Lead name (first_name + last_name)
- Phone number
- Tags displayed as badges (colored pills)
- Click → Open lead detail modal

**Drag & Drop:**
- Use @dnd-kit/core for dragging leads between stages
- On drop → Update `leads.pipeline_stage_id` in database
- Optimistic update for instant UI feedback

**Lead Detail Modal:**
- Lead information (name, phone, email, source)
- Notes textarea (editable)
- Tags management:
  - Display current tags as removable badges
  - "Add Tag" button → Dropdown with campaign tags
  - Add tag → Triggers campaign enrollment
- Conversation history link
- Save button

**Supabase Queries:**
```typescript
// Fetch pipeline stages
const { data: stages } = await supabase
  .from('pipeline_stages')
  .select('*')
  .order('order_position', { ascending: true });

// Fetch leads grouped by stage
const { data: leads } = await supabase
  .from('leads')
  .select(`
    id,
    first_name,
    last_name,
    phone_number,
    email,
    tags,
    notes,
    pipeline_stage_id,
    pipeline_stages (
      id,
      name,
      color
    )
  `)
  .order('created_at', { ascending: false });

// Update lead stage on drag & drop
await supabase
  .from('leads')
  .update({ pipeline_stage_id: newStageId })
  .eq('id', leadId);

// Add tag to lead (triggers campaign)
const { data } = await supabase
  .from('leads')
  .update({
    tags: [...existingTags, newTag]
  })
  .eq('id', leadId)
  .select()
  .single();
```

**Tag Management:**
- Show all available campaign tags in dropdown
- When tag added → Database webhook triggers n8n → Campaign starts
- Show tag with colored badge (different color per tag)
- Remove tag → Remove from array (doesn't affect active campaigns)

**Responsive Design:**
- Desktop: 4 columns side-by-side
- Tablet: 2x2 grid
- Mobile: Vertical stack with tabs to switch stages

---

### Page 4: SMS Analytics (`/analytics`)

**Route:** `/analytics`

**Layout:**

**Top Section:**
- Date range picker (Last 7 days, Last 30 days, Custom range)
- 4 metric cards in row

**Metric Cards:**
1. **Total Messages Sent**
   - Count of all outbound messages in date range
   - Icon: Send

2. **Total Messages Received**
   - Count of all inbound messages in date range
   - Icon: MessageCircle

3. **Response Rate**
   - (Inbound / Outbound) * 100
   - Icon: TrendingUp

4. **Active Campaigns**
   - Count of campaign_enrollments where status='active'
   - Icon: Zap

**Charts Section:**

**Chart 1: Message Volume (Line Chart)**
- X-axis: Dates in selected range
- Y-axis: Message count
- Two lines: Inbound (blue), Outbound (orange)
- Use recharts library

**Chart 2: Conversations by Status (Pie Chart)**
- Active vs Closed vs Archived
- Show percentages

**Table Section:**
- Recent message activity (last 50 messages)
- Columns: Timestamp, Lead Name, Direction, Content Preview, Status

**Supabase Queries:**
```typescript
// Fetch message stats for date range
const { data: messages } = await supabase
  .from('messages')
  .select('direction, created_at')
  .gte('created_at', startDate)
  .lte('created_at', endDate);

const inboundCount = messages.filter(m => m.direction === 'inbound').length;
const outboundCount = messages.filter(m => m.direction === 'outbound').length;
const responseRate = ((inboundCount / outboundCount) * 100).toFixed(1);

// Fetch active campaigns count
const { count: activeCampaigns } = await supabase
  .from('campaign_enrollments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active');

// Fetch message volume by day
const { data: dailyVolume } = await supabase
  .rpc('get_daily_message_volume', {
    start_date: startDate,
    end_date: endDate
  });

// Fetch conversations by status
const { data: conversationStats } = await supabase
  .from('conversations')
  .select('status');

const statsByStatus = conversationStats.reduce((acc, c) => {
  acc[c.status] = (acc[c.status] || 0) + 1;
  return acc;
}, {});
```

**PostgreSQL Function for Daily Volume:**
```sql
CREATE OR REPLACE FUNCTION get_daily_message_volume(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE(date DATE, inbound_count BIGINT, outbound_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_count,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_count
  FROM messages
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at);
END;
$$ LANGUAGE plpgsql;
```

---

### Page 5: Tag Templates (`/tag-templates`)

**Route:** `/tag-templates`

**Layout:**

**Header:**
- Title: "Tag Templates"
- "Add New Tag" button (primary CTA)

**Template Grid:**
- Grid of template cards (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each card shows:
  - Tag name (e.g., "Ghosted / No Response")
  - Tag badge (e.g., "Ghosted")
  - 4 message previews with day labels:
    - "Day 1: Hey, just checking in..."
    - "Day 2: I've got a couple options..."
    - "Day 4: If the right payment..."
    - "Day 6: Before I close out your file..."
  - Edit button (only for custom tags, not predefined)
  - Delete button (only for custom tags)

**Predefined Tags (14 total, cannot edit/delete):**
1. Ghosted / No Response (tag: "Ghosted")
2. Payment Too High (tag: "PaymentTooHigh")
3. Credit Declined Previously (tag: "CreditDeclined")
4. Waiting / Timing Not Right (tag: "Waiting")
5. Couldn't Find the Right Vehicle (tag: "NoRightVehicle")
6. Needed More Info / Confusion About Terms (tag: "NeededMoreInfo")
7. Process Took Too Long (tag: "ProcessTooLong")
8. Bought Elsewhere (tag: "BoughtElsewhere")
9. Wanted to Improve Credit First (tag: "ImproveCreditFirst")
10. Negative Equity / Trade-In Issue (tag: "NegativeEquity")
11. Needed a Cosigner (tag: "NeededCosigner")
12. Didn't Like the Approved Vehicle (tag: "DislikedVehicle")
13. Rate Too High (tag: "RateTooHigh")
14. Missing Documents (tag: "MissingDocuments")

**Create/Edit Tag Modal (Two-Step Wizard):**

**Step 1: Message Count Selection**
- Title: "How many messages in this sequence?"
- Radio buttons: 2, 3, 4, 5, 6 messages
- Default: 4 messages
- Next button

**Step 2: Message Editor**
- Tag name input (required)
- Tag identifier input (auto-generated from name, editable)
- Target pipeline stage dropdown (which stage to move lead to on reply)
- For each message:
  - Day number input (e.g., 1, 2, 4, 6)
  - Message textarea with:
    - Character counter (160 limit)
    - Placeholder helper buttons: {first_name}, {last_name}
    - Real-time preview showing "John Doe" replacements
- Save button (creates campaign + campaign_messages)

**Supabase Queries:**
```typescript
// Fetch all campaigns with messages
const { data: campaigns } = await supabase
  .from('campaigns')
  .select(`
    id,
    tag,
    name,
    description,
    is_predefined,
    is_active,
    target_pipeline_stage_id,
    campaign_messages (
      id,
      day_number,
      sequence_order,
      message_template
    )
  `)
  .eq('is_active', true)
  .order('is_predefined', { ascending: false }); // Predefined first

// Create new custom tag template
const { data: campaign } = await supabase
  .from('campaigns')
  .insert({
    tag: tagIdentifier,
    name: tagName,
    is_predefined: false,
    is_active: true,
    target_pipeline_stage_id: selectedStageId,
    created_by: userId
  })
  .select()
  .single();

// Insert campaign messages
const messages = messageArray.map((msg, index) => ({
  campaign_id: campaign.id,
  day_number: msg.dayNumber,
  sequence_order: index + 1,
  message_template: msg.content
}));

await supabase
  .from('campaign_messages')
  .insert(messages);

// Delete custom tag (only if not predefined)
await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId)
  .eq('is_predefined', false); // Safety check
```

**Validation:**
- Tag identifier must be unique
- Tag name required
- Each message must be ≤ 160 characters
- Day numbers must be unique and positive
- Target pipeline stage required

**Placeholder Replacement:**
```typescript
const replacePlaceholders = (template: string, lead: Lead) => {
  return template
    .replace(/{first_name}/g, lead.first_name)
    .replace(/{last_name}/g, lead.last_name);
};
```

---

## Navigation & Layout

### Main Layout Component

**Header/Navbar:**
- Logo/Brand: "Automotive AI CRM" (left)
- Navigation links (center):
  - Dashboard
  - Conversations
  - Pipeline
  - Analytics
  - Tag Templates
- User menu (right):
  - User avatar/name
  - Dropdown: Profile, Settings, Logout

**Sidebar (Optional Alternative):**
- Collapsible sidebar on left
- Navigation items with icons
- Active state highlighting

**Responsive:**
- Desktop: Horizontal navbar
- Mobile: Hamburger menu → Slide-out drawer

**Protected Routes:**
```typescript
const ProtectedRoute = ({ children }) => {
  const { session } = useSession();

  if (!session) {
    return <Navigate to="/login" />;
  }

  return children;
};
```

---

## Authentication Pages

### Login Page (`/login`)

**Layout:**
- Centered card (max-width: 400px)
- Logo at top
- Email input
- Password input
- "Remember me" checkbox
- "Sign In" button (primary color)
- "Forgot password?" link
- "Don't have an account? Sign up" link

**Supabase Auth:**
```typescript
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  navigate('/dashboard');
};
```

### Register Page (`/register`)

**Layout:**
- Similar to login
- Fields: Full Name, Email, Password, Confirm Password
- "Create Account" button
- "Already have an account? Sign in" link

**Supabase Auth:**
```typescript
const handleRegister = async (fullName: string, email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  // Create user profile in users table
  await supabase.from('users').insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role: 'user'
  });

  toast.success('Account created! Please check your email to verify.');
};
```

---

## Key Features & User Flows

### Flow 1: Tag a Lead to Trigger Campaign

1. User opens Sales Pipeline page
2. Clicks on a lead card
3. Lead detail modal opens
4. User clicks "Add Tag" button
5. Dropdown shows all available campaign tags
6. User selects "Ghosted"
7. Tag added to lead's tags array
8. Database webhook fires → n8n receives notification
9. n8n finds "Ghosted" campaign
10. n8n sends Day 1 SMS via Twilio
11. n8n creates campaign_enrollment record
12. n8n inserts message into messages table
13. UI shows new tag badge on lead card
14. User sees confirmation toast: "Campaign started for John Doe"

### Flow 2: View and Reply to Conversation

1. User opens Conversations page
2. List shows all conversations sorted by recent activity
3. Unread conversations have badge showing unread count
4. User clicks on a conversation
5. Right panel loads message thread (sorted by created_at ASC)
6. Auto-scrolls to latest message
7. Unread count resets to 0
8. User types reply in textarea
9. Character counter updates (shows "45/160")
10. User clicks Send
11. Message inserted into database
12. Twilio API called to send SMS (via n8n webhook)
13. Message appears in thread instantly (optimistic update)
14. Real-time subscription updates other users viewing same conversation

### Flow 3: Lead Replies to Campaign (Auto-Pipeline Move)

1. Lead sends SMS reply
2. Twilio receives SMS → Sends webhook to n8n
3. n8n inserts message into database (direction: 'inbound')
4. Database webhook fires to n8n reply handler
5. n8n checks if lead has active campaign enrollment
6. If yes:
   - n8n updates enrollment: status='completed', last_response_at=NOW()
   - n8n gets campaign's target_pipeline_stage_id
   - n8n updates lead's pipeline_stage_id to target stage
7. n8n generates AI response using conversation context
8. n8n sends AI response via Twilio
9. n8n inserts AI response into messages (is_ai_generated=true)
10. Frontend real-time subscription updates:
    - Conversation thread shows new messages
    - Pipeline board shows lead moved to new stage
    - Notification shows "John Doe moved to Needs A Call"

### Flow 4: Create Custom Tag Template

1. User opens Tag Templates page
2. Clicks "Add New Tag" button
3. Modal opens with two-step wizard
4. **Step 1:** User selects message count (e.g., 4 messages)
5. Clicks Next
6. **Step 2:** User fills in:
   - Tag name: "Follow Up - Test Drive"
   - Tag identifier: "TestDriveFollowUp" (auto-generated)
   - Target pipeline stage: "Working Lead"
   - Message 1 (Day 1): "Hi {first_name}, thanks for test driving with us! How did you like the vehicle?" (120 chars)
   - Message 2 (Day 3): "Just checking in! Any questions about the {vehicle_model}?" (95 chars)
   - Message 3 (Day 5): "We have special financing available this week. Want to discuss numbers?" (110 chars)
   - Message 4 (Day 7): "Before we close your file, is there anything we can do to earn your business?" (145 chars)
7. User clicks placeholder helper buttons to insert {first_name}, {last_name}
8. Character counter shows real-time count for each message
9. User clicks Save
10. Campaign and campaign_messages records created in database
11. New tag appears in tag template grid
12. User sees success toast: "Tag template created successfully"
13. New tag now available in lead tagging dropdown

### Flow 5: View Analytics

1. User opens Analytics page
2. Default shows "Last 7 days" data
3. Metric cards display:
   - Total Sent: 234
   - Total Received: 156
   - Response Rate: 66.7%
   - Active Campaigns: 18
4. Line chart shows daily message volume (inbound vs outbound)
5. Pie chart shows conversation distribution (75% active, 20% closed, 5% archived)
6. User changes date range to "Last 30 days"
7. All metrics and charts update via API queries
8. Recent messages table shows last 50 messages with filters

---

## Component Architecture

### Shared Components

**MetricCard.tsx**
```typescript
interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
}
```

**MessageBubble.tsx**
```typescript
interface MessageBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  isAiGenerated: boolean;
}
```

**LeadCard.tsx**
```typescript
interface LeadCardProps {
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    tags: string[];
  };
  onClick: () => void;
  draggable?: boolean;
}
```

**TagBadge.tsx**
```typescript
interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  color?: string;
}
```

**CharacterCounter.tsx**
```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
  showWarning?: boolean; // Show warning at 90%
}
```

**ConversationListItem.tsx**
```typescript
interface ConversationListItemProps {
  conversation: {
    id: string;
    lead: {
      first_name: string;
      last_name: string;
    };
    last_message_at: string;
    unread_count: number;
  };
  isActive: boolean;
  onClick: () => void;
}
```

### Feature Components

**Dashboard/DashboardMetrics.tsx**
- Fetches and displays 4 metric cards
- Uses React Query for caching
- Real-time updates via Supabase subscription

**Dashboard/RecentConversations.tsx**
- Displays last 10 conversations
- Click handler to navigate to conversation detail
- Loading skeleton while fetching

**Conversations/ConversationList.tsx**
- Sidebar with search and conversation list
- Virtual scrolling for performance (if many conversations)
- Real-time updates

**Conversations/MessageThread.tsx**
- Scrollable message list
- Auto-scroll to bottom on new message
- Message grouping by date

**Conversations/ReplyBox.tsx**
- Textarea with auto-resize
- Character counter
- Send button with loading state
- Enter to send (Shift+Enter for new line)

**Pipeline/KanbanBoard.tsx**
- 4 columns (pipeline stages)
- Drag and drop using @dnd-kit/core
- Optimistic updates

**Pipeline/LeadDetailModal.tsx**
- Lead information form
- Tag management
- Notes editor
- Save/Cancel buttons

**Analytics/MessageVolumeChart.tsx**
- Line chart using recharts
- Responsive sizing
- Tooltip with detailed info

**Analytics/DateRangePicker.tsx**
- Preset ranges (7 days, 30 days, custom)
- Calendar picker for custom range
- Apply button

**TagTemplates/TemplateGrid.tsx**
- Responsive grid layout
- Template cards with preview
- Filter: All, Predefined, Custom

**TagTemplates/CreateTagWizard.tsx**
- Two-step modal
- Step 1: Message count selector
- Step 2: Tag editor with message inputs
- Navigation: Back, Next, Save

**TagTemplates/MessageEditor.tsx**
- Day number input
- Message textarea
- Character counter
- Placeholder helper buttons
- Preview section

---

## State Management with React Query

### Query Keys Structure
```typescript
export const queryKeys = {
  dashboard: {
    metrics: ['dashboard', 'metrics'] as const,
    recentConversations: ['dashboard', 'recent-conversations'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    detail: (id: string) => ['conversations', id] as const,
    messages: (id: string) => ['conversations', id, 'messages'] as const,
  },
  leads: {
    all: ['leads'] as const,
    detail: (id: string) => ['leads', id] as const,
    byStage: (stageId: string) => ['leads', 'stage', stageId] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    detail: (id: string) => ['campaigns', id] as const,
    messages: (id: string) => ['campaigns', id, 'messages'] as const,
  },
  analytics: {
    metrics: (startDate: string, endDate: string) =>
      ['analytics', 'metrics', startDate, endDate] as const,
    volume: (startDate: string, endDate: string) =>
      ['analytics', 'volume', startDate, endDate] as const,
  },
  stages: ['pipeline-stages'] as const,
};
```

### Custom Hooks Examples

**useConversations.ts**
```typescript
export const useConversations = () => {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          unread_count,
          status,
          leads (
            id,
            first_name,
            last_name,
            phone_number
          )
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

**useMessages.ts**
```typescript
export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            queryKeys.conversations.messages(conversationId),
            (old: any[]) => [...old, payload.new]
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, queryClient]);

  return query;
};
```

**useSendMessage.ts**
```typescript
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      sender,
      recipient
    }: {
      conversationId: string;
      content: string;
      sender: string;
      recipient: string;
    }) => {
      // Insert message into database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          content,
          sender,
          recipient,
          status: 'sent',
          is_ai_generated: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Call n8n webhook to send via Twilio
      await fetch('https://your-n8n-instance.com/webhook/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          from: sender,
          body: content,
          messageId: data.id,
        }),
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.conversations.messages(variables.conversationId),
        (old: any[]) => [...(old || []), data]
      );

      // Update conversation last_message_at
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      toast.success('Message sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send message');
      console.error(error);
    },
  });
};
```

**useUpdateLeadStage.ts**
```typescript
export const useUpdateLeadStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      stageId
    }: {
      leadId: string;
      stageId: string;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ pipeline_stage_id: stageId })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ leadId, stageId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.all });

      const previousLeads = queryClient.getQueryData(queryKeys.leads.all);

      queryClient.setQueryData(queryKeys.leads.all, (old: any[]) =>
        old.map(lead =>
          lead.id === leadId
            ? { ...lead, pipeline_stage_id: stageId }
            : lead
        )
      );

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.leads.all, context?.previousLeads);
      toast.error('Failed to update pipeline stage');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      toast.success('Lead moved successfully');
    },
  });
};
```

---

## Form Validation with Zod

**Lead Form Schema**
```typescript
import { z } from 'zod';

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional(),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be valid E.164 format (+1234567890)'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  lead_source: z.enum(['Incoming Call', 'Contact Form', 'Referral', 'Manual Entry']).optional(),
  notes: z.string().max(1000).optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
```

**Tag Template Form Schema**
```typescript
export const campaignMessageSchema = z.object({
  day_number: z.number().min(1, 'Day must be positive'),
  message_template: z
    .string()
    .min(1, 'Message is required')
    .max(160, 'SMS messages must be 160 characters or less'),
});

export const tagTemplateSchema = z.object({
  tag: z
    .string()
    .min(1, 'Tag identifier is required')
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Tag name is required').max(255),
  description: z.string().max(500).optional(),
  target_pipeline_stage_id: z.string().uuid('Select a pipeline stage'),
  messages: z
    .array(campaignMessageSchema)
    .min(2, 'At least 2 messages required')
    .max(6, 'Maximum 6 messages allowed'),
});

export type TagTemplateFormData = z.infer<typeof tagTemplateSchema>;
```

**React Hook Form Usage**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const CreateTagForm = () => {
  const form = useForm<TagTemplateFormData>({
    resolver: zodResolver(tagTemplateSchema),
    defaultValues: {
      tag: '',
      name: '',
      description: '',
      target_pipeline_stage_id: '',
      messages: [
        { day_number: 1, message_template: '' },
        { day_number: 2, message_template: '' },
        { day_number: 4, message_template: '' },
        { day_number: 6, message_template: '' },
      ],
    },
  });

  const onSubmit = async (data: TagTemplateFormData) => {
    // Create campaign and messages
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

---

## Environment Variables

Create `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Twilio
VITE_TWILIO_PHONE_NUMBER=+1234567890

# n8n Webhooks
VITE_N8N_TAG_WEBHOOK_URL=https://your-n8n.com/webhook/tag-changed
VITE_N8N_SEND_SMS_WEBHOOK_URL=https://your-n8n.com/webhook/send-sms
VITE_N8N_INBOUND_MESSAGE_WEBHOOK_URL=https://your-n8n.com/webhook/inbound-message

# App Config
VITE_APP_NAME=Automotive AI CRM
```

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   ├── shared/                # Shared components
│   │   ├── MetricCard.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── LeadCard.tsx
│   │   ├── TagBadge.tsx
│   │   ├── CharacterCounter.tsx
│   │   ├── ConversationListItem.tsx
│   │   └── LoadingSkeleton.tsx
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/
│   │   ├── DashboardMetrics.tsx
│   │   └── RecentConversations.tsx
│   ├── conversations/
│   │   ├── ConversationList.tsx
│   │   ├── MessageThread.tsx
│   │   └── ReplyBox.tsx
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── LeadDetailModal.tsx
│   ├── analytics/
│   │   ├── MessageVolumeChart.tsx
│   │   ├── ConversationStatsChart.tsx
│   │   └── DateRangePicker.tsx
│   └── tag-templates/
│       ├── TemplateGrid.tsx
│       ├── TemplateCard.tsx
│       ├── CreateTagWizard.tsx
│       └── MessageEditor.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Conversations.tsx
│   ├── Pipeline.tsx
│   ├── Analytics.tsx
│   ├── TagTemplates.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── hooks/
│   ├── useConversations.ts
│   ├── useMessages.ts
│   ├── useSendMessage.ts
│   ├── useLeads.ts
│   ├── useUpdateLeadStage.ts
│   ├── useCampaigns.ts
│   ├── usePipelineStages.ts
│   └── useAnalytics.ts
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── queryClient.ts        # React Query client config
│   └── utils.ts              # Utility functions
├── types/
│   ├── database.types.ts     # Generated Supabase types
│   ├── lead.types.ts
│   ├── conversation.types.ts
│   ├── campaign.types.ts
│   └── message.types.ts
├── schemas/
│   ├── lead.schema.ts        # Zod schemas
│   ├── campaign.schema.ts
│   └── message.schema.ts
├── App.tsx
├── main.tsx
└── routes.tsx
```

---

## Routing Configuration

**routes.tsx**
```typescript
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Pipeline from './pages/Pipeline';
import Analytics from './pages/Analytics';
import TagTemplates from './pages/TagTemplates';
import Login from './pages/Login';
import Register from './pages/Register';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'conversations',
        element: <Conversations />,
      },
      {
        path: 'pipeline',
        element: <Pipeline />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'tag-templates',
        element: <TagTemplates />,
      },
    ],
  },
]);
```

---

## Twilio Integration (via n8n)

### Inbound SMS Webhook (Twilio → n8n)

**Twilio Configuration:**
- Configure webhook URL: `https://your-n8n.com/webhook/twilio-inbound`
- Method: POST
- When: A message comes in

**n8n Workflow: Receive Inbound SMS**
1. Webhook trigger receives Twilio payload
2. Extract: From (lead phone), To (your number), Body (message text), MessageSid
3. Find or create lead by phone number
4. Find or create conversation for lead
5. Insert message into database:
   - conversation_id
   - direction: 'inbound'
   - content: Body
   - sender: From
   - recipient: To
   - twilio_sid: MessageSid
6. Database webhook fires to reply handler (see next workflow)

### Reply Handler Workflow (Database Webhook → n8n)

**Triggered by:** messages table INSERT where direction='inbound'

**n8n Workflow Steps:**
1. Receive webhook with new message data
2. Query: Check if lead has active campaign enrollment
   ```sql
   SELECT
     ce.id, ce.campaign_id, ce.lead_id,
     c.target_pipeline_stage_id,
     l.pipeline_stage_id
   FROM messages m
   JOIN conversations conv ON m.conversation_id = conv.id
   JOIN leads l ON conv.lead_id = l.id
   LEFT JOIN campaign_enrollments ce ON ce.lead_id = l.id
   LEFT JOIN campaigns c ON ce.campaign_id = c.id
   WHERE
     m.id = {{webhook.message_id}}
     AND ce.status = 'active'
     AND ce.last_response_at IS NULL;
   ```
3. **If active enrollment found:**
   - Update enrollment: `status='completed', last_response_at=NOW(), completed_at=NOW()`
   - Update lead: `pipeline_stage_id = target_pipeline_stage_id`
4. Generate AI response:
   - Fetch last 10 messages from conversation
   - Call AI model with context (handled in n8n, not frontend)
   - Get response text
5. Send AI response via Twilio
6. Insert AI response into messages table:
   - direction: 'outbound'
   - is_ai_generated: true
   - content: AI response
   - twilio_sid: response from Twilio

### Send SMS Workflow (Frontend → n8n → Twilio)

**Triggered by:** Frontend calls webhook when user sends manual reply

**n8n Workflow Steps:**
1. Webhook receives: to, from, body, messageId
2. Call Twilio API:
   ```javascript
   POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
   From: {{from}}
   To: {{to}}
   Body: {{body}}
   ```
3. Update message record with twilio_sid from response
4. Return success to frontend

### Daily Campaign Scheduler (n8n Cron Job)

**Schedule:** Every day at 9:00 AM

**n8n Workflow Steps:**
1. Query enrollments ready for next message:
   ```sql
   SELECT
     ce.id, ce.lead_id, ce.campaign_id,
     ce.last_message_day, ce.enrolled_at,
     l.first_name, l.last_name, l.phone_number,
     cm.day_number, cm.message_template
   FROM campaign_enrollments ce
   JOIN leads l ON ce.lead_id = l.id
   JOIN campaigns c ON ce.campaign_id = c.id
   JOIN campaign_messages cm ON cm.campaign_id = c.id
   WHERE
     ce.status = 'active'
     AND ce.last_response_at IS NULL
     AND EXTRACT(DAY FROM NOW() - ce.enrolled_at) >= cm.day_number
     AND ce.last_message_day < cm.day_number
   ORDER BY ce.enrolled_at ASC;
   ```
2. For each enrollment:
   - Replace placeholders in message_template
   - Send SMS via Twilio
   - Insert message into database
   - Update enrollment: last_message_sent_at=NOW(), last_message_day=day_number

---

## Error Handling & Loading States

### Error Boundary Component
```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Loading Skeletons

**ConversationListSkeleton.tsx**
```typescript
export const ConversationListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center space-x-4 p-4 border rounded">
          <div className="w-12 h-12 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
```

**Usage in Component:**
```typescript
const Conversations = () => {
  const { data: conversations, isLoading, error } = useConversations();

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">Failed to load conversations</p>
        <button onClick={() => queryClient.invalidateQueries()}>
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  return (
    <div>
      {conversations.map(conv => (
        <ConversationListItem key={conv.id} conversation={conv} />
      ))}
    </div>
  );
};
```

---

## Performance Optimizations

### 1. Code Splitting (Lazy Loading)
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TagTemplates = lazy(() => import('./pages/TagTemplates'));

// In routes
<Suspense fallback={<PageLoadingSkeleton />}>
  <Dashboard />
</Suspense>
```

### 2. Memoization
```typescript
import { memo, useMemo } from 'react';

export const LeadCard = memo(({ lead, onClick }: LeadCardProps) => {
  const displayName = useMemo(
    () => `${lead.first_name} ${lead.last_name}`,
    [lead.first_name, lead.last_name]
  );

  return (
    <div onClick={onClick}>
      <h3>{displayName}</h3>
      {/* ... */}
    </div>
  );
});
```

### 3. Debounced Search
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const ConversationList = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const filteredConversations = useMemo(() => {
    if (!debouncedSearch) return conversations;
    return conversations.filter(c =>
      `${c.lead.first_name} ${c.lead.last_name}`
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase())
    );
  }, [conversations, debouncedSearch]);

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search conversations..."
      />
      {/* Render filteredConversations */}
    </>
  );
};
```

### 4. Virtual Scrolling (Optional for large lists)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const ConversationList = ({ conversations }: Props) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ConversationListItem
              conversation={conversations[virtualRow.index]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Testing Checklist

### Functional Tests

- [ ] User can login with email/password
- [ ] Dashboard displays correct metrics
- [ ] Conversations list loads and displays all active conversations
- [ ] Clicking conversation loads message thread
- [ ] User can send manual reply (appears in thread, character counter works)
- [ ] Inbound messages appear in real-time
- [ ] Pipeline board displays leads in correct columns
- [ ] Dragging lead updates stage in database
- [ ] Adding tag to lead starts campaign (check n8n logs)
- [ ] Tag Templates page shows 14 predefined + custom templates
- [ ] User can create custom tag template (2-step wizard works)
- [ ] Character counter shows warning at 144/160 characters
- [ ] Placeholder helpers {first_name}, {last_name} insert correctly
- [ ] Analytics page shows correct metrics for date range
- [ ] Charts render correctly and update on date change

### Edge Cases

- [ ] Empty states (no conversations, no leads, no campaigns)
- [ ] Long names/messages truncate properly
- [ ] Phone numbers validate E.164 format
- [ ] Duplicate tags prevented
- [ ] Campaign can't be deleted if enrollments exist
- [ ] User can't edit predefined campaigns
- [ ] Message > 160 chars shows error and disables send

### Responsive Design

- [ ] All pages work on mobile (320px width)
- [ ] Navbar collapses to hamburger menu
- [ ] Pipeline board stacks vertically on mobile
- [ ] Conversations split view becomes full-screen message thread
- [ ] Tag templates grid adjusts columns (3 → 2 → 1)

### Performance

- [ ] Initial page load < 3 seconds
- [ ] Message thread scrolls smoothly (100+ messages)
- [ ] No layout shifts during loading
- [ ] Real-time updates don't cause UI flicker

---

## Deployment Checklist

### Supabase Setup

1. Create Supabase project
2. Run SQL migrations for all 10 tables
3. Create database triggers (updated_at)
4. Configure database webhooks (leads.tags, messages)
5. Set up RLS policies for all tables
6. Seed predefined data:
   - 4 pipeline stages
   - 14 campaigns
   - 56 campaign messages
7. Generate TypeScript types: `npx supabase gen types typescript`

### n8n Setup

1. Create 4 workflows:
   - Tag Changed Handler
   - Inbound Message Handler (with AI response logic)
   - Send SMS via Twilio
   - Daily Campaign Scheduler (cron)
2. Configure Twilio credentials in n8n
3. Configure Supabase credentials in n8n
4. Configure AI model API (OpenAI, Claude, etc.) in n8n
5. Test each workflow with sample data
6. Set up error notifications (email/Slack)

### Twilio Setup

1. Purchase Twilio phone number
2. Configure inbound SMS webhook to n8n
3. Test sending/receiving SMS

### Frontend Deployment

1. Build: `npm run build`
2. Deploy to Vercel/Netlify/etc.
3. Configure environment variables
4. Test production build
5. Set up custom domain (optional)

---

## Seed Data SQL

**Run this after creating all tables:**

```sql
-- Insert pipeline stages
INSERT INTO pipeline_stages (name, order_position, color, is_default) VALUES
  ('New Contact', 1, '#3498DB', true),
  ('Working Lead', 2, '#F39C12', false),
  ('Needs A Call', 3, '#E74C3C', false),
  ('I Accept', 4, '#00C851', false);

-- Insert 14 predefined campaigns
INSERT INTO campaigns (tag, name, is_predefined, is_active, target_pipeline_stage_id) VALUES
  ('Ghosted', 'Ghosted / No Response', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Needs A Call')),
  ('PaymentTooHigh', 'Payment Too High', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('CreditDeclined', 'Credit Declined Previously', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('Waiting', 'Waiting / Timing Not Right', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('NoRightVehicle', 'Couldn''t Find the Right Vehicle', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('NeededMoreInfo', 'Needed More Info / Confusion About Terms', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('ProcessTooLong', 'Process Took Too Long', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('BoughtElsewhere', 'Bought Elsewhere', true, true, (SELECT id FROM pipeline_stages WHERE name = 'I Accept')),
  ('ImproveCreditFirst', 'Wanted to Improve Credit First', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('NegativeEquity', 'Negative Equity / Trade-In Issue', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('NeededCosigner', 'Needed a Cosigner', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('DislikedVehicle', 'Didn''t Like the Approved Vehicle', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('RateTooHigh', 'Rate Too High', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead')),
  ('MissingDocuments', 'Missing Documents', true, true, (SELECT id FROM pipeline_stages WHERE name = 'Working Lead'));

-- Insert campaign messages for "Ghosted" campaign
INSERT INTO campaign_messages (campaign_id, day_number, sequence_order, message_template) VALUES
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 1, 1, 'Hey, just checking in. Are you still exploring vehicle options or did plans change?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 2, 2, 'I''ve got a couple options that fit what you were originally looking for. Want me to send them over?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 4, 3, 'If the right payment and the right vehicle came up, would you be open to taking another look?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 6, 4, 'Before I close out your file, want me to keep sending options or pause it for now?');

-- Insert campaign messages for "PaymentTooHigh" campaign
INSERT INTO campaign_messages (campaign_id, day_number, sequence_order, message_template) VALUES
  ((SELECT id FROM campaigns WHERE tag = 'PaymentTooHigh'), 1, 1, 'Good timing. Some payments on the vehicles you liked have come down. Want updated numbers?'),
  ((SELECT id FROM campaigns WHERE tag = 'PaymentTooHigh'), 2, 2, 'I can structure things differently now. Sometimes a small adjustment solves the payment issue. Want me to show you?'),
  ((SELECT id FROM campaigns WHERE tag = 'PaymentTooHigh'), 4, 3, 'If I could get you closer to your ideal monthly payment, would you want to reopen the conversation?'),
  ((SELECT id FROM campaigns WHERE tag = 'PaymentTooHigh'), 6, 4, 'I don''t want you to miss a lower payment if it''s available. Should I run a new quote for you?');

-- ... (Continue for all 14 campaigns with their 4 messages each)
-- Total: 56 message inserts

-- Note: Complete SQL with all 56 messages available in campaigns.md file
```

---

## Notes & Best Practices

### Phone Number Formatting
Always store phone numbers in E.164 format: `+[country code][number]`
- Example: +1234567890
- Validate on input with regex: `/^\+?[1-9]\d{1,14}$/`

### SMS Character Limit
- Standard SMS: 160 characters
- Show warning at 144 characters (90%)
- Disable send button if > 160

### Message Placeholder Replacement
- Supported placeholders: {first_name}, {last_name}
- Replace at send time, not storage time
- Handle missing values gracefully (use empty string or "there")

### Campaign Enrollment Logic
- Only one active enrollment per lead per campaign
- When lead replies → Complete campaign, don't cancel
- Don't send remaining messages after completion

### Pipeline Auto-Movement
- Only move pipeline if lead has active campaign
- Use campaign's `target_pipeline_stage_id`
- Update happens via n8n, not frontend

### Real-time Updates
- Use Supabase subscriptions for live data
- Subscribe only to relevant data (conversation being viewed)
- Unsubscribe when component unmounts
- Use React Query cache updates for optimistic UI

### Error Handling
- Show toast notifications for all user actions
- Display friendly error messages (not technical errors)
- Provide retry mechanisms for failed operations
- Log errors to console for debugging

### Security
- Never expose Twilio credentials in frontend
- All SMS sending goes through n8n
- Use RLS policies for data access control
- Validate all user inputs (phone, email, message content)

---

## Future Enhancements (Post-V1)

**Not included in V1, but planned for future:**

1. CSV Bulk Upload for leads
2. Campaign Management UI (edit predefined campaigns)
3. Call analytics and recording
4. Multi-channel support (Discord, Facebook, Email)
5. Advanced analytics (funnel conversion, revenue tracking)
6. Team collaboration (notes, @mentions, assignments)
7. Automation rules (if/then workflows)
8. Custom fields for leads
9. Email integration
10. Mobile app (React Native)

---

## Summary

This specification covers:
- ✅ Complete tech stack (React, Supabase, Twilio, n8n)
- ✅ Full database schema (10 tables with relationships)
- ✅ All 5 pages with detailed layouts and queries
- ✅ Design system (Consumer Genius colors, typography, spacing)
- ✅ Authentication and authorization (RLS policies)
- ✅ Real-time updates (Supabase subscriptions)
- ✅ Campaign automation workflow (tag → SMS → reply → pipeline move)
- ✅ Component architecture and state management
- ✅ Form validation (Zod schemas)
- ✅ API integrations (Twilio via n8n)
- ✅ Error handling and loading states
- ✅ Performance optimizations
- ✅ Deployment checklist
- ✅ Seed data SQL

**Total Implementation Scope:**
- 5 main pages
- 30+ components
- 10 database tables
- 14 predefined campaigns (56 messages)
- 4 n8n workflows
- Complete authentication system
- Real-time messaging
- Drag-and-drop pipeline
- SMS analytics with charts

This is a production-ready specification for Lovable to generate a fully functional Automotive AI CRM platform.