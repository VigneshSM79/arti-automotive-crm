# Automotive AI CRM Platform - Lovable Build Prompt

Build a complete automotive dealership CRM platform for SMS-based lead nurturing with AI-powered drip campaigns and pipeline management.

---

## Project Context

**IMPORTANT:** This prompt references these attached files:
- `database-schema-v1.md` - Complete database schema (10 tables)
- `campaigns.md` - 14 predefined campaign sequences with messages
- `frontend-architecture.md` - UI/UX design specifications
- `version-1-scope.md` - Feature scope and user flows

---

## Tech Stack

**Frontend:**
- React 18+ with TypeScript
- Shadcn UI components + Tailwind CSS
- React Router v6
- TanStack Query (React Query)
- React Hook Form + Zod validation
- @dnd-kit/core (drag & drop)

**Backend:**
- Supabase (PostgreSQL + Auth + Realtime)
- Twilio (SMS via n8n webhooks)
- n8n (automation - external, AI responses handled here)

**Build:** Vite + npm

---

## Design System (Consumer Genius Inspired)

### Colors
```css
--primary: #E74C3C;           /* Coral Red - Brand */
--primary-hover: #C0392B;
--secondary: #F39C12;         /* Orange - Primary CTA */
--secondary-hover: #E67E22;
--success: #00C851;           /* Bright Green - Secondary CTA */
--success-hover: #00A844;
--background: #FFFFFF;
--card: #FFFFFF;
--card-dark: #2B2B2B;
--muted: #F5F5F5;
--foreground: #2B2B2B;        /* Dark charcoal text */
--muted-foreground: #7F8C8D;
--border: #E0E0E0;
--destructive: #E74C3C;
--warning: #F39C12;
--info: #3498DB;
```

### Typography
- Font: 'Inter', sans-serif
- Sizes: xs(12px), sm(14px), base(16px), lg(18px), xl(20px), 2xl(24px), 3xl(30px), 4xl(36px)
- Weights: 400, 500, 600, 700

### Spacing
Tailwind default (4px base): 1(4px), 2(8px), 4(16px), 6(24px), 8(32px)

### Border Radius
- sm: 4px, md: 6px, lg: 8px, full: 9999px

---

## Database Implementation

**Use complete schema from `database-schema-v1.md`**

### Critical Database Features to Implement:

**1. Updated `campaigns` table - ADD this column:**
```sql
ALTER TABLE campaigns
ADD COLUMN target_pipeline_stage_id UUID REFERENCES pipeline_stages(id);
```
This tells the system which pipeline stage to move leads to when they reply.

**2. Database Triggers:**
```sql
-- Auto-update updated_at on all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_[table]_updated_at BEFORE UPDATE ON [table]
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**3. Supabase Webhooks (configure in Supabase Dashboard):**
- **Webhook 1:** `leads` table UPDATE when `tags` changes → `https://n8n-instance.com/webhook/tag-changed`
- **Webhook 2:** `messages` table INSERT when `direction='inbound'` → `https://n8n-instance.com/webhook/inbound-message`

**4. PostgreSQL Function for Analytics:**
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

**5. RLS Policies:**
```sql
-- Users: Can view own profile, admins view all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Leads: Users view own leads, admins view all
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Admins can view all leads" ON leads FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create leads" ON leads FOR INSERT WITH CHECK (true);

-- Conversations & Messages: Users access their leads' data
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = conversations.lead_id AND leads.owner_id = auth.uid()));
CREATE POLICY "Users can view own messages" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations JOIN leads ON leads.id = conversations.lead_id
    WHERE conversations.id = messages.conversation_id AND leads.owner_id = auth.uid()));
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (true);

-- Campaigns: All authenticated read, admins manage
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view campaigns" ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view campaign messages" ON campaign_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage campaigns" ON campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

**6. Seed Data (from `database-schema-v1.md` and `campaigns.md`):**
```sql
-- 4 Pipeline Stages
INSERT INTO pipeline_stages (name, order_position, color, is_default) VALUES
  ('New Contact', 1, '#3498DB', true),
  ('Working Lead', 2, '#F39C12', false),
  ('Needs A Call', 3, '#E74C3C', false),
  ('I Accept', 4, '#00C851', false);

-- 14 Campaigns (use tags from campaigns.md)
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

