# Automated Customer Communication CRM - High-Level Architecture

## Overview

An automated SMS communication system that sends templated messages when leads are tagged and uses AI to respond to customer replies.

**Core Functionality:**
1. User tags a lead → Automated SMS sent
2. Customer replies → AI generates and sends response
3. All conversations tracked in database

---

## Tech Stack

**Frontend:** React
**Database:** Supabase (PostgreSQL + API)
**Automation:** n8n (Visual workflows)
**SMS Gateway:** Twilio
**AI:** OpenAI (GPT-3.5-turbo / GPT-4)

---

## Database Structure

**`leads`**
- id, first_name, last_name, phone_number, email, tags (array), created_at, updated_at

**`message_templates`**
- id, tag, template, created_at

**`conversations`**
- id, lead_id, status, created_at

**`messages`**
- id, conversation_id, direction, content, sender, recipient, status, created_at

---

## Architecture Flow

### Flow 1: Lead Tagged → Automated SMS

```
React Frontend
   ↓ UPDATE leads SET tags = ['interested-camry']
Supabase Database
   ↓ Database webhook detects tag change
n8n Workflow
   ├─ Node 1: Receive webhook (lead data)
   ├─ Node 2: Query message_templates table (get template)
   ├─ Node 3: Format message (replace {first_name})
   ├─ Node 4: Send SMS via Twilio
   ├─ Node 5: Insert conversation record
   └─ Node 6: Insert message record
Twilio → Customer's Phone
```

**Example:**
- User tags John as "interested-camry"
- SMS sent: "Hi John! Thanks for your interest in the Toyota Camry..."

---

### Flow 2: Customer Reply → AI Response

```
Customer sends SMS
   ↓
Twilio receives, sends webhook to n8n
   ↓
n8n Workflow
   ├─ Node 1: Receive Twilio webhook
   ├─ Node 2: Save incoming message to DB
   ├─ Node 3: Get conversation history (last 10 messages)
   ├─ Node 4: Get lead info
   ├─ Node 5: Build AI prompt with context
   ├─ Node 6: Call OpenAI API
   ├─ Node 7: Send AI response via Twilio
   └─ Node 8: Save outbound message to DB
```

**Example:**
- Customer: "What colors does it come in?"
- AI: "The Camry comes in 8 colors including Silver, Pearl White, and Red..."

---

## System Architecture Diagram

```
┌──────────────────────────────────────────┐
│  React Frontend                          │
│  - View/manage leads                     │
│  - Tag leads                             │
│  - View conversations                    │
└────────────┬─────────────────────────────┘
             │
             │ API calls (read/write)
             ↓
┌──────────────────────────────────────────┐
│  Supabase (PostgreSQL)                   │
│  - leads, message_templates              │
│  - conversations, messages               │
│  - Database webhooks configured          │
└────────────┬─────────────────────────────┘
             │
             │ Webhook on tag change
             ↓
┌──────────────────────────────────────────┐
│  n8n Workflows                           │
│  Workflow 1: Tag → SMS                   │
│  Workflow 2: SMS reply → AI response     │
└──────┬──────────────────┬────────────────┘
       │                  │
       │ Send SMS         │ Generate response
       ↓                  ↓
  ┌─────────┐      ┌─────────────┐
  │ Twilio  │      │  OpenAI API │
  └─────────┘      └─────────────┘
       │
       │ SMS to/from customer
       ↓
  ┌─────────────┐
  │ Customer    │
  │ Phone       │
  └─────────────┘
```

---

## Key Architecture Decisions

### Why Database-Triggered Webhooks?

**Chosen approach:**
```
React → Supabase → Database webhook → n8n
```

**Benefits:**
- Frontend only talks to database (clean separation)
- Easy to replace n8n with custom API later
- No frontend code changes needed for backend swap
- Database is single source of truth

**Alternative (not chosen):**
```
React → n8n webhook directly
```
- Couples frontend to n8n
- Harder to migrate away from n8n
- Frontend needs to know about backend implementation

---

### Database Webhook Configuration

**Trigger:** UPDATE on `leads` table when `tags` column changes

**Webhook URL:** `https://your-n8n.app/webhook/lead-tagged`

**Payload sent:**
```json
{
  "type": "UPDATE",
  "table": "leads",
  "record": {
    "id": "123",
    "first_name": "John",
    "phone_number": "+1234567890",
    "tags": ["interested-camry"]
  }
}
```

---


## n8n Workflow Details

### Workflow 1: Lead Tagged → Send SMS

**Trigger:** Webhook from Supabase
**Input:** Lead data with new tag

**Nodes:**
1. Webhook - Receive lead data
2. Supabase - Query `message_templates WHERE tag = ?`
3. Function - Format template (replace {first_name}, etc.)
4. Twilio - Send SMS
5. Supabase - Insert into `conversations`
6. Supabase - Insert into `messages` (direction: outbound)

**Why n8n queries for template:**
- Webhook only sends lead data (not template)
- n8n fetches template from database itself
- Keeps webhook payload small and generic

---

### Workflow 2: SMS Reply → AI Response

**Trigger:** Twilio webhook (incoming SMS)
**Input:** Customer phone, message content

**Nodes:**
1. Webhook - Receive SMS data from Twilio
2. Supabase - Get lead by phone number
3. Supabase - Get conversation ID
4. Supabase - Get last 10 messages (for context)
5. Function - Build AI prompt with conversation history
6. OpenAI - Generate response
7. Twilio - Send AI response
8. Supabase - Insert incoming message record
9. Supabase - Insert outbound AI response record

---

## Cost Estimate

**Monthly costs for 1,000 SMS:**
- Supabase: $0 (free tier)
- n8n: $20 (Cloud starter)
- Twilio: ~$20 (phone + messages)
- OpenAI: ~$15 (GPT-3.5-turbo)
- Vercel: $0 (free tier)
- **Total: ~$55/month**

**Scaling at 10,000 SMS:**
- Supabase: $25 (Pro)
- n8n: $50
- Twilio: ~$200
- OpenAI: ~$150
- **Total: ~$425/month**

---

## Migration Path (Future)

**When to replace n8n with custom API:**
- Workflows become too complex (>30 nodes)
- Need advanced testing/CI/CD
- Team grows to 3+ developers
- Volume exceeds 50k messages/month

**How migration works:**
1. Frontend stays exactly the same (no changes)
2. Replace Supabase webhook URL to point to custom API instead of n8n
3. Reimplement n8n logic in code (Node.js/Python)
4. Database structure stays the same

**Why this is easy:**
- Frontend only talks to Supabase
- Database is source of truth
- n8n is isolated and replaceable
- Clean separation of concerns

---

## Key Technical Concepts

**API:** HTTP interface for services to communicate (Twilio API, OpenAI API, Supabase API)

**Webhook:** HTTP callback - service calls your URL when event happens (Twilio calls n8n when SMS arrives)

**Database Trigger:** Auto-execute action when data changes (call webhook when tags column updates)

**Context/Memory:** AI needs conversation history to generate relevant responses (last 10 messages + lead info)

---

## Related Documentation

- **features.md** - Detailed feature specifications
- **tech-stack-decision.md** - Full technology decisions and reasoning
- **tech-stack.md** - Quick reference of chosen technologies
- **automated-customer-communication-architecture.md** - Deep technical architecture (microservices comparison)

---

**Last Updated:** 2025-11-13
**Status:** Planning complete, ready for implementation
