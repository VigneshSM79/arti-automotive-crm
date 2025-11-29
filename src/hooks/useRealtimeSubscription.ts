import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'leads' | 'conversations' | 'messages' | 'pipeline_stages' | 'tag_campaigns' | 'tag_campaign_messages';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  table: TableName;
  event?: EventType;
  schema?: string;
  filter?: string;
  queryKey: string[];
}

export function useRealtimeSubscription({
  table,
  event = '*',
  schema = 'public',
  filter,
  queryKey,
}: SubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = `public:${table}:${event}${filter ? `:${filter}` : ''}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: event as any, // Cast to any to avoid strict literal type mismatch issues with Supabase types
          schema,
          table,
          ...(filter && { filter }),
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Real-time update received for ${table}:`, payload);
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channelName}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, schema, filter, queryKey, queryClient]);
}