-- 56 Campaign Messages (4 messages × 14 campaigns from campaigns.md)
-- Example for "Ghosted" campaign:
INSERT INTO campaign_messages (campaign_id, day_number, sequence_order, message_template) VALUES
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 1, 1, 'Hey, just checking in. Are you still exploring vehicle options or did plans change?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 2, 2, 'I''ve got a couple options that fit what you were originally looking for. Want me to send them over?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 4, 3, 'If the right payment and the right vehicle came up, would you be open to taking another look?'),
  ((SELECT id FROM campaigns WHERE tag = 'Ghosted'), 6, 4, 'Before I close out your file, want me to keep sending options or pause it for now?');
-- Repeat for all 14 campaigns using messages from campaigns.md
```

---

## Page Implementations (5 Pages)

### Page 1: Dashboard (`/dashboard`)

**Layout:** 4 metric cards + Recent conversations list

**Metric Cards (responsive grid):**
1. Total Messages (today) - Blue, MessageSquare icon
2. Unread Texts - Orange, MessageCircle icon
3. Active Conversations - Green, Users icon
4. New Leads (this week) - Red, UserPlus icon

**Recent Conversations:**
- Last 10 conversations
- Show: Lead name, last message preview (30 chars), timestamp (relative), unread badge
- Click → Navigate to `/conversations?id={id}`
- Real-time updates

**Queries:**
```typescript
const { data: todayMessages } = await supabase
  .from('messages')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', new Date().toISOString().split('T')[0]);

const { data: conversations } = await supabase
  .from('conversations')
  .select('unread_count')
  .eq('status', 'active');

const unreadCount = conversations?.reduce((sum, c) => sum + c.unread_count, 0);

const { data: recentConversations } = await supabase
  .from('conversations')
  .select(`
    id, last_message_at, unread_count,
    leads (id, first_name, last_name),
    messages (content, created_at)
  `)
  .order('last_message_at', { ascending: false })
  .limit(10);
```

**Real-time:**
```typescript
supabase.channel('dashboard-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
    () => queryClient.invalidateQueries(['dashboard-metrics']))
  .subscribe();
```

---

### Page 2: Conversations (`/conversations`)

**Layout:** Split view (desktop) / Stacked (mobile)

**Left Panel (40%):**
- Search bar
- Conversation list sorted by `last_message_at DESC`
- Each item: Lead name, message preview (50 chars), timestamp, unread badge

**Right Panel (60%):**
- Header: Lead name, phone, "View Profile" link
- Message thread (auto-scroll to bottom):
  - Inbound: Left-aligned, gray bg
  - Outbound: Right-aligned, primary color bg
  - AI badge if `is_ai_generated=true`
  - Timestamp below each
- Reply box:
  - Textarea with character counter (160 max)
  - Send button (disabled if empty or >160)

**Queries:**
```typescript
// List
const { data } = await supabase
  .from('conversations')
  .select(`
    id, last_message_at, unread_count, status,
    leads (id, first_name, last_name, phone_number)
  `)
  .eq('status', 'active')
  .order('last_message_at', { ascending: false });

// Messages for conversation
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

// Send reply
await supabase.from('messages').insert({
  conversation_id: conversationId,
  direction: 'outbound',
  content: messageText,
  sender: twilioPhoneNumber,
  recipient: leadPhoneNumber,
  status: 'sent',
  is_ai_generated: false
});

// Mark as read
await supabase
  .from('conversations')
  .update({ unread_count: 0 })
  .eq('id', conversationId);
