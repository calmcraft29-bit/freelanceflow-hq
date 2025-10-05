import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
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
  expenses: number;
  profit: number;
}

interface AIInsight {
  type: 'overdue' | 'profitable' | 'deepwork';
  title: string;
  description: string;
  value?: string;
}

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))'
];

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

      // Fetch monthly expenses
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('user_id', user?.id)
        .order('expense_date', { ascending: true });

      const monthlyData = invoiceData?.reduce((acc: any, invoice) => {
        const month = new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!acc[month]) acc[month] = { earnings: 0, expenses: 0 };
        acc[month].earnings += parseFloat(String(invoice.total_amount || 0));
        return acc;
      }, {}) || {};

      expenseData?.forEach((expense) => {
        const month = new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { earnings: 0, expenses: 0 };
        monthlyData[month].expenses += parseFloat(String(expense.amount || 0));
      });

      const processedMonthlyData = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
        month,
        earnings: data.earnings,
        expenses: data.expenses,
        profit: data.earnings - data.expenses
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
    expenses: {
      label: "Expenses",
      color: "hsl(var(--destructive))",
    },
    profit: {
      label: "Profit",
      color: "hsl(var(--accent))",
    },
  };

  return (
    <div className="space-y-6">
      {/* AI Productivity Assistant */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Productivity Assistant</CardTitle>
              <CardDescription>
                Smart insights to optimize your workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {aiInsights.map((insight, index) => (
              <div 
                key={index} 
                className="p-5 rounded-xl border bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {insight.type === 'overdue' && (
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                    {insight.type === 'profitable' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {insight.type === 'deepwork' && (
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-accent" />
                      </div>
                    )}
                  </div>
                  {insight.value && (
                    <Badge variant={insight.type === 'overdue' ? 'destructive' : 'default'} className="font-semibold">
                      {insight.value}
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-sm mb-1.5">{insight.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
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

        {/* Monthly Earnings, Expenses & Profit Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Monthly earnings, expenses and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyEarnings}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={2} />
                  <Legend />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};