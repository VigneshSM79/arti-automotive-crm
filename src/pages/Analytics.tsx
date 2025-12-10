import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MetricCard } from '@/components/shared/MetricCard';
import { MessageSquare, MessageCircle, TrendingUp, Tag, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const getDateRange = () => {
    if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
      // Use custom date range
      const start = new Date(customDateRange.from);
      start.setHours(0, 0, 0, 0); // Start of day
      const end = new Date(customDateRange.to);
      end.setHours(23, 59, 59, 999); // End of day
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (dateRange === 'custom') {
      // Custom selected but no dates chosen, use last 7 days as fallback
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      // Preset date ranges (7, 30, 90 days)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - parseInt(dateRange));
      return { start: start.toISOString(), end: end.toISOString() };
    }
  };

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['analytics', 'metrics', dateRange, customDateRange.from, customDateRange.to],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data: messages, error } = await supabase
        .from('messages')
        .select('direction, created_at')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const inbound = messages?.filter(m => m.direction === 'inbound').length || 0;
      const outbound = messages?.filter(m => m.direction === 'outbound').length || 0;
      const responseRate = outbound > 0 ? ((inbound / outbound) * 100).toFixed(1) : '0';

      return { totalSent: outbound, totalReceived: inbound, responseRate };
    },
  });

  const { data: activeCampaigns } = useQuery({
    queryKey: ['analytics', 'active-campaigns'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('campaign_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: volumeData } = useQuery({
    queryKey: ['analytics', 'volume', dateRange, customDateRange.from, customDateRange.to],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('messages')
        .select('direction, created_at')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = data?.reduce((acc: any, msg: any) => {
        const date = new Date(msg.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, inbound: 0, outbound: 0 };
        }
        if (msg.direction === 'inbound') {
          acc[date].inbound++;
        } else {
          acc[date].outbound++;
        }
        return acc;
      }, {});

      return Object.values(grouped || {});
    },
  });

  const { data: conversationStats } = useQuery({
    queryKey: ['analytics', 'conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('status');

      if (error) throw error;

      const stats = data?.reduce((acc: any, conv: any) => {
        acc[conv.status] = (acc[conv.status] || 0) + 1;
        return acc;
      }, {});

      return [
        { name: 'Active', value: stats?.active || 0, color: '#00C851' },
        { name: 'Closed', value: stats?.closed || 0, color: '#F39C12' },
        { name: 'Archived', value: stats?.archived || 0, color: '#7F8C8D' },
      ];
    },
  });

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS Analytics</h1>
          <p className="text-muted-foreground">Track your messaging performance</p>
        </div>
        <div className="flex gap-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={dateRange === days ? 'default' : 'outline'}
              onClick={() => setDateRange(days)}
              size="sm"
            >
              Last {days} days
            </Button>
          ))}

          {/* Custom Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.from && customDateRange.to ? (
                  <>
                    {format(customDateRange.from, "MMM d, yyyy")} - {format(customDateRange.to, "MMM d, yyyy")}
                  </>
                ) : (
                  <span>Custom Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: customDateRange.from,
                  to: customDateRange.to,
                }}
                onSelect={(range) => {
                  setCustomDateRange({
                    from: range?.from,
                    to: range?.to,
                  });
                  if (range?.from && range?.to) {
                    setDateRange('custom');
                  }
                }}
                disabled={{ after: new Date() }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sent"
          value={metrics?.totalSent || 0}
          icon={MessageSquare}
          variant="primary"
          loading={loadingMetrics}
        />
        <MetricCard
          title="Total Received"
          value={metrics?.totalReceived || 0}
          icon={MessageCircle}
          variant="secondary"
          loading={loadingMetrics}
        />
        <MetricCard
          title="Response Rate"
          value={`${metrics?.responseRate || 0}%`}
          icon={TrendingUp}
          variant="warning"
          loading={loadingMetrics}
        />
        <MetricCard
          title="Active Campaigns"
          value={activeCampaigns || 0}
          icon={Tag}
          variant="destructive"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Message Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inbound" stroke="#00C851" name="Inbound" />
                <Line type="monotone" dataKey="outbound" stroke="#E74C3C" name="Outbound" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversations Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conversationStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {conversationStats?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
