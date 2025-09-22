import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InvoiceForm } from '@/components/InvoiceForm';
import { FileText, Download, DollarSign, Clock, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Invoice {
  id: string;
  invoice_number: string;
  hours_worked: number;
  hourly_rate: number;
  total_amount: number;
  status: string;
  invoice_date: string;
  due_date: string | null;
  pdf_url: string | null;
  notes: string | null;
  projects: {
    id: string;
    name: string;
    clients: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects:project_id (
            id,
            name,
            clients:client_id (
              id,
              name,
              email
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceStatus = async (invoiceId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice marked as ${newStatus}`,
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    try {
      // Create a temporary div for the invoice content
      const invoiceElement = document.createElement('div');
      invoiceElement.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #333; margin-bottom: 10px;">INVOICE</h1>
            <p style="color: #666; font-size: 18px;">#${invoice.invoice_number}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
            <div>
              <h3 style="color: #333; margin-bottom: 15px;">Bill To:</h3>
              <p style="margin: 5px 0; font-weight: bold;">${invoice.projects.clients.name}</p>
              <p style="margin: 5px 0; color: #666;">${invoice.projects.clients.email}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              ${invoice.due_date ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Project:</strong> ${invoice.projects.name}</p>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Description</th>
                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">Hours</th>
                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">Rate</th>
                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #dee2e6;">Work on ${invoice.projects.name}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #dee2e6;">${invoice.hours_worked}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #dee2e6;">$${invoice.hourly_rate.toFixed(2)}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #dee2e6;">$${invoice.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="text-align: right; margin-bottom: 40px;">
            <div style="background-color: #f8f9fa; padding: 20px; display: inline-block;">
              <p style="margin: 10px 0; font-size: 24px; font-weight: bold;">Total: $${invoice.total_amount.toFixed(2)}</p>
            </div>
          </div>
          
          ${invoice.notes ? `
            <div style="margin-top: 40px;">
              <h3 style="color: #333; margin-bottom: 15px;">Notes:</h3>
              <p style="color: #666; line-height: 1.6;">${invoice.notes}</p>
            </div>
          ` : ''}
        </div>
      `;

      // Temporarily add to DOM for rendering
      invoiceElement.style.position = 'absolute';
      invoiceElement.style.left = '-9999px';
      document.body.appendChild(invoiceElement);

      // Generate canvas from HTML
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      // Remove temporary element
      document.body.removeChild(invoiceElement);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Download the PDF
      pdf.save(`Invoice-${invoice.invoice_number}.pdf`);

      toast({
        title: "Success",
        description: "PDF invoice downloaded successfully",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'paid' ? 'default' : 'secondary';
  };

  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalUnpaid = invoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalHours = invoices.reduce((sum, inv) => sum + inv.hours_worked, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and generate invoices from your projects</p>
        </div>
        <InvoiceForm onSuccess={fetchInvoices} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalUnpaid.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No invoices</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first invoice.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.projects.clients.name}</TableCell>
                    <TableCell>{invoice.projects.name}</TableCell>
                    <TableCell>{invoice.hours_worked}h</TableCell>
                    <TableCell>${invoice.hourly_rate.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">${invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePDF(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleInvoiceStatus(invoice.id, invoice.status)}
                        >
                          {invoice.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}