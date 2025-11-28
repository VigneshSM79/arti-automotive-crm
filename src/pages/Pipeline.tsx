import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Search, Phone, Mail, MessageSquare } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

export default function Pipeline() {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const { user } = useAuth();
  const { data: userRole } = useUserRole();

  const { data: stages, isLoading: loadingStages } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users for admin dropdown
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: userRole?.isAdmin === true,
  });

  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ['leads', search, selectedSalesperson, user?.id, userRole?.isAdmin],
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
          pipeline_stages (
            id,
            name,
            color
          )
        `)
        .not('owner_id', 'is', null); // Only get assigned leads (not pooled)

      // Role-based filtering
      if (userRole?.isAdmin) {
        // Admin: Filter by selected salesperson or show all
        if (selectedSalesperson && selectedSalesperson !== 'all') {
          query = query.eq('owner_id', selectedSalesperson);
        }
      } else {
        // Regular agent: Only show their own leads
        query = query.eq('owner_id', user.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ pipeline_stage_id: stageId })
        .eq('id', leadId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead moved successfully' });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ notes })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
      toast({ title: 'Lead updated' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    updateStageMutation.mutate({ leadId, stageId: newStageId });
  };

  const openLeadDetail = (lead: any) => {
    setSelectedLead(lead);
    setEditedNotes(lead.notes || '');
  };

  const handleSaveNotes = () => {
    if (selectedLead) {
      updateLeadMutation.mutate({ leadId: selectedLead.id, notes: editedNotes });
    }
  };

  const filteredLeads = leads?.filter((lead: any) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            {userRole?.isAdmin
              ? 'View and manage team pipelines'
              : 'Drag and drop your leads between stages'}
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
                {allUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
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

      {loadingStages || loadingLeads ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[320px] h-[600px] bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages?.map((stage: any) => {
              const stageLeads = filteredLeads?.filter(
                (lead: any) => lead.pipeline_stage_id === stage.id
              );

              return (
                <div key={stage.id} data-stage-id={stage.id} className="min-w-[320px]">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div 
                          className="px-3 py-1 rounded-full text-white text-sm font-medium"
                          style={{ backgroundColor: stage.color }}
                        >
                          {stage.name}
                        </div>
                        <Badge variant="secondary">
                          {stageLeads?.length || 0}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {stageLeads?.map((lead: any) => (
                        <Card
                          key={lead.id}
                          className="p-3 cursor-pointer hover:shadow-md transition-shadow !bg-blue-200 border border-border"
                          onClick={() => openLeadDetail(lead)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('leadId', lead.id);
                          }}
                        >
                          <p className="font-medium text-sm">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lead.phone}
                          </p>
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lead.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-white border-slate-400 text-slate-700 hover:border-slate-500 hover:shadow-sm transition-all cursor-pointer">
                              {tag}
                            </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {lead.email && <Mail className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm mt-1">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm mt-1">{selectedLead.phone}</p>
                </div>
                {selectedLead.email && (
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm mt-1">{selectedLead.email}</p>
                  </div>
                )}
                <div>
                  <Label>Stage</Label>
                  <p className="text-sm mt-1">{selectedLead.pipeline_stages?.name}</p>
                </div>
              </div>
              
              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLead.tags.map((tag: string, idx: number) => (
                      <Badge key={idx}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                  placeholder="Add notes about this lead..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNotes}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
