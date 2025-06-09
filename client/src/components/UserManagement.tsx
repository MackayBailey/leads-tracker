
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Edit, Mail, User, Building2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User as UserType, CreateUserInput, UpdateUserInput, UserRole } from '../../../server/src/schema';

interface UserManagementProps {
  organisationId: number;
  currentUser: UserType;
}

const roleColors: Record<UserRole, string> = {
  'admin': 'bg-red-100 text-red-800',
  'broker': 'bg-blue-100 text-blue-800',
  'view_only': 'bg-gray-100 text-gray-800'
};

export function UserManagement({ organisationId, currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'view_only',
    organisation_id: organisationId
  });

  const [editFormData, setEditFormData] = useState<UpdateUserInput>({
    id: 0,
    email: '',
    first_name: '',
    last_name: '',
    role: 'view_only',
    organisation_id: organisationId,
    is_active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await trpc.getUsersByOrganisation.query({
        organisation_id: organisationId,
        role: roleFilter !== 'all' ? roleFilter : undefined
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [organisationId, roleFilter]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await loadUsers();
      setIsLoading(false);
    };
    initData();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await trpc.createUser.mutate(formData);
      setUsers((prev: UserType[]) => [newUser, ...prev]);
      setShowCreateDialog(false);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'view_only',
        organisation_id: organisationId
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = await trpc.updateUser.mutate(editFormData);
      setUsers((prev: UserType[]) => prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const openEditDialog = (user: UserType) => {
    setEditFormData({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      organisation_id: user.organisation_id,
      is_active: user.is_active
    });
    setShowEditDialog(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const userRoles: UserRole[] = ['admin', 'broker', 'view_only'];

  // Only admins can manage users
  if (currentUser.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">You don't have permission to manage users.</p>
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
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage organisation members and their roles</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label>Role</Label>
                <Select 
                  value={formData.role || 'view_only'} 
                  onValueChange={(value: UserRole) => 
                    setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={roleFilter} onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {userRoles.map(role => (
              <SelectItem key={role} value={role}>
                {role.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">No users found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user: UserType) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.first_name} {user.last_name}
                        </h3>
                        <Badge className={roleColors[user.role as UserRole]}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                        {!user.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-4 w-4" />
                          <span>Org ID: {user.organisation_id}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-1">
                        Joined: {user.created_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={editFormData.first_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, first_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  value={editFormData.last_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, last_name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select 
                value={editFormData.role || 'view_only'} 
                onValueChange={(value: UserRole) => 
                  setEditFormData((prev: UpdateUserInput) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={editFormData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setEditFormData((prev: UpdateUserInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Active User</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
