import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Lock, Pencil } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_TEMPLATES } from "@/data/campaignTemplates";

export default function TagTemplates() {
  const { data: userRole } = useUserRole();
  const isAdmin = userRole?.isAdmin || false;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editInitialMessageOpen, setEditInitialMessageOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagIdentifier, setTagIdentifier] = useState('');
  const [messageCount, setMessageCount] = useState('4');
  const [messages, setMessages] = useState<Array<{ day: number; content: string }>>([
    { day: 1, content: '' },
    { day: 2, content: '' },
    { day: 4, content: '' },
    { day: 6, content: '' },
  ]);

  // Initial Message state
  const [initialMessageCount, setInitialMessageCount] = useState('4');
  const [initialMessages, setInitialMessages] = useState<Array<{ day: number; content: string }>>([
    { day: 1, content: '' },
    { day: 0, content: '' },
    { day: 0, content: '' },
    { day: 0, content: '' },
  ]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time subscriptions for tag campaigns and messages
  useRealtimeSubscription({
    table: 'tag_campaigns',
    event: '*',
    queryKey: ['tag-campaigns'],
  });

  useRealtimeSubscription({
    table: 'tag_campaigns',
    event: '*',
    queryKey: ['initial-message-campaign'],
  });

  useRealtimeSubscription({
    table: 'tag_campaign_messages',
    event: '*',
    queryKey: ['tag-campaigns'],
  });

  useRealtimeSubscription({
    table: 'tag_campaign_messages',
    event: '*',
    queryKey: ['initial-message-campaign'],
  });

  // Fetch Initial_Message campaign separately
  const { data: initialMessageCampaign, isLoading: isLoadingInitial } = useQuery({
    queryKey: ['initial-message-campaign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_campaigns')
        .select(`
          id,
          tag,
          name,
          user_id,
          is_active,
          tag_campaign_messages (
            id,
            day_number,
            sequence_order,
            message_template
          )
        `)
        .eq('tag', 'Initial_Message')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    },
  });

  // Fetch other tag campaigns (exclude Initial_Message)
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['tag-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_campaigns')
        .select(`
          id,
          tag,
          name,
          user_id,
          is_active,
          tag_campaign_messages (
            id,
            day_number,
            sequence_order,
            message_template
          )
        `)
        .neq('tag', 'Initial_Message')
        .eq('is_active', true)
        .order('user_id', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return data;
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tag_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-campaigns'] });
      toast({ title: 'Campaign deleted' });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('tag_campaigns')
        .insert({
          tag: tagIdentifier,
          name: tagName,
          is_active: true,
          user_id: user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create messages
      const messageInserts = messages.map((msg, idx) => ({
        campaign_id: campaign.id,
        day_number: msg.day,
        sequence_order: idx + 1,
        message_template: msg.content,
      }));

      const { error: messagesError } = await supabase
        .from('tag_campaign_messages')
        .insert(messageInserts);

      if (messagesError) throw messagesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-campaigns'] });
      setCreateModalOpen(false);
      resetForm();
      toast({ title: 'Campaign created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!editingCampaignId) throw new Error('No campaign selected');

      // Update campaign
      const { error: campaignError } = await supabase
        .from('tag_campaigns')
        .update({
          tag: tagIdentifier,
          name: tagName,
        })
        .eq('id', editingCampaignId);

      if (campaignError) throw campaignError;

      // Delete old messages
      const { error: deleteError } = await supabase
        .from('tag_campaign_messages')
        .delete()
        .eq('campaign_id', editingCampaignId);

      if (deleteError) throw deleteError;

      // Insert new messages
      const messageInserts = messages.map((msg, idx) => ({
        campaign_id: editingCampaignId,
        day_number: msg.day,
        sequence_order: idx + 1,
        message_template: msg.content,
      }));

      const { error: messagesError } = await supabase
        .from('tag_campaign_messages')
        .insert(messageInserts);

      if (messagesError) throw messagesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-campaigns'] });
      setCreateModalOpen(false);
      resetForm();
      toast({ title: 'Campaign updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save Initial Message mutation
  const saveInitialMessageMutation = useMutation({
    mutationFn: async () => {
      let campaignId = initialMessageCampaign?.id;

      // If campaign doesn't exist, create it
      if (!campaignId) {
        const { data: campaign, error: campaignError } = await supabase
          .from('tag_campaigns')
          .insert({
            tag: 'Initial_Message',
            name: 'Initial Outbound Message',
            is_active: true,
            user_id: null, // System-level campaign
          })
          .select()
          .single();

        if (campaignError) throw campaignError;
        campaignId = campaign.id;
      }

      // Delete existing messages
      if (initialMessageCampaign?.id) {
        const { error: deleteError } = await supabase
          .from('tag_campaign_messages')
          .delete()
          .eq('campaign_id', initialMessageCampaign.id);

        if (deleteError) throw deleteError;
      }

      // Insert new messages
      const messageInserts = initialMessages.map((msg, idx) => ({
        campaign_id: campaignId,
        day_number: msg.day,
        sequence_order: idx + 1,
        message_template: msg.content,
      }));

      const { error: messagesError } = await supabase
        .from('tag_campaign_messages')
        .insert(messageInserts);

      if (messagesError) throw messagesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initial-message-campaign'] });
      setEditInitialMessageOpen(false);
      toast({ title: 'Initial message sequence saved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save initial message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setEditMode(false);
    setEditingCampaignId(null);
    setTagName('');
    setTagIdentifier('');
    setMessageCount('4');
    setMessages([
      { day: 1, content: '' },
      { day: 2, content: '' },
      { day: 4, content: '' },
      { day: 6, content: '' },
    ]);
  };

  const handleMessageCountChange = (count: string) => {
    setMessageCount(count);
    const numCount = parseInt(count);
    const newMessages = Array.from({ length: numCount }, (_, i) => ({
      day: i === 0 ? 1 : (i + 1) * 2,
      content: messages[i]?.content || '',
    }));
    setMessages(newMessages);
  };

  const handleInitialMessageCountChange = (count: string) => {
    setInitialMessageCount(count);
    const numCount = parseInt(count);
    const newMessages = Array.from({ length: numCount }, (_, i) => ({
      day: i === 0 ? 1 : 0, // Day 1 fixed, others need to be set
      content: initialMessages[i]?.content || '',
    }));
    setInitialMessages(newMessages);
  };

  const insertPlaceholder = (index: number, placeholder: string) => {
    setMessages(prev =>
      prev.map((msg, i) =>
        i === index ? { ...msg, content: msg.content + placeholder } : msg
      )
    );
  };

  const insertInitialPlaceholder = (index: number, placeholder: string) => {
    setInitialMessages(prev =>
      prev.map((msg, i) =>
        i === index ? { ...msg, content: msg.content + placeholder } : msg
      )
    );
  };

  const openEditInitialMessage = () => {
    if (initialMessageCampaign?.tag_campaign_messages) {
      const sortedMessages = [...initialMessageCampaign.tag_campaign_messages]
        .sort((a: any, b: any) => a.sequence_order - b.sequence_order);

      setInitialMessageCount(sortedMessages.length.toString());
      setInitialMessages(sortedMessages.map((msg: any) => ({
        day: msg.day_number,
        content: msg.message_template,
      })));
    } else {
      // Default setup
      setInitialMessageCount('4');
      setInitialMessages([
        { day: 1, content: '' },
        { day: 0, content: '' },
        { day: 0, content: '' },
        { day: 0, content: '' },
      ]);
    }
    setEditInitialMessageOpen(true);
  };

  const handleSaveInitialMessage = () => {
    // Validation
    const hasEmptyMessages = initialMessages.some(m => !m.content.trim());
    const hasTooLongMessages = initialMessages.some(m => m.content.length > 160);
    const hasInvalidDays = initialMessages.some((m, i) => i > 0 && m.day === 0);

    // Check day number ordering
    let hasInvalidOrdering = false;
    for (let i = 1; i < initialMessages.length; i++) {
      if (initialMessages[i].day <= initialMessages[i - 1].day) {
        hasInvalidOrdering = true;
        break;
      }
    }

    if (hasEmptyMessages) {
      toast({
        title: 'Empty messages',
        description: 'All messages must have content',
        variant: 'destructive',
      });
      return;
    }

    if (hasTooLongMessages) {
      toast({
        title: 'Message too long',
        description: 'Messages must be 160 characters or less',
        variant: 'destructive',
      });
      return;
    }

    if (hasInvalidDays) {
      toast({
        title: 'Invalid day numbers',
        description: 'Please set day numbers for all follow-up messages',
        variant: 'destructive',
      });
      return;
    }

    if (hasInvalidOrdering) {
      toast({
        title: 'Invalid day sequence',
        description: 'Each message must be scheduled for a later day than the previous one',
        variant: 'destructive',
      });
      return;
    }

    saveInitialMessageMutation.mutate();
  };



  const handleEdit = (campaign: any) => {
    setEditMode(true);
    setEditingCampaignId(campaign.id);
    setTagName(campaign.name);
    setTagIdentifier(campaign.tag);

    const sortedMessages = [...(campaign.tag_campaign_messages || [])]
      .sort((a: any, b: any) => a.sequence_order - b.sequence_order);

    setMessageCount(sortedMessages.length.toString());
    setMessages(sortedMessages.map((msg: any) => ({
      day: msg.day_number,
      content: msg.message_template,
    })));

    setCreateModalOpen(true);
  };

  const handleCreate = () => {
    // Validate Tag Name and Identifier
    if (!tagName || !tagIdentifier) {
      toast({
        title: 'Missing information',
        description: 'Please fill in Tag Name and Tag Identifier',
        variant: 'destructive',
      });
      return;
    }

    // Validate messages
    const hasEmptyMessages = messages.some(m => !m.content.trim());
    const hasTooLongMessages = messages.some(m => m.content.length > 160);

    if (hasEmptyMessages) {
      toast({
        title: 'Empty messages',
        description: 'All messages must have content',
        variant: 'destructive',
      });
      return;
    }

    if (hasTooLongMessages) {
      toast({
        title: 'Message too long',
        description: 'Messages must be 160 characters or less',
        variant: 'destructive',
      });
      return;
    }

    if (editMode) {
      updateCampaignMutation.mutate();
    } else {
      createCampaignMutation.mutate();
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = CAMPAIGN_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setTagName(template.name);
      setTagIdentifier(template.identifier);

      const msgCount = template.messages.length.toString();
      setMessageCount(msgCount);

      // Update messages
      const newMessages = template.messages.map(msg => ({
        day: msg.day,
        content: msg.content
      }));
      setMessages(newMessages);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
        <p className="text-muted-foreground">
          Manage all SMS templates for automated sequences
        </p>
      </div>

      {/* Section 1: Initial Outbound Message */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Initial Outbound Message</h2>
          <p className="text-sm text-muted-foreground">
            Sent when you click "Send 1st Message" on the Leads page. Includes follow-up sequence for non-responders.
          </p>
        </div>

        {isLoadingInitial ? (
          <div className="h-48 bg-muted animate-pulse rounded-lg border-2 border-orange-500" />
        ) : initialMessageCampaign ? (
          <Card className="border-2 border-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{initialMessageCampaign.name}</CardTitle>
                  <Badge className="bg-orange-500">Initial_Message</Badge>
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Lock className="h-3 w-3" />
                      Admin-only template
                    </p>
                  )}
                </div>
                {isAdmin ? (
                  <Button variant="outline" size="sm" onClick={openEditInitialMessage}>
                    Edit Sequence
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Lock className="h-3 w-3 mr-2" />
                    Admin Only
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialMessageCampaign.tag_campaign_messages
                ?.sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                .map((message: any, idx: number) => (
                  <div key={message.id} className="text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      {idx === 0 ? 'Day 1 (Initial Message)' : `Follow-up ${idx} - Day ${message.day_number}`}
                    </p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {message.message_template}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-orange-500">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No initial message sequence configured</p>
              {isAdmin ? (
                <Button onClick={openEditInitialMessage} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Initial Message Sequence
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button disabled className="bg-gray-400">
                    <Lock className="h-4 w-4 mr-2" />
                    Admin Only
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Contact your admin to set up the initial message
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section 2: Tag Campaign Sequences */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Tag Campaign Sequences</h2>
            <p className="text-sm text-muted-foreground">
              Follow-up sequences triggered when leads are tagged with specific objections or interests
            </p>
          </div>
          {isAdmin ? (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Tag
            </Button>
          ) : (
            <Button disabled>
              <Lock className="h-4 w-4 mr-2" />
              Admin Only
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns?.map((campaign: any) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <Badge variant="secondary">{campaign.tag}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(campaign)}
                          className="hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {campaign.user_id !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.tag_campaign_messages
                    ?.sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                    .map((message: any) => (
                      <div key={message.id} className="text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          Day {message.day_number}
                        </p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {message.message_template}
                        </p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Campaign Modal */}
      <Dialog open={createModalOpen} onOpenChange={(open) => {
        setCreateModalOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit Tag Template' : 'Create New Tag Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tag Name */}
            <div>
              <Label>Tag Name</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g., Ghosted / No Response"
                className="mt-1"
              />
            </div>

            {/* Tag Identifier */}
            <div>
              <Label>Tag Identifier</Label>
              <Input
                value={tagIdentifier}
                onChange={(e) => setTagIdentifier(e.target.value)}
                placeholder="e.g., Ghosted"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to identify this campaign in the system
              </p>
            </div>

            {/* Number of Messages */}
            <div>
              <Label>Number of Messages</Label>
              <RadioGroup value={messageCount} onValueChange={handleMessageCountChange} className="mt-2 flex gap-4">
                {['2', '3', '4', '5', '6'].map((count) => (
                  <div key={count} className="flex items-center space-x-2">
                    <RadioGroupItem value={count} id={`count-${count}`} />
                    <Label htmlFor={`count-${count}`}>{count} messages</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Messages */}
            {messages.map((message, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Message {index + 1}</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Day:</Label>
                    <Input
                      type="number"
                      value={message.day}
                      onChange={(e) =>
                        setMessages(prev =>
                          prev.map((m, i) =>
                            i === index ? { ...m, day: parseInt(e.target.value) } : m
                          )
                        )
                      }
                      className="w-20"
                      min="1"
                    />
                  </div>
                </div>

                <Textarea
                  value={message.content}
                  onChange={(e) =>
                    setMessages(prev =>
                      prev.map((m, i) =>
                        i === index ? { ...m, content: e.target.value } : m
                      )
                    )
                  }
                  rows={3}
                  placeholder="Enter message content..."
                />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder(index, '{first_name}')}
                    >
                      {'{first_name}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder(index, '{last_name}')}
                    >
                      {'{last_name}'}
                    </Button>
                  </div>
                  <p
                    className={`text-xs ${message.content.length > 144
                      ? 'text-orange-600 font-semibold'
                      : message.content.length > 120
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                      }`}
                  >
                    {message.content.length}/160
                  </p>
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending || updateCampaignMutation.isPending
                  ? (editMode ? 'Updating...' : 'Creating...')
                  : (editMode ? 'Update Campaign' : 'Create Campaign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Initial Message Dialog */}
      <Dialog open={editInitialMessageOpen} onOpenChange={setEditInitialMessageOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Initial Outbound Message Sequence</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Message Count Selector */}
            <div>
              <Label>Number of Messages</Label>
              <RadioGroup
                value={initialMessageCount}
                onValueChange={handleInitialMessageCountChange}
                className="mt-2 flex gap-4"
              >
                {['2', '3', '4', '5', '6'].map((count) => (
                  <div key={count} className="flex items-center space-x-2">
                    <RadioGroupItem value={count} id={`initial-count-${count}`} />
                    <Label htmlFor={`initial-count-${count}`}>{count} messages</Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-1">
                Day 1 message + follow-ups for non-responders
              </p>
            </div>

            {/* Messages */}
            {initialMessages.map((message, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {index === 0 ? 'Day 1 - Initial Message' : `Follow-up ${index}`}
                  </Label>
                  {index === 0 ? (
                    <Badge variant="outline">Day 1 (Fixed)</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Send on Day:</Label>
                      <select
                        value={message.day}
                        onChange={(e) =>
                          setInitialMessages(prev =>
                            prev.map((m, i) =>
                              i === index ? { ...m, day: parseInt(e.target.value) } : m
                            )
                          )
                        }
                        className="border rounded px-2 py-1 text-sm w-20"
                      >
                        <option value={0}>--</option>
                        {Array.from({ length: 20 }, (_, i) => {
                          const dayNum = i + 2; // Start from day 2
                          // Only show days greater than previous message's day
                          const prevDay = index > 0 ? initialMessages[index - 1].day : 1;
                          if (dayNum <= prevDay) return null;
                          return (
                            <option key={dayNum} value={dayNum}>
                              {dayNum}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                <Textarea
                  value={message.content}
                  onChange={(e) =>
                    setInitialMessages(prev =>
                      prev.map((m, i) =>
                        i === index ? { ...m, content: e.target.value } : m
                      )
                    )
                  }
                  rows={3}
                  placeholder="Enter message content..."
                  className="border-2 border-orange-400"
                />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertInitialPlaceholder(index, '{first_name}')}
                    >
                      {'{first_name}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertInitialPlaceholder(index, '{last_name}')}
                    >
                      {'{last_name}'}
                    </Button>
                  </div>
                  <p
                    className={`text-xs ${message.content.length > 144
                      ? 'text-orange-600 font-semibold'
                      : message.content.length > 120
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                      }`}
                  >
                    {message.content.length}/160
                  </p>
                </div>
              </div>
            ))}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This sequence stops automatically if the lead responds.
                Each follow-up is only sent if no response is received.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditInitialMessageOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInitialMessage}
                disabled={saveInitialMessageMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saveInitialMessageMutation.isPending ? 'Saving...' : 'Save Sequence'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
