import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MetricCard } from '@/components/shared/MetricCard';
import { MessageSquare, MessageCircle, TrendingUp, Tag, CalendarIcon, CheckCheck, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
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
        .select('direction, created_at, conversation_id')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const inbound = messages?.filter(m => m.direction === 'inbound').length || 0;
      const outbound = messages?.filter(m => m.direction === 'outbound').length || 0;

      // Calculate true response rate: % of conversations that received at least one reply
      const conversationsWithOutbound = new Set(
        messages?.filter(m => m.direction === 'outbound').map(m => m.conversation_id)
      );
      const conversationsWithInbound = new Set(
        messages?.filter(m => m.direction === 'inbound').map(m => m.conversation_id)
      );

      const conversationsWithReplies = [...conversationsWithOutbound].filter(id =>
        conversationsWithInbound.has(id)
      ).length;

      const responseRate = conversationsWithOutbound.size > 0
        ? ((conversationsWithReplies / conversationsWithOutbound.size) * 100).toFixed(1)
        : '0';

      return { totalSent: outbound, totalReceived: inbound, responseRate };
    },
  });

  const { data: activeCampaigns } = useQuery({
    queryKey: ['analytics', 'active-campaigns', dateRange, customDateRange.from, customDateRange.to],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { count, error } = await supabase
        .from('campaign_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', start)
        .lte('created_at', end);

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

  const { data: pipelineFunnel } = useQuery({
    queryKey: ['analytics', 'pipeline-funnel', dateRange, customDateRange.from, customDateRange.to],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Fetch all pipeline stages
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, color')
        .order('order_position', { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch leads created within date range
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('pipeline_stage_id')
        .gte('created_at', start)
        .lte('created_at', end);

      if (leadsError) throw leadsError;

      // Count leads per stage
      const leadCounts = leads?.reduce((acc: any, lead: any) => {
        if (lead.pipeline_stage_id) {
          acc[lead.pipeline_stage_id] = (acc[lead.pipeline_stage_id] || 0) + 1;
        }
        return acc;
      }, {});

      // Build funnel data
      const funnelData = stages?.map((stage) => {
        const count = leadCounts?.[stage.id] || 0;

        return {
          name: stage.name,
          count: count,
          color: stage.color,
        };
      }) || [];

      return funnelData;
    },
  });

  // SMS Delivery Metrics
  const { data: deliveryMetrics, isLoading: loadingDeliveryMetrics } = useQuery({
    queryKey: ['analytics', 'delivery-metrics', dateRange, customDateRange.from, customDateRange.to],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data: messages, error } = await supabase
        .from('messages')
        .select('delivery_status, error_code, error_message, direction')
        .eq('direction', 'outbound') // Only outbound messages have delivery tracking
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const total = messages?.length || 0;
      const delivered = messages?.filter(m => m.delivery_status === 'delivered').length || 0;
      const failed = messages?.filter(m => m.delivery_status === 'failed' || m.delivery_status === 'undelivered').length || 0;
      const pending = messages?.filter(m => m.delivery_status === 'queued' || m.delivery_status === 'sent').length || 0;

      const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0';

      // Group failures by error code
      const failuresByCode = messages
        ?.filter(m => m.delivery_status === 'failed' || m.delivery_status === 'undelivered')
        .reduce((acc: any, msg: any) => {
          const code = msg.error_code || 'Unknown';
          const errorMsg = msg.error_message || 'Unknown error';

          if (!acc[code]) {
            acc[code] = {
              code,
              message: errorMsg,
              count: 0
            };
          }
          acc[code].count++;
          return acc;
        }, {});

      const failureBreakdown = Object.values(failuresByCode || {}).sort((a: any, b: any) => b.count - a.count);

      return {
        total,
        delivered,
        failed,
        pending,
        deliveryRate,
        failureBreakdown
      };
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

      {/* Messaging Metrics */}
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

      {/* SMS Delivery Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">SMS Delivery Tracking</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Delivered"
            value={deliveryMetrics?.delivered || 0}
            icon={CheckCheck}
            variant="secondary"
            loading={loadingDeliveryMetrics}
            description={`${deliveryMetrics?.deliveryRate || 0}% delivery rate`}
          />
          <MetricCard
            title="Failed"
            value={deliveryMetrics?.failed || 0}
            icon={XCircle}
            variant="destructive"
            loading={loadingDeliveryMetrics}
            description={deliveryMetrics?.failed ? `${deliveryMetrics.failed} undeliverable` : 'No failures'}
          />
          <MetricCard
            title="Pending"
            value={deliveryMetrics?.pending || 0}
            icon={AlertTriangle}
            variant="warning"
            loading={loadingDeliveryMetrics}
            description="Queued or in transit"
          />
          <MetricCard
            title="Delivery Rate"
            value={`${deliveryMetrics?.deliveryRate || 0}%`}
            icon={TrendingUp}
            variant="primary"
            loading={loadingDeliveryMetrics}
            description={`${deliveryMetrics?.delivered || 0} of ${deliveryMetrics?.total || 0} delivered`}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Message Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F39C12" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F39C12" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" fontSize={12} stroke="#6B7280" />
                <YAxis fontSize={12} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                  name="Inbound"
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  stroke="#F39C12"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutbound)"
                  name="Outbound"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={pipelineFunnel}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  fontSize={12}
                  interval={0}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm">Leads: <strong>{data.count}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {pipelineFunnel?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Failure Analysis */}
      {deliveryMetrics?.failed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Failure Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Common reasons why messages failed to deliver</p>
          </CardHeader>
          <CardContent>
            {deliveryMetrics.failureBreakdown && deliveryMetrics.failureBreakdown.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={deliveryMetrics.failureBreakdown}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg max-w-xs">
                              <p className="font-semibold text-red-600">Error {data.code}</p>
                              <p className="text-sm mt-1">{data.message}</p>
                              <p className="text-sm mt-2">Count: <strong>{data.count}</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#EF4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Failure Details Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold">Error Code</th>
                        <th className="text-left p-3 font-semibold">Description</th>
                        <th className="text-right p-3 font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryMetrics.failureBreakdown.map((failure: any, index: number) => (
                        <tr key={index} className="border-t hover:bg-muted/50 transition-colors">
                          <td className="p-3 font-mono text-red-600">{failure.code}</td>
                          <td className="p-3 text-muted-foreground">{failure.message}</td>
                          <td className="p-3 text-right font-semibold">{failure.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Common Error Codes Reference */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Common Twilio Error Codes:</p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li><strong>30006:</strong> Landline or unreachable carrier</li>
                    <li><strong>30007:</strong> Message filtered (spam)</li>
                    <li><strong>30008:</strong> Unknown destination handset</li>
                    <li><strong>21211:</strong> Invalid phone number format</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No delivery failures to analyze</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
