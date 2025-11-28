# Frontend Architecture - Automotive AI Platform

## Overview

Complete frontend planning for the Automotive AI CRM platform built with React, Shadcn, and Tailwind CSS.

**Last Updated:** 2025-11-16
**Status:** Planning Phase

---

## Tech Stack

- **Framework:** React 18+
- **UI Components:** Shadcn UI
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** React Context + Custom Hooks
- **Database Client:** Supabase JS Client
- **CSV Parsing:** Papa Parse
- **Data Fetching:** React Query (TanStack Query)
- **Form Handling:** React Hook Form
- **Date Handling:** date-fns
- **Charts:** Recharts or Chart.js
- **Icons:** Lucide React

---

## Application Structure

```
src/
├── app/
│   ├── App.jsx                      # Main app component
│   ├── routes.jsx                   # Route definitions
│   └── layout/
│       ├── AppLayout.jsx            # Main layout wrapper
│       ├── Sidebar.jsx              # Left navigation sidebar
│       ├── Header.jsx               # Top header bar
│       └── MobileNav.jsx            # Mobile navigation
│
├── pages/
│   ├── Dashboard/
│   │   ├── DashboardPage.jsx        # Main dashboard container
│   │   ├── OverviewTab.jsx          # Overview analytics tab
│   │   └── AnalyticsTab.jsx         # Detailed analytics tab
│   │
│   ├── Conversations/
│   │   ├── ConversationsPage.jsx    # Conversations list view
│   │   ├── ConversationDetail.jsx   # Single conversation thread
│   │   └── ConversationFilters.jsx  # Filter sidebar/modal
│   │
│   ├── Leads/
│   │   ├── LeadsPage.jsx            # Leads list/table view
│   │   ├── LeadDetail.jsx           # Lead detail view
│   │   └── LeadEditModal.jsx        # Edit lead modal
│   │
│   ├── Pipelines/
│   │   ├── PipelinePage.jsx         # Kanban board view
│   │   ├── PipelineCard.jsx         # Contact card in pipeline
│   │   └── PipelineStage.jsx        # Pipeline stage column
│   │
│   ├── Contacts/
│   │   ├── ContactsPage.jsx         # Contacts table view
│   │   ├── ContactDetail.jsx        # Ct detail ontacdrawer
│   │   └── BulkUploadModal.jsx      # CSV upload modal
│   │
│   ├── BulkSMS/
│   │   ├── BulkSMSPage.jsx          # Bulk messaging interface
│   │   └── SMSPreview.jsx           # Preview before send
│   │
│   ├── Templates/
│   │   ├── TemplatesPage.jsx        # Message templates list
│   │   ├── TemplateEditor.jsx       # Create/edit template
│   │   └── TemplatePreview.jsx      # Template preview
│   │
│   ├── Campaigns/
│   │   ├── CampaignsPage.jsx        # All campaigns overview
│   │   ├── CampaignDetail.jsx       # Single campaign view
│   │   ├── CampaignEditor.jsx       # Create/edit campaign
│   │   └── CampaignEnrollments.jsx  # Leads enrolled in campaign
│   │
│   ├── Agents/
│   │   └── AgentsPage.jsx           # AI agent settings
│   │
│   ├── Followups/
│   │   └── FollowupsPage.jsx        # Scheduled followups
│   │
│   └── Automations/
│       └── AutomationsPage.jsx      # Automation rules
│
├── components/
│   ├── ui/                          # Shadcn UI components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── table.jsx
│   │   ├── dialog.jsx
│   │   ├── dropdown-menu.jsx
│   │   ├── input.jsx
│   │   ├── badge.jsx
│   │   ├── select.jsx
│   │   ├── textarea.jsx
│   │   ├── tabs.jsx
│   │   ├── drawer.jsx
│   │   ├── calendar.jsx
│   │   └── ...
│   │
│   ├── dashboard/
│   │   ├── MetricCard.jsx           # KPI metric card
│   │   ├── ActivityChart.jsx        # Call/message charts
│   │   ├── DateRangePicker.jsx      # Date range selector
│   │   └── TeamSelector.jsx         # Team member filter
│   │
│   ├── conversations/
│   │   ├── ConversationList.jsx     # List of conversations
│   │   ├── ConversationItem.jsx     # Single conversation row
│   │   ├── MessageThread.jsx        # Message thread view
│   │   ├── MessageBubble.jsx        # Single message bubble
│   │   ├── ChannelTabs.jsx          # SMS/Facebook/Discord tabs
│   │   └── ConversationTags.jsx     # Tag pills on conversation
│   │
│   ├── leads/
│   │   ├── LeadsTable.jsx           # Leads data table
│   │   ├── LeadRow.jsx              # Single lead row
│   │   ├── LeadTags.jsx             # Tag management component
│   │   ├── LeadFilters.jsx          # Filter panel
│   │   └── LeadSearch.jsx           # Search input
│   │
│   ├── contacts/
│   │   ├── ContactsTable.jsx        # Contacts data table
│   │   ├── ContactRow.jsx           # Single contact row
│   │   ├── ContactActions.jsx       # Action buttons (view, message, etc.)
│   │   ├── BulkUpload.jsx           # CSV upload component
│   │   └── CSVValidator.jsx         # CSV validation logic
│   │
│   ├── pipeline/
│   │   ├── KanbanBoard.jsx          # Main kanban container
│   │   ├── KanbanColumn.jsx         # Pipeline stage column
│   │   ├── KanbanCard.jsx           # Draggable contact card
│   │   ├── StageHeader.jsx          # Column header with count
│   │   └── DragDropContext.jsx      # Drag & drop wrapper
│   │
│   ├── templates/
│   │   ├── TemplateList.jsx         # List of templates
│   │   ├── TemplateCard.jsx         # Template preview card
│   │   ├── TemplateForm.jsx         # Create/edit form
│   │   └── PlaceholderHelper.jsx    # {first_name} helper
│   │
│   ├── campaigns/
│   │   ├── CampaignList.jsx         # All campaigns list
│   │   ├── CampaignCard.jsx         # Campaign summary card
│   │   ├── CampaignTimeline.jsx     # Visual timeline (Day 1, 2, 4, 6)
│   │   ├── MessageSchedule.jsx      # Day-by-day messages
│   │   ├── EnrollmentStatus.jsx     # Active/paused/completed
│   │   └── CampaignMetrics.jsx      # Response rate, completion
│   │
│   ├── shared/
│   │   ├── Pagination.jsx           # Pagination controls
│   │   ├── EmptyState.jsx           # Empty state illustrations
│   │   ├── LoadingSpinner.jsx       # Loading indicators
│   │   ├── ErrorBoundary.jsx        # Error handling
│   │   ├── SearchBar.jsx            # Reusable search
│   │   ├── FilterButton.jsx         # Filter toggle button
│   │   ├── ExportButton.jsx         # CSV export
│   │   ├── BulkActions.jsx          # Bulk action toolbar
│   │   └── ConfirmDialog.jsx        # Confirmation modal
│   │
│   └── forms/
│       ├── LeadForm.jsx             # Add/edit lead form
│       ├── ContactForm.jsx          # Add/edit contact form
│       ├── TemplateForm.jsx         # Message template form
│       └── CampaignForm.jsx         # Campaign creation form
│
├── hooks/
│   ├── useLeads.js                  # Leads CRUD operations
│   ├── useConversations.js          # Conversations queries
│   ├── useMessages.js               # Messages queries
│   ├── useTemplates.js              # Templates CRUD
│   ├── useCampaigns.js              # Campaigns CRUD
│   ├── useEnrollments.js            # Campaign enrollments
│   ├── useContacts.js               # Contacts CRUD
│   ├── useDashboard.js              # Dashboard metrics
│   ├── useSupabase.js               # Supabase client wrapper
│   ├── useAuth.js                   # Authentication
│   └── useDebounce.js               # Debounce hook
│
├── lib/
│   ├── supabase.js                  # Supabase client config
│   ├── utils.js                     # Utility functions
│   ├── validators.js                # Validation functions
│   ├── formatters.js                # Phone, date formatters
│   └── constants.js                 # App constants
│
├── context/
│   ├── AuthContext.jsx              # User authentication state
│   ├── ThemeContext.jsx             # Dark/light theme
│   └── NotificationContext.jsx      # Toast notifications
│
└── styles/
    └── globals.css                  # Global Tailwind styles
```

