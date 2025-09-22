import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

const invoiceSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceType: z.enum(["hourly", "fixed"], { required_error: "Invoice type is required" }),
  hourlyRate: z.string().optional(),
  fixedAmount: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.invoiceType === "hourly") {
    return data.hourlyRate && parseFloat(data.hourlyRate) > 0;
  }
  if (data.invoiceType === "fixed") {
    return data.fixedAmount && parseFloat(data.fixedAmount) > 0;
  }
  return false;
}, {
  message: "Rate or amount is required based on invoice type",
  path: ["hourlyRate"],
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Project {
  id: string;
  name: string;
  client_id: string;
  clients: {
    id: string;
    name: string;
  };
}

interface InvoiceFormProps {
  onSuccess: () => void;
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      projectId: '',
      invoiceNumber: '',
      invoiceType: 'hourly',
      hourlyRate: '',
      fixedAmount: '',
      dueDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open && user) {
      fetchProjects();
    }
  }, [open, user]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          clients:client_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const fetchProjectHours = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('time_spent')
        .eq('project_id', projectId);

      if (error) throw error;
      
      const totalSeconds = data?.reduce((total, task) => total + task.time_spent, 0) || 0;
      const totalHours = totalSeconds / 3600;
      setHoursWorked(Math.round(totalHours * 100) / 100);
    } catch (error) {
      console.error('Error fetching project hours:', error);
      setHoursWorked(0);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const selectedProject = projects.find(p => p.id === data.projectId);
      if (!selectedProject) throw new Error('Project not found');

      const hourlyRate = data.invoiceType === 'hourly' ? parseFloat(data.hourlyRate || '0') : 0;
      const fixedAmount = data.invoiceType === 'fixed' ? parseFloat(data.fixedAmount || '0') : 0;
      const totalAmount = data.invoiceType === 'hourly' ? hoursWorked * hourlyRate : fixedAmount;

      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          project_id: data.projectId,
          client_id: selectedProject.client_id,
          invoice_number: data.invoiceNumber,
          hours_worked: data.invoiceType === 'hourly' ? hoursWorked : 0,
          hourly_rate: hourlyRate,
          total_amount: totalAmount,
          due_date: data.dueDate || null,
          notes: data.notes || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      form.reset();
      setHoursWorked(0);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === form.watch('projectId'));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={(value) => {
                  form.setValue('projectId', value);
                  if (value) {
                    fetchProjectHours(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.clients?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                {...form.register('invoiceNumber')}
                placeholder="INV-001"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="invoiceType">Invoice Type</Label>
            <Select
              value={form.watch('invoiceType')}
              onValueChange={(value) => form.setValue('invoiceType', value as 'hourly' | 'fixed')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly Rate</SelectItem>
                <SelectItem value="fixed">Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedProject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client</Label>
                    <p className="text-sm font-medium">{selectedProject.clients?.name}</p>
                  </div>
                  <div>
                    <Label>Project</Label>
                    <p className="text-sm font-medium">{selectedProject.name}</p>
                  </div>
                </div>
                {form.watch('invoiceType') === 'hourly' ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Hours Worked</Label>
                      <p className="text-lg font-semibold">{hoursWorked}h</p>
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        {...form.register('hourlyRate')}
                        placeholder="50.00"
                      />
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-lg font-semibold text-primary">
                        ${(hoursWorked * parseFloat(form.watch('hourlyRate') || '0')).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fixedAmount">Fixed Amount ($)</Label>
                      <Input
                        id="fixedAmount"
                        type="number"
                        step="0.01"
                        {...form.register('fixedAmount')}
                        placeholder="1000.00"
                      />
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-lg font-semibold text-primary">
                        ${parseFloat(form.watch('fixedAmount') || '0').toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register('dueDate')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional notes or terms..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}