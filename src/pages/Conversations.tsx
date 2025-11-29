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
import { Search, Send, Bot, AlertCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export default function Conversations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('id');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [handoffFilter, setHandoffFilter] = useState<'all' | 'handoff' | 'ai'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', search, handoffFilter],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          unread_count,
          status,
          requires_human_handoff,
          handoff_triggered_at,
          ai_message_count,
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

      query = query.order('last_message_at', { ascending: false });

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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) throw new Error('Conversation not found');

      const twilioPhone = import.meta.env.VITE_TWILIO_PHONE_NUMBER || '';
      const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;
      const leadPhone = lead?.phone;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversationId,
          direction: 'outbound',
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText('');
      toast({ title: 'Message sent' });
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

  // 2. Conversation updates (status, handoff, unread counts)
  useRealtimeSubscription({
    table: 'conversations',
    event: 'UPDATE',
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
                        {lead?.phone_number}
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
                          {lead?.phone_number}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {selectedConversation.requires_human_handoff && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full animate-pulse">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium text-orange-500">Action Required</span>
                  </div>
                )}
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
                <div className="relative flex items-end gap-2 bg-background/80 border border-white/10 rounded-xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent py-3 px-3"
                  />
                  <div className="flex items-center gap-2 pb-1 pr-1">
                    <span className={`text-[10px] ${charWarning ? 'text-destructive' : 'text-muted-foreground'} transition-colors`}>
                      {charCount}/160
                    </span>
                    <Button
                      onClick={handleSend}
                      disabled={!messageText.trim() || charCount > 160 || sendMessageMutation.isPending}
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
    </div>
  );
}