---

## Page Definitions

### 1. Dashboard Page (`/dashboard`)

**Purpose:** High-level analytics and metrics overview

**Layout:**
- Header with date range picker and team selector
- Two tabs: Overview | Analytics
- Grid of metric cards
- Charts for call/message activity

**Components:**
```jsx
<DashboardPage>
  <Header>
    <DateRangePicker />
    <TeamSelector />
  </Header>

  <Tabs defaultValue="overview">
    <TabsList>
      <Tab>Overview</Tab>
      <Tab>Analytics</Tab>
    </TabsList>
# the first version only has SMS being sent out and we will need to have tab where user can select SMS, calls to toggle between analytics
    <TabContent value="overview">
      <MetricsGrid>
        <MetricCard title="Total Calls" value="5,378" trend="+33%" />
        <MetricCard title="Inbound Calls" value="389" trend="-47%" />
        <MetricCard title="Outbound Calls" value="4,989" trend="+51%" />
        <MetricCard title="Missed Calls" value="1,506" trend="+42%" />
        <MetricCard title="Total Messages" value="18,071" trend="-52%" />
        <MetricCard title="Unread Texts" value="63" trend="+100%" />
      </MetricsGrid>

      <ChartsGrid>
        <ActivityChart type="calls" />
        <ActivityChart type="messages" />
      </ChartsGrid>
    </TabContent>

    <TabContent value="analytics">
      {/* Detailed analytics */}
    </TabContent>
  </Tabs>
</DashboardPage>
```

