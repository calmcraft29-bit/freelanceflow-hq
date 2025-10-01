import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Bell, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OverdueInvoice {
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  days_overdue: number;
  total_amount: number;
  due_date: string;
}

export const InvoiceReminders: React.FC = () => {
  const { user } = useAuth();
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOverdueInvoices();
    }
  }, [user]);

  const fetchOverdueInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_overdue_invoices', {
        user_uuid: user.id,
      });

      if (error) throw error;
      setOverdueInvoices(data || []);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch overdue invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (invoice: OverdueInvoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', invoice.invoice_id);

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: `Reminder sent for invoice #${invoice.invoice_number}`,
      });

      fetchOverdueInvoices();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (overdueInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Invoice Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No overdue invoices - you're all caught up! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Overdue Invoices ({overdueInvoices.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueInvoices.map((invoice) => (
          <div key={invoice.invoice_id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Invoice #{invoice.invoice_number}</p>
                <Badge variant="destructive">
                  {invoice.days_overdue} {invoice.days_overdue === 1 ? 'day' : 'days'} overdue
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {invoice.client_name} • {invoice.project_name}
              </p>
              <p className="text-sm font-semibold">
                ${invoice.total_amount.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendReminder(invoice)}
              >
                <Bell className="w-4 h-4 mr-1" />
                Send Reminder
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/invoices'}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
