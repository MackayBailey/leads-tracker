
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar as CalendarIcon,
  Phone,
  Mail,
  DollarSign,
  User,
  Upload,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  Lead, 
  User as UserType, 
  Document,
  CreateLeadInput, 
  UpdateLeadInput,
  LeadStatus,
  LeadSource,
  InsuranceType
} from '../../../server/src/schema';

interface LeadManagementProps {
  organisationId: number;
  currentUser: UserType;
}

const statusColors: Record<LeadStatus, string> = {
  'new': 'bg-blue-100 text-blue-800',
  'contacted': 'bg-yellow-100 text-yellow-800',
  'qualified': 'bg-green-100 text-green-800',
  'converted': 'bg-purple-100 text-purple-800',
  'lost': 'bg-red-100 text-red-800'
};

const sourceColors: Record<LeadSource, string> = {
  'referral': 'bg-green-100 text-green-800',
  'website': 'bg-blue-100 text-blue-800',
  'cold_call': 'bg-orange-100 text-orange-800',
  'social_media': 'bg-pink-100 text-pink-800',
  'advertisement': 'bg-purple-100 text-purple-800',
  'other': 'bg-gray-100 text-gray-800'
};

export function LeadManagement({ organisationId, currentUser }: LeadManagementProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [brokerFilter, setBrokerFilter] = useState<number | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  const [formData, setFormData] = useState<CreateLeadInput>({
    name: '',
    email: null,
    phone: null,
    insurance_types: [],
    source: 'website',
    estimated_value: 0,
    notes: null,
    due_date: null,
    organisation_id: organisationId,
    assigned_broker_id: null,
    parent_lead_id: null
  });

  const [editFormData, setEditFormData] = useState<UpdateLeadInput>({
    id: 0,
    name: '',
    email: null,
    phone: null,
    insurance_types: [],
    status: 'new',
    source: 'website',
    estimated_value: 0,
    notes: null,
    due_date: null,
    assigned_broker_id: null,
    parent_lead_id: null
  });

  const loadLeads = useCallback(async () => {
    try {
      const leadsData = await trpc.getLeadsByOrganisation.query({
        organisation_id: organisationId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        assigned_broker_id: brokerFilter !== 'all' ? brokerFilter : undefined
      });
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  }, [organisationId, statusFilter, brokerFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await trpc.getUsersByOrganisation.query({
        organisation_id: organisationId,
        role: 'broker'
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [organisationId]);

  const loadDocuments = useCallback(async (leadId: number) => {
    try {
      const docsData = await trpc.getDocumentsByLead.query(leadId);
      setDocuments(docsData);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([loadLeads(), loadUsers()]);
      setIsLoading(false);
    };
    initData();
  }, [loadLeads, loadUsers]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLead = await trpc.createLead.mutate(formData);
      setLeads((prev: Lead[]) => [newLead, ...prev]);
      setShowCreateDialog(false);
      setFormData({
        name: '',
        email: null,
        phone: null,
        insurance_types: [],
        source: 'website',
        estimated_value: 0,
        notes: null,
        due_date: null,
        organisation_id: organisationId,
        assigned_broker_id: null,
        parent_lead_id: null
      });
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedLead = await trpc.updateLead.mutate(editFormData);
      setLeads((prev: Lead[]) => prev.map(lead => 
        lead.id === updatedLead.id ? updatedLead : lead
      ));
      setShowEditDialog(false);
      if (selectedLead?.id === updatedLead.id) {
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    try {
      await trpc.deleteLead.mutate(leadId);
      setLeads((prev: Lead[]) => prev.filter(lead => lead.id !== leadId));
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleInsuranceTypeChange = (type: InsuranceType, checked: boolean, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData((prev: UpdateLeadInput) => ({
        ...prev,
        insurance_types: checked 
          ? [...(prev.insurance_types || []), type]
          : (prev.insurance_types || []).filter(t => t !== type)
      }));
    } else {
      setFormData((prev: CreateLeadInput) => ({
        ...prev,
        insurance_types: checked 
          ? [...prev.insurance_types, type]
          : prev.insurance_types.filter(t => t !== type)
      }));
    }
  };

  const openEditDialog = (lead: Lead) => {
    setEditFormData({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      insurance_types: lead.insurance_types,
      status: lead.status,
      source: lead.source,
      estimated_value: lead.estimated_value,
      notes: lead.notes,
      due_date: lead.due_date,
      assigned_broker_id: lead.assigned_broker_id,
      parent_lead_id: lead.parent_lead_id
    });
    setShowEditDialog(true);
  };

  const openLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    await loadDocuments(lead.id);
    setShowLeadDetails(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (lead.phone?.includes(searchTerm) || false);
    return matchesSearch;
  });

  const insuranceTypes: InsuranceType[] = ['life', 'auto', 'health', 'home', 'business', 'travel', 'disability'];
  const leadStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  const leadSources: LeadSource[] = ['referral', 'website', 'cold_call', 'social_media', 'advertisement', 'other'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
          <p className="text-gray-600">Manage and track insurance leads</p>
        </div>
        
        {(currentUser.role === 'admin' || currentUser.role === 'broker') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeadInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeadInput) => ({ ...prev, email: e.target.value || null }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeadInput) => ({ ...prev, phone: e.target.value || null }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_value">Estimated Value</Label>
                    <Input
                      id="estimated_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimated_value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeadInput) => ({ ...prev, estimated_value: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Source</Label>
                    <Select 
                      value={formData.source} 
                      onValueChange={(value: LeadSource) => 
                        setFormData((prev: CreateLeadInput) => ({ ...prev, source: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map(source => (
                          <SelectItem key={source} value={source}>
                            {source.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned Broker</Label>
                    <Select 
                      value={formData.assigned_broker_id?.toString() || 'unassigned'} 
                      onValueChange={(value: string) => 
                        setFormData((prev: CreateLeadInput) => ({ ...prev, assigned_broker_id: value === 'unassigned' ? null : parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select broker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No broker</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Insurance Types *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {insuranceTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={formData.insurance_types.includes(type)}
                          onCheckedChange={(checked: boolean) => 
                            handleInsuranceTypeChange(type, checked)
                          }
                        />
                        <Label htmlFor={type} className="text-sm">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date || undefined}
                        onSelect={(date: Date | undefined) => 
                          setFormData((prev: CreateLeadInput) => ({ ...prev, due_date: date || null }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateLeadInput) => ({ ...prev, notes: e.target.value || null }))
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Lead</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={(value: LeadStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {leadStatuses.map(status => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brokerFilter.toString()} onValueChange={(value: string) => setBrokerFilter(value === 'all' ? 'all' : parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brokers</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.first_name} {user.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Grid */}
      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">No leads found. Create your first lead!</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead: Lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                      <Badge variant="outline" className={sourceColors[lead.source]}>
                        {lead.source.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{lead.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{lead.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="h-4  w-4" />
                        <span>${lead.estimated_value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          {lead.assigned_broker_id 
                            ? users.find(u => u.id === lead.assigned_broker_id)?.first_name + ' ' + 
                              users.find(u => u.id === lead.assigned_broker_id)?.last_name
                            : 'Unassigned'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {lead.insurance_types.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>

                    {lead.due_date && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Due: {format(lead.due_date, 'PPP')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => openLeadDetails(lead)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(currentUser.role === 'admin' || currentUser.role === 'broker') && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(lead)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{lead.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteLead(lead.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value: LeadStatus) => 
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, email: e.target.value || null }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={editFormData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, phone: e.target.value || null }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_estimated_value">Estimated Value</Label>
                <Input
                  id="edit_estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.estimated_value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, estimated_value: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label>Assigned Broker</Label>
                <Select 
                  value={editFormData.assigned_broker_id?.toString() || 'unassigned'} 
                  onValueChange={(value: string) => 
                    setEditFormData((prev: UpdateLeadInput) => ({ ...prev, assigned_broker_id: value === 'unassigned' ? null : parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No broker</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Insurance Types *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {insuranceTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit_${type}`}
                      checked={editFormData.insurance_types?.includes(type) || false}
                      onCheckedChange={(checked: boolean) => 
                        handleInsuranceTypeChange(type, checked, true)
                      }
                    />
                    <Label htmlFor={`edit_${type}`} className="text-sm">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={editFormData.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditFormData((prev: UpdateLeadInput) => ({ ...prev, notes: e.target.value || null }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={showLeadDetails} onOpenChange={setShowLeadDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {selectedLead.name}</p>
                      <p><strong>Email:</strong> {selectedLead.email || 'Not provided'}</p>
                      <p><strong>Phone:</strong> {selectedLead.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Lead Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Status:</strong> <Badge className={statusColors[selectedLead.status]}>{selectedLead.status}</Badge></p>
                      <p><strong>Source:</strong> <Badge variant="outline" className={sourceColors[selectedLead.source]}>{selectedLead.source.replace('_', ' ')}</Badge></p>
                      <p><strong>Estimated Value:</strong> ${selectedLead.estimated_value.toLocaleString()}</p>
                      <p><strong>Due Date:</strong> {selectedLead.due_date ? format(selectedLead.due_date, 'PPP') : 'Not set'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Insurance Types</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.insurance_types.map(type => (
                      <Badge key={type} variant="secondary">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {selectedLead.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedLead.notes}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">Assignment & Dates</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>Assigned Broker:</strong> {
                      selectedLead.assigned_broker_id 
                        ? users.find(u => u.id === selectedLead.assigned_broker_id)?.first_name + ' ' + 
                          users.find(u => u.id === selectedLead.assigned_broker_id)?.last_name
                        : 'Unassigned'
                    }</p>
                    <p><strong>Created:</strong> {format(selectedLead.created_at, 'PPP')}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Associated Documents</h4>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: Document) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{doc.original_filename}</p>
                            <p className="text-sm text-gray-500">
                              {(doc.file_size / 1024).toFixed(1)} KB • {format(doc.created_at, 'PPP')}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
