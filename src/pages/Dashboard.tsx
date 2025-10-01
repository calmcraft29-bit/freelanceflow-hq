import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Users, FolderOpen, Clock, FileText } from 'lucide-react';
import { DashboardAnalytics } from '@/components/DashboardAnalytics';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InvoiceReminders } from '@/components/InvoiceReminders';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">FreelanceFlow</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/clients')}>
                <Users className="w-4 h-4 mr-2" />
                Clients
              </Button>
              <Button variant="ghost" onClick={() => navigate('/projects')}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Projects
              </Button>
              <Button variant="ghost" onClick={() => navigate('/tasks')}>
                <Clock className="w-4 h-4 mr-2" />
                Tasks
              </Button>
              <Button variant="ghost" onClick={() => navigate('/invoices')}>
                <FileText className="w-4 h-4 mr-2" />
                Invoices
              </Button>
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Welcome, {profile.name}</span>
              <Badge variant={profile.plan === 'paid' ? 'default' : 'secondary'}>
                {profile.plan.toUpperCase()}
              </Badge>
              <ThemeToggle />
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <InvoiceReminders />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalProjects === 0 ? 'No projects yet' : `Active projects`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalClients === 0 ? 'No clients yet' : `Total clients`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeTasks === 0 ? 'No active tasks' : `Tasks in progress`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoursLogged}h</div>
              <p className="text-xs text-muted-foreground">
                {stats.hoursLogged === 0 ? 'No time tracked yet' : `Total hours logged`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingInvoices === 0 ? 'No pending invoices' : `Awaiting payment`}
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
      </main>
    </div>
  );
};

export default Dashboard;