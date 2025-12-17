import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, Send, Bot, AlertCircle, MessageSquare, User, Loader2, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Conversations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('id');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [handoffFilter, setHandoffFilter] = useState<'all' | 'handoff' | 'ai'>('all');
  const [showPhoneNumberDialog, setShowPhoneNumberDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole();

  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', search, handoffFilter],
    queryFn: async () => {
      let query = supabase
        .from('conversation_list') // Use VIEW that computes last_message_at from messages.created_at
        .select(`
          id,
          last_message_at,
          unread_count,
          status,
          requires_human_handoff,
          handoff_triggered_at,
          ai_message_count,
          ai_controlled,
          takeover_at,
          takeover_by,
          leads (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('status', 'active');

      // Apply handoff filter
      if (handoffFilter === 'handoff') {
        query = query.eq('requires_human_handoff', true);
      } else if (handoffFilter === 'ai') {
        query = query.eq('requires_human_handoff', false).gt('ai_message_count', 0);
      }

      // Order by last_message_at (computed from messages.created_at in view)
      // NULLS LAST ensures conversations with no messages appear at bottom
      query = query.order('last_message_at', { ascending: false, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversationId,
  });

  // Manual AI takeover mutation
  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conversations')
        .update({
          ai_controlled: false,
          takeover_at: new Date().toISOString(),
          takeover_by: user.id
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'AI disabled',
        description: 'You now have manual control of this conversation'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to take over',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send manual message via n8n webhook (frontend-first)
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) throw new Error('Conversation not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const twilioPhone = import.meta.env.VITE_TWILIO_PHONE_NUMBER || '';
      const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;
      const leadPhone = lead?.phone;

      if (!leadPhone) throw new Error('Lead phone number not found');

      // Call n8n webhook directly for manual SMS
      const response = await fetch(import.meta.env.VITE_N8N_MANUAL_SMS_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN}`
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          content: content,
          sender: twilioPhone,
          recipient: leadPhone,
          sent_by: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send SMS');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText('');
      toast({
        title: 'Message sent successfully!',
        description: `Twilio SID: ${data.twilio_sid}`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Initiate voice call via n8n webhook
  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error('No conversation selected');

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) throw new Error('Conversation not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;
      if (!lead?.phone) throw new Error('Lead phone number not found');

      // Get agent's phone number from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('phone_number')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.phone_number) throw new Error('Your phone number is not set. Please update it in Settings.');

      // Call n8n webhook to initiate call
      const response = await fetch(import.meta.env.VITE_N8N_INITIATE_CALL_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          agent_id: user.id,
          conversation_id: selectedConversationId,
          agent_phone: userData.phone_number,
          lead_phone: lead.phone,
          lead_name: `${lead.first_name} ${lead.last_name || ''}`.trim(),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate call');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Call initiated!',
        description: 'Your phone will ring shortly. Answer to connect to the lead.',
      });
    },
    onError: (error: any) => {
      // Check if error is about missing phone number
      if (error.message?.includes('phone number is not set')) {
        setShowPhoneNumberDialog(true);
      } else {
        toast({
          title: 'Failed to initiate call',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  // Track previous first conversation to detect when new ones arrive
  const previousFirstConvIdRef = useRef<string | null>(null);

  // Auto-select first conversation when page loads OR when new conversation arrives at top
  // Only auto-select conversations that have messages (last_message_at is not null)
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const firstConversation = conversations[0];
      const currentFirstId = firstConversation.id;
      const hasMessages = firstConversation.last_message_at !== null;

      // Only proceed if the conversation has messages
      if (!hasMessages) {
        // Don't auto-select empty conversations, but track the ID
        if (!previousFirstConvIdRef.current) {
          previousFirstConvIdRef.current = currentFirstId;
        }
        return;
      }

      // Case 1: No conversation selected - select the first one (if it has messages)
      if (!selectedConversationId) {
        setSearchParams({ id: currentFirstId });
        previousFirstConvIdRef.current = currentFirstId;
      }
      // Case 2: First conversation changed (new conversation arrived at top) - auto-select it
      else if (previousFirstConvIdRef.current && previousFirstConvIdRef.current !== currentFirstId) {
        setSearchParams({ id: currentFirstId });
        previousFirstConvIdRef.current = currentFirstId;
      }
      // Case 3: First load - just track the current first conversation
      else if (!previousFirstConvIdRef.current) {
        previousFirstConvIdRef.current = currentFirstId;
      }
    }
  }, [conversations, selectedConversationId, setSearchParams]);

  useEffect(() => {
    if (selectedConversationId) {
      markAsReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscriptions
  // 1. Global messages (for unread counts and new messages in active chat)
  useRealtimeSubscription({
    table: 'messages',
    event: 'INSERT',
    queryKey: ['messages', selectedConversationId], // This will also trigger for other conversations if we invalidate 'conversations'
  });

  // 2. Conversation updates (status, handoff, unread counts) AND new conversations
  useRealtimeSubscription({
    table: 'conversations',
    event: '*', // Listen for INSERT, UPDATE, DELETE
    queryKey: ['conversations'],
  });

  // Also invalidate conversations when new messages arrive
  useEffect(() => {
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSend = () => {
    if (!messageText.trim() || messageText.length > 160) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);
  const charCount = messageText.length;
  const charWarning = charCount > 144;

  return (
    <div className="space-y-4 animate-in h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-baseline justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Conversations
          </h1>
          <p className="text-sm text-muted-foreground">Manage your SMS interactions</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[380px_1fr] gap-6 flex-1 min-h-0">
        {/* Left Panel - Conversation List */}
        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 space-y-4 bg-black/5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-white/10 focus:bg-background transition-all"
              />
            </div>

            <Tabs value={handoffFilter} onValueChange={(v) => setHandoffFilter(v as 'all' | 'handoff' | 'ai')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-background/30">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="handoff" className="text-xs">
                  Handoff
                  {conversations?.filter(c => c.requires_human_handoff).length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1 py-0 text-[10px] h-4 min-w-[16px]">
                      {conversations.filter(c => c.requires_human_handoff).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">AI Only</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              conversations.map((conversation: any) => {
                const lead = conversation.leads;
                const displayName = lead
                  ? `${lead.first_name} ${lead.last_name || ''}`.trim()
                  : 'Unknown';
                const isActive = conversation.id === selectedConversationId;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => setSearchParams({ id: conversation.id })}
                    className={`
                      group p-4 rounded-xl cursor-pointer transition-all duration-200 border
                      ${isActive
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${conversation.unread_count > 0 ? 'bg-primary' : 'bg-transparent'}`} />
                        <p className={`font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {displayName}
                        </p>
                      </div>
                      {conversation.last_message_at && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pl-4">
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {lead?.phone}
                      </p>
                      <div className="flex items-center gap-2">
                        {conversation.requires_human_handoff && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                            Handoff
                          </Badge>
                        )}
                        {conversation.ai_message_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-secondary/20 text-secondary hover:bg-secondary/30">
                            <Bot className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Message Thread */}
        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden relative">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 bg-black/5 backdrop-blur-md flex items-center justify-between z-10">
                {(() => {
                  const lead = Array.isArray(selectedConversation.leads)
                    ? selectedConversation.leads[0]
                    : selectedConversation.leads;
                  return (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {lead?.first_name?.[0] || '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">
                          {lead?.first_name} {lead?.last_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {lead?.phone}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2">
                  {/* AI Status Badge */}
                  {selectedConversation.ai_controlled ? (
                    <div className="flex items-center gap-1 text-[#F39C12] font-medium text-xs">
                      <Bot className="h-3 w-3" />
                      AI Active
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs px-2 py-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                      <User className="h-3 w-3 mr-1" />
                      Manual Control
                      {selectedConversation.takeover_at && (
                        <span className="ml-1 text-[10px] opacity-70">
                          ({formatDistanceToNow(new Date(selectedConversation.takeover_at), { addSuffix: true })})
                        </span>
                      )}
                    </Badge>
                  )}

                  {/* Handoff Indicator */}
                  {selectedConversation.requires_human_handoff && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full animate-pulse">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-500">Action Required</span>
                    </div>
                  )}

                  {/* Take Over Button (Admin Only) */}
                  {userRole?.isAdmin && selectedConversation.ai_controlled && (
                    <Button
                      onClick={() => takeoverMutation.mutate(selectedConversationId!)}
                      disabled={takeoverMutation.isPending}
                      size="sm"
                      className="text-xs bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
                    >
                      {takeoverMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Taking over...
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Take Over from AI
                        </>
                      )}
                    </Button>
                  )}

                  {/* Call Button */}
                  <Button
                    onClick={() => initiateCallMutation.mutate()}
                    disabled={initiateCallMutation.isPending}
                    size="sm"
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600"
                  >
                    {initiateCallMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-black/5">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="h-12 w-1/3 bg-muted/50 animate-pulse rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((message: any, index: number) => {
                    const isOutbound = message.direction === 'outbound';
                    const isLast = index === messages.length - 1;

                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} group`}
                      >
                        <div
                          className={`
                            max-w-[75%] px-5 py-3 shadow-sm relative text-sm leading-relaxed
                            ${isOutbound
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                              : 'bg-white dark:bg-zinc-800 text-foreground border border-border/50 rounded-2xl rounded-tl-sm'
                            }
                          `}
                        >
                          {message.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-[10px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                          {message.is_ai_generated && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary/20 text-primary">
                              <Bot className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                    <MessageSquare className="h-12 w-12 mb-2" />
                    <p>No messages yet</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-black/5 border-t border-white/5 backdrop-blur-sm">
                {(() => {
                  const canSendManualMessage = userRole?.isAdmin && !selectedConversation.ai_controlled;
                  const placeholderText = selectedConversation.ai_controlled
                    ? "AI is handling this conversation. Click 'Take Over from AI' to send manual messages."
                    : !userRole?.isAdmin
                    ? "Only admins can send manual messages"
                    : "Type your message...";

                  return (
                    <div className={`relative flex items-end gap-2 bg-background/80 border border-white/10 rounded-xl p-2 shadow-sm transition-all ${canSendManualMessage ? 'focus-within:ring-1 focus-within:ring-primary/50' : 'opacity-60'}`}>
                      <Textarea
                        placeholder={placeholderText}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && canSendManualMessage) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={!canSendManualMessage}
                        rows={1}
                        className={`min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent py-3 px-3 ${!canSendManualMessage ? 'cursor-not-allowed' : ''}`}
                      />
                      <div className="flex items-center gap-2 pb-1 pr-1">
                        <span className={`text-[10px] ${charWarning ? 'text-destructive' : 'text-muted-foreground'} transition-colors`}>
                          {charCount}/160
                        </span>
                        <Button
                          onClick={handleSend}
                          disabled={!canSendManualMessage || !messageText.trim() || charCount > 160 || sendMessageMutation.isPending}
                          size="icon"
                          className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm opacity-70">Choose a thread from the list to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Phone Number Required Dialog */}
      <Dialog open={showPhoneNumberDialog} onOpenChange={setShowPhoneNumberDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              Phone Number Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2 space-y-3">
              <p>
                To call leads from the dashboard, you need to add your phone number to your profile.
              </p>
              <p className="text-sm">
                <strong>How it works:</strong> When you click "Call", your phone will ring first.
                After you answer, we'll connect you to the lead.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPhoneNumberDialog(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowPhoneNumberDialog(false);
                navigate('/settings?highlight=phone');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Go to Settings →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
