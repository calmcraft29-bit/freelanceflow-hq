import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Users, FolderOpen, Clock, FileText, Calendar as CalendarIcon, DollarSign, Search, Bell, Gift, TrendingUp, Eye, ArrowUp, ArrowDown } from 'lucide-react';
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
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger />
              <div className="flex-1 flex items-center gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    className="pl-9 bg-muted/50 border-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </Button>
                <ThemeToggle />
                <div className="flex items-center gap-2 pl-3 border-l">
                  <div className="text-right">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.plan === 'paid' ? 'Premium' : 'Free Plan'}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Oct 18 - Nov 18
                </Button>
                <Button variant="outline" size="sm">
                  Monthly
                </Button>
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </div>

            <InvoiceReminders />

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalProjects}</div>
                  <div className="flex items-center gap-1 text-xs text-success mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>15.6%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${stats.hoursLogged * 50}</div>
                  <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <ArrowDown className="h-3 w-3" />
                    <span>34.0%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeTasks}</div>
                  <div className="flex items-center gap-1 text-xs text-success mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>24.2%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DashboardAnalytics />

            {stats.totalClients === 0 && (
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
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;