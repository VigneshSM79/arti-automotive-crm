import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

export default function LeadPool() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ['pooled-leads', search],
    queryFn: async () => {
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
          pipeline_stages (
            id,
            name,
            color
          ),
          campaign_enrollments!inner (
            id,
            status
          )
        `)
        .is('owner_id', null) // Only get unassigned leads
        .eq('campaign_enrollments.status', 'qualified') // Only get AI-qualified leads
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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
      toast({
        title: 'Lead claimed!',
        description: 'This lead has been assigned to you.'
      });
    },
  });

  const filteredLeads = leads?.filter((lead: any) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Pool</h1>
          <p className="text-muted-foreground">AI-qualified leads ready for agent claiming</p>
        </div>
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

      {loadingLeads ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : filteredLeads && filteredLeads.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-base px-3 py-1">
              {filteredLeads.length} Available Lead{filteredLeads.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLeads.map((lead: any) => (
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
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <div className="text-6xl">🏊</div>
            <h3 className="text-xl font-semibold">No leads in the pool</h3>
            <p className="text-muted-foreground">
              {search
                ? 'No leads match your search criteria'
                : 'All leads have been claimed. New leads will appear here when they become available.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