**Data Requirements:**
- Call metrics (total, inbound, outbound, missed)
- Message metrics (total, inbound, outbound, unread)
- Time-series data for charts
- Comparison with previous period

**Supabase Queries:**
```javascript
// Get call metrics for date range
const { data: metrics } = await supabase
  .rpc('get_dashboard_metrics', {
    start_date: '2025-10-14',
    end_date: '2025-11-13',
    team_member: 'all'
  })
```

---

### 2. Conversations Page (`/conversations`)

**Purpose:** View and manage all SMS conversations

**Layout:**
- Left panel: List of conversations with search/filters
- Right panel: Selected conversation thread
- Search bar and filters button

**Components:**
```jsx
<ConversationsPage>
  <ChannelTabs>
    <Tab icon={<MessageIcon />} count={3}>SMS</Tab>
    <Tab icon={<FacebookIcon />}>Facebook</Tab>
  </ChannelTabs>

  <LeftPanel>
    <SearchBar placeholder="Search conversations..." />
    <ActionBar>
      <Button>New Chat</Button>
      <Button variant="ghost" icon={<PhoneIcon />} />
      <Button variant="ghost">Filters</Button>
    </ActionBar>

    <ConversationList>
      {conversations.map(conv => (
        <ConversationItem
          key={conv.id}
          avatar={conv.lead.initials}
          name={conv.lead.name}
          lastMessage={conv.lastMessage}
          timestamp={conv.timestamp}
          tags={conv.tags}
          isOnline={conv.isOnline}
        />
      ))}
    </ConversationList>

    <Pagination page={1} total={1462} />
  </LeftPanel>

  <RightPanel>
    {selectedConversation ? (
      <MessageThread conversationId={selectedConversation.id} />
    ) : (
      <EmptyState message="Select a conversation to start chatting" />
    )}
  </RightPanel>
</ConversationsPage>
```

**Data Requirements:**
- Conversations list with last message
- Message threads for selected conversation
- Real-time updates for new messages
- Pagination 

**Supabase Queries:**
```javascript
// Get conversations list
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    id,
    status,
    created_at,
    leads!inner (
      id,
      first_name,
      last_name,
      tags
    ),
    messages (
      content,
      created_at,
      direction
    )
  `)
  .order('updated_at', { ascending: false })
  .range(0, 49)

// Get messages for conversation
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true })
```

---

### 3. Leads Page (`/leads`)

**Purpose:** Manage all leads with filtering and search

**Layout:**
- Search bar at top
- Data table with columns: Name, Phone, Email,Lead Source, Status

**Components:**
```jsx
<LeadsPage>
  <Header>
    <h1>Lead Management</h1>
    <Button onClick={openAddLeadModal}>+ Add Lead</Button>
  </Header>

  <SearchBar placeholder="Search by name or phone number..." />

  <FilterBar>
    <FilterButton icon={<UserIcon />}>Filter by Owner</FilterButton>
    <FilterButton icon={<FilterIcon />}>Advanced Filters</FilterButton>
  </FilterBar>

  <LeadsTable>
    <TableHeader>
      <th>Name</th>
      <th>Phone Number</th>
      <th>Email</th>
      <th>Tags</th>
      <th>Status</th>
      <th>Actions</th>
    </TableHeader>

    <TableBody>
      {leads.map(lead => (
        <LeadRow
          key={lead.id}
          lead={lead}
          onEdit={handleEdit}
          onTag={handleTag}
          onDelete={handleDelete}
        />
      ))}
    </TableBody>
  </LeadsTable>

  <Pagination />
</LeadsPage>
```

**Features:**
- **Tag Management:** Click on lead → Add/remove tags → Triggers SMS automation
- **Inline Editing:** Edit lead fields directly in table -> only admins have this feature

**Data Requirements:**
- Leads list with all fields
- Owner/user information
- Tags list for autocomplete

**Supabase Queries:**
```javascript
// Get leads with filters
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .ilike('first_name', `%${searchTerm}%`)
  .eq('owner_id', ownerId)
  .order('created_at', { ascending: false })
  .range(0, 49)

// Update lead tags (triggers webhook → n8n)
const { data, error } = await supabase
  .from('leads')
  .update({ tags: ['Ghosted', 'high-priority'] })
  .eq('id', leadId)
```

---

### 4. Pipelines Page (`/pipelines`)

**Purpose:** Kanban-style sales pipeline management

**Layout:**
- Search bar at top
- Horizontal columns for each pipeline stage
- Draggable cards for each contact

**Pipeline Stages:**
1. New Contact 
2. Working Lead 
3. Needs A Call 
4. I Accept 

**Components:**
```jsx
<PipelinePage>
  <Header>
    <SearchBar placeholder="Search contacts..." />
    <FilterButton>Advanced Filters</FilterButton>
  </Header>

  <ActionBar>
    <Button variant="outline">View Stages</Button>
    <Button variant="outline">Filter by Owner</Button>
    <Button variant="outline">My Contacts</Button>
    <Button variant="outline">Manage Fields</Button>
    <Button variant="outline">Select Contacts</Button>
  </ActionBar>

  <DragDropContext onDragEnd={handleDragEnd}>
    <KanbanBoard>
      {stages.map(stage => (
        <KanbanColumn key={stage.id} stage={stage}>
          <StageHeader
            name={stage.name}
            count={stage.count}
            total={stage.total}
          />

          {stage.contacts.map(contact => (
            <KanbanCard
              key={contact.id}
              contact={contact}
              draggable
            >
              <Avatar>{contact.initials}</Avatar>
              <Name>{contact.name}</Name>
              <Owner>{contact.owner}</Owner>
              <Phone>{contact.phone}</Phone>
              <Email>{contact.email}</Email>
              <Notes>{contact.notes}</Notes>
              <Actions>
                <IconButton icon={<MessageIcon />} />
                <IconButton icon={<PhoneIcon />} />
                <IconButton icon={<EmailIcon />} />
              </Actions>
            </KanbanCard>
          ))}
        </KanbanColumn>
      ))}
    </KanbanBoard>
  </DragDropContext>
</PipelinePage>
```

**Drag & Drop Logic:**
```javascript
const handleDragEnd = async (result) => {
  const { source, destination, draggableId } = result

  if (!destination) return

  // Update contact stage in database
  await supabase
    .from('contacts')
    .update({
      pipeline_stage: destination.droppableId,
      stage_updated_at: new Date()
    })
    .eq('id', draggableId)
}
```

**Data Requirements:**
- Contacts grouped by pipeline stage
- Stage definitions and counts
- Real-time updates when contacts move

---

### 5. Tag Templates Page (`/tag-templates`)

**Purpose:** Manage campaign tags and their associated drip sequence messages

**Layout:**
- Header with "Add New Tag" button (top left corner)
- Grid/List view of all campaign tags
- Each tag card shows all 4 messages with day numbers
- Click to expand and view full message content

**Components:**
```jsx
<TagTemplatesPage>
  <Header>
    <h1>Tag Templates</h1>
    <Button onClick={openCreateTagModal}>+ Add New Tag</Button>
  </Header>

  <TagTemplateGrid>
    {campaignTags.map(tag => (
      <TagCard key={tag.id}>
        <TagHeader>
          <TagName>{tag.name}</TagName>
          <TagBadge>{tag.tag}</TagBadge>
          <Actions>
            <IconButton icon={<EditIcon />} onClick={() => editTag(tag)} />
            <IconButton icon={<DeleteIcon />} onClick={() => deleteTag(tag.id)} />
          </Actions>
        </TagHeader>

        <MessageSequence>
          {tag.messages.map((msg, index) => (
            <MessageItem key={msg.id}>
              <DayLabel>Day {msg.day_number}</DayLabel>
              <MessagePreview>{msg.message_template}</MessagePreview>
            </MessageItem>
          ))}
        </MessageSequence>

        <TagFooter>
          <span>{tag.enrollments_count} leads enrolled</span>
        </TagFooter>
      </TagCard>
    ))}
  </TagTemplateGrid>
</TagTemplatesPage>
```

**Create New Tag Flow:**

**Step 1 - Select Number of Questions:**
```jsx
<CreateTagModal step={1}>
  <Header>
    <h2>Create New Tag Template</h2>
  </Header>

  <Form>
    <FormField label="Tag Name">
      <Input
        value={tagName}
        onChange={setTagName}
        placeholder="e.g., Ghosted / No Response"
      />
    </FormField>

    <FormField label="Tag Identifier">
      <Input
        value={tagId}
        onChange={setTagId}
        placeholder="e.g., Ghosted"
      />
      <HelpText>This will be used when tagging leads</HelpText>
    </FormField>

    <FormField label="Number of Messages in Sequence">
      <Select value={messageCount} onChange={setMessageCount}>
        <option value={2}>2 Messages</option>
        <option value={3}>3 Messages</option>
        <option value={4}>4 Messages (Recommended)</option>
        <option value={5}>5 Messages</option>
        <option value={6}>6 Messages</option>
      </Select>
    </FormField>
  </Form>

  <Footer>
    <Button variant="outline" onClick={handleClose}>Cancel</Button>
    <Button onClick={goToStep2}>Next: Add Messages</Button>
  </Footer>
</CreateTagModal>
```

**Step 2 - Enter Messages for Each Day:**
```jsx
<CreateTagModal step={2}>
  <Header>
    <h2>Add Messages to "{tagName}"</h2>
    <p>Enter {messageCount} messages for your drip sequence</p>
  </Header>

  <MessageInputs>
    {Array.from({ length: messageCount }).map((_, index) => (
      <MessageInput key={index}>
        <DaySelector>
          <Label>Day {index + 1} - Send on Day:</Label>
          <Input
            type="number"
            value={messageDays[index]}
            onChange={(e) => updateMessageDay(index, e.target.value)}
            min={index === 0 ? 1 : messageDays[index - 1] + 1}
            placeholder="e.g., 1, 2, 4, 6"
          />
        </DaySelector>

        <MessageTextarea
          label={`Message ${index + 1}`}
          value={messages[index]}
          onChange={(e) => updateMessage(index, e.target.value)}
          placeholder="Enter your message here..."
          rows={4}
          maxLength={160}
        />

        <CharacterCount>
          {messages[index]?.length || 0} / 160 characters
        </CharacterCount>

        <PlaceholderHelper>
          <span>Available placeholders:</span>
          <Badge onClick={() => insertPlaceholder(index, '{first_name}')}>
            {'{first_name}'}
          </Badge>
          <Badge onClick={() => insertPlaceholder(index, '{last_name}')}>
            {'{last_name}'}
          </Badge>
        </PlaceholderHelper>
      </MessageInput>
    ))}
  </MessageInputs>

  <Preview>
    <h3>Preview Timeline</h3>
    <Timeline>
      {messages.map((msg, index) => (
        <TimelineItem key={index}>
          <DayMarker>Day {messageDays[index]}</DayMarker>
          <MessagePreview>
            {renderPreview(msg, { first_name: 'John', last_name: 'Doe' })}
          </MessagePreview>
        </TimelineItem>
      ))}
    </Timeline>
  </Preview>

  <Footer>
    <Button variant="outline" onClick={goToStep1}>Back</Button>
    <Button onClick={handleSaveTag} disabled={!isValid()}>
      Save Tag Template
    </Button>
  </Footer>
</CreateTagModal>
```

**Display of 14 Predefined Tags:**

```jsx
// Example: Ghosted Tag Card
<TagCard>
  <TagHeader>
    <TagName>Ghosted / No Response</TagName>
    <TagBadge>Ghosted</TagBadge>
  </TagHeader>

  <MessageSequence>
    <MessageItem>
      <DayLabel>Day 1</DayLabel>
      <MessagePreview>
        "Hey, just checking in. Are you still exploring vehicle options or did plans change?"
      </MessagePreview>
    </MessageItem>

    <MessageItem>
      <DayLabel>Day 2</DayLabel>
      <MessagePreview>
        "I've got a couple options that fit what you were originally looking for. Want me to send them over?"
      </MessagePreview>
    </MessageItem>

    <MessageItem>
      <DayLabel>Day 4</DayLabel>
      <MessagePreview>
        "If the right payment and the right vehicle came up, would you be open to taking another look?"
      </MessagePreview>
    </MessageItem>

    <MessageItem>
      <DayLabel>Day 6</DayLabel>
      <MessagePreview>
        "Before I close out your file, want me to keep sending options or pause it for now?"
      </MessagePreview>
    </MessageItem>
  </MessageSequence>

  <TagFooter>
    <span>23 leads enrolled</span>
    <span>Response rate: 37%</span>
  </TagFooter>
</TagCard>
```

**Data Requirements:**
- All campaigns with their messages
- Campaign enrollment counts
- Message templates for each campaign
- Day numbers for each message

**Supabase Queries:**
```javascript
// Get all campaign tags with messages
const { data: campaignTags } = await supabase
  .from('campaigns')
  .select(`
    id,
    tag,
    name,
    description,
    campaign_messages (
      id,
      day_number,
      message_template,
      sequence_order
    ),
    campaign_enrollments (count)
  `)
  .order('name', { ascending: true })

// Create new campaign tag
const { data: campaign, error } = await supabase
  .from('campaigns')
  .insert({
    tag: 'interested-accord',
    name: 'Interested in Accord',
    description: 'Follow-up sequence for Accord inquiries'
  })
  .select()
  .single()

// Create campaign messages
const { data: messages, error } = await supabase
  .from('campaign_messages')
  .insert([
    {
      campaign_id: campaign.id,
      day_number: 1,
      sequence_order: 1,
      message_template: 'Hi {first_name}! Thanks for your interest...'
    },
    {
      campaign_id: campaign.id,
      day_number: 2,
      sequence_order: 2,
      message_template: 'Just following up...'
    },
    // ... more messages
  ])
```

**Features:**
- View all 14 predefined campaign tags
- See all 4 messages for each tag with day numbers
- Create new custom tag templates
- Edit existing tag templates (custom ones only)
- Delete custom tag templates (predefined ones are locked)
- Preview messages with placeholder replacement
- Character count for SMS length

**Validation Rules:**
- Tag identifier must be unique
- Tag name required
- At least 2 messages required
- Day numbers must be sequential (Day 2 must be > Day 1)
- Messages cannot exceed 160 characters
- First message must be Day 1

---






## Component Hierarchy

### Shared Component Library

**Buttons:**
- Primary Button
- Secondary Button
- Outline Button
- Ghost Button
- Icon Button
- Danger Button

**Inputs:**
- Text Input
- Textarea
- Select Dropdown
- Multi-Select
- Date Picker
- Date Range Picker
- Checkbox
- Radio Button
- Toggle Switch

**Data Display:**
- Table (with sorting, filtering, pagination)
- Card
- Badge
- Tag
- Avatar
- Progress Bar
- Metric Card
- Chart (Line, Bar, Pie)

**Navigation:**
- Sidebar
- Tabs
- Breadcrumbs
- Pagination

**Feedback:**
- Toast Notifications
- Modal Dialog
- Drawer/Slide-over
- Alert Banner
- Loading Spinner
- Skeleton Loader
- Empty State
- Error State

**Layout:**
- Container
- Grid
- Stack
- Divider

---

## State Management

### React Context Providers

**AuthContext:**
```javascript
const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

**NotificationContext:**
```javascript
const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => removeNotification(id), 5000)
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <ToastContainer notifications={notifications} onClose={removeNotification} />
    </NotificationContext.Provider>
  )
}

export const useNotification = () => useContext(NotificationContext)
```

### Custom Hooks

**useLeads Hook:**
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useLeads = (filters = {}) => {
  const queryClient = useQueryClient()

  // Fetch leads
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase.from('leads').select('*')

      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
      }

      if (filters.owner) {
        query = query.eq('owner_id', filters.owner)
      }

      if (filters.tags?.length > 0) {
        query = query.contains('tags', filters.tags)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(filters.page * 50, (filters.page + 1) * 50 - 1)

      if (error) throw error
      return data
    }
  })

  // Create lead
  const createLead = useMutation({
    mutationFn: async (newLead) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(newLead)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    }
  })

  // Update lead
  const updateLead = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    }
  })

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    }
  })

  // Tag lead (triggers SMS automation)
  const tagLead = useMutation({
    mutationFn: async ({ id, tags }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ tags })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    }
  })

  return {
    leads,
    isLoading,
    error,
    createLead: createLead.mutate,
    updateLead: updateLead.mutate,
    deleteLead: deleteLead.mutate,
    tagLead: tagLead.mutate
  }
}
```

---

## Routing

### Route Configuration

```javascript
import { createBrowserRouter } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'conversations',
        element: <ConversationsPage />
      },
      {
        path: 'conversations/:id',
        element: <ConversationDetail />
      },
      {
        path: 'leads',
        element: <LeadsPage />
      },
      {
        path: 'leads/:id',
        element: <LeadDetail />
      },
      {
        path: 'pipelines',
        element: <PipelinePage />
      },
      {
        path: 'contacts',
        element: <ContactsPage />
      },
      {
        path: 'bulk-sms',
        element: <BulkSMSPage />
      },
      {
        path: 'templates',
        element: <TemplatesPage />
      },
      {
        path: 'campaigns',
        element: <CampaignsPage />
      },
      {
        path: 'campaigns/:id',
        element: <CampaignDetail />
      },
      {
        path: 'agents',
        element: <AgentsPage />
      },
      {
        path: 'followups',
        element: <FollowupsPage />
      },
      {
        path: 'automations',
        element: <AutomationsPage />
      }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/signup',
    element: <SignupPage />
  }
])

export default router
```

---

## User Flows

### Flow 1: Tag Lead → Automated SMS Sent

```
1. User navigates to /leads
2. User searches for or finds lead "John Doe"
3. User clicks on lead row to expand details
4. User clicks "Add Tag" button
5. Tag selector appears with autocomplete
6. User types "Ghosted" and selects tag
7. User clicks "Save"
8. Frontend updates lead in database:
   UPDATE leads SET tags = ['Ghosted'] WHERE id = 123
9. Success toast: "Lead tagged successfully. SMS will be sent."
10. Tag appears on lead row with badge
11. (Backend) Database webhook triggers n8n
12. (Backend) n8n sends Day 1 SMS
13. (Backend) n8n enrolls lead in Ghosted campaign
```



### Flow 3: View Conversation and Reply

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
12. Notification badge decreases to "2"
```


### Flow 5: Create Message Template

```
1. User navigates to /templates
2. User clicks "+ Create Template"
3. Template Editor Modal opens
4. User enters:
   - Tag: "interested-accord"
   - Message: "Hi {first_name}! I saw you're interested in the Honda Accord. Want to schedule a test drive?"
5. Preview panel shows:
   "Hi John! I saw you're interested in the Honda Accord..."
6. User clicks "Save Template"
7. Frontend inserts to Supabase:
   INSERT INTO message_templates (tag, template)
8. Success toast: "Template created successfully"
9. Modal closes
10. Template appears in list
11. Template now available when tagging leads
```

---

## Design System

### Colors (Tailwind CSS)

**Inspired by Consumer Genius Design**