```

**Real-time:**
```typescript
supabase.channel(`conversation-${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
    scrollToBottom();
  })
  .subscribe();
```

---

### Page 3: Sales Pipeline (`/pipeline`)

**Layout:** Kanban board with 4 columns (horizontal)

**Columns:** New Contact, Working Lead, Needs A Call, I Accept

**Lead Cards:**
- Name, phone, tags (colored badges)
- Click → Open detail modal

**Drag & Drop (@dnd-kit/core):**
```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const leadId = active.id;
  const newStageId = over.id;

  // Optimistic update
  await supabase
    .from('leads')
    .update({ pipeline_stage_id: newStageId })
    .eq('id', leadId);
};
```

**Lead Detail Modal:**
- Lead info (name, phone, email, source)
- Notes textarea
- Tags management:
  - Current tags as removable badges
  - "Add Tag" → Dropdown with campaign tags
  - Add tag → Triggers DB webhook → n8n starts campaign
- Conversation history link
- Save button

**Queries:**
```typescript
const { data: stages } = await supabase
  .from('pipeline_stages')
  .select('*')
  .order('order_position', { ascending: true });

const { data: leads } = await supabase
  .from('leads')
  .select(`
    id, first_name, last_name, phone_number, email, tags, notes, pipeline_stage_id,
    pipeline_stages (id, name, color)
  `)
  .order('created_at', { ascending: false });

// Add tag (triggers campaign)
await supabase
  .from('leads')
  .update({ tags: [...existingTags, newTag] })
  .eq('id', leadId);
```

---

### Page 4: SMS Analytics (`/analytics`)

**Layout:**

**Top:** Date range picker (Last 7 days, Last 30 days, Custom)

**Metric Cards (4):**
1. Total Sent
2. Total Received
3. Response Rate (inbound/outbound * 100)
4. Active Campaigns

**Charts (use recharts):**
1. Message Volume Line Chart (inbound vs outbound by day)
2. Conversations Pie Chart (active/closed/archived)

**Table:** Recent 50 messages

**Queries:**
```typescript
const { data: messages } = await supabase
  .from('messages')
  .select('direction, created_at')
  .gte('created_at', startDate)
  .lte('created_at', endDate);

const inbound = messages.filter(m => m.direction === 'inbound').length;
const outbound = messages.filter(m => m.direction === 'outbound').length;
const responseRate = ((inbound / outbound) * 100).toFixed(1);

const { count } = await supabase
  .from('campaign_enrollments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active');

// Use PostgreSQL function for daily volume
const { data } = await supabase.rpc('get_daily_message_volume', {
  start_date: startDate,
  end_date: endDate
});
```

---

### Page 5: Tag Templates (`/tag-templates`)

**Layout:**

**Header:** Title + "Add New Tag" button

**Grid:** 3 columns (desktop), 2 (tablet), 1 (mobile)

**Template Card:**
- Tag name + badge
- 4 message previews with day labels
- Edit/Delete (custom tags only, not predefined)

**14 Predefined Tags** (from `campaigns.md`):
Ghosted, PaymentTooHigh, CreditDeclined, Waiting, NoRightVehicle, NeededMoreInfo, ProcessTooLong, BoughtElsewhere, ImproveCreditFirst, NegativeEquity, NeededCosigner, DislikedVehicle, RateTooHigh, MissingDocuments

**Create Tag Modal (2-step wizard):**

**Step 1:** Select message count (2-6 messages, radio buttons)

**Step 2:**
- Tag name input
- Tag identifier (auto-generated from name, editable)
- Target pipeline stage dropdown
- For each message:
  - Day number input
  - Message textarea (character counter 160 max)
  - Placeholder buttons: {first_name}, {last_name}
  - Preview with "John Doe" replacement
- Save button

**Queries:**
```typescript
// Fetch all
const { data: campaigns } = await supabase
  .from('campaigns')
  .select(`
    id, tag, name, description, is_predefined, is_active, target_pipeline_stage_id,
    campaign_messages (id, day_number, sequence_order, message_template)
  `)
  .eq('is_active', true)
  .order('is_predefined', { ascending: false });

// Create custom
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

const messages = messageArray.map((msg, idx) => ({
  campaign_id: campaign.id,
  day_number: msg.dayNumber,
  sequence_order: idx + 1,
  message_template: msg.content
}));

await supabase.from('campaign_messages').insert(messages);

// Delete custom (safety check)
await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId)
  .eq('is_predefined', false);
```

**Validation:**
```typescript
import { z } from 'zod';

const tagTemplateSchema = z.object({
  tag: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(1).max(255),
  target_pipeline_stage_id: z.string().uuid(),
  messages: z.array(z.object({
    day_number: z.number().min(1),
    message_template: z.string().min(1).max(160)
  })).min(2).max(6)
});
```

---

## Authentication

### Login (`/login`)
- Centered card (max-width 400px)
- Email, password inputs
- "Sign In" button, "Forgot password?" link

```typescript
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  });
  if (error) {
    toast.error(error.message);
    return;
  }
  navigate('/dashboard');
};
```

### Register (`/register`)
- Full name, email, password, confirm password
- "Create Account" button

```typescript
const handleRegister = async (fullName: string, email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  if (error) {
    toast.error(error.message);
    return;
  }
  await supabase.from('users').insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role: 'user'
  });
  toast.success('Account created! Check your email.');
};
```

### Protected Routes
```typescript
const ProtectedRoute = ({ children }) => {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" />;
  return children;
};
```

---

## Component Architecture

### Shared Components (in `/components/shared`)
- `MetricCard.tsx` - Dashboard metrics display
- `MessageBubble.tsx` - Chat message with direction styling
- `LeadCard.tsx` - Lead display for pipeline
- `TagBadge.tsx` - Removable tag badge
- `CharacterCounter.tsx` - SMS character counter (160 max, warning at 144)
- `ConversationListItem.tsx` - Conversation preview in list
- `LoadingSkeleton.tsx` - Loading state placeholders

### Feature Components
- `Dashboard/DashboardMetrics.tsx` - 4 metric cards with real-time updates
- `Dashboard/RecentConversations.tsx` - Last 10 conversations
- `Conversations/ConversationList.tsx` - Sidebar with search
- `Conversations/MessageThread.tsx` - Scrollable chat with auto-scroll
- `Conversations/ReplyBox.tsx` - Textarea + char counter + send
- `Pipeline/KanbanBoard.tsx` - 4 columns with drag-drop
- `Pipeline/LeadDetailModal.tsx` - Edit lead info + tags
- `Analytics/MessageVolumeChart.tsx` - Recharts line chart
- `Analytics/DateRangePicker.tsx` - Date range selector
- `TagTemplates/TemplateGrid.tsx` - Responsive grid
- `TagTemplates/CreateTagWizard.tsx` - 2-step modal
- `TagTemplates/MessageEditor.tsx` - Day + message inputs

---

## State Management (React Query)

### Query Keys Structure
```typescript
export const queryKeys = {
  dashboard: {
    metrics: ['dashboard', 'metrics'],
    recentConversations: ['dashboard', 'recent-conversations']
  },
  conversations: {
    all: ['conversations'],
    detail: (id: string) => ['conversations', id],
    messages: (id: string) => ['conversations', id, 'messages']
  },
  leads: {
    all: ['leads'],
    detail: (id: string) => ['leads', id],
    byStage: (stageId: string) => ['leads', 'stage', stageId]
  },
  campaigns: {
    all: ['campaigns'],
    detail: (id: string) => ['campaigns', id]
  },
  analytics: {
    metrics: (start: string, end: string) => ['analytics', 'metrics', start, end],
    volume: (start: string, end: string) => ['analytics', 'volume', start, end]
  },
  stages: ['pipeline-stages']
};
```

### Custom Hooks

**useConversations.ts**
```typescript
export const useConversations = () => {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, last_message_at, unread_count, status,
          leads (id, first_name, last_name, phone_number)
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5
  });
};
```

**useSendMessage.ts**
```typescript
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, sender, recipient }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          content, sender, recipient,
          status: 'sent',
          is_ai_generated: false
        })
        .select()
        .single();
      if (error) throw error;

      // Call n8n to send via Twilio
      await fetch(import.meta.env.VITE_N8N_SEND_SMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient, from: sender, body: content, messageId: data.id })
      });

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        queryKeys.conversations.messages(variables.conversationId),
        (old: any[]) => [...(old || []), data]
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      toast.success('Message sent');
    }
  });
};
```

**useUpdateLeadStage.ts**
```typescript
export const useUpdateLeadStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stageId }) => {
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
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.all });
      const previousLeads = queryClient.getQueryData(queryKeys.leads.all);
      queryClient.setQueryData(queryKeys.leads.all, (old: any[]) =>
        old.map(lead => lead.id === leadId ? { ...lead, pipeline_stage_id: stageId } : lead)
      );
      return { previousLeads };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(queryKeys.leads.all, context?.previousLeads);
      toast.error('Failed to update stage');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      toast.success('Lead moved');
    }
  });
};
```

---

## n8n Workflow Integration (External)

**Note:** AI response generation happens in n8n, NOT in the frontend.

### Workflow 1: Tag Changed Handler
**Triggered by:** Database webhook on `leads.tags` UPDATE

**Steps:**
1. Receive webhook with lead data
2. Find new tags: `NEW.tags - OLD.tags`
3. For each new tag:
   - Find campaign where `tag = new_tag`
   - Get first message (day_number = 1) from campaign_messages
   - Send SMS via Twilio
   - Create campaign_enrollment (status='active', last_message_day=1)
   - Insert message into messages table

### Workflow 2: Inbound Message Handler (with AI)
**Triggered by:** Database webhook on `messages` INSERT where direction='inbound'

**Steps:**
1. Receive new message webhook
2. Query: Check if lead has active campaign enrollment
3. If active enrollment:
   - Update enrollment: status='completed', last_response_at=NOW()
   - Get campaign's target_pipeline_stage_id
   - Update lead's pipeline_stage_id
4. **Generate AI response:**
   - Fetch last 10 messages from conversation
   - Call AI model (OpenAI/Claude) with context
   - Get response text
5. Send AI response via Twilio
6. Insert AI response: direction='outbound', is_ai_generated=true

### Workflow 3: Send SMS
**Triggered by:** Frontend webhook call

**Steps:**
1. Receive: to, from, body, messageId
2. Call Twilio API to send SMS
3. Update message with twilio_sid
4. Return success

### Workflow 4: Daily Campaign Scheduler
**Triggered by:** Cron (daily 9AM)

**Steps:**
1. Query enrollments ready for next message:
```sql
SELECT ce.*, l.*, cm.*
FROM campaign_enrollments ce
JOIN leads l ON ce.lead_id = l.id
JOIN campaign_messages cm ON cm.campaign_id = ce.campaign_id
WHERE ce.status = 'active'
  AND ce.last_response_at IS NULL
  AND EXTRACT(DAY FROM NOW() - ce.enrolled_at) >= cm.day_number
  AND ce.last_message_day < cm.day_number;
```
2. For each: Replace placeholders, send SMS, update enrollment

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TWILIO_PHONE_NUMBER=+1234567890
VITE_N8N_TAG_WEBHOOK_URL=https://n8n.com/webhook/tag-changed
VITE_N8N_SEND_SMS_WEBHOOK_URL=https://n8n.com/webhook/send-sms
VITE_N8N_INBOUND_MESSAGE_WEBHOOK_URL=https://n8n.com/webhook/inbound-message
VITE_APP_NAME=Automotive AI CRM
```

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   └── toast.tsx
│   ├── shared/
│   │   ├── MetricCard.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── LeadCard.tsx
│   │   ├── TagBadge.tsx
│   │   ├── CharacterCounter.tsx
│   │   └── ConversationListItem.tsx
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/
│   ├── conversations/
│   ├── pipeline/
│   ├── analytics/
│   └── tag-templates/
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
│   └── useCampaigns.ts
├── lib/
│   ├── supabase.ts
│   ├── queryClient.ts
│   └── utils.ts
├── types/
│   └── database.types.ts
├── schemas/
│   ├── lead.schema.ts
│   └── campaign.schema.ts
├── App.tsx
└── main.tsx
```

---

## Routing

```typescript
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'conversations', element: <Conversations /> },
      { path: 'pipeline', element: <Pipeline /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'tag-templates', element: <TagTemplates /> }
    ]
  }
]);
```

---

## Navigation Layout

**Navbar (horizontal on desktop, hamburger on mobile):**
- Left: Logo "Automotive AI CRM"
- Center: Dashboard, Conversations, Pipeline, Analytics, Tag Templates
- Right: User dropdown (Profile, Logout)

**Active state:** Primary color underline/background

---

## Key Implementation Notes

### Phone Number Format
- Store in E.164: `+[country][number]` (e.g., +1234567890)
- Validate: `/^\+?[1-9]\d{1,14}$/`

### SMS Character Limit
- Max: 160 characters
- Warning: 144 characters (90%)
- Disable send if >160

### Message Placeholders
- Supported: `{first_name}`, `{last_name}`
- Replace at send time:
```typescript
const replacePlaceholders = (template: string, lead: Lead) =>
  template
    .replace(/{first_name}/g, lead.first_name)
    .replace(/{last_name}/g, lead.last_name);
```

### Campaign Auto-Complete Logic
- When lead replies → Check if in active campaign
- If yes → Complete campaign (don't send remaining messages)
- Auto-move to target_pipeline_stage_id

### Real-time Best Practices
- Subscribe only to active data (current conversation)
- Unsubscribe on unmount
- Use React Query cache updates for optimistic UI

### Error Handling
- Toast notifications for all actions
- Loading skeletons for all async data
- Error boundaries for component crashes
- Retry buttons for failed requests

---

## Performance Optimizations

1. **Code Splitting:**
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
<Suspense fallback={<LoadingSkeleton />}>
  <Dashboard />
</Suspense>
```

2. **Memoization:**
```typescript
const displayName = useMemo(
  () => `${lead.first_name} ${lead.last_name}`,
  [lead.first_name, lead.last_name]
);
```

3. **Debounced Search:**
```typescript
const debouncedSearch = useDebouncedValue(search, 300);
```

4. **Virtual Scrolling** (optional for large lists):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## Critical Workflows

### Workflow 1: Tag Lead → Start Campaign
1. User adds tag to lead
2. DB webhook → n8n
3. n8n sends Day 1 SMS
4. Creates enrollment record
5. Inserts message

### Workflow 2: Lead Replies → Auto-Move Pipeline
1. Inbound SMS → Twilio → n8n
2. n8n inserts message (direction='inbound')
3. DB webhook → n8n reply handler
4. If active campaign:
   - Complete enrollment
   - Move to target pipeline stage
5. Generate AI response
6. Send AI SMS
7. Insert AI message (is_ai_generated=true)

### Workflow 3: Daily Campaign Check
1. Cron runs daily 9AM
2. Query enrollments ready for next message
3. Send messages for Day 2, 4, 6, etc.
4. Update enrollment tracking

---

## Responsive Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md/lg)
- **Desktop:** > 1024px (xl)

**Mobile Adaptations:**
- Navbar → Hamburger menu
- Split view → Full screen message thread
- 4-column Kanban → Vertical stack with tabs
- 3-column grid → 1 column

---

## Testing Checklist

- [ ] Login/register works
- [ ] Dashboard metrics display correctly
- [ ] Conversations load and real-time updates work
- [ ] Send manual reply (char counter, send button)
- [ ] Pipeline drag-drop updates database
- [ ] Add tag triggers campaign (check n8n)
- [ ] Create custom tag template (2-step wizard)
- [ ] Character counter warns at 144, blocks at >160
- [ ] Placeholders insert correctly
- [ ] Analytics charts render with date range
- [ ] Empty states display
- [ ] Mobile responsive (all pages)
- [ ] Error handling (toast, retry buttons)

---

## Deployment Steps

1. **Supabase:**
   - Create project
   - Run SQL migrations (all 10 tables)
   - Add `target_pipeline_stage_id` column to campaigns
   - Create triggers (updated_at)
   - Configure webhooks (2 webhooks)
   - Set RLS policies
   - Seed data (4 stages, 14 campaigns, 56 messages)

2. **n8n:**
   - Create 4 workflows (tag handler, reply handler, send SMS, daily scheduler)
   - Configure Twilio + Supabase credentials
   - Configure AI model credentials (OpenAI/Claude)
   - Test workflows

3. **Twilio:**
   - Purchase phone number
   - Configure webhook to n8n

4. **Frontend:**
   - Build: `npm run build`
   - Deploy to Vercel/Netlify
   - Set environment variables

---

## Summary

This prompt builds a complete V1 CRM with:
- ✅ 5 pages (Dashboard, Conversations, Pipeline, Analytics, Tag Templates)
- ✅ 10 database tables (complete schema in database-schema-v1.md)
- ✅ 14 predefined campaigns (messages in campaigns.md)
- ✅ Real-time messaging with Supabase
- ✅ SMS automation via n8n + Twilio
- ✅ AI responses (handled in n8n)
- ✅ Drag-drop pipeline with auto-movement on reply
- ✅ Character counter, placeholder helpers
- ✅ Consumer Genius design system
- ✅ React Query state management
- ✅ Form validation with Zod
- ✅ RLS security policies
- ✅ Responsive design

**Reference Files Attached:**
- `database-schema-v1.md` - Full schema
- `campaigns.md` - 14 campaigns with messages
- `frontend-architecture.md` - UI specifications
- `version-1-scope.md` - Feature scope