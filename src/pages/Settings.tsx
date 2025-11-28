import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { User, Bell, Phone, Mail } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [receiveSmsNotifications, setReceiveSmsNotifications] = useState(true);
  const { data: userRole } = useUserRole();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  // Initialize form with user data
  useEffect(() => {
    if (userProfile) {
      setPhoneNumber(userProfile.phone_number || '');
      setReceiveSmsNotifications(userProfile.receive_sms_notifications ?? true);
    }
  }, [userProfile]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({
          phone_number: phoneNumber || null,
          receive_sms_notifications: receiveSmsNotifications,
        })
        .eq('id', currentUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notification settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            View your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  value={userProfile?.full_name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  value={userProfile?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  {userRole?.isAdmin ? (
                    <Badge variant="default" className="bg-blue-600 text-white">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Sales Agent
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {userRole?.isAdmin
                      ? 'Full access to all features and team management'
                      : 'Access to your own leads and conversations'}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SMS Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications when leads engage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone-number" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number in E.164 format (e.g., +1234567890)
            </p>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">Receive SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when leads show positive engagement
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={receiveSmsNotifications}
              onCheckedChange={setReceiveSmsNotifications}
            />
          </div>

          {receiveSmsNotifications && !phoneNumber && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <p className="font-medium">Phone number required</p>
              <p className="text-xs mt-1">
                Please enter your phone number to receive SMS notifications.
              </p>
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base">How Notifications Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>AI Handoff Notifications:</strong> When a lead shows positive engagement
            after 2-3 AI messages, you'll receive an SMS alert to take over the conversation.
          </p>
          <p>
            <strong>What counts as positive engagement?</strong> Responses indicating interest,
            asking questions, requesting more information, or showing buying intent.
          </p>
          {userRole?.isAdmin && (
            <p>
              <strong>Admin Controls:</strong> Go to Team Management to control which agents
              receive alerts and manage team notification preferences.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            You can disable notifications at any time by toggling the switch above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
