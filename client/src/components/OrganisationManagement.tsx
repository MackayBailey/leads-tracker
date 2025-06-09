
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Building2, Users, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Organisation, User, CreateOrganisationInput, UpdateOrganisationInput } from '../../../server/src/schema';

interface OrganisationManagementProps {
  currentUser: User;
  onOrganisationChange: () => void;
}

export function OrganisationManagement({ currentUser, onOrganisationChange }: OrganisationManagementProps) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [formData, setFormData] = useState<CreateOrganisationInput>({
    name: '',
    description: null
  });

  const [editFormData, setEditFormData] = useState<UpdateOrganisationInput>({
    id: 0,
    name: '',
    description: null
  });

  const loadOrganisations = useCallback(async () => {
    try {
      const orgsData = await trpc.getOrganisations.query();
      setOrganisations(orgsData);
    } catch (error) {
      console.error('Failed to load organisations:', error);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await loadOrganisations();
      setIsLoading(false);
    };
    initData();
  }, [loadOrganisations]);

  const handleCreateOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrg = await trpc.createOrganisation.mutate(formData);
      setOrganisations((prev: Organisation[]) => [newOrg, ...prev]);
      setShowCreateDialog(false);
      setFormData({
        name: '',
        description: null
      });
      onOrganisationChange(); // Refresh parent component
    } catch (error) {
      console.error('Failed to create organisation:', error);
    }
  };

  const handleUpdateOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedOrg = await trpc.updateOrganisation.mutate(editFormData);
      setOrganisations((prev: Organisation[]) => prev.map(org => 
        org.id === updatedOrg.id ? updatedOrg : org
      ));
      setShowEditDialog(false);
      onOrganisationChange(); // Refresh parent component
    } catch (error) {
      console.error('Failed to update organisation:', error);
    }
  };

  const openEditDialog = (org: Organisation) => {
    setEditFormData({
      id: org.id,
      name: org.name,
      description: org.description
    });
    setShowEditDialog(true);
  };

  const filteredOrganisations = organisations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  // Only admins can manage organisations
  if (currentUser.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">You don't have permission to manage organisations.</p>
        </CardContent>
      </Card>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Organisation Management</h2>
          <p className="text-gray-600">Manage your insurance organisations</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Organisation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organisation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrganisation} className="space-y-4">
              <div>
                <Label htmlFor="name">Organisation Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateOrganisationInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateOrganisationInput) => ({ ...prev, description: e.target.value || null }))
                  }
                  rows={3}
                  placeholder="Optional description of the organisation..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Organisation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search organisations..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Organisations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredOrganisations.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">No organisations found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrganisations.map((org: Organisation) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {org.created_at.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(org)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {org.description && (
                  <CardDescription className="mb-3">
                    {org.description}
                  </CardDescription>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Organisation ID: {org.id}</span>
                  </div>
                  <Badge variant="secondary">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Organisation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrganisation} className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Organisation Name *</Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateOrganisationInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editFormData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditFormData((prev: UpdateOrganisationInput) => ({ ...prev, description: e.target.value || null }))
                }
                rows={3}
                placeholder="Optional description of the organisation..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Organisation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