**Light Theme (Primary):**
- Background: `bg-white` (#FFFFFF)
- Card Background (Light): `bg-gray-50` (#FAFAFA)
- Card Background (Dark): `bg-[#2B2B2B]` (#2B2B2B)
- Border: `border-gray-200` (#E5E5E5)
- Text Primary: `text-black` (#000000)
- Text Secondary: `text-gray-600` (#666666)

**Brand Colors:**
- Primary (Coral Red): `bg-[#E74C3C]` (#E74C3C)
  - Hover: `hover:bg-[#D43F2F]`
  - Text: `text-[#E74C3C]`
  - Used for: Brand accent, highlights, important badges

- Secondary (Orange): `bg-[#F39C12]` (#F39C12)
  - Hover: `hover:bg-[#E08E0B]`
  - Text: `text-[#F39C12]`
  - Used for: Primary CTA buttons ("Partner With Us" style)

- Success (Bright Green): `bg-[#00C851]` (#00C851)
  - Hover: `hover:bg-[#00B248]`
  - Text: `text-[#00C851]`
  - Used for: Success states, secondary CTA buttons ("Buy Leads Now" style)

**Additional Accent Colors:**
- Warning (Amber): `bg-amber-500` (#F59E0B)
- Danger (Red): `bg-red-500` (#EF4444)
- Info (Blue): `bg-blue-500` (#3B82F6)

**Status Colors:**
- Active/Online: `bg-[#00C851]` (Bright Green)
- Inactive/Offline: `bg-gray-400` (#9CA3AF)
- New: `bg-[#E74C3C]` (Coral Red)
- Pending: `bg-[#F39C12]` (Orange)
- Success: `bg-[#00C851]` (Bright Green)
- Error: `bg-red-500` (#EF4444)

**Text Colors:**
- Heading: `text-black` (#000000)
- Body: `text-gray-700` (#4A4A4A)
- Muted: `text-gray-500` (#6B6B6B)
- On Dark Cards: `text-white` (#FFFFFF)

**Button Styles:**
- Primary Button: Orange background (#F39C12) with white text, rounded corners
- Secondary Button: Green background (#00C851) with white text, rounded corners
- Outline Button: Transparent with coral red border (#E74C3C)
- Ghost Button: Transparent with hover effect

### Typography

**Font Family:** Inter, system-ui, sans-serif

**Font Sizes:**
- Heading 1: `text-3xl font-bold` (30px)
- Heading 2: `text-2xl font-semibold` (24px)
- Heading 3: `text-xl font-semibold` (20px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)
- Tiny: `text-xs` (12px)

### Spacing

- Extra Small: `4px` (p-1)
- Small: `8px` (p-2)
- Medium: `16px` (p-4)
- Large: `24px` (p-6)
- Extra Large: `32px` (p-8)

### Border Radius

- Small: `rounded-sm` (2px)
- Medium: `rounded-md` (6px)
- Large: `rounded-lg` (8px)
- Extra Large: `rounded-xl` (12px)
- Full: `rounded-full` (9999px)

### Shadows

- Small: `shadow-sm`
- Medium: `shadow-md`
- Large: `shadow-lg`
- Extra Large: `shadow-xl`

---

## Responsive Design

### Breakpoints

- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (md, lg)
- Desktop: `> 1024px` (xl, 2xl)

### Mobile Adaptations

**Sidebar:**
- Desktop: Fixed left sidebar, always visible
- Mobile: Drawer that slides in from left, toggleable

**Tables:**
- Desktop: Full table with all columns
- Mobile: Card layout with stacked fields

**Multi-column Layouts:**
- Desktop: Two or three columns side-by-side
- Mobile: Single column, stacked vertically

**Charts:**
- Desktop: Full width with all data points
- Mobile: Scrollable horizontal charts

---

## Performance Optimizations

### Code Splitting

```javascript
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const ConversationsPage = lazy(() => import('@/pages/Conversations/ConversationsPage'))

// In router
{
  path: 'dashboard',
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardPage />
    </Suspense>
  )
}
```

### Pagination & Infinite Scroll

- Dashboard: Load 50 metric cards at a time
- Conversations: Paginate 50 conversations per page (1,462 total pages)
- Messages: Load last 50 messages, infinite scroll for older
- Leads/Contacts: Virtual scrolling for 10,000+ rows

### Real-time Updates

```javascript
// Subscribe to new messages
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        // Add new message to state
        setMessages(prev => [...prev, payload.new])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

### Image Optimization

- Use lazy loading for avatar images
- Implement progressive image loading
- Compress and optimize all assets

---

## Accessibility

- Semantic HTML elements
- ARIA labels on all interactive elements
- Keyboard navigation support (Tab, Enter, Esc)
- Focus indicators on all focusable elements
- Screen reader friendly
- Color contrast ratios meet WCAG AA standards

---

## Testing Strategy

**Unit Tests:**
- Utility functions (formatters, validators)
- Custom hooks (useLeads, useConversations)
- Form validation logic

**Integration Tests:**
- User flows (tag lead, upload CSV, send message)
- API interactions with Supabase
- Form submissions

**E2E Tests:**
- Critical paths (login, tag lead → SMS sent, view conversation)
- CSV upload flow
- Campaign enrollment

**Tools:**
- Jest for unit tests
- React Testing Library for component tests
- Playwright or Cypress for E2E tests

---

## Deployment

**Build Process:**
```bash
npm run build
```

**Environment Variables:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Hosting:**
- Vercel (recommended, free tier)
- Netlify
- AWS Amplify

**Build Optimization:**
- Tree shaking
- Minification
- Compression (gzip/brotli)
- CDN for static assets

---

## Summary

This frontend architecture provides a complete blueprint for building the Automotive AI platform with:

- **11 Main Pages:** Dashboard, Conversations, Leads, Pipelines, Contacts, Bulk SMS, Templates, Campaigns, Agents, Followups, Automations
- **50+ Reusable Components:** Organized by feature area
- **Custom Hooks:** For all database operations
- **State Management:** React Context + React Query
- **Responsive Design:** Mobile-first approach
- **Real-time Updates:** Supabase subscriptions
- **Type-safe:** (Optional: Add TypeScript)

**Next Steps:**
1. Set up React + Vite project
2. Install dependencies (Shadcn, Tailwind, React Query, Supabase)
3. Configure Supabase client
4. Build component library (Shadcn UI)
5. Implement pages one by one
6. Integrate with backend (Supabase + n8n)
7. Test user flows
8. Deploy to Vercel

---

**Status:** Ready for Implementation
**Estimated Development Time:** 4-6 weeks (with 1-2 developers)