import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Users, FolderOpen, Clock, FileText, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { DashboardAnalytics } from '@/components/DashboardAnalytics';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InvoiceReminders } from '@/components/InvoiceReminders';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalClients: 0,
    activeTasks: 0,
    hoursLogged: 0,
    pendingInvoices: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const [projects, clients, tasks, invoices] = await Promise.all([
        supabase.from('projects').select('id').eq('user_id', user?.id),
        supabase.from('clients').select('id').eq('user_id', user?.id),
        supabase.from('tasks').select('id, time_spent, status').eq('user_id', user?.id),
        supabase.from('invoices').select('id, status').eq('user_id', user?.id)
      ]);

      const totalHours = tasks.data?.reduce((total, task) => total + (task.time_spent || 0), 0) || 0;
      const activeTasks = tasks.data?.filter(task => task.status === 'in-progress').length || 0;
      const pendingInvoices = invoices.data?.filter(invoice => invoice.status === 'unpaid').length || 0;

      setStats({
        totalProjects: projects.data?.length || 0,
        totalClients: clients.data?.length || 0,
        activeTasks,
        hoursLogged: Math.round(totalHours / 3600 * 10) / 10,
        pendingInvoices
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-2" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  FreelanceFlow
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-foreground">{profile.name}</span>
                  <Badge variant={profile.plan === 'paid' ? 'default' : 'secondary'} className="text-xs">
                    {profile.plan.toUpperCase()}
                  </Badge>
                </div>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h2>
                <p className="text-muted-foreground">Welcome back, {profile.name}. Here's your business overview.</p>
              </div>

              <InvoiceReminders />
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalProjects === 0 ? 'No projects yet' : `Active projects`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalClients === 0 ? 'No clients yet' : `Total clients`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-3 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--chart-3))]/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-[hsl(var(--chart-3))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.activeTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeTasks === 0 ? 'No active tasks' : `In progress`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-4 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hours Logged</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--chart-4))]/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-[hsl(var(--chart-4))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.hoursLogged}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.hoursLogged === 0 ? 'No time tracked' : `Total tracked`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-5 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--chart-5))]/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[hsl(var(--chart-5))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingInvoices === 0 ? 'All paid' : `Invoices`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="mt-8">
          <DashboardAnalytics />
        </div>

        {/* Getting Started Section */}
        {stats.totalClients === 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Welcome to FreelanceFlow! Here's what you can do to get started:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium">Add Your First Client</h3>
                    <p className="text-sm text-muted-foreground">
                      Start by adding clients to organize your projects
                    </p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto mt-1" 
                      onClick={() => navigate('/clients')}
                    >
                      Go to Clients →
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium">Create a Project</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up projects for your clients with details and timelines
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium">Track Your Time</h3>
                    <p className="text-sm text-muted-foreground">
                      Add tasks and track time spent on each project
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium">Generate Invoices</h3>
                    <p className="text-sm text-muted-foreground">
                      Create professional invoices from your tracked time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;