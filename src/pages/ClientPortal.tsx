import React, { useState, useEffect } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, LogOut, Eye, MessageCircle, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import ProjectProgressCard from '@/components/ProjectProgressCard';
import ProjectChat from '@/components/ProjectChat';

type Project = Tables<'projects'>;
type Invoice = Tables<'invoices'>;
type Task = Tables<'tasks'>;

interface ProjectWithTasks extends Project {
  tasks: Task[];
}

interface InvoiceWithProject extends Invoice {
  projects: Project;
}

const ClientPortal = () => {
  const { client, signOut } = useClientAuth();
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (client) {
      fetchClientData();
    }
  }, [client]);

  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem('client_session_token');
      if (!token) return;

      // Note: RLS policies will be handled through application logic

      // Fetch projects with tasks
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*)
        `);

      if (projectsError) throw projectsError;

      // Fetch invoices with project details
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          projects (*)
        `);

      if (invoicesError) throw invoicesError;

      setProjects(projectsData || []);
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getProjectProgress = (project: ProjectWithTasks) => {
    const totalTasks = project.tasks.length;
    if (totalTasks === 0) return 0;
    const completedTasks = project.tasks.filter(task => task.status === 'done').length;
    return (completedTasks / totalTasks) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on_hold': return 'destructive';
      default: return 'outline';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'secondary';
      case 'unpaid': return 'destructive';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const downloadInvoice = async (invoice: InvoiceWithProject) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      toast.error('PDF not available for this invoice');
    }
  };

  const openChat = (project: ProjectWithTasks) => {
    setSelectedProject(project);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedProject(null);
  };

  // Calculate overall statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const overallProgress = projects.length > 0 
    ? projects.reduce((acc, project) => acc + getProjectProgress(project), 0) / projects.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Client Portal</h1>
            <p className="text-muted-foreground">Welcome, {client?.name}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Chat Modal */}
        {showChat && selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl">
              <ProjectChat project={selectedProject} onClose={closeChat} />
            </div>
          </div>
        )}

        {/* Dashboard Overview */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Project Dashboard</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold">{totalProjects}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary/60" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">{activeProjects}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600/60" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-blue-600">{completedProjects}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600/60" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold text-purple-600">{Math.round(overallProgress)}%</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-600/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600">{Math.round(overallProgress)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Projects Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No projects found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => {
                const progress = getProjectProgress(project);
                return (
                  <div key={project.id} className="relative">
                    <ProjectProgressCard project={project} progress={progress} />
                    <Button
                      onClick={() => openChat(project)}
                      className="absolute top-4 right-4 h-8 w-8 p-0"
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Invoices Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Invoices</h2>
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Invoice #{invoice.invoice_number}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Project: {invoice.projects.name}
                        </p>
                      </div>
                      <Badge variant={getInvoiceStatusColor(invoice.status)}>
                        {invoice.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Hours:</span>
                        <span className="ml-2 font-medium">{invoice.hours_worked}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="ml-2 font-medium">${invoice.hourly_rate}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2 font-bold">${invoice.total_amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2 font-medium">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {invoice.notes && (
                      <p className="text-sm text-muted-foreground mb-4">{invoice.notes}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoice(invoice)}
                      className="flex items-center gap-2"
                      disabled={!invoice.pdf_url}
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClientPortal;