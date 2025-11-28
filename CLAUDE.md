# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an **Automotive AI CRM** system for dealerships to manage SMS-based lead qualification, sales pipelines, and automated customer engagement. The system consists of:

1. **Frontend**: React/TypeScript application (this repository - main working directory)
2. **Backend/Automation**: n8n workflows in `../Kaiden_Arti/n8n/` + Supabase (PostgreSQL)

**Working Directory**: `D:\Dev\Kaiden_Arti_Lovable\` - All development happens here

---

## Essential Commands

### Frontend Development (Run from working directory)

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

**Note:** All commands should be run from `D:\Dev\Kaiden_Arti_Lovable\` (the working directory)

### Database Migrations (Supabase)

Migrations are located in `D:\Dev\Kaiden_Arti_Lovable\supabase\migrations\`

Apply migrations via Supabase Dashboard or Supabase CLI (if configured).

---

## High-Level Architecture

### System Architecture Pattern

This is a **pool-based lead management system** with **AI-first qualification**:

```
Raw Lead → AI Qualification (n8n) → Lead Pool → Agent Claims → Sales Pipeline
```

**NOT** a traditional CRM where leads are immediately assigned to agents. Instead:
1. Leads start unassigned (`owner_id = NULL`)
2. AI qualifies leads via 2-3 SMS exchanges (n8n workflows)
3. Qualified leads enter "Lead Pool" (competitive claiming)
4. First agent to claim wins (`owner_id` set)
5. Claimed leads move to agent's personal pipeline

### Three-Tier Architecture

**Tier 1: Frontend (React + Supabase Client)**
- `D:\Dev\Kaiden_Arti_Lovable\src\`
- Direct Supabase queries via `@supabase/supabase-js`
- No backend API layer (Supabase is the API)
- Real-time subscriptions for live updates

**Tier 2: Database (Supabase PostgreSQL)**
- Single source of truth
- Row-Level Security (RLS) for access control
- Database triggers fire n8n webhooks
- See `database-schema-v1.md` for full schema

**Tier 3: Automation (n8n Workflows)**
- AI qualification workflows (OpenAI GPT-4)
- SMS automation (Twilio integration)
- Tag-based campaign enrollment
- Agent notifications
- Located in `D:\Dev\Kaiden_Arti\n8n\new-workflows\` (5 workflows)

### Critical Business Logic: Pool-Based Lead Management

**Lead States:**
- `owner_id = NULL` → Lead is in **Lead Pool** (unassigned, visible to all agents)
- `owner_id = <user_id>` → Lead is **claimed** (visible only to owning agent or admin)

**Agent vs Admin Access:**
- **Agents**: See only their own leads in Pipeline (`WHERE owner_id = current_user.id`)
- **Admins**: Can filter by any salesperson to monitor performance
- **Lead Pool**: Visible to ALL agents, competitive first-come-first-served claiming

**Key Files:**
- `BUSINESS_LOGIC.md` - Complete business rules (READ THIS FIRST for context)
- `high-level-architecture-overview.md` - Original architecture design
- `PROGRESS.md` (in Lovable folder) - Implementation history and current status

### Database Webhook Architecture

**Why this matters:** Frontend NEVER calls n8n directly. Instead:

```
Frontend → Supabase INSERT/UPDATE → Database Trigger → Webhook → n8n
```

This allows n8n to be replaced later without frontend changes. Database is the integration point.

**Example:** When a lead is created:
1. Frontend: `INSERT INTO leads ...`
2. Supabase trigger detects INSERT
3. Trigger fires webhook to n8n Workflow 1
4. n8n sends Day 1 SMS via Twilio

---

## Code Structure & Navigation

### Frontend Structure (`D:\Dev\Kaiden_Arti_Lovable\src\`)

**Pages** (`src/pages/`):
- `LeadPool.tsx` - Competitive lead claiming interface (separate from Pipeline)
- `Pipeline.tsx` - Kanban board for claimed leads (agent-specific or admin-filtered)
- `Conversations.tsx` - SMS thread management with AI handoff indicators
- `Leads.tsx` - Raw lead list, CSV import with validation, and manual SMS trigger
- `Settings.tsx` - User settings + admin team notification controls
- `Analytics.tsx` - Dashboard with metrics
- `TagTemplates.tsx` - Message Templates (renamed from Tag Templates) - manages Initial Message + tag campaigns

**Critical Components:**
- `src/components/layout/ProtectedRoute.tsx` - Authentication wrapper
- `src/integrations/supabase/` - Supabase client + types

**Data Layer:**
- NO dedicated service layer (uses Supabase client directly in components)
- Queries use `@tanstack/react-query` for caching
- Types auto-generated in `src/integrations/supabase/types.ts`

### n8n Workflows (`D:\Dev\Kaiden_Arti\n8n\new-workflows\`)

**5 Workflows (JSON files):**
1. `1-initial-outbound-message.json` - Day 1 SMS on lead creation
2. `2-enhanced-ai-tag-classification.json` - AI analyzes inbound SMS, assigns tags, routes to workflows 3/4
3. `3-lead-pool-agent-notifications.json` - Moves qualified leads to pool, SMS broadcast to agents
4. `4-dnc-handler.json` - Do Not Contact (opt-out) compliance
5. `5-four-message-cadence-scheduler.json` - Day 3, 5, 7 follow-ups for non-responders

**Documentation:**
- `README.md` - Complete setup guide for n8n import
- `VALIDATION_REPORT.md` - Validation status of all workflows

---

## Key Technical Concepts

### 1. Pool-Based vs. Assignment-Based CRM

**Traditional CRM:**
```
Lead Created → Assigned to Agent → Agent Works Lead
```

**This System:**
```
Lead Created → AI Qualifies → Lead Pool → Agent Claims → Agent Works Lead
```

This is a **pull model** (agents claim leads) not a **push model** (leads assigned to agents).

### 2. AI Handoff System

Conversation table has these fields:
- `requires_human_handoff` (BOOLEAN) - AI sets to TRUE after 2-3 messages if qualified
- `handoff_triggered_at` (TIMESTAMPTZ) - When handoff occurred
- `ai_message_count` (INTEGER) - Number of AI messages sent

Frontend shows orange indicators when `requires_human_handoff = true`.

### 3. Initial Message Campaign System

**Initial_Message Tag:** Special system-level campaign (`user_id = NULL`) that triggers the first outbound SMS sequence.

**Workflow:**
1. User selects leads in Leads page → clicks "Send 1st Message"
2. Lead tagged with `'Initial_Message'` + `status = 'contacted'`
3. Database webhook triggers n8n Workflow 1
4. Day 1 SMS sent immediately
5. Follow-up messages sent on Days 3, 5, 7 (if no response)
6. Sequence stops if lead responds

**Admin-Only Template:**
- Only admins can edit Initial Message sequence (system-level campaign)
- Sales agents see it as read-only (ensures brand consistency, compliance)
- Configured via Message Templates page

### 4. Tag-Based Campaign Auto-Enrollment

When lead is tagged (e.g., "Payment Too High"), database triggers automatically:
1. Query `tag_campaigns` for matching campaigns
2. Create `campaign_enrollments` records
3. n8n workflows send scheduled messages based on enrollment

**Important:** Tag campaigns start AFTER agent claims lead, NOT during AI qualification phase.

### 5. Role-Based Access Control (RLS)

Supabase RLS policies enforce:
- **Agents**: See only their own leads (`WHERE owner_id = auth.uid()`)
- **Admins**: See all leads (detected via `user_roles` table with `has_role()` function)
- **Lead Pool**: Visible to all agents (`WHERE owner_id IS NULL`)
- **System Campaigns**: Only admins can edit (`user_id IS NULL AND has_role(auth.uid(), 'admin')`)

**Role Detection:** `useUserRole()` hook queries `user_roles` table to determine admin status.

### 6. Database-First Architecture

**ALWAYS modify data via Supabase:**
```typescript
// ✅ CORRECT
await supabase.from('leads').update({ owner_id: userId }).eq('id', leadId);

// ❌ WRONG - Never call n8n directly from frontend
await fetch('https://n8n-instance/webhook/...');
```

Frontend only knows about Supabase. n8n is invisible to frontend code.

---

## Common Development Patterns

### Claiming a Lead (Lead Pool → Pipeline)

```typescript
const claimLeadMutation = useMutation({
  mutationFn: async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('leads')
      .update({ owner_id: user.id }) // Sets ownership
      .eq('id', leadId);
    if (error) throw error;
  },
});
```

This triggers:
1. Lead disappears from Lead Pool for other agents
2. Lead appears in claiming agent's Pipeline
3. RLS policies enforce visibility automatically

### Querying Lead Pool (Unassigned Leads)

```typescript
const { data: leads } = useQuery({
  queryKey: ['pooled-leads'],
  queryFn: async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .is('owner_id', null) // Key filter for pool
      .order('created_at', { ascending: false });
    return data;
  },
});
```

### Admin vs Agent Pipeline Query

```typescript
// Agents: Auto-filtered to their leads
if (!userRole?.isAdmin) {
  query = query.eq('owner_id', user.id);
}

// Admins: Filter by selected salesperson
if (userRole?.isAdmin && selectedSalesperson !== 'all') {
  query = query.eq('owner_id', selectedSalesperson);
}
```

### SMS Notification Control (Admin Feature)

```typescript
// Query active agents for notifications
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('receive_sms_notifications', true)
  .not('phone_number', 'is', null)
  .eq('is_active', true);
```

This is used by n8n Workflow 3 to determine who gets SMS alerts.

### CSV Upload with Validation (Leads.tsx)

```typescript
// Phone number normalization (E.164 format)
const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`; // Add +1 for US numbers
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return phone;
};

// CSV validation before import
const validateCsvRow = (row: CSVRow): ValidationResult => {
  // Required: first_name, last_name, phone
  // Validates phone format (10 or 11 digits)
  // Detects duplicates within CSV
  // Email format warnings (soft validation)
};
```

**Features:**
- Client-side CSV parsing (PapaParser)
- Phone normalization to E.164 format
- Preview dialog shows valid/invalid counts
- Error and warning badges per row
- Only imports valid leads

### Sending Initial Messages (Manual Trigger)

```typescript
// User clicks "Send 1st Message" on selected leads
const sendFirstMessageMutation = useMutation({
  mutationFn: async (leadIds: string[]) => {
    // 1. Fetch leads with current tags
    const { data: leads } = await supabase
      .from('leads')
      .select('id, tags')
      .in('id', leadIds);

    // 2. Update: status + ADD 'Initial_Message' tag (ADDITIVE)
    for (const lead of leads) {
      await supabase
        .from('leads')
        .update({
          status: 'contacted',
          tags: [...(lead.tags || []), 'Initial_Message']
        })
        .eq('id', lead.id);
    }
    // 3. Database webhook triggers n8n Workflow 1
  },
});
```

**Cost Estimation:** Shows `$0.0075 per SMS` before sending.

---

## Important Files to Reference

### Documentation (Read Before Major Changes)

1. **`BUSINESS_LOGIC.md`** (Lovable folder) - Complete business rules, read this FIRST
2. **`PROGRESS.md`** (Lovable folder) - Implementation history with Nov 19 requirements
3. **`high-level-architecture-overview.md`** - Original architecture design
4. **`database-schema-v1.md`** - Full database schema reference
5. **`campaigns.md`** - 14 tag categories and campaign definitions
6. **`n8n/new-workflows/README.md`** - n8n setup guide
7. **`n8n/new-workflows/VALIDATION_REPORT.md`** - Workflow validation status

### Schema Files

- `database-schema-v1.md` - Complete schema
- `src/integrations/supabase/types.ts` - TypeScript types (auto-generated)
- Migrations: `supabase/migrations/` (Lovable folder)

### Key Implementation Files

- **Lead Pool**: `src/pages/LeadPool.tsx` - Competitive lead claiming
- **Pipeline**: `src/pages/Pipeline.tsx` - Role-based kanban board
- **Leads**: `src/pages/Leads.tsx` - CSV import, validation, manual SMS trigger (Nov 21, 2025)
- **Message Templates**: `src/pages/TagTemplates.tsx` - Initial Message + tag campaigns (Nov 21, 2025)
- **Settings**: `src/pages/Settings.tsx` - Admin notification controls
- **Conversations**: `src/pages/Conversations.tsx` - AI handoff indicators

---

## Git Workflow Notes

**Current Branch:** `main` (or check with `git branch`)

**User Preference:** Always ask permission before committing. User said: "do not commit, always ask permission before committing"

**When creating commits:**
1. Stage relevant changes only
2. Ask user for approval BEFORE committing
3. Use descriptive commit messages
4. Include "🤖 Generated with Claude Code" footer if requested

---

## Environment & Configuration

### Supabase (Production)

Environment variables in `.env` (Lovable folder):
```
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Frontend connects via `@supabase/supabase-js` client in `src/integrations/supabase/client.ts`.

### n8n Workflows (Not Yet Deployed)

Will require:
- Supabase credentials (service role key, not anon key)
- Twilio credentials (Account SID, Auth Token, Phone Number)
- OpenAI API key (GPT-4 access)

See `n8n/new-workflows/README.md` for setup.

---

## Design System

**Brand Colors (Consumer Genius):**
- Primary Orange: `#F39C12` - CTAs, active states
- Secondary Green: `#00C851` - Success states
- Accent Coral Red: `#E74C3C` - Highlights
- Dark Cards: `#2B2B2B` - Metric backgrounds

