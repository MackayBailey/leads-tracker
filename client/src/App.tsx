
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Users, Building2, FileText, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Organisation, 
  User, 
  Notification,
  UserRole
} from '../../server/src/schema';

import { LeadManagement } from '@/components/LeadManagement';
import { UserManagement } from '@/components/UserManagement';
import { OrganisationManagement } from '@/components/OrganisationManagement';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ReportsAnalytics } from '@/components/ReportsAnalytics';

// Current user - in production this would come from authentication context
const currentUser: User = {
  id: 1,
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin' as UserRole,
  organisation_id: 1,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

function App() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leads');

  // Load initial data
  const loadOrganisations = useCallback(async () => {
    try {
      const orgs = await trpc.getOrganisations.query();
      setOrganisations(orgs);
      if (orgs.length > 0 && !selectedOrganisation) {
        setSelectedOrganisation(orgs[0].id);
      }
    } catch (error) {
      console.error('Failed to load organisations:', error);
    }
  }, [selectedOrganisation]);

  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await trpc.getNotificationsByUser.query({ 
        user_id: currentUser.id,
        limit: 10 
      });
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      await Promise.all([loadOrganisations(), loadNotifications()]);
      setIsLoading(false);
    };
    initApp();
  }, [loadOrganisations, loadNotifications]);

  const handleOrganisationChange = (orgId: string) => {
    setSelectedOrganisation(parseInt(orgId));
  };

  const handleNotificationRead = async (notificationId: number) => {
    try {
      await trpc.markNotificationRead.mutate(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Insurance Leads Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Insurance Leads Tracker</h1>
              </div>
              
              {organisations.length > 0 && (
                <Select value={selectedOrganisation?.toString() || 'none'} onValueChange={handleOrganisationChange}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Welcome,</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentUser.first_name} {currentUser.last_name}
                </span>
                <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'}>
                  {currentUser.role}
                </Badge>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedOrganisation ? (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Please select an organisation to view and manage leads.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="leads" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Leads</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="organisations" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Organisations</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leads">
              <LeadManagement 
                organisationId={selectedOrganisation}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement 
                organisationId={selectedOrganisation}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="organisations">
              <OrganisationManagement 
                currentUser={currentUser}
                onOrganisationChange={loadOrganisations}
              />
            </TabsContent>

            <TabsContent value="reports">
              <ReportsAnalytics 
                organisationId={selectedOrganisation}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationCenter
                notifications={notifications}
                onNotificationRead={handleNotificationRead}
                onRefresh={loadNotifications}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
