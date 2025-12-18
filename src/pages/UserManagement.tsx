import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Mail, Phone, Building, Shield, Plus, Pencil, Trash2 } from 'lucide-react';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  twilio_phone_number: string | null;
  designation: string | null;
  receive_sms_notifications: boolean;
  is_active: boolean;
  user_roles?: { role: 'admin' | 'user' } | null;
}

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  phone_number: string;
  twilio_phone_number: string;
  designation: string;
  role: 'admin' | 'user';
  receive_sms_notifications: boolean;
  is_active: boolean;
}

const initialFormData: UserFormData = {
  full_name: '',
  email: '',
  password: '',
  phone_number: '',
  twilio_phone_number: '',
  designation: '',
  role: 'user',
  receive_sms_notifications: true,
  is_active: true,
};

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  // Delete user state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch all users with their roles (optimized single query)
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          twilio_phone_number,
          designation,
          receive_sms_notifications,
          is_active,
          user_roles!user_roles_user_id_fkey (role)
        `)
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  // Get role for a specific user
  // With UNIQUE constraint, each user has exactly 0 or 1 role
  // Supabase returns single role as object (not array) for one-to-one relationships
  const getUserRole = (userId: string): 'admin' | 'user' => {
    const user = users?.find((u) => u.id === userId);
    return user?.user_roles?.role === 'admin' ? 'admin' : 'user';
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      // Call Edge Function to create user (requires service role key)
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email.trim(),
          password: data.password,
          full_name: data.full_name.trim(),
          phone_number: data.phone_number?.trim() || null,
          twilio_phone_number: data.twilio_phone_number?.trim() || null,
          designation: data.designation?.trim() || null,
          role: data.role,
          receive_sms_notifications: data.receive_sms_notifications,
          is_active: data.is_active,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to create user');
      }

      return response.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setDialogOpen(false);
      setFormData(initialFormData);
      toast({
        title: 'User created successfully',
        description: 'A welcome email has been sent to the user.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserFormData> }) => {
      // 1. Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: data.full_name?.trim(),
          phone_number: data.phone_number?.trim() || null,
          twilio_phone_number: data.twilio_phone_number?.trim() || null,
          designation: data.designation?.trim() || null,
          receive_sms_notifications: data.receive_sms_notifications,
          is_active: data.is_active,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 2. Update role if changed (UPSERT - atomic operation)
      if (data.role) {
        // UPSERT: Update if exists, insert if not
        // UNIQUE constraint on user_id ensures only one role per user
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(
            {
              user_id: userId,
              role: data.role,
            },
            {
              onConflict: 'user_id', // Uses UNIQUE constraint
            }
          );

        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setDialogOpen(false);
      setFormData(initialFormData);
      toast({
        title: 'User updated successfully',
        description: 'Changes have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Call Edge Function to delete user (requires service role key)
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to delete user');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: 'User deleted successfully',
        description: 'The user has been permanently removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle SMS notifications
  const toggleNotificationMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ receive_sms_notifications: enabled })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: 'Notification settings updated',
        description: 'SMS notification preferences have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateNew = () => {
    setEditMode(false);
    setSelectedUserId(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditMode(true);
    setSelectedUserId(user.id);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      phone_number: user.phone_number || '',
      twilio_phone_number: user.twilio_phone_number || '',
      designation: user.designation || '',
      role: getUserRole(user.id),
      receive_sms_notifications: user.receive_sms_notifications,
      is_active: user.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editMode && selectedUserId) {
      updateUserMutation.mutate({ userId: selectedUserId, data: formData });
    } else {
      if (!formData.password) {
        toast({
          title: 'Password required',
          description: 'Please enter a password for the new user.',
          variant: 'destructive',
        });
        return;
      }
      createUserMutation.mutate(formData);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete({ id: user.id, name: user.full_name });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0]?.[0] || '?').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users in your dealership and teams
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Users
          </CardTitle>
          <CardDescription>
            View and manage all team members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NAME</TableHead>
                  <TableHead>EMAIL</TableHead>
                  <TableHead>PHONE</TableHead>
                  <TableHead>TWILIO PHONE</TableHead>
                  <TableHead>DESIGNATION</TableHead>
                  <TableHead>ROLE</TableHead>
                  <TableHead>SMS ALERTS</TableHead>
                  <TableHead className="text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const role = getUserRole(user.id);
                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {getInitials(user.full_name)}
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                          {!user.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phone_number || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.twilio_phone_number || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.designation || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                          {role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.receive_sms_notifications}
                          onCheckedChange={(enabled) =>
                            toggleNotificationMutation.mutate({ userId: user.id, enabled })
                          }
                          disabled={toggleNotificationMutation.isPending || !user.is_active}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="gap-2 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Update user information and permissions'
                : 'Add a new team member to your dealership'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">User Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="john@example.com"
                    disabled={editMode}
                  />
                </div>
              </div>

              {!editMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Enter password"
                  />
                  <p className="text-xs text-muted-foreground">
                    User will receive a welcome email with login instructions
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone_number: e.target.value }))
                    }
                    placeholder="+16042404206"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilio_phone_number">Twilio Phone Number</Label>
                  <Input
                    id="twilio_phone_number"
                    type="tel"
                    value={formData.twilio_phone_number}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, twilio_phone_number: e.target.value }))
                    }
                    placeholder="+17786533712"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, designation: e.target.value }))
                    }
                    placeholder="Sales"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'user') =>
                      setFormData((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Settings</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive users cannot log in or receive notifications
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="receive_sms">Receive SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when leads show positive engagement
                  </p>
                </div>
                <Switch
                  id="receive_sms"
                  checked={formData.receive_sms_notifications}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, receive_sms_notifications: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {createUserMutation.isPending || updateUserMutation.isPending
                ? 'Saving...'
                : editMode
                  ? 'Save Changes'
                  : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        userName={userToDelete?.name}
        isDeleting={deleteUserMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
