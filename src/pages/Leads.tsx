import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, Search, Columns, Edit, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Check, ChevronsUpDown, X, Upload, Send, AlertCircle, CheckCircle, XCircle, Download, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { checkDuplicatePhone, normalizePhoneNumber as normalizePhone, validatePhoneNumber, ExistingLead } from '@/lib/duplicatePhoneCheck';
import { DuplicateContactDialog } from '@/components/leads/DuplicateContactDialog';
import { DeleteLeadDialog } from '@/components/leads/DeleteLeadDialog';

const LEADS_PER_PAGE = 25;

const OPTIONAL_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' },
  { key: 'lead_source', label: 'Lead Source' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
];

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tags: string[] | null;
  notes: string | null;
  lead_source: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  pipeline_stage_id: string;
  stage_name?: string;
  stage_color?: string;
};

type PipelineStage = {
  id: string;
  name: string;
  color: string;
};

type CSVRow = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
};

type ValidationResult = {
  row: number;
  data: CSVRow;
  errors: string[];
  warnings: string[];
  isValid: boolean;
};

import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const Leads = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const isAdmin = roleData?.isAdmin || false;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time updates for leads (new leads and tag changes)
  useRealtimeSubscription({
    table: 'leads',
    event: '*', // Listen for INSERT, UPDATE, DELETE
    queryKey: ['leads'],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<keyof Lead>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Multi-select state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // CSV upload state
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [csvValidationResults, setCsvValidationResults] = useState<ValidationResult[]>([]);
  const [csvImportStep, setCsvImportStep] = useState(1);
  const [importBatchName, setImportBatchName] = useState('');
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // Duplicate phone detection state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<ExistingLead | null>(null);
  const [phoneError, setPhoneError] = useState('');

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null); // Single lead ID
  const [leadsToDeleteBulk, setLeadsToDeleteBulk] = useState<string[]>([]); // Multiple lead IDs

  // Load column visibility from localStorage or default to showing email, status, and tags
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('leads-visible-columns');
    return saved ? JSON.parse(saved) : ['email', 'status', 'tags'];
  });

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    pipeline_stage_id: '',
    tags: [] as string[],
    notes: '',
  });

  // Fetch pipeline stages
  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_position');

      if (error) throw error;
      return data;
    },
  });

  // Fetch tag campaigns for tags dropdown
  const { data: tagCampaigns = [] } = useQuery({
    queryKey: ['tag-campaigns-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_campaigns')
        .select('id, tag, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', user?.id, searchQuery, sortColumn, sortDirection, isAdmin],
    queryFn: async () => {
      if (!user?.id) return { leads: [], total: 0 };

      let query = supabase
        .from('leads')
        .select('*, pipeline_stages(name, color)', { count: 'exact' });

      // Only filter by user_id if NOT admin
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      const { data, error, count } = await query;

      if (error) throw error;

      const leads = data?.map(lead => ({
        ...lead,
        stage_name: lead.pipeline_stages?.name,
        stage_color: lead.pipeline_stages?.color,
      })) || [];

      return { leads, total: count || 0 };
    },
    enabled: !!user?.id,
  });

  // Paginate leads in memory
  const paginatedLeads = useMemo(() => {
    const leads = leadsData?.leads || [];
    const startIndex = (currentPage - 1) * LEADS_PER_PAGE;
    const endIndex = startIndex + LEADS_PER_PAGE;
    return leads.slice(startIndex, endIndex);
  }, [leadsData?.leads, currentPage]);

  const totalPages = Math.ceil((leadsData?.total || 0) / LEADS_PER_PAGE);

  // Helper function to trigger webhook for campaign tags
  const triggerCampaignWebhook = async (leadId: string, leadData: any, tag: string) => {
    const n8nWebhookUrl = import.meta.env.VITE_N8N_INITIAL_MESSAGE_WEBHOOK;
    const webhookToken = import.meta.env.VITE_N8N_WEBHOOK_TOKEN;

    if (!n8nWebhookUrl || !webhookToken) {
      console.warn('n8n webhook not configured');
      return false;
    }

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': webhookToken,
        },
        body: JSON.stringify({
          source: 'tag_added',
          lead_id: leadId,
          first_name: leadData.first_name,
          last_name: leadData.last_name,
          phone: leadData.phone,
          tag: tag,
          tags: leadData.tags || [], // Include all tags array
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log(`Webhook triggered for tag: ${tag}`);
        return true;
      } else {
        console.error(`Webhook failed for tag ${tag}:`, response.status, await response.text());
        return false;
      }
    } catch (error) {
      console.error(`Webhook network error for tag ${tag}:`, error);
      return false;
    }
  };

  // Create/Update lead mutation
  const leadMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let leadId: string;
      const oldTags = editingLead?.tags || [];
      const newTags = data.tags || [];

      // Determine if Initial_Message tag is being added
      const addingInitialMessage = newTags.includes('Initial_Message') && !oldTags.includes('Initial_Message');

      const leadData = {
        ...data,
        user_id: user?.id,
        owner_id: null, // All leads start unassigned in "New Contact" stage
        pipeline_stage_id: data.pipeline_stage_id, // Fix: Include pipeline stage
        tags: newTags,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        notes: data.notes || null,
        lead_source: 'manual_entry',
        // Only set status to 'contacted' if:
        // 1. Creating new lead WITH 'Initial_Message' tag, OR
        // 2. Editing existing lead and ADDING 'Initial_Message' tag
        // Otherwise, preserve existing status (for edits) or set to 'new' (for creates)
        status: addingInitialMessage || (!editingLead && newTags.includes('Initial_Message'))
          ? 'contacted'
          : (editingLead?.status || 'new'),
      };

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id);

        if (error) throw error;
        leadId = editingLead.id;
      } else {
        const { data: insertedData, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select('id')
          .single();

        if (error) throw error;
        leadId = insertedData.id;
      }

      // Return data needed for onSuccess
      return { leadId, leadData, oldTags, newTags };
    },
    onSuccess: async (result) => {
      const { leadId, leadData, oldTags, newTags } = result;

      // Detect newly added tags
      const addedTags = newTags.filter((tag: string) => !oldTags.includes(tag));

      if (addedTags.length > 0) {
        // Fetch tag_campaigns to check which tags should trigger webhook
        const { data: campaigns } = await supabase
          .from('tag_campaigns')
          .select('tag')
          .in('tag', addedTags);

        const campaignTags = campaigns?.map(c => c.tag) || [];

        // Trigger webhook for all campaign tags (including 'Initial_Message')
        const triggeredTags = campaignTags;

        // Trigger webhook for each qualifying tag
        let webhooksTriggered = 0;
        for (const tag of triggeredTags) {
          const success = await triggerCampaignWebhook(leadId, leadData, tag);
          if (success) webhooksTriggered++;
        }

        if (webhooksTriggered > 0) {
          toast.success(
            `${editingLead ? 'Lead updated' : 'Lead created'}! Triggering ${webhooksTriggered} campaign${webhooksTriggered > 1 ? 's' : ''}...`
          );
        } else {
          toast.success(editingLead ? 'Lead updated successfully' : 'Lead created successfully');
        }
      } else {
        toast.success(editingLead ? 'Lead updated successfully' : 'Lead created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Failed to ${editingLead ? 'update' : 'create'} lead: ${error.message}`);
    },
  });

  // Send 1st message mutation (HYBRID APPROACH: Frontend webhook + Backup polling)
  const sendFirstMessageMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      // Fetch leads with all data needed for webhook
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, tags')
        .in('id', leadIds);

      if (fetchError) throw fetchError;

      if (!leads || leads.length === 0) {
        throw new Error('No leads found');
      }

      const n8nWebhookUrl = import.meta.env.VITE_N8N_INITIAL_MESSAGE_WEBHOOK;
      const webhookToken = import.meta.env.VITE_N8N_WEBHOOK_TOKEN;

      const results = {
        updated: 0,
        webhooksSent: 0,
        webhooksFailed: 0,
        skipped: 0,
      };

      // Process each lead
      for (const lead of leads) {
        try {
          // Check if lead already has 'Initial_Message' tag
          const existingTags = lead.tags || [];
          if (existingTags.includes('Initial_Message')) {
            // Skip this lead - already tagged
            console.log(`Lead ${lead.id} already has 'Initial_Message' tag, skipping...`);
            results.skipped++;
            continue;
          }

          // Step 1: Update database (status + add 'Initial_Message' tag)
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              status: 'contacted',
              tags: [...existingTags, 'Initial_Message'], // ADDITIVE tagging (no duplicates)
            })
            .eq('id', lead.id);

          if (updateError) throw updateError;
          results.updated++;

          // Step 2: Call n8n webhook DIRECTLY (no Supabase webhook needed)
          try {
            const response = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': webhookToken,
              },
              body: JSON.stringify({
                source: 'frontend',
                lead_id: lead.id,
                first_name: lead.first_name,
                last_name: lead.last_name,
                phone: lead.phone,
                tags: [...existingTags, 'Initial_Message'], // Include updated tags with Initial_Message
                timestamp: new Date().toISOString(),
              }),
            });

            if (response.ok) {
              results.webhooksSent++;
            } else {
              console.error(`Webhook failed for lead ${lead.id}:`, response.status, await response.text());
              results.webhooksFailed++;
            }
          } catch (webhookError) {
            // Don't fail the whole operation if webhook fails
            // Backup polling workflow will catch this lead later
            console.error(`Webhook network error for lead ${lead.id}:`, webhookError);
            results.webhooksFailed++;
          }
        } catch (error) {
          console.error(`Failed to process lead ${lead.id}:`, error);
          throw error; // Fail fast on database errors
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // Show appropriate message based on results
      if (results.skipped > 0 && results.updated === 0) {
        // All leads were skipped
        toast.info(`${results.skipped} lead${results.skipped > 1 ? 's' : ''} already tagged with 'Initial_Message'. No messages sent.`);
      } else if (results.skipped > 0) {
        // Some leads processed, some skipped
        toast.success(`Sending message to ${results.updated} lead${results.updated > 1 ? 's' : ''}. ${results.skipped} already tagged (skipped).`);
      } else if (results.webhooksFailed === 0) {
        // All successful
        toast.success(`Sending message to ${results.updated} lead${results.updated > 1 ? 's' : ''}...`);
      } else if (results.webhooksSent > 0) {
        // Some webhook failures
        toast.warning(`Updated ${results.updated} lead(s). ${results.webhooksSent} messages queued, ${results.webhooksFailed} will be sent by backup system.`);
      } else {
        // All webhooks failed (backup will handle)
        toast.warning(`Updated ${results.updated} lead(s). Messages will be sent by backup system shortly.`);
      }

      setSelectedLeads(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to send messages: ${error.message}`);
    },
  });

  // Delete lead(s) mutation - Admin only
  const deleteLeadsMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      // Admin-only check
      if (!roleData?.isAdmin) {
        throw new Error('Only admins can delete leads');
      }

      // Delete leads (conversations will be CASCADE deleted automatically)
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) throw error;

      return leadIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Successfully deleted ${count} lead${count > 1 ? 's' : ''}`);
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
      setLeadsToDeleteBulk([]);
      setSelectedLeads(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to delete lead(s): ${error.message}`);
    },
  });

  // Bulk CSV import mutation with duplicate handling
  const bulkImportMutation = useMutation({
    mutationFn: async (validatedLeads: ValidationResult[]) => {
      const leadsToInsert = validatedLeads
        .filter(result => result.isValid)
        .map(result => ({
          first_name: result.data.first_name,
          last_name: result.data.last_name,
          phone: normalizePhone(result.data.phone),
          email: result.data.email || null,
          address: result.data.address || null,
          city: result.data.city || null,
          state: result.data.state || null,
          zip: result.data.zip || null,
          notes: result.data.notes || null,
          user_id: user?.id,
          owner_id: null, // CSV uploads go to Lead Pool for AI qualification
          lead_source: 'csv_upload',
          status: 'new',
          pipeline_stage_id: pipelineStages[0]?.id || null,
          tags: [],
        }));

      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      // Insert leads one by one to handle duplicates gracefully
      for (const lead of leadsToInsert) {
        try {
          const { error } = await supabase
            .from('leads')
            .insert([lead]);

          if (error) {
            // Check if it's a duplicate phone error (UNIQUE constraint violation)
            if (error.code === '23505' && error.message.includes('unique_phone_number')) {
              duplicateCount++;
              console.log(`Skipped duplicate phone: ${lead.phone}`);
            } else {
              errorCount++;
              console.error('Insert error:', error);
            }
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          console.error('Unexpected error:', err);
        }
      }

      return { successCount, duplicateCount, errorCount, total: leadsToInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // Build success message
      const messages = [];
      if (result.successCount > 0) {
        messages.push(`${result.successCount} lead${result.successCount > 1 ? 's' : ''} imported`);
      }
      if (result.duplicateCount > 0) {
        messages.push(`${result.duplicateCount} duplicate${result.duplicateCount > 1 ? 's' : ''} skipped`);
      }
      if (result.errorCount > 0) {
        messages.push(`${result.errorCount} error${result.errorCount > 1 ? 's' : ''}`);
      }

      const summaryMessage = messages.join(', ');

      if (result.successCount > 0) {
        toast.success(`CSV Import Complete: ${summaryMessage}`);
      } else if (result.duplicateCount > 0 && result.errorCount === 0) {
        toast.info(`All leads were duplicates (${result.duplicateCount} skipped)`);
      } else {
        toast.error(`Import failed: ${summaryMessage}`);
      }

      handleCloseCsvDialog();
    },
    onError: (error) => {
      toast.error(`Failed to import leads: ${error.message}`);
    },
  });

  // Phone number normalization imported from lib/duplicatePhoneCheck

  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // Accept 10 digits (US) or 11 digits starting with 1
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
  };

  // CSV Validation
  const validateCsvRow = (row: CSVRow, rowIndex: number, allPhones: Set<string>): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.first_name || row.first_name.trim() === '') {
      errors.push('First name is required');
    }
    if (!row.last_name || row.last_name.trim() === '') {
      errors.push('Last name is required');
    }
    if (!row.phone || row.phone.trim() === '') {
      errors.push('Phone number is required');
    } else if (!isValidPhoneNumber(row.phone)) {
      errors.push('Invalid phone number format (must be 10 or 11 digits)');
    }

    // Check for duplicates within CSV
    const normalizedPhone = normalizePhone(row.phone);
    if (allPhones.has(normalizedPhone)) {
      warnings.push('Duplicate phone number in CSV');
    } else {
      allPhones.add(normalizedPhone);
    }

    // Email validation (if provided)
    if (row.email && row.email.trim() !== '' && !row.email.includes('@')) {
      warnings.push('Email format may be invalid');
    }

    return {
      row: rowIndex + 1,
      data: {
        ...row,
        first_name: row.first_name?.trim() || '',
        last_name: row.last_name?.trim() || '',
        phone: row.phone?.trim() || '',
        email: row.email?.trim(),
        address: row.address?.trim(),
        city: row.city?.trim(),
        state: row.state?.trim(),
        zip: row.zip?.trim(),
        notes: row.notes?.trim(),
      },
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  };

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingCsv(true);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const allPhones = new Set<string>();
        const validationResults = results.data.map((row, index) =>
          validateCsvRow(row, index, allPhones)
        );

        setCsvValidationResults(validationResults);
        setIsCsvDialogOpen(true);
        setIsProcessingCsv(false);
        setShowWelcomeScreen(false);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
        setIsProcessingCsv(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const handleSort = (column: keyof Lead) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleColumnVisibilityChange = (column: string, checked: boolean) => {
    const newVisible = checked
      ? [...visibleColumns, column]
      : visibleColumns.filter(c => c !== column);

    setVisibleColumns(newVisible);
    localStorage.setItem('leads-visible-columns', JSON.stringify(newVisible));
  };

  const handleShowAll = () => {
    const allColumns = OPTIONAL_COLUMNS.map(c => c.key);
    setVisibleColumns(allColumns);
    localStorage.setItem('leads-visible-columns', JSON.stringify(allColumns));
  };

  const handleHideAll = () => {
    setVisibleColumns([]);
    localStorage.setItem('leads-visible-columns', JSON.stringify([]));
  };

  const handleOpenDialog = (lead?: Lead) => {
    console.log('Opening dialog, pipeline stages:', pipelineStages);
    if (lead) {
      setEditingLead(lead);
      setFormData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        email: lead.email || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        zip: lead.zip || '',
        pipeline_stage_id: lead.pipeline_stage_id,
        tags: lead.tags || [],
        notes: lead.notes || '',
      });
    } else {
      setEditingLead(null);
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        pipeline_stage_id: pipelineStages[0]?.id || '',
        tags: [],
        notes: '',
      });
    }
    console.log('Setting dialog open to true');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLead(null);
  };

  const handleCloseCsvDialog = () => {
    setIsCsvDialogOpen(false);
    setShowWelcomeScreen(true);
    setCsvValidationResults([]);
    setCsvImportStep(1);
    setImportBatchName('');
  };

  const handleOpenCsvWizard = () => {
    setIsCsvDialogOpen(true);
    setShowWelcomeScreen(true);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsvContent = `first_name,last_name,phone,email,address,city,state,zip,notes
John,Smith,+16045551234,john.smith@example.com,123 Main St,Vancouver,BC,V6B 1A1,Interested in sedan
Sarah,Johnson,+17785552345,sarah.j@gmail.com,456 Oak Ave,Surrey,BC,V3T 2B2,Looking for SUV
Michael,Williams,6043334444,michael.w@outlook.com,789 Pine Rd,Burnaby,BC,V5H 3C3,Trade-in available`;

    const blob = new Blob([sampleCsvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-leads-import.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded! Check your downloads folder.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.phone || !formData.pipeline_stage_id || formData.tags.length === 0) {
      toast.error('Please fill in all required fields (including at least one tag)');
      return;
    }

    // Validate phone number (must be exactly 10 digits)
    const phoneValidationError = validatePhoneNumber(formData.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast.error(phoneValidationError);
      return;
    }

    // Normalize phone to E.164 format (+1XXXXXXXXXX)
    const normalizedPhone = normalizePhone(formData.phone);

    // Check for duplicates (only when creating new lead, not editing)
    if (!editingLead) {
      const duplicateCheck = await checkDuplicatePhone(normalizedPhone);
      if (duplicateCheck.isDuplicate && duplicateCheck.existingLead) {
        setDuplicateLead(duplicateCheck.existingLead);
        setIsDuplicateDialogOpen(true);
        return; // Stop submission, show duplicate dialog
      }
    }

    // Clear any phone errors
    setPhoneError('');

    // Update formData with normalized phone before submission
    leadMutation.mutate({
      ...formData,
      phone: normalizedPhone,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(paginatedLeads.map(lead => lead.id));
      setSelectedLeads(newSelected);
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSendFirstMessage = () => {
    const selectedArray = Array.from(selectedLeads);
    if (selectedArray.length === 0) {
      toast.error('Please select at least one lead');
      return;
    }

    const estimatedCost = (selectedArray.length * 0.0075).toFixed(2);

    if (confirm(`Send Day 1 SMS to ${selectedArray.length} lead${selectedArray.length > 1 ? 's' : ''}?\n\nEstimated cost: $${estimatedCost}`)) {
      sendFirstMessageMutation.mutate(selectedArray);
    }
  };

  const handleCsvImport = () => {
    const validLeads = csvValidationResults.filter(r => r.isValid);
    if (validLeads.length === 0) {
      toast.error('No valid leads to import');
      return;
    }

    if (confirm(`Import ${validLeads.length} valid lead${validLeads.length > 1 ? 's' : ''}?`)) {
      bulkImportMutation.mutate(csvValidationResults);
    }
  };

  const handleConfirmDelete = () => {
    const idsToDelete = leadToDelete ? [leadToDelete] : leadsToDeleteBulk;
    deleteLeadsMutation.mutate(idsToDelete);
  };

  const getSortIcon = (column: keyof Lead) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;

    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
      new: { variant: 'secondary', color: 'bg-gray-500' },
      contacted: { variant: 'default', color: 'bg-blue-500' },
      qualified: { variant: 'default', color: 'bg-green-500' },
      lost: { variant: 'destructive', color: 'bg-red-500' },
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'bg-gray-400' };

    return (
      <Badge variant={config.variant} className={cn('text-white', config.color)}>
        {status}
      </Badge>
    );
  };

  const validLeadsCount = csvValidationResults.filter(r => r.isValid).length;
  const invalidLeadsCount = csvValidationResults.filter(r => !r.isValid).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button
            onClick={handleOpenCsvWizard}
            disabled={isProcessingCsv}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessingCsv ? 'Processing...' : 'Add Bulk Contacts'}
          </Button>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-600">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </AlertTitle>
          <AlertDescription className="flex items-center gap-2 mt-2">
            <Button
              onClick={handleSendFirstMessage}
              disabled={sendFirstMessageMutation.isPending}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendFirstMessageMutation.isPending ? 'Sending...' : 'Send 1st Message'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedLeads(new Set())}
              size="sm"
            >
              Clear Selection
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={() => {
                  setLeadsToDeleteBulk(Array.from(selectedLeads));
                  setIsDeleteDialogOpen(true);
                }}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Column Visibility */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 border-2 border-red-400"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-2 border-yellow-500">
              <Columns className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {OPTIONAL_COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={(checked) => handleColumnVisibilityChange(column.key, checked)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <div className="flex gap-2 p-2">
              <Button variant="outline" size="sm" onClick={handleShowAll} className="flex-1">
                Show All
              </Button>
              <Button variant="outline" size="sm" onClick={handleHideAll} className="flex-1">
                Hide All
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedLeads.has(lead.id))}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('first_name')}>
                <div className="flex items-center">
                  First Name
                  {getSortIcon('first_name')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('last_name')}>
                <div className="flex items-center">
                  Last Name
                  {getSortIcon('last_name')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('phone')}>
                <div className="flex items-center">
                  Phone
                  {getSortIcon('phone')}
                </div>
              </TableHead>
              {visibleColumns.includes('email') && (
                <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center">
                    Email
                    {getSortIcon('email')}
                  </div>
                </TableHead>
              )}
              {visibleColumns.includes('address') && <TableHead>Address</TableHead>}
              {visibleColumns.includes('city') && <TableHead>City</TableHead>}
              {visibleColumns.includes('state') && <TableHead>State</TableHead>}
              {visibleColumns.includes('zip') && <TableHead>ZIP</TableHead>}
              <TableHead>Pipeline Stage</TableHead>
              {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
              {visibleColumns.includes('lead_source') && <TableHead>Lead Source</TableHead>}
              {visibleColumns.includes('tags') && <TableHead>Tags</TableHead>}
              {visibleColumns.includes('notes') && <TableHead>Notes</TableHead>}
              {visibleColumns.includes('created_at') && (
                <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">
                    Created At
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
              )}
              {visibleColumns.includes('updated_at') && (
                <TableHead className="cursor-pointer" onClick={() => handleSort('updated_at')}>
                  <div className="flex items-center">
                    Updated At
                    {getSortIcon('updated_at')}
                  </div>
                </TableHead>
              )}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : paginatedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                  No leads found. {searchQuery && 'Try adjusting your search.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.first_name}</TableCell>
                  <TableCell>{lead.last_name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  {visibleColumns.includes('email') && <TableCell>{lead.email || '-'}</TableCell>}
                  {visibleColumns.includes('address') && <TableCell>{lead.address || '-'}</TableCell>}
                  {visibleColumns.includes('city') && <TableCell>{lead.city || '-'}</TableCell>}
                  {visibleColumns.includes('state') && <TableCell>{lead.state || '-'}</TableCell>}
                  {visibleColumns.includes('zip') && <TableCell>{lead.zip || '-'}</TableCell>}
                  <TableCell>
                    <Badge style={{ backgroundColor: lead.stage_color }} className="text-white">
                      {lead.stage_name}
                    </Badge>
                  </TableCell>
                  {visibleColumns.includes('status') && (
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  )}
                  {visibleColumns.includes('lead_source') && (
                    <TableCell>
                      {lead.lead_source ? (
                        <Badge variant="outline">{lead.lead_source.replace('_', ' ')}</Badge>
                      ) : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('tags') && (
                    <TableCell>
                      {lead.tags && lead.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(lead.tags)].map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('notes') && (
                    <TableCell className="max-w-xs truncate">{lead.notes || '-'}</TableCell>
                  )}
                  {visibleColumns.includes('created_at') && (
                    <TableCell>{format(new Date(lead.created_at), 'MMM d, yyyy')}</TableCell>
                  )}
                  {visibleColumns.includes('updated_at') && (
                    <TableCell>{format(new Date(lead.updated_at), 'MMM d, yyyy')}</TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(lead)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        onClick={() => {
                          setLeadToDelete(lead.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * LEADS_PER_PAGE) + 1} to{' '}
            {Math.min(currentPage * LEADS_PER_PAGE, leadsData?.total || 0)} of{' '}
            {leadsData?.total || 0} leads
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .map((page, idx, array) => {
                  // Add ellipsis
                  if (idx > 0 && page - array[idx - 1] > 1) {
                    return [
                      <PaginationItem key={`ellipsis-${page}`}>
                        <span className="px-4">...</span>
                      </PaginationItem>,
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>,
                    ];
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Add/Edit Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  className="border-2 border-red-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  className="border-2 border-red-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted border border-input rounded-md text-muted-foreground font-medium">
                    +1
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="7785552345"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow digits, limit to 10
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digits });
                      setPhoneError('');
                    }}
                    required
                    className={cn(
                      "border-2 border-red-400 flex-1",
                      phoneError && "border-destructive"
                    )}
                    maxLength={10}
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter 10-digit phone number (without +1)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-2 border-red-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="border-2 border-red-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="border-2 border-red-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="border-2 border-red-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Postal Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  className="border-2 border-red-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeline_stage_id">
                Pipeline Stage <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.pipeline_stage_id}
                onValueChange={(value) => setFormData({ ...formData, pipeline_stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between border-2 border-red-400",
                      !formData.tags.length && "text-muted-foreground"
                    )}
                  >
                    {formData.tags.length > 0
                      ? `${formData.tags.length} tag${formData.tags.length > 1 ? 's' : ''} selected`
                      : "Select tags"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {tagCampaigns.map((campaign) => {
                          const isSelected = formData.tags.includes(campaign.tag);
                          return (
                            <CommandItem
                              key={campaign.id}
                              value={campaign.name}
                              onSelect={() => {
                                const newTags = isSelected
                                  ? formData.tags.filter(t => t !== campaign.tag)
                                  : [...formData.tags, campaign.tag]; // No duplicates - adds only if not selected
                                setFormData({ ...formData, tags: newTags });
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {campaign.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...new Set(formData.tags)].map((tag) => {
                    const campaign = tagCampaigns.find(c => c.tag === tag);
                    return (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {campaign?.name || tag}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter(t => t !== tag)
                            });
                          }}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="border-2 border-red-400"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={leadMutation.isPending}>
                {leadMutation.isPending ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Wizard Dialog */}
      <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
        <DialogContent className={showWelcomeScreen ? "max-w-2xl" : "max-w-7xl max-h-[90vh] p-0 gap-0"}>
          {/* Welcome Screen */}
          {showWelcomeScreen ? (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Upload className="h-6 w-6 text-primary" />
                  Bulk Import Contacts
                </DialogTitle>
                <DialogDescription>
                  Import multiple contacts at once using a CSV file. Follow the guide below to ensure successful import.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Required Format */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    Required CSV Format
                  </div>
                  <div className="p-4 bg-muted rounded-lg border">
                    <code className="text-xs break-all">
                      first_name, last_name, phone, email, address, city, state, zip, notes
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Required fields:</strong> first_name, last_name, phone
                  </p>
                </div>

                {/* Example Row */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Example Data
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <code className="text-xs break-all text-green-800">
                      John, Smith, +16045551234, john@example.com, 123 Main St, Vancouver, BC, V6B 1A1, Interested in sedan
                    </code>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    Important Tips
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Phone format:</strong> 10 digits (6045551234) or E.164 format (+16045551234)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Email:</strong> Optional but recommended for better communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Duplicates:</strong> System will warn about duplicate phone numbers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Validation:</strong> Invalid rows will be shown before import</span>
                    </li>
                  </ul>
                </div>

                {/* Download Sample */}
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={handleDownloadSampleCsv}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Sample CSV
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseCsvDialog}>
                    Cancel
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                    Continue to Upload
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* 3-Step Wizard */
            <div className="flex h-[85vh]">
              {/* Left Sidebar - Steps */}
              <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Bulk Import Contacts</h2>
                <p className="text-slate-300 text-sm mb-8">Follow the steps to import and manage multiple contacts at once.</p>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${csvImportStep >= 1 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                      {csvImportStep > 1 ? <Check className="h-5 w-5" /> : <span className="font-semibold">1</span>}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${csvImportStep === 1 ? 'text-white' : 'text-slate-400'}`}>
                        Upload & Validate Contacts
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload your contact list and validate the data format
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${csvImportStep >= 2 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                      {csvImportStep > 2 ? <Check className="h-5 w-5" /> : <span className="font-semibold">2</span>}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${csvImportStep === 2 ? 'text-white' : 'text-slate-400'}`}>
                        Contact Details
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Name your contact batch
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${csvImportStep >= 3 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                      <span className="font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${csvImportStep === 3 ? 'text-white' : 'text-slate-400'}`}>
                        Review & Import
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Review contacts and import to your database
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b">
                  <DialogTitle className="text-xl">
                    {csvImportStep === 1 && 'Import Contacts'}
                    {csvImportStep === 2 && 'Contact Details'}
                    {csvImportStep === 3 && 'Review & Import'}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {csvImportStep === 1 && 'Upload a CSV file with contact information'}
                    {csvImportStep === 2 && 'Name your contact batch for easy identification'}
                    {csvImportStep === 3 && 'Review contacts and import to your database'}
                  </DialogDescription>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Step 1: Upload & Validate */}
                  {csvImportStep === 1 && (
                    <div className="space-y-6">
                      {csvValidationResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
                          <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Click the button below to select your CSV file
                          </p>
                          <Button onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            Select CSV File
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Summary */}
                          <div className="grid grid-cols-3 gap-4">
                            <Alert className="border-green-500 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-600">Valid Leads</AlertTitle>
                              <AlertDescription className="text-2xl font-bold text-green-600">
                                {validLeadsCount}
                              </AlertDescription>
                            </Alert>
                            <Alert className="border-red-500 bg-red-50">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertTitle className="text-red-600">Invalid Leads</AlertTitle>
                              <AlertDescription className="text-2xl font-bold text-red-600">
                                {invalidLeadsCount}
                              </AlertDescription>
                            </Alert>
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Total Rows</AlertTitle>
                              <AlertDescription className="text-2xl font-bold">
                                {csvValidationResults.length}
                              </AlertDescription>
                            </Alert>
                          </div>

                          {/* Preview Table */}
                          <div className="border rounded-lg max-h-96 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">Row</TableHead>
                                  <TableHead className="w-12">Status</TableHead>
                                  <TableHead>First Name</TableHead>
                                  <TableHead>Last Name</TableHead>
                                  <TableHead>Phone</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Issues</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {csvValidationResults.map((result) => (
                                  <TableRow key={result.row} className={!result.isValid ? 'bg-red-50' : ''}>
                                    <TableCell>{result.row}</TableCell>
                                    <TableCell>
                                      {result.isValid ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      )}
                                    </TableCell>
                                    <TableCell>{result.data.first_name}</TableCell>
                                    <TableCell>{result.data.last_name}</TableCell>
                                    <TableCell>{result.data.phone}</TableCell>
                                    <TableCell>{result.data.email || '-'}</TableCell>
                                    <TableCell>
                                      {result.errors.length > 0 && (
                                        <div className="space-y-1">
                                          {result.errors.map((error, idx) => (
                                            <Badge key={idx} variant="destructive" className="text-xs mr-1">
                                              {error}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      {result.warnings.length > 0 && (
                                        <div className="space-y-1">
                                          {result.warnings.map((warning, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs mr-1 border-yellow-500 text-yellow-700">
                                              {warning}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 2: Contact Details */}
                  {csvImportStep === 2 && (
                    <div className="max-w-2xl mx-auto space-y-6 py-8">
                      <div className="space-y-4">
                        <Label htmlFor="batch-name" className="text-base">
                          Batch Name <span className="text-muted-foreground text-sm">(Optional)</span>
                        </Label>
                        <Input
                          id="batch-name"
                          placeholder="e.g., Q4 2024 Leads, Trade Show Contacts, etc."
                          value={importBatchName}
                          onChange={(e) => setImportBatchName(e.target.value)}
                          className="text-lg h-12"
                        />
                        <p className="text-sm text-muted-foreground">
                          Give this import batch a memorable name to help identify it later
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Import */}
                  {csvImportStep === 3 && (
                    <div className="space-y-6">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Ready to Import</AlertTitle>
                        <AlertDescription>
                          You're about to import <strong>{validLeadsCount} valid contact{validLeadsCount > 1 ? 's' : ''}</strong>
                          {importBatchName && ` as "${importBatchName}"`}.
                          {invalidLeadsCount > 0 && ` ${invalidLeadsCount} invalid row${invalidLeadsCount > 1 ? 's' : ''} will be skipped.`}
                        </AlertDescription>
                      </Alert>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Valid Contacts</div>
                          <div className="text-3xl font-bold text-green-600">{validLeadsCount}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Will Be Skipped</div>
                          <div className="text-3xl font-bold text-red-600">{invalidLeadsCount}</div>
                        </div>
                      </div>

                      {importBatchName && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Batch Name</div>
                          <div className="text-lg font-semibold">{importBatchName}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-between">
                  <Button variant="outline" onClick={handleCloseCsvDialog}>
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    {csvImportStep > 1 && (
                      <Button variant="outline" onClick={() => setCsvImportStep(csvImportStep - 1)}>
                        Back
                      </Button>
                    )}
                    {csvImportStep < 3 ? (
                      <Button
                        onClick={() => setCsvImportStep(csvImportStep + 1)}
                        disabled={csvImportStep === 1 && validLeadsCount === 0}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCsvImport}
                        disabled={validLeadsCount === 0 || bulkImportMutation.isPending}
                      >
                        {bulkImportMutation.isPending ? 'Importing...' : `Import ${validLeadsCount} Contact${validLeadsCount > 1 ? 's' : ''}`}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Contact Warning Dialog */}
      {duplicateLead && (
        <DuplicateContactDialog
          open={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          existingLead={duplicateLead}
          onViewExisting={() => {
            setIsDuplicateDialogOpen(false);
            setIsDialogOpen(false);
            // Optionally navigate to Pipeline or lead detail
            toast.info('Navigate to existing contact in Pipeline');
          }}
        />
      )}

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadCount={leadToDelete ? 1 : leadsToDeleteBulk.length}
        isDeleting={deleteLeadsMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Leads;
