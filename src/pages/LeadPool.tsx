import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Search } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export default function LeadPool() {
  const [search, setSearch] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: userRole } = useUserRole();

  // Subscribe to real-time updates for leads
  useRealtimeSubscription({
    table: 'leads',
    event: 'UPDATE',
    filter: 'owner_id=neq.null', // Listen for when a lead gets claimed (owner_id changes from null)
    queryKey: ['pooled-leads'],
  });

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
    enabled: userRole?.isAdmin === true,
  });

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
          owner:users (
            id,
            full_name
          )
        `)
        .eq('conversations.requires_human_handoff', true); // Only get AI-qualified leads needing handoff

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
    enabled: !!user, // Only run query when user is loaded
  });

  const claimLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('leads')
        .update({
          owner_id: user.id,
          claimed_at: new Date().toISOString()
        })
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

  // Separate leads into available and claimed
  const availableLeads = filteredLeads?.filter((lead: any) => lead.owner_id === null) || [];
  const claimedLeads = filteredLeads?.filter((lead: any) => lead.owner_id !== null) || [];

  return (
    <div className="space-y-6 animate-in">
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
    </div>
  );
}
