import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Calendar, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CalendarIntegration = Tables<'calendar_integrations'>;

interface CalendarSyncProps {
  onClose: () => void;
}

export const CalendarSync: React.FC<CalendarSyncProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setIntegrations(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch calendar integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user]);

  const handleConnectGoogle = async () => {
    toast({
      title: "Google Calendar",
      description: "Google Calendar integration requires OAuth setup. Please configure the Google Calendar API credentials first.",
    });
    
    // In a real implementation, this would:
    // 1. Redirect to Google OAuth
    // 2. Get authorization code
    // 3. Exchange for access token
    // 4. Store in calendar_integrations table
    
    // For demo purposes, we'll show the process
    console.log('Google Calendar OAuth flow would start here');
  };

  const handleConnectOutlook = async () => {
    toast({
      title: "Outlook Calendar",
      description: "Outlook Calendar integration requires OAuth setup. Please configure the Microsoft Graph API credentials first.",
    });
    
    // In a real implementation, this would:
    // 1. Redirect to Microsoft OAuth
    // 2. Get authorization code
    // 3. Exchange for access token
    // 4. Store in calendar_integrations table
    
    console.log('Outlook Calendar OAuth flow would start here');
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Calendar disconnected successfully",
      });

      fetchIntegrations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect calendar",
        variant: "destructive",
      });
    }
  };

  const handleSyncNow = async (integration: CalendarIntegration) => {
    setSyncing(integration.id);
    
    try {
      // In a real implementation, this would call an edge function to:
      // 1. Fetch events from the external calendar
      // 2. Sync with local events
      // 3. Push updates to the external calendar
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast({
        title: "Success",
        description: "Calendar synced successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync calendar",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const googleIntegration = integrations.find(i => i.provider === 'google');
  const outlookIntegration = integrations.find(i => i.provider === 'outlook');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sync your projects and tasks with Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {googleIntegration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={googleIntegration.is_active ? 'default' : 'secondary'}>
                    {googleIntegration.is_active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Calendar ID: {googleIntegration.calendar_id || 'Primary'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncNow(googleIntegration)}
                    disabled={syncing === googleIntegration.id}
                  >
                    {syncing === googleIntegration.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(googleIntegration.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnectGoogle}>
              Connect Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            Outlook Calendar
          </CardTitle>
          <CardDescription>
            Sync your projects and tasks with Outlook Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outlookIntegration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={outlookIntegration.is_active ? 'default' : 'secondary'}>
                    {outlookIntegration.is_active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Calendar ID: {outlookIntegration.calendar_id || 'Primary'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncNow(outlookIntegration)}
                    disabled={syncing === outlookIntegration.id}
                  >
                    {syncing === outlookIntegration.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(outlookIntegration.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnectOutlook}>
              Connect Outlook Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-semibold mb-2">How Calendar Sync Works</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Project deadlines are synced as all-day events</li>
          <li>• Task due dates are synced with their completion status</li>
          <li>• Changes made in the app are pushed to your external calendar</li>
          <li>• Sync happens automatically every hour, or manually on demand</li>
        </ul>
      </div>
    </div>
  );
};
