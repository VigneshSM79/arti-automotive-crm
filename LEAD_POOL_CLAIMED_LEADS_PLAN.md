# Lead Pool - Show Claimed Leads Implementation Plan

## Current State Analysis

### Current Lead Pool Behavior (LeadPool.tsx)
```typescript
// Line 52: Only shows unassigned leads
.is('owner_id', null)

// Line 53: Only AI-qualified leads
.eq('conversations.requires_human_handoff', true)
```

**Problem**: When agent claims lead → Lead disappears from pool → Can't track who claimed what

---

## Desired Behavior

### For Regular Agents:
- See **Available leads** (owner_id = null)
- See **Their own claimed leads** (owner_id = current user)
- Cannot see other agents' claimed leads

### For Admins:
- Dropdown to select salesperson (like Pipeline page)
- Options: "All Salespeople" or specific agent
- See **Available leads** (owner_id = null)
- See **Claimed leads** by selected salesperson

---

## Implementation Steps

### **Step 1: Add Required Imports**

Add these imports at the top of `LeadPool.tsx`:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

**Why**: Need auth context, role detection, and dropdown component

---

### **Step 2: Add State Variables**

Add after line 13 (after existing state):

```typescript
const { user } = useAuth();
const { data: userRole } = useUserRole();
const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
```

**Why**:
- `user` - Get current user ID for filtering
- `userRole` - Detect if admin
- `selectedSalesperson` - Track admin's dropdown selection

---

### **Step 3: Fetch All Users (Admins Only)**

Add this query after line 15 (before the leads query):

```typescript
// Fetch all users for admin dropdown
const { data: allUsers } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .order('full_name');

    if (error) throw error;
    return data;
  },
  enabled: userRole?.isAdmin === true, // Only run for admins
});
```

**Why**: Admin dropdown needs list of salespeople to filter by

---

### **Step 4: Update Leads Query with Role-Based Filtering**

Replace the query (lines 25-60) with this:

```typescript
const { data: leads, isLoading: loadingLeads } = useQuery({
  queryKey: ['pooled-leads', search, selectedSalesperson, user?.id, userRole?.isAdmin],
  queryFn: async () => {
    if (!user) return [];

    let query = supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        tags,
        notes,
        owner_id,
        status,
        lead_source,
        pipeline_stage_id,
        claimed_at,
        pipeline_stages (
          id,
          name,
          color
        ),
        conversations!inner (
          id,
          requires_human_handoff
        ),
        owner:users!owner_id (
          id,
          full_name
        )
      `)
      .eq('conversations.requires_human_handoff', true); // Only AI-qualified leads

    // Role-based filtering
    if (userRole?.isAdmin) {
      // Admin: Filter by selected salesperson or show all
      if (selectedSalesperson && selectedSalesperson !== 'all') {
        // Show unassigned leads OR leads owned by selected salesperson
        query = query.or(`owner_id.is.null,owner_id.eq.${selectedSalesperson}`);
      }
      // If 'all', show all leads (assigned + unassigned) - no filter needed
    } else {
      // Regular agent: Show unassigned leads OR their own claimed leads
      query = query.or(`owner_id.is.null,owner_id.eq.${user.id}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});
```

**Key Changes**:
1. **Line 26**: Added `selectedSalesperson`, `user.id`, `userRole.isAdmin` to query key (refetch when these change)
2. **Line 46**: Added `claimed_at` field
3. **Lines 52-56**: Added join to `users` table to get owner name
4. **Line 59**: REMOVED `.is('owner_id', null)` filter
5. **Lines 62-74**: Added role-based filtering logic (same as Pipeline)

**Logic**:
- **Admins with 'all'**: No owner filter → See all leads
- **Admins with specific salesperson**: `.or()` → See unassigned OR that salesperson's leads
- **Regular agents**: `.or()` → See unassigned OR their own leads

---

### **Step 5: Separate Leads into Available vs Claimed**

Add this after the query (around line 85):

```typescript
// Separate leads into available and claimed
const availableLeads = filteredLeads?.filter((lead: any) => lead.owner_id === null) || [];
const claimedLeads = filteredLeads?.filter((lead: any) => lead.owner_id !== null) || [];
```

**Why**: Display two sections in the UI

---

### **Step 6: Add Admin Dropdown in Header**

Update the header section (lines 92-106) to include dropdown:

```typescript
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Lead Pool</h1>
    <p className="text-muted-foreground">
      {userRole?.isAdmin
        ? 'View and manage team lead pool'
        : 'AI-qualified leads ready for claiming'}
    </p>
  </div>
  <div className="flex items-center gap-3">
    {/* Admin: Salesperson Filter */}
    {userRole?.isAdmin && allUsers && (
      <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select salesperson" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Salespeople</SelectItem>
          {allUsers.map((salesUser: any) => (
            <SelectItem key={salesUser.id} value={salesUser.id}>
              {salesUser.full_name || 'Unknown'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}

    {/* Search */}
    <div className="relative w-64">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  </div>
</div>
```

**Why**: Admins can switch between salespeople (same UX as Pipeline)

---

### **Step 7: Update UI to Show Two Sections**

Replace the main content (lines 108-188) with:

```typescript
{loadingLeads ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-32 bg-muted animate-pulse rounded" />
    ))}
  </div>
) : (
  <>
    {/* SECTION 1: Available Leads */}
    {availableLeads.length > 0 && (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-base px-3 py-1">
            {availableLeads.length} Available Lead{availableLeads.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableLeads.map((lead: any) => (
            <Card
              key={lead.id}
              className="p-4 hover:shadow-lg transition-shadow border-2 border-orange-200 bg-orange-50/30"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    {lead.email && (
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    )}
                  </div>
                </div>

                {lead.lead_source && (
                  <Badge variant="outline" className="text-xs bg-white">
                    {lead.lead_source}
                  </Badge>
                )}

                {lead.tags && lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {lead.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {lead.notes}
                  </p>
                )}

                <Button
                  onClick={() => claimLeadMutation.mutate(lead.id)}
                  disabled={claimLeadMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  {claimLeadMutation.isPending ? 'Claiming...' : 'Claim Lead'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )}

    {/* SECTION 2: Claimed Leads */}
    {claimedLeads.length > 0 && (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-3 py-1">
            {claimedLeads.length} Claimed Lead{claimedLeads.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {claimedLeads.map((lead: any) => (
            <Card
              key={lead.id}
              className="p-4 hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/30"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    {lead.email && (
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    )}
                  </div>
                </div>

                {/* Owner Badge */}
                <Badge variant="default" className="text-xs bg-blue-600">
                  👤 {lead.owner?.full_name || 'Unknown'}
                </Badge>

                {/* Claimed Date */}
                {lead.claimed_at && (
                  <p className="text-xs text-muted-foreground">
                    Claimed {new Date(lead.claimed_at).toLocaleDateString()}
                  </p>
                )}

                {lead.lead_source && (
                  <Badge variant="outline" className="text-xs bg-white">
                    {lead.lead_source}
                  </Badge>
                )}

                {lead.tags && lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {lead.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {lead.notes}
                  </p>
                )}

                {/* Already Claimed - Show Button as Disabled */}
                <Button
                  disabled
                  className="w-full"
                  size="sm"
                  variant="outline"
                >
                  ✓ Claimed
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )}

    {/* Empty State */}
    {availableLeads.length === 0 && claimedLeads.length === 0 && (
      <Card className="p-12">
        <div className="text-center space-y-3">
          <div className="text-6xl">🏊</div>
          <h3 className="text-xl font-semibold">No leads in the pool</h3>
          <p className="text-muted-foreground">
            {search
              ? 'No leads match your search criteria'
              : 'No AI-qualified leads available. New leads will appear here when they become available.'}
          </p>
        </div>
      </Card>
    )}
  </>
)}
```

**Key Features**:
1. **Two sections**: Available (orange) + Claimed (green)
2. **Claimed leads show**:
   - Owner name badge (blue)
   - Claimed date
   - Disabled "✓ Claimed" button
3. **Visual distinction**: Different border colors (orange vs green)

---

### **Step 8: Update Real-Time Subscription Filter**

Update line 21:

```typescript
// OLD (line 21):
filter: 'owner_id=neq.null', // Only listen when claimed

// NEW:
filter: 'owner_id=neq.null', // Listen for claim events to refresh
```

**Why**: Still need to refresh when leads are claimed, but now we keep them visible

---

## Summary of Changes

### Data Flow Changes:

**Before**:
```
Query: owner_id = null AND requires_human_handoff = true
→ Shows only unassigned leads
→ Lead claimed → Disappears from pool
```

**After**:
```
Query: requires_human_handoff = true AND (owner_id = null OR owner_id = current_user)
→ Shows unassigned + own claimed leads (agents)
→ Shows unassigned + selected salesperson's leads (admins)
→ Lead claimed → Moves to "Claimed Leads" section
```

### UI Changes:

**Before**:
- Single section: "Available Leads"
- Orange cards with "Claim Lead" button
- No admin controls

**After**:
- Two sections: "Available Leads" + "Claimed Leads"
- Available: Orange cards, "Claim Lead" button
- Claimed: Green cards, owner badge, claimed date, disabled button
- Admin dropdown to filter by salesperson

---

## Visual Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Pool                    [Dropdown: All Salespeople ▼]   │
│ View and manage team lead pool              [Search... 🔍]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [5 Available Leads]                                           │
│                                                               │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                   │
│ │John Smith │ │Sarah Lee  │ │Mike Jones │  (Orange cards)   │
│ │7785552345 │ │6045551234 │ │6043334444 │                   │
│ │[Claim]    │ │[Claim]    │ │[Claim]    │                   │
│ └───────────┘ └───────────┘ └───────────┘                   │
│                                                               │
│ [3 Claimed Leads]                                             │
│                                                               │
│ ┌───────────┐ ┌───────────┐                                 │
│ │Jane Doe   │ │Tom Wilson │               (Green cards)     │
│ │7785559876 │ │6045559999 │                                 │
│ │👤 Alice J. │ │👤 Bob K.  │               (Owner badges)   │
│ │Claimed    │ │Claimed    │                                 │
│ │11/29/25   │ │11/30/25   │               (Claimed dates)   │
│ │[✓ Claimed]│ │[✓ Claimed]│               (Disabled btns)   │
│ └───────────┘ └───────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits

✅ **Track claimed leads** - See who claimed which leads
✅ **Admin visibility** - Admins can monitor all salespeople
✅ **Agent visibility** - Agents see their own claimed leads
✅ **Historical record** - claimed_at timestamp tracks claim time
✅ **Consistent UX** - Same dropdown pattern as Pipeline page
✅ **Performance tracking** - See how many leads each person claimed

---

## Testing Checklist

### As Regular Agent:
- [ ] See available leads (orange section)
- [ ] See your own claimed leads (green section)
- [ ] Do NOT see other agents' claimed leads
- [ ] Claim button works on available leads
- [ ] Claim button disabled on claimed leads

### As Admin:
- [ ] See salesperson dropdown
- [ ] Select "All Salespeople" → See all available + all claimed
- [ ] Select specific salesperson → See available + that person's claimed
- [ ] Claimed leads show owner name correctly
- [ ] Claimed date displays correctly

### Real-time Updates:
- [ ] When lead claimed → Moves from orange to green section
- [ ] When another agent claims → Lead updates in real-time (if admin viewing "All")

---

**Implementation Time**: ~30-45 minutes
**Complexity**: Medium (follows existing Pipeline pattern)
**Files Modified**: 1 file (`src/pages/LeadPool.tsx`)
