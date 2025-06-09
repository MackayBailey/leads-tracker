
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Calendar, User, FileText, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Notification, NotificationType } from '../../../server/src/schema';

interface NotificationCenterProps {
  notifications: Notification[];
  onNotificationRead: (notificationId: number) => void;
  onRefresh: () => void;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  'due_date_reminder': <Calendar className="h-4 w-4" />,
  'lead_assignment': <User className="h-4 w-4" />,
  'status_change': <AlertCircle className="h-4 w-4" />,
  'document_upload': <FileText className="h-4 w-4" />
};

const notificationColors: Record<NotificationType, string> = {
  'due_date_reminder': 'bg-orange-100 text-orange-800',
  'lead_assignment': 'bg-blue-100 text-blue-800',
  'status_change': 'bg-green-100 text-green-800',
  'document_upload': 'bg-purple-100 text-purple-800'
};

export function NotificationCenter({ notifications, onNotificationRead, onRefresh }: NotificationCenterProps) {
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-gray-600">Stay updated with your lead activities</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {unreadNotifications.length} Unread
          </Badge>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              No notifications yet.<br />
              You'll see updates about your leads here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Unread ({unreadNotifications.length})
              </h3>
              <div className="space-y-3">
                {unreadNotifications.map((notification: Notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-blue-500 bg-blue-50/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              {notificationIcons[notification.type]}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{notification.title}</h4>
                              <Badge className={notificationColors[notification.type]}>
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                            <p className="text-xs text-gray-400">
                              {format(notification.created_at, 'PPP p')}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onNotificationRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Read ({readNotifications.length})
              </h3>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {readNotifications.map((notification: Notification) => (
                    <Card key={notification.id} className="opacity-75">
                      <CardContent className="p-4">
                        <div className="flex space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                              {notificationIcons[notification.type]}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-700">{notification.title}</h4>
                              <Badge variant="outline" className={notificationColors[notification.type]}>
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-gray-500 text-sm mb-2">{notification.message}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <span>{format(notification.created_at, 'PPP p')}</span>
                              {notification.sent_at && (
                                <>
                                  <span>•</span>
                                  <span>Sent: {format(notification.sent_at, 'PPP p')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
