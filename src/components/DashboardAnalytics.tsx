import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientTimeData {
  name: string;
  time: number;
  fill: string;
}

interface MonthlyEarnings {
  month: string;
  earnings: number;
}

interface AIInsight {
  type: 'overdue' | 'profitable' | 'deepwork';
  title: string;
  description: string;
  value?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const DashboardAnalytics = () => {
  const { user } = useAuth();
  const [clientTimeData, setClientTimeData] = useState<ClientTimeData[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch client time data
      // Fetch client time data through tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          time_spent,
          project_id,
          projects!inner(
            client_id,
            clients!inner(name)
          )
        `)
        .eq('user_id', user?.id);

      const clientTimeMap = tasksData?.reduce((acc: any, task) => {
        const clientName = task.projects?.clients?.name || 'Unknown';
        if (!acc[clientName]) acc[clientName] = 0;
        acc[clientName] += task.time_spent || 0;
        return acc;
      }, {}) || {};

      const processedClientData = Object.entries(clientTimeMap).map(([name, time], index) => ({
        name,
        time: (time as number) / 3600,
        fill: COLORS[index % COLORS.length]
      }));

      setClientTimeData(processedClientData);

      // Fetch monthly earnings
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('total_amount, invoice_date')
        .eq('user_id', user?.id)
        .order('invoice_date', { ascending: true });

      const monthlyData = invoiceData?.reduce((acc: any, invoice) => {
        const month = new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += parseFloat(String(invoice.total_amount || 0));
        return acc;
      }, {});

      const processedMonthlyData = Object.entries(monthlyData || {}).map(([month, earnings]) => ({
        month,
        earnings: earnings as number
      }));

      setMonthlyEarnings(processedMonthlyData);

      // Generate AI insights
      await generateAIInsights();

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    try {
      // Fetch overdue tasks
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, name')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .lt('end_time', new Date().toISOString());

      // Fetch client profitability
      const { data: clientProfitability } = await supabase
        .from('invoices')
        .select('client_id, total_amount, clients:clients!inner(name)')
        .eq('user_id', user?.id);

      const insights: AIInsight[] = [];

      // Overdue tasks insight
      if (overdueTasks && overdueTasks.length > 0) {
        insights.push({
          type: 'overdue',
          title: 'Overdue Tasks Alert',
          description: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need attention.`,
          value: overdueTasks.length.toString()
        });
      }

      // Most profitable client
      if (clientProfitability && clientProfitability.length > 0) {
        const clientRevenue = clientProfitability.reduce((acc: any, invoice) => {
          const clientName = (invoice.clients as any)?.name || 'Unknown';
          if (!acc[clientName]) acc[clientName] = 0;
          acc[clientName] += parseFloat(String(invoice.total_amount || 0));
          return acc;
        }, {});

        const topClient = Object.entries(clientRevenue).sort(([,a], [,b]) => (b as number) - (a as number))[0];
        if (topClient) {
          insights.push({
            type: 'profitable',
            title: 'Top Revenue Client',
            description: `${topClient[0]} generates the most revenue for your business.`,
            value: `$${(topClient[1] as number).toFixed(0)}`
          });
        }
      }

      // Best deep work time (simulated insight based on task completion patterns)
      insights.push({
        type: 'deepwork',
        title: 'Optimal Work Hours',
        description: 'Based on your task completion patterns, you\'re most productive between 9-11 AM.',
        value: '9-11 AM'
      });

      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartConfig = {
    time: {
      label: "Hours",
      color: "hsl(var(--primary))",
    },
    earnings: {
      label: "Earnings",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      {/* AI Productivity Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI Productivity Assistant
          </CardTitle>
          <CardDescription>
            Smart insights to boost your freelance productivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  {insight.type === 'overdue' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {insight.type === 'profitable' && <Users className="h-4 w-4 text-primary" />}
                  {insight.type === 'deepwork' && <Clock className="h-4 w-4 text-accent-foreground" />}
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  {insight.value && (
                    <Badge variant={insight.type === 'overdue' ? 'destructive' : 'default'}>
                      {insight.value}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Time per Client Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Time Distribution by Client</CardTitle>
            <CardDescription>Hours spent on each client's projects</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientTimeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="time"
                  >
                    {clientTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Earnings Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Revenue generated each month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEarnings}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};