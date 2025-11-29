# Real-Time UI Update Analysis Report

**Date:** November 29, 2025
**Project:** Automotive AI CRM (Kaiden_Arti_Lovable)
**Issue:** Manual page refreshes required to see UI changes

---

## Executive Summary

This React/Supabase application currently has **minimal real-time functionality** implemented. Only the Conversations page has partial Supabase real-time subscriptions for incoming messages. All other pages rely on manual React Query cache invalidation after mutations, which means users must perform actions (or wait for cache expiration) to see updates from other sources.

**Current State:**
- ✅ 1 of 6 pages has partial real-time updates (Conversations)
- ❌ 5-minute cache staleness causes significant UX issues
- ❌ Pool-based lead claiming has race conditions
- ❌ Manual refreshes required for most collaborative features

---

## Table of Contents

1. [Current State of Real-Time Functionality](#1-current-state-of-real-time-functionality)
2. [Data Fetching Patterns Analysis](#2-data-fetching-patterns-analysis)
3. [Business Logic Requirements](#3-business-logic-requirements)
4. [Where Manual Refreshes Are Required](#4-where-manual-refreshes-are-required)
5. [Recommended Implementation Approach](#5-recommended-implementation-approach)
6. [Architectural Recommendations](#6-architectural-recommendations)
7. [Implementation Priority Matrix](#7-implementation-priority-matrix)
8. [Testing Recommendations](#8-testing-recommendations)
9. [Performance Considerations](#9-performance-considerations)
10. [Migration Plan](#10-migration-plan)
11. [Summary & Next Steps](#11-summary--next-steps)

---

## 1. Current State of Real-Time Functionality

### 1.1 Pages WITH Real-Time Updates

#### Conversations.tsx (Lines 142-165)

**Current Implementation:**
- **Subscription Target:** Messages table filtered by conversation ID
- **Event:** INSERT events only
- **Action:** Invalidates React Query cache for messages
- **Scope:** Only updates the currently selected conversation's messages
- **Effectiveness:** PARTIAL

```typescript
// Current implementation (line 143-164)
useEffect(() => {
  if (!selectedConversationId) return;

  const channel = supabase
    .channel(`conversation-${selectedConversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversationId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedConversationId, queryClient]);
```

**Issues with Current Implementation:**
- ❌ Missing UPDATE events for message status changes
- ❌ Does not subscribe to conversation metadata changes
- ❌ Conversation list (left panel) only updates on manual actions
- ❌ Does not update when new conversations are created
- ❌ Unread counts don't update in real-time
- ❌ Handoff badges don't appear when AI sets `requires_human_handoff = true`

### 1.2 Pages WITHOUT Real-Time Updates

#### Leads.tsx
- **Data Fetching:** `useQuery` with 5-minute stale time
- **Updates:** Only on mutation success (manual lead creation/editing)
- **Problem:** When CSV imports complete, tags are added, or leads are claimed by other agents, the list does not update automatically
- **Business Impact:** 🔴 HIGH - Multiple users may attempt to send initial messages to the same lead

#### Pipeline.tsx
- **Data Fetching:** `useQuery` based on user role and salesperson filter
- **Updates:** Only when dragging leads between stages
- **Problem:** Admins watching a specific salesperson won't see real-time updates as that salesperson moves leads
- **Business Impact:** 🟡 MEDIUM - Delays in management oversight

#### LeadPool.tsx
- **Data Fetching:** `useQuery` filtered by `owner_id = NULL` and qualified status
- **Updates:** Only after claiming a lead
- **Problem:** 🔴 CRITICAL race condition - multiple agents can see and attempt to claim the same lead simultaneously
- **Business Impact:** 🔴 CRITICAL - Core business logic failure (pool-based lead claiming requires real-time visibility)

#### TagTemplates.tsx (Message Templates)
- **Data Fetching:** Two separate queries (Initial Message campaign + other campaigns)
- **Updates:** Only after creating/deleting campaigns
- **Problem:** Team members won't see when admins update the Initial Message template or when other agents create new tag campaigns
- **Business Impact:** 🟢 LOW - Infrequent changes, single-admin pattern

#### Settings.tsx
- **Data Fetching:** User profile query
- **Updates:** Only after saving settings
- **Problem:** No real-time sync if admin changes user permissions/roles
- **Business Impact:** 🟢 LOW - Single-user settings page

---

## 2. Data Fetching Patterns Analysis

### 2.1 React Query Configuration

**Global Settings (App.tsx, lines 21-28):**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes - TOO LONG
      retry: 1,
    },
  },
});
```

**Implications:**
- All queries are cached for 5 minutes before considered stale
- Background refetching happens only when queries are re-mounted or manually invalidated
- No automatic polling or refetch-on-window-focus (using defaults)
- **Problem:** 5 minutes is far too long for a collaborative CRM application

### 2.2 Query Key Patterns

**Well-Structured (Good for Targeted Invalidation):**
```typescript
['leads', user?.id, searchQuery, sortColumn, sortDirection, isAdmin]
['messages', selectedConversationId]
['pooled-leads', search]
['conversations', search, handoffFilter]
['tag-campaigns']
['initial-message-campaign']
```

**Impact:** Precise query keys allow granular cache invalidation, which will work well with real-time subscriptions.

### 2.3 Cache Invalidation Patterns

**Current Approach:**
```typescript
// Example from Leads.tsx (line 371)
queryClient.invalidateQueries({ queryKey: ['leads'] });

// Example from LeadPool.tsx (line 66)
queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
```

**Issues:**
- ❌ Invalidates ALL queries matching the base key (overly broad)
- ❌ No optimistic updates (except drag-and-drop in Pipeline)
- ❌ Does not invalidate related queries (e.g., updating a lead doesn't invalidate conversations list)
- ❌ No cross-page coordination (claiming lead in Pool doesn't update Leads page or Pipeline)

---

## 3. Business Logic Requirements

### 3.1 Pool-Based Lead Management (CRITICAL)

**Current State:** 🔴 BROKEN

**How It Should Work:**
```
Raw Lead → AI Qualification → Lead Pool (owner_id = NULL) → Agent Claims → Pipeline (owner_id = user_id)
```

**The Problem:**
- Lead Pool page shows leads with `owner_id = NULL`
- Multiple agents can see the same lead simultaneously
- First to click "Claim Lead" wins (race condition)
- **Critical Issue:** Without real-time updates, Agent A may see a lead that Agent B just claimed 5 seconds ago

**Required Real-Time Updates:**
1. ✅ When ANY lead's `owner_id` changes from NULL to a user ID, remove from all agents' views instantly
2. ✅ When a lead is claimed, add to the claiming agent's pipeline immediately
3. ✅ Update "X Available Leads" count badge in real-time
4. ✅ Show visual feedback when another agent claims a lead you're viewing

### 3.2 AI Handoff Indicators

**Current State:** 🟡 PARTIAL

**What Works:**
- Conversations page shows `requires_human_handoff` badges
- Filters work (All / Handoff / AI Only tabs)

**The Problem:**
- When AI updates `requires_human_handoff = true` via n8n Workflow 2, agents must refresh to see the orange badge
- Unread counts don't update when new messages arrive
- Last message timestamp doesn't update

**Required Real-Time Updates:**
1. ✅ Conversation list: Update handoff badges when `requires_human_handoff` changes
2. ✅ Handoff count badge: Update tab badge counts dynamically
3. ✅ Conversation metadata: Update `last_message_at` and `unread_count` when new messages arrive
4. ✅ New conversations: Appear instantly when inbound SMS creates new conversation

### 3.3 Admin Team Monitoring

**Current State:** 🟡 FUNCTIONAL BUT DELAYED

**What Works:**
- Admins can filter Pipeline by salesperson
- Admins see all leads (no RLS filtering)

**The Problem:**
- 5-minute cache delay means admins see stale data when monitoring team performance
- When salesperson moves lead between stages, admin doesn't see it

**Required Real-Time Updates:**
1. ✅ Pipeline: When filtered by salesperson, show real-time updates as that agent moves leads
2. ✅ Lead ownership changes: Reflect instantly when leads are reassigned
3. ✅ Tag updates: Show when AI classifies leads in real-time

---

## 4. Where Manual Refreshes Are Required

### 4.1 Critical (User Must Manually Refresh)

#### 🔴 LeadPool.tsx
**Trigger:** Another agent claims a lead
**Current Behavior:** Lead remains visible until cache expires (up to 5 minutes) or page refreshes
**User Impact:** Agents may attempt to claim already-claimed leads, causing confusion and wasted effort
**Frequency:** High (multiple agents competing for leads)

#### 🔴 Conversations.tsx (Conversation List)
**Trigger:** New conversation created (inbound message from new lead)
**Current Behavior:** Conversation list does not update until user performs an action
**User Impact:** Missed conversations, delayed responses to customers
**Frequency:** High (continuous inbound SMS)

#### 🔴 Conversations.tsx (Metadata)
**Trigger:** Message status changes (delivered → read) or unread count updates
**Current Behavior:** Stale badges and counters
**User Impact:** Inaccurate notification indicators, agents don't know which conversations need attention
**Frequency:** Very High (every message)

### 4.2 High Priority (Degraded UX)

#### 🟡 Pipeline.tsx (Admin Monitoring)
**Trigger:** Salesperson moves leads between stages
**Current Behavior:** Admin sees stale pipeline state for up to 5 minutes
**User Impact:** Inaccurate performance monitoring, can't provide real-time coaching
**Frequency:** Medium (throughout business day)

#### 🟡 Leads.tsx (Tag Updates)
**Trigger:** Tag campaigns are applied to leads (via Workflow 2 AI classification)
**Current Behavior:** Tags appear only after cache expiration
**User Impact:** Delayed visibility into AI qualification results
**Frequency:** High (AI tags every inbound message)

#### 🟡 Leads.tsx (CSV Import)
**Trigger:** Bulk import completes
**Current Behavior:** Page must be manually refreshed to see new leads
**User Impact:** Uncertainty about import success, must manually refresh
**Frequency:** Low (occasional bulk imports)

### 4.3 Medium Priority (Acceptable Delay)

#### 🟢 TagTemplates.tsx
**Trigger:** Admin edits Initial Message sequence or another agent creates tag campaign
**Current Behavior:** Changes not visible until cache expires
**User Impact:** Minor - Template changes are infrequent
**Frequency:** Very Low (administrative changes)

#### 🟢 Settings.tsx
**Trigger:** Admin changes user role
**Current Behavior:** User sees old role until cache expires or logout
**User Impact:** Minor - Infrequent operation
**Frequency:** Very Low (user management)

---

## 5. Recommended Implementation Approach

### 5.1 Priority 1: Lead Pool (CRITICAL - Pool-Based Model)

**Goal:** Instant removal of claimed leads from all agents' views

**Implementation:**
```typescript
// Hook: src/hooks/useLeadPoolSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadPoolSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('lead-pool-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: 'owner_id=not.is.null', // Listen for leads being claimed
        },
        (payload) => {
          console.log('Lead claimed:', payload.new.id);

          // Invalidate lead pool queries for all agents
          queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
          queryClient.invalidateQueries({ queryKey: ['leads'] }); // Also update Leads page
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          // New lead added (CSV import or manual creation)
          if (payload.new.owner_id === null) {
            console.log('New lead added to pool:', payload.new.id);
            queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from lead pool updates');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
```

**Usage in LeadPool.tsx:**
```typescript
// Add near top of component
import { useLeadPoolSubscription } from '@/hooks/useLeadPoolSubscription';

export default function LeadPool() {
  // Enable real-time updates
  useLeadPoolSubscription();

  // ... rest of component
}
```

**Tables to Subscribe:** `leads`
**Events:** UPDATE (when owner_id changes), INSERT (new leads)
**Invalidation:** `['pooled-leads']`, `['leads']`

---

### 5.2 Priority 2: Conversations Metadata

**Goal:** Real-time conversation list updates (new conversations, unread counts, last message times)

**Implementation:**
```typescript
// Hook: src/hooks/useConversationsSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useConversationsSubscription = (selectedConversationId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const conversationChannel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('New message inserted:', payload.new);

          // Update conversation list when ANY message is inserted
          queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // Also update messages if this is the active conversation
          if (payload.new.conversation_id === selectedConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', selectedConversationId]
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message updated:', payload.new);

          // Update when message status changes (delivered → read)
          if (payload.new.conversation_id === selectedConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', selectedConversationId]
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from conversations updates');
      supabase.removeChannel(conversationChannel);
    };
  }, [selectedConversationId, queryClient]);
};
```

**Usage in Conversations.tsx:**
```typescript
// REPLACE existing subscription (lines 142-165) with:
import { useConversationsSubscription } from '@/hooks/useConversationsSubscription';

export default function Conversations() {
  // ... existing code ...

  // Replace old subscription with new hook
  useConversationsSubscription(selectedConversationId);

  // ... rest of component
}
```

**Tables to Subscribe:** `conversations`, `messages`
**Events:** All events (*) for conversations, INSERT/UPDATE for messages
**Invalidation:** `['conversations']`, `['messages', conversationId]`

---

### 5.3 Priority 3: Pipeline Real-Time Updates

**Goal:** Admins see real-time pipeline changes when monitoring salespeople

**Implementation:**
```typescript
// Hook: src/hooks/usePipelineSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';

export const usePipelineSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('pipeline-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          // Check if pipeline_stage_id changed
          if (payload.new.pipeline_stage_id !== payload.old.pipeline_stage_id) {
            console.log('Lead moved to new stage:', payload.new.id);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }

          // Also check if tags changed (affects badge display)
          if (JSON.stringify(payload.new.tags) !== JSON.stringify(payload.old.tags)) {
            console.log('Lead tags updated:', payload.new.id);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from pipeline updates');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
```

**Usage in Pipeline.tsx:**
```typescript
import { usePipelineSubscription } from '@/hooks/usePipelineSubscription';

export default function Pipeline() {
  // Enable real-time updates
  usePipelineSubscription();

  // ... rest of component
}
```

**Tables to Subscribe:** `leads`
**Events:** UPDATE (when pipeline_stage_id or tags change)
**Invalidation:** `['leads']`

---

### 5.4 Priority 4: Lead Tags (AI Classification Results)

**Goal:** Show AI-assigned tags in real-time on Leads page

**Implementation:**
```typescript
// Hook: src/hooks/useLeadTagsSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadTagsSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('lead-tags-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          // Invalidate when tags array changes
          if (JSON.stringify(payload.new.tags) !== JSON.stringify(payload.old.tags)) {
            console.log('Lead tags updated:', payload.new.id, payload.new.tags);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from lead tags updates');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
```

**Usage in Leads.tsx:**
```typescript
import { useLeadTagsSubscription } from '@/hooks/useLeadTagsSubscription';

export default function Leads() {
  // Enable real-time tag updates
  useLeadTagsSubscription();

  // ... rest of component
}
```

**Tables to Subscribe:** `leads`
**Events:** UPDATE (when tags change)
**Invalidation:** `['leads']`

---

## 6. Architectural Recommendations

### 6.1 Create Reusable Subscription Hook

**Generic Hook Pattern:**
```typescript
// src/hooks/useSupabaseSubscription.ts
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseSubscription = ({
  channel,
  table,
  event,
  filter,
  onEvent,
}: {
  channel: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onEvent: (payload: any) => void;
}) => {
  useEffect(() => {
    const subscription = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        onEvent
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel, table, event, filter, onEvent]);
};
```

**Usage Example:**
```typescript
// Simplified version in LeadPool.tsx
import { useSupabaseSubscription } from '@/hooks/useSupabaseSubscription';
import { useQueryClient } from '@tanstack/react-query';

export default function LeadPool() {
  const queryClient = useQueryClient();

  useSupabaseSubscription({
    channel: 'lead-pool',
    table: 'leads',
    event: 'UPDATE',
    filter: 'owner_id=not.is.null',
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
    },
  });

  // ... rest of component
}
```

---

### 6.2 Optimize React Query Settings

**Current Issue:** 5-minute stale time is too long for collaborative features

**Recommended Update to App.tsx:**
```typescript
// App.tsx - Update queryClient config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Reduce to 1 minute (for fallback)
      retry: 1,
      refetchOnWindowFocus: true, // Enable refetch on tab focus
      refetchOnReconnect: true,   // Enable refetch on network reconnect
    },
  },
});
```

**Rationale:**
- Real-time subscriptions handle most updates
- 1-minute stale time catches edge cases (subscription failures, race conditions)
- Window focus refetch improves multi-tab UX
- Network reconnect ensures data freshness after connectivity issues

---

### 6.3 Add Optimistic Updates for Common Actions

**Example: Claiming a Lead**

**Current Implementation (LeadPool.tsx):**
```typescript
const claimLeadMutation = useMutation({
  mutationFn: async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('leads')
      .update({ owner_id: user.id })
      .eq('id', leadId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
    toast({ title: 'Lead claimed!', description: 'This lead has been assigned to you.' });
  },
});
```

**Enhanced with Optimistic Updates:**
```typescript
const claimLeadMutation = useMutation({
  mutationFn: async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('leads')
      .update({ owner_id: user.id })
      .eq('id', leadId);

    if (error) throw error;
  },
  onMutate: async (leadId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['pooled-leads'] });

    // Snapshot previous value
    const previousLeads = queryClient.getQueryData(['pooled-leads']);

    // Optimistically remove lead from pool
    queryClient.setQueryData(['pooled-leads'], (old: any[]) =>
      old?.filter(lead => lead.id !== leadId) || []
    );

    return { previousLeads };
  },
  onError: (err, leadId, context) => {
    // Rollback on error
    queryClient.setQueryData(['pooled-leads'], context.previousLeads);
    toast({
      title: 'Failed to claim lead',
      description: 'This lead may have been claimed by another agent.',
      variant: 'destructive'
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pooled-leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast({ title: 'Lead claimed!', description: 'This lead has been assigned to you.' });
  },
});
```

**Benefits:**
- ✅ Instant UI feedback (lead disappears immediately)
- ✅ Rollback on failure (error handling)
- ✅ Real-time subscription ensures consistency across clients
- ✅ Better UX (no waiting for server response)

---

### 6.4 Implement Subscription Health Monitoring

**Problem:** Supabase subscriptions can fail silently due to network issues or RLS policies

**Recommended Hook:**
```typescript
// src/hooks/useSubscriptionStatus.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSubscriptionStatus = (channelName: string) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel.on('system', { event: 'connected' }, () => {
      setStatus('connected');
      console.log(`✅ Subscribed to ${channelName}`);
    });

    channel.on('system', { event: 'error' }, (error) => {
      setStatus('error');
      console.error(`❌ Subscription error on ${channelName}:`, error);
    });

    channel.on('system', { event: 'disconnected' }, () => {
      setStatus('disconnected');
      console.warn(`⚠️ Disconnected from ${channelName}`);
    });

    return () => {
      setStatus('disconnected');
    };
  }, [channelName]);

  return status;
};
```

**Usage in LeadPool.tsx:**
```typescript
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Badge } from '@/components/ui/badge';

export default function LeadPool() {
  const poolStatus = useSubscriptionStatus('lead-pool-changes');

  return (
    <div>
      {/* Show warning badge if subscription fails */}
      {poolStatus !== 'connected' && (
        <Badge variant="warning">
          ⚠️ Real-time updates offline
        </Badge>
      )}

      {/* ... rest of component */}
    </div>
  );
}
```

---

## 7. Implementation Priority Matrix

| Feature | Business Impact | Technical Complexity | Priority | Est. Effort | Files to Modify |
|---------|----------------|---------------------|----------|-------------|-----------------|
| Lead Pool Real-Time | 🔴 CRITICAL | Low | P0 | 2 hours | `LeadPool.tsx`, create `useLeadPoolSubscription.ts` |
| Optimistic Lead Claiming | 🔴 HIGH | Medium | P1 | 2 hours | `LeadPool.tsx` (enhance mutation) |
| Conversations Metadata | 🔴 HIGH | Medium | P1 | 3 hours | `Conversations.tsx`, create `useConversationsSubscription.ts` |
| Pipeline Updates (Admin) | 🟡 MEDIUM | Low | P2 | 2 hours | `Pipeline.tsx`, create `usePipelineSubscription.ts` |
| Lead Tags Updates | 🟡 MEDIUM | Low | P2 | 1 hour | `Leads.tsx`, create `useLeadTagsSubscription.ts` |
| Subscription Health Monitoring | 🟢 LOW | Low | P3 | 1 hour | Create `useSubscriptionStatus.ts`, add to all pages |
| Reusable Hook Library | 🟢 LOW | Medium | P3 | 3 hours | Create `useSupabaseSubscription.ts`, refactor existing |
| React Query Config Update | 🟡 MEDIUM | Low | P2 | 15 mins | `App.tsx` |

**Total Estimated Effort:** ~14 hours (2 working days)

---

## 8. Testing Recommendations

### 8.1 Multi-User Testing Scenarios

#### Scenario 1: Lead Pool Race Condition
**Objective:** Verify leads disappear instantly when claimed by another agent

**Steps:**
1. Open Lead Pool on two browser windows (different agents)
2. Both agents should see the same lead
3. Agent A clicks "Claim Lead"
4. Verify Agent B's view updates instantly (lead removed)
5. Verify Agent A sees lead in their Pipeline
6. Verify Agent A cannot claim the lead again

**Expected Result:**
- Lead disappears from Agent B's view within 1-2 seconds
- Agent B does not see any error if they try to claim the removed lead
- Both agents' lead counts update correctly

---

#### Scenario 2: Conversation Real-Time Updates
**Objective:** Verify conversation list updates when new messages arrive

**Steps:**
1. Agent has Conversations page open
2. Simulate inbound message via database INSERT:
   ```sql
   INSERT INTO messages (conversation_id, content, is_from_customer, created_at)
   VALUES ('uuid-here', 'Test message', true, NOW());
   ```
3. Verify conversation list updates (conversation moves to top)
4. Verify `last_message_at` timestamp updates
5. Verify unread count increments
6. Open the conversation, verify message appears

**Expected Result:**
- Conversation appears at top of list within 1-2 seconds
- Unread badge shows correct count
- No manual refresh required

---

#### Scenario 3: AI Handoff Badge
**Objective:** Verify handoff badge appears when AI sets flag

**Steps:**
1. Agent has Conversations page open
2. Simulate AI handoff via database UPDATE:
   ```sql
   UPDATE conversations
   SET requires_human_handoff = true, handoff_triggered_at = NOW()
   WHERE id = 'uuid-here';
   ```
3. Verify orange handoff badge appears on conversation
4. Verify "Handoff" tab count increments
5. Filter by "Handoff" tab, verify conversation appears

**Expected Result:**
- Handoff badge appears within 1-2 seconds
- Tab count updates automatically
- No manual refresh required

---

#### Scenario 4: Admin Pipeline Monitoring
**Objective:** Verify admin sees real-time updates when monitoring salespeople

**Steps:**
1. Admin opens Pipeline, filters by "Salesperson A"
2. Salesperson A (different session) drags lead to new stage
3. Verify Admin sees update within 1-2 seconds
4. Verify lead appears in correct column
5. Verify stage counts update

**Expected Result:**
- Lead moves to new column in admin's view
- Stage counts update automatically
- No manual refresh required

---

#### Scenario 5: CSV Import + Lead Pool
**Objective:** Verify new leads appear in pool after import

**Steps:**
1. Agent A has Lead Pool open
2. Agent B uploads CSV with 10 new leads
3. Verify Agent A sees "Available Leads" count increase
4. Verify new leads appear in Lead Pool list
5. No manual refresh required

**Expected Result:**
- Lead count updates within 1-2 seconds
- New leads appear in list
- Proper sorting maintained

---

### 8.2 Edge Cases

#### Edge Case 1: Network Disconnection
**Test:** Disconnect network, reconnect after 30 seconds
**Expected:** Subscription reconnects, missed updates fetched via cache invalidation

#### Edge Case 2: Subscription Failure
**Test:** Simulate RLS policy blocking subscription
**Expected:** Health monitoring shows warning badge, fallback to 1-minute cache refresh

#### Edge Case 3: Multiple Tabs
**Test:** Open same page in 3 tabs as same user
**Expected:** All tabs receive subscription updates, no duplicate queries

#### Edge Case 4: RLS Policies
**Test:** Agent claims lead, verify other agents don't receive UPDATE events for that lead's future changes
**Expected:** Subscriptions respect RLS policies (agents only see pool leads)

#### Edge Case 5: Rapid Updates
**Test:** Bulk update 50 leads simultaneously
**Expected:** React Query deduplicates invalidation calls, single refetch occurs

---

## 9. Performance Considerations

### 9.1 Subscription Count Limits

**Supabase Realtime Limits:**
- Free tier: 200 concurrent connections
- Pro tier: 500+ concurrent connections

**Current Risk Assessment:** 🟢 LOW

**Calculation:**
- Assuming 20 concurrent users
- 3-4 subscriptions per user (Lead Pool + Conversations + Pipeline + Leads)
- Total: 60-80 concurrent connections
- **Well within limits**

**Recommendation:** Monitor connection count in Supabase Dashboard → Realtime → Connections

**Mitigation Strategy:**
- If approaching limits, consolidate subscriptions into shared channels
- Implement connection pooling for heavy pages
- Consider upgrading to Pro tier if team grows beyond 50 agents

---

### 9.2 Payload Size

**Current Table Sizes:**
- `leads`: ~500 bytes per row (includes tags array, all fields)
- `conversations`: ~200 bytes per row
- `messages`: ~300 bytes per row (text content)

**Subscription Payload:**
- Each UPDATE event sends full row (new + old values)
- Typical payload: 500-1000 bytes per event
- Compressed over WebSocket: ~200-400 bytes

**Optimization Opportunities:**
- ✅ Already using `.filter()` on subscriptions (good!)
- ✅ Already invalidating queries instead of updating cache directly (React Query refetches only needed data)
- Future: Consider pagination for large result sets (not needed at current scale)

**Bandwidth Estimate:**
- 10 updates/minute per user × 400 bytes = 4 KB/min
- 20 users × 4 KB/min = 80 KB/min = 4.8 MB/hour
- **Negligible bandwidth impact**

---

### 9.3 Battery Impact (Mobile)

**Issue:** Real-time subscriptions use persistent WebSocket connections, which can drain mobile battery

**Current Mitigation:**
- ✅ Proper cleanup on unmount (already implemented)
- ✅ Subscriptions only active when component mounted
- ✅ Single WebSocket connection shared across subscriptions (Supabase multiplexing)

**Additional Recommendations:**
- Enable `refetchOnWindowFocus` as fallback (allows closing WebSocket when tab inactive)
- Consider reducing subscription count on mobile devices (future enhancement)
- Monitor battery usage in production

**Battery Test:**
- Leave page open on mobile for 1 hour
- Measure battery drain vs. non-subscribed page
- Expected: < 2% additional battery drain

---

### 9.4 React Query Cache Efficiency

**Current Cache Keys:**
```typescript
['leads', user?.id, searchQuery, sortColumn, sortDirection, isAdmin]
['pooled-leads', search]
['conversations', search, handoffFilter]
['messages', selectedConversationId]
```

**Issue:** Complex cache keys create multiple cache entries

**Recommendation:** Keep current structure, benefits outweigh costs:
- ✅ Granular invalidation (only refetch what changed)
- ✅ Prevents unnecessary API calls
- ✅ Cache size remains small (< 5 MB typical)

**Monitoring:**
- Log cache size periodically: `queryClient.getQueryCache().getAll().length`
- Set up cache garbage collection: `queryClient.clear()` on logout

---

## 10. Migration Plan

### Phase 1: Critical Fixes (Week 1 - Days 1-2)

**Goal:** Fix pool-based lead claiming race condition

**Tasks:**
1. ✅ Create `src/hooks/useLeadPoolSubscription.ts`
2. ✅ Integrate into `LeadPool.tsx`
3. ✅ Add optimistic updates to `claimLeadMutation`
4. ✅ Test multi-user lead claiming scenarios
5. ✅ Verify RLS policies don't block subscriptions

**Deliverables:**
- Lead Pool works correctly with multiple agents
- No race conditions
- Instant UI updates

**Testing:**
- Scenario 1: Lead Pool Race Condition
- Edge Case 3: Multiple Tabs
- Edge Case 4: RLS Policies

---

### Phase 2: Core Features (Week 1 - Days 3-4)

**Goal:** Real-time conversation updates

**Tasks:**
1. ✅ Create `src/hooks/useConversationsSubscription.ts`
2. ✅ Replace existing subscription in `Conversations.tsx`
3. ✅ Test new conversation creation
4. ✅ Test handoff badge updates
5. ✅ Test unread count updates

**Deliverables:**
- Conversation list updates in real-time
- Handoff badges appear instantly
- Unread counts accurate

**Testing:**
- Scenario 2: Conversation Real-Time Updates
- Scenario 3: AI Handoff Badge
- Edge Case 1: Network Disconnection

---

### Phase 3: Admin Features (Week 2 - Days 1-2)

**Goal:** Real-time pipeline monitoring for admins

**Tasks:**
1. ✅ Create `src/hooks/usePipelineSubscription.ts`
2. ✅ Integrate into `Pipeline.tsx`
3. ✅ Create `src/hooks/useLeadTagsSubscription.ts`
4. ✅ Integrate into `Leads.tsx`
5. ✅ Test admin monitoring scenarios

**Deliverables:**
- Admins see real-time pipeline changes
- Lead tags update when AI classifies
- CSV imports appear instantly

**Testing:**
- Scenario 4: Admin Pipeline Monitoring
- Scenario 5: CSV Import + Lead Pool
- Edge Case 5: Rapid Updates

---

### Phase 4: Refinement (Week 2 - Days 3-5)

**Goal:** Polish and optimization

**Tasks:**
1. ✅ Create `src/hooks/useSupabaseSubscription.ts` (generic hook)
2. ✅ Create `src/hooks/useSubscriptionStatus.ts` (health monitoring)
3. ✅ Update `App.tsx` React Query config (reduce stale time to 1 minute)
4. ✅ Add health monitoring badges to all pages
5. ✅ Refactor existing subscriptions to use generic hook
6. ✅ Document subscription architecture in `CLAUDE.md`
7. ✅ Performance testing and optimization

**Deliverables:**
- Reusable hook library
- Health monitoring on all pages
- Optimized React Query config
- Complete documentation

**Testing:**
- All scenarios end-to-end
- All edge cases
- Performance benchmarks
- Battery usage testing

---

## 11. Summary & Next Steps

### 11.1 Current State Summary

**What's Broken:**
- ❌ Lead Pool has race conditions (CRITICAL)
- ❌ Conversations list doesn't update (HIGH)
- ❌ Handoff badges don't appear (HIGH)
- ❌ Admin monitoring shows stale data (MEDIUM)
- ❌ AI tags don't appear in real-time (MEDIUM)
- ❌ CSV imports require refresh (LOW)

**Root Causes:**
1. Only 1 of 6 pages has partial real-time subscriptions
2. 5-minute cache staleness is too long
3. No optimistic updates for user actions
4. No cross-page cache invalidation

---

### 11.2 What Needs Implementation

**Priority 0 (CRITICAL):**
- Lead Pool real-time subscriptions
- Optimistic lead claiming
- **Est. 4 hours**

**Priority 1 (HIGH):**
- Conversations metadata subscriptions
- Update existing message subscription
- **Est. 3 hours**

**Priority 2 (MEDIUM):**
- Pipeline real-time updates
- Lead tags subscriptions
- React Query config update
- **Est. 3 hours**

**Priority 3 (POLISH):**
- Reusable hooks
- Health monitoring
- Documentation
- **Est. 4 hours**

**Total Effort:** ~14 hours (2 working days)

---

### 11.3 Recommended Approach

**Strategy:** Database subscriptions + React Query invalidation + Optimistic updates

**Architecture:**
```
Supabase Real-Time (WebSocket)
  ↓
useSupabaseSubscription Hook
  ↓
React Query Cache Invalidation
  ↓
Automatic Refetch
  ↓
UI Updates
```

**Benefits:**
- ✅ Instant UI updates across all users
- ✅ No race conditions in lead claiming
- ✅ Better collaboration between agents
- ✅ Real-time admin monitoring
- ✅ Improved UX with optimistic updates

**Performance:**
- 60-80 concurrent connections (well within limits)
- < 5 MB/hour bandwidth per user
- Minimal battery impact
- Sub-second update latency

---

### 11.4 Expected Outcome

**After Implementation:**
- ✅ **Lead Pool:** Leads disappear instantly when claimed by other agents
- ✅ **Conversations:** New messages appear without refresh
- ✅ **Handoff Badges:** Orange badges appear when AI sets flag
- ✅ **Admin Monitoring:** Real-time pipeline updates for team oversight
- ✅ **AI Tags:** Classification results appear instantly
- ✅ **CSV Imports:** New leads appear in lists automatically
- ✅ **Optimistic Updates:** Instant feedback for user actions
- ✅ **Health Monitoring:** Warning badges if real-time fails

**User Experience:**
- No manual refreshes required
- Instant feedback on all actions
- True collaborative CRM experience
- Real-time team coordination

---

### 11.5 Next Steps

**Decision Required:**

Would you like to:

1. **Start with Priority 0 (Lead Pool)** - Fix the critical race condition first, then iterate
2. **Implement all priorities at once** - Complete real-time system in one go (~2 days)
3. **Create reusable hooks first** - Build foundation, then add subscriptions
4. **Phase 1 only (Week 1)** - Get critical + core features working, defer polish

**Recommendation:** Option 1 (Start with P0)
- Fixes most critical business logic issue
- Validates approach before broader implementation
- Allows testing in production before full rollout
- Lower risk, faster time to value

---

## File Structure Summary

**New Files to Create:**
```
src/hooks/
  ├── useLeadPoolSubscription.ts      (P0 - Lead Pool)
  ├── useConversationsSubscription.ts (P1 - Conversations)
  ├── usePipelineSubscription.ts      (P2 - Pipeline)
  ├── useLeadTagsSubscription.ts      (P2 - Lead Tags)
  ├── useSupabaseSubscription.ts      (P3 - Reusable generic)
  └── useSubscriptionStatus.ts        (P3 - Health monitoring)
```

**Files to Modify:**
```
src/
  ├── App.tsx                         (Update React Query config)
  └── pages/
      ├── LeadPool.tsx               (Add subscription + optimistic updates)
      ├── Conversations.tsx          (Replace existing subscription)
      ├── Pipeline.tsx               (Add subscription)
      └── Leads.tsx                  (Add subscription)
```

**Documentation to Update:**
```
CLAUDE.md                            (Add real-time architecture section)
```

---

**Report End**

**Generated:** November 29, 2025
**Analysis Coverage:** 6 pages, 3 hooks, React Query, Supabase Real-Time
**Total Findings:** 6 critical issues, 14 hours estimated fix time
