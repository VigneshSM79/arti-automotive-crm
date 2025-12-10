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
import { Search, Phone, Mail, MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

// Predefined color options for pipeline stages
const STAGE_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' },
];

export default function Pipeline() {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3B82F6');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);
  const [stageToEdit, setStageToEdit] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#3B82F6');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const { user } = useAuth();
  const { data: userRole } = useUserRole();

  // Subscribe to real-time updates for leads (stage changes)
  useRealtimeSubscription({
    table: 'leads',
    event: 'UPDATE',
    queryKey: ['leads'],
  });

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
        `);

      // Role-based filtering
      if (userRole?.isAdmin) {
        // Admin: Filter by selected salesperson or show all assigned + unassigned
        if (selectedSalesperson && selectedSalesperson !== 'all') {
          // Show unassigned leads OR leads owned by selected salesperson
          query = query.or(`owner_id.is.null,owner_id.eq.${selectedSalesperson}`);
        }
        // If 'all', show all leads (assigned + unassigned) - no filter needed
      } else {
        // Regular agent: Show unassigned leads OR their own assigned leads
        query = query.or(`owner_id.is.null,owner_id.eq.${user.id}`);
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

  const createStageMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      // Get the highest order number
      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('order_position')
        .order('order_position', { ascending: false })
        .limit(1);

      const nextOrder = existingStages && existingStages.length > 0 ? existingStages[0].order_position + 1 : 1;

      const { error } = await supabase
        .from('pipeline_stages')
        .insert({
          name,
          color,
          order_position: nextOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setIsCreateStageOpen(false);
      setNewStageName('');
      setNewStageColor('#3B82F6');
      toast({ title: 'Pipeline stage created successfully!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create stage',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const editStageMutation = useMutation({
    mutationFn: async ({ stageId, name, color }: { stageId: string; name: string; color: string }) => {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({
          name,
          color,
        })
        .eq('id', stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setStageToEdit(null);
      toast({ title: 'Pipeline stage updated successfully!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update stage',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      // Check if stage has any leads
      const { data: leadsInStage } = await supabase
        .from('leads')
        .select('id')
        .eq('pipeline_stage_id', stageId)
        .limit(1);

      if (leadsInStage && leadsInStage.length > 0) {
        throw new Error('Cannot delete stage with existing leads. Please move or delete the leads first.');
      }

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setStageToDelete(null);
      toast({ title: 'Pipeline stage deleted successfully!' });
    },
    onError: (error: any) => {
      setStageToDelete(null);
      toast({
        title: 'Failed to delete stage',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      updateStageMutation.mutate({ leadId: draggedLeadId, stageId });
      setDraggedLeadId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
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

  const handleCreateStage = () => {
    if (!newStageName.trim()) {
      toast({
        title: 'Stage name required',
        description: 'Please enter a name for the new stage',
        variant: 'destructive'
      });
      return;
    }
    createStageMutation.mutate({ name: newStageName, color: newStageColor });
  };

  const handleEditStage = () => {
    if (!editStageName.trim()) {
      toast({
        title: 'Stage name required',
        description: 'Please enter a name for the stage',
        variant: 'destructive'
      });
      return;
    }
    if (stageToEdit) {
      editStageMutation.mutate({ stageId: stageToEdit.id, name: editStageName, color: editStageColor });
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
          {/* Create New Stage Button - Admin Only */}
          {userRole?.isAdmin && (
            <Button onClick={() => setIsCreateStageOpen(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Stage
            </Button>
          )}
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage: any) => {
            const stageLeads = filteredLeads?.filter(
              (lead: any) => lead.pipeline_stage_id === stage.id
            );

            return (
              <div
                key={stage.id}
                className="min-w-[320px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <div
                          className="px-3 py-1 rounded-full text-white text-sm font-medium"
                          style={{ backgroundColor: stage.color }}
                        >
                          {stage.name}
                        </div>
                        {/* Edit & Delete Stage Buttons - Admin Only */}
                        {userRole?.isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStageToEdit({ id: stage.id, name: stage.name, color: stage.color });
                                setEditStageName(stage.name);
                                setEditStageColor(stage.color);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStageToDelete({ id: stage.id, name: stage.name });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {stageLeads?.length || 0}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent
                    className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto min-h-[200px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {stageLeads?.map((lead: any) => (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow !bg-blue-200 border border-border ${
                          draggedLeadId === lead.id ? 'opacity-50' : ''
                        }`}
                        onClick={() => openLeadDetail(lead)}
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

      {/* Create New Stage Modal */}
      <Dialog open={isCreateStageOpen} onOpenChange={setIsCreateStageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pipeline Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                placeholder="e.g., Sealed Deal, Negotiating, etc."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="stage-color">Stage Color</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-border"
                        style={{ backgroundColor: newStageColor }}
                      />
                      <span>{STAGE_COLORS.find(c => c.value === newStageColor)?.name || 'Select color'}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a color for the stage badge
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateStageOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateStage}
                disabled={createStageMutation.isPending}
              >
                {createStageMutation.isPending ? 'Creating...' : 'Create Stage'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!stageToEdit} onOpenChange={() => setStageToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pipeline Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-stage-name">Stage Name</Label>
              <Input
                id="edit-stage-name"
                placeholder="e.g., Sealed Deal, Negotiating, etc."
                value={editStageName}
                onChange={(e) => setEditStageName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-stage-color">Stage Color</Label>
              <Select value={editStageColor} onValueChange={setEditStageColor}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-border"
                        style={{ backgroundColor: editStageColor }}
                      />
                      <span>{STAGE_COLORS.find(c => c.value === editStageColor)?.name || 'Select color'}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a color for the stage badge
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStageToEdit(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditStage}
                disabled={editStageMutation.isPending}
              >
                {editStageMutation.isPending ? 'Updating...' : 'Update Stage'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation Dialog */}
      <Dialog open={!!stageToDelete} onOpenChange={() => setStageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pipeline Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the <span className="font-semibold text-foreground">"{stageToDelete?.name}"</span> stage?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Make sure to move all leads from this stage before deleting.
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStageToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (stageToDelete) {
                    deleteStageMutation.mutate(stageToDelete.id);
                  }
                }}
                disabled={deleteStageMutation.isPending}
              >
                {deleteStageMutation.isPending ? 'Deleting...' : 'Delete Stage'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