**UI Framework:** Shadcn UI (Radix primitives + Tailwind)

Components in `src/components/ui/` are from Shadcn and should not be modified directly. Customize via Tailwind classes or create wrapper components in `src/components/shared/`.

---

## Testing & Development Workflow

### Local Development

1. Navigate to frontend: `cd D:\Dev\Kaiden_Arti_Lovable`
2. Start dev server: `npm run dev`
3. Open browser: `http://localhost:5173`

### Testing Lead Pool Flow

1. Create lead in Leads page or via SQL
2. Ensure `owner_id = NULL`
3. Lead should appear in Lead Pool page
4. Click "Claim Lead"
5. Lead should disappear from pool and appear in Pipeline

### Testing Admin Features

1. Log in as admin user (check `user_roles` table for `role = 'admin'`)
2. Pipeline page should show salesperson dropdown
3. Settings page should show "Team Notification Settings" section
4. Message Templates page should show enabled "Edit Sequence" button for Initial Message
5. Agents should see disabled "Admin Only" button with lock icon

---

## Troubleshooting Common Issues

### "Lead not appearing in Lead Pool"

Check:
1. Is `owner_id = NULL`?
2. Is user authenticated?
3. Check Supabase RLS policies for `leads` table

### "Agent can see other agents' leads in Pipeline"

Check:
1. Pipeline query should have `.eq('owner_id', user.id)` for non-admins
2. Verify `user_roles` table has correct role
3. Check `useUserRole` hook implementation

### "n8n workflow not triggering"

Check:
1. Supabase webhook configured correctly
2. Webhook URL matches n8n workflow webhook node
3. n8n workflow is activated
4. Check n8n execution logs

---

## Migration & Deployment Notes

### Database Changes

1. Create migration file in `supabase/migrations/`
2. Test locally with Supabase CLI (if available)
3. Apply via Supabase Dashboard → SQL Editor
4. Update TypeScript types: Check if Supabase auto-generates types

### Frontend Deployment

Built with Vite. Deploy to:
- Vercel (recommended)
- Netlify
- Any static hosting

Build command: `npm run build`
Output: `dist/` folder

### n8n Workflows

Import workflow JSON files via n8n UI:
1. Workflows → Import from File
2. Configure credentials (Supabase, Twilio, OpenAI)
3. Update webhook URLs
4. Activate workflows in order: 4 → 3 → 5 → 2 → 1

---

## Architecture Decision Records

### Why Separate Lead Pool and Pipeline Pages?

**User Feedback (Nov 20):** "Lead Pool and Pipeline should be separate. Pipeline was pushed down and not visible."

**Decision:** Create standalone `LeadPool.tsx` page instead of section within Pipeline. Better visibility, clearer separation of concerns.

### Why Pool-Based Lead Management?

**Client Context:** Automotive dealership with competitive sales team.

**Decision:** Qualified leads enter pool where agents compete to claim them. Ensures:
- Fast response times (agents incentivized to claim quickly)
- Fair distribution (first-come-first-served)
- No leads languish in queues waiting for assignment

### Why Database Webhooks Instead of Direct n8n Calls?

**Decision:** Frontend → Supabase → Webhook → n8n (not Frontend → n8n)

**Rationale:**
- Clean separation of concerns
- n8n is replaceable without frontend changes
- Database is single source of truth
- Easier to debug and monitor

---

## Future Enhancements (Not Yet Implemented)

From `BUSINESS_LOGIC.md`:

**Phase 2B (Next):**
- [ ] Deploy n8n workflows to production
- [ ] Configure Twilio SMS integration
- [ ] Test AI qualification end-to-end
- [ ] Monitor SMS delivery and AI accuracy

**Phase 3 (Later):**
- [ ] Lead reassignment (admin feature)
- [ ] Team performance dashboard
- [ ] Conversion rate analytics
- [ ] Agent leaderboard
- [ ] Mobile app

---

## Contact & Support

**Project Context:**
- Client: Emile (dealership owner/sales manager)
- Development: Kaiden + Claude Code
- Industry: Automotive dealership CRM

**Key Documents:**
- Meeting notes: `19_Nov_Meeting_Analysis_and_Required_Changes.md`
- Gap analysis: `19_Nov_Lovable_Gap_Analysis.md`

---

**Last Updated:** November 20, 2025
**Claude Code Version:** Optimized for claude.ai/code
