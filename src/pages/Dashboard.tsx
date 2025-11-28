import { MetricCard } from '@/components/shared/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, MessageCircle, Users, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: todayMessages, isLoading: loadingTodayMessages } = useQuery({
    queryKey: ['dashboard', 'today-messages'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today);

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: unreadCount, isLoading: loadingUnread } = useQuery({
    queryKey: ['dashboard', 'unread'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('status', 'active');

      if (error) throw error;
      return data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;
    },
  });

  const { data: activeConversations, isLoading: loadingActive } = useQuery({
    queryKey: ['dashboard', 'active-conversations'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: newLeadsWeek, isLoading: loadingNewLeads } = useQuery({
    queryKey: ['dashboard', 'new-leads'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: recentConversations, isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboard', 'recent-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
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
            created_at,
            direction
          )
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your SMS communication and lead activity
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Messages (Today)"
          value={todayMessages || 0}
          icon={MessageSquare}
          variant="primary"
          loading={loadingTodayMessages}
        />
        <MetricCard
          title="Unread Texts"
          value={unreadCount || 0}
          icon={MessageCircle}
          variant="warning"
          loading={loadingUnread}
        />
        <MetricCard
          title="Active Conversations"
          value={activeConversations || 0}
          icon={Users}
          variant="secondary"
          loading={loadingActive}
        />
        <MetricCard
          title="New Leads (This Week)"
          value={newLeadsWeek || 0}
          icon={UserPlus}
          variant="destructive"
          loading={loadingNewLeads}
        />
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentConversations && recentConversations.length > 0 ? (
            <div className="space-y-2">
              {recentConversations.map((conversation: any) => {
                const lead = conversation.leads;
                const lastMessage = conversation.messages?.[0];
                const displayName = lead
                  ? `${lead.first_name} ${lead.last_name || ''}`.trim()
                  : 'Unknown';

                return (
                  <div
                    key={conversation.id}
                    onClick={() => navigate(`/conversations?id=${conversation.id}`)}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{displayName}</p>
                        {conversation.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage.direction === 'outbound' && 'You: '}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                    {conversation.last_message_at && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No conversations yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
