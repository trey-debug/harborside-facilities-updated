import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";

interface WorkVolumeData { date: string; requests: number; }
interface DepartmentData { name: string; requests: number; percentage: number; }
interface CompletionPerformanceData { week: string; onTime: number; late: number; early: number; }
interface WeeklyCompletionData { week: string; avgHours: number; totalRequests: number; date: Date; }

const CHART_COLORS = {
  primary: "#3c83f6",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red: "#ef4444",
  cyan: "#06b6d4",
  teal: "#14b8a6",
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.purple, CHART_COLORS.orange, CHART_COLORS.green, CHART_COLORS.cyan, CHART_COLORS.red];

export const AnalyticsPage = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState("6months");
  const [workVolumeData, setWorkVolumeData] = useState<WorkVolumeData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [completionPerformanceData, setCompletionPerformanceData] = useState<CompletionPerformanceData[]>([]);
  const [weeklyCompletionData, setWeeklyCompletionData] = useState<WeeklyCompletionData[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [avgCompletionTime, setAvgCompletionTime] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [mostActiveDept, setMostActiveDept] = useState({ name: '', count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const endDate = new Date();
        const startDate = subDays(endDate, timeRange === "30days" ? 30 : timeRange === "3months" ? 90 : timeRange === "6months" ? 180 : 365);

        const { data: requests, error } = await supabase
          .from('work_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (error) { console.error('Error fetching work requests:', error); return; }
        if (!requests || requests.length === 0) {
          setWorkVolumeData([]); setDepartmentData([]); setCompletionPerformanceData([]); setWeeklyCompletionData([]);
          setTotalRequests(0); setAvgCompletionTime(0); setOnTimeRate(0); setMostActiveDept({ name: 'N/A', count: 0 });
          return;
        }

        // Work volume
        const volumeMap = new Map<string, number>();
        requests.forEach(req => { const date = format(parseISO(req.created_at), 'MMM d'); volumeMap.set(date, (volumeMap.get(date) || 0) + 1); });
        const volumeData = Array.from(volumeMap.entries()).map(([date, requests]) => ({ date, requests }));

        // Department data
        const deptMap = new Map<string, number>();
        requests.forEach(req => { deptMap.set(req.department, (deptMap.get(req.department) || 0) + 1); });
        const totalRequestsCount = requests.length;
        const deptData = Array.from(deptMap.entries())
          .map(([name, requests]) => ({ name, requests, percentage: Math.round((requests / totalRequestsCount) * 100) }))
          .sort((a, b) => b.requests - a.requests);

        // Completion metrics
        const completedRequests = requests.filter(req => req.status === 'completed');
        let totalActualHours = 0, completedWithHours = 0, onTimeCount = 0, lateCount = 0, earlyCount = 0;

        completedRequests.forEach(req => {
          if (req.actual_hours) { totalActualHours += req.actual_hours; completedWithHours++; }
          if (req.completed_at && req.requested_date) {
            const diffDays = Math.ceil((parseISO(req.completed_at).getTime() - parseISO(req.requested_date).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) onTimeCount++; else if (diffDays > 0) lateCount++; else earlyCount++;
          }
        });

        // Weekly completion times
        const weeklyMap = new Map<string, { totalHours: number; count: number; dates: Date[] }>();
        completedRequests.forEach(req => {
          if (req.actual_hours && req.completed_at) {
            const week = format(parseISO(req.completed_at), "'W'ww yyyy");
            const existing = weeklyMap.get(week);
            if (existing) { existing.totalHours += req.actual_hours; existing.count += 1; existing.dates.push(parseISO(req.completed_at)); }
            else { weeklyMap.set(week, { totalHours: req.actual_hours, count: 1, dates: [parseISO(req.completed_at)] }); }
          }
        });
        const weeklyData = Array.from(weeklyMap.entries())
          .map(([week, data]) => ({ week, avgHours: data.totalHours / data.count, totalRequests: data.count, date: new Date(Math.min(...data.dates.map(d => d.getTime()))) }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        // Performance data
        const performanceMap = new Map<string, { onTime: number; late: number; early: number }>();
        completedRequests.forEach(req => {
          if (req.completed_at && req.requested_date) {
            const week = format(parseISO(req.completed_at), "'W'ww yyyy");
            const diffDays = Math.ceil((parseISO(req.completed_at).getTime() - parseISO(req.requested_date).getTime()) / (1000 * 60 * 60 * 24));
            const existing = performanceMap.get(week) || { onTime: 0, late: 0, early: 0 };
            if (diffDays === 0) existing.onTime += 1; else if (diffDays > 0) existing.late += 1; else existing.early += 1;
            performanceMap.set(week, existing);
          }
        });
        const performanceData = Array.from(performanceMap.entries())
          .map(([week, data]) => {
            const total = data.onTime + data.late + data.early;
            return { week, onTime: Math.round((data.onTime / total) * 100), late: Math.round((data.late / total) * 100), early: Math.round((data.early / total) * 100) };
          });

        setWorkVolumeData(volumeData); setDepartmentData(deptData);
        setCompletionPerformanceData(performanceData); setWeeklyCompletionData(weeklyData);
        setTotalRequests(totalRequestsCount);
        setAvgCompletionTime(completedWithHours > 0 ? totalActualHours / completedWithHours : 0);
        setOnTimeRate(completedRequests.length > 0 ? Math.round((onTimeCount / completedRequests.length) * 100) : 0);
        setMostActiveDept(deptData.length > 0 ? { name: deptData[0].name, count: deptData[0].requests } : { name: 'N/A', count: 0 });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [timeRange]);

  const tooltipStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8" ref={printRef}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-3xl">bar_chart</span>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Analytics & Reports</h1>
                <p className="text-gray-500 mt-1">Monitor work request trends, department metrics, and completion performance.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-44 bg-white border-gray-200">
                  <span className="material-symbols-outlined text-[18px] mr-2 text-gray-500">calendar_today</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={() => window.print()} className="flex items-center gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 transition-all">
                <span className="material-symbols-outlined text-[20px]">download</span>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Requests</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-extrabold text-gray-900">{loading ? "..." : totalRequests}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Avg Completion</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-extrabold text-gray-900">{loading ? "..." : `${avgCompletionTime.toFixed(1)}h`}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">On-Time Rate</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-extrabold text-gray-900">{loading ? "..." : `${onTimeRate}%`}</span>
              {!loading && onTimeRate >= 80 && (
                <span className="text-green-500 text-sm font-bold mb-1 flex items-center">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span> Good
                </span>
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Top Department</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-2xl font-extrabold text-gray-900 capitalize">{loading ? "..." : mostActiveDept.name}</span>
              {!loading && <span className="text-primary text-sm font-bold mb-0.5">{mostActiveDept.count} req</span>}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Work Volume */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Requests Over Time</h3>
            <div className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">Loading...</p></div>
              ) : workVolumeData.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">No data for this period</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workVolumeData}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="requests" stroke={CHART_COLORS.primary} strokeWidth={3} fill="url(#colorRequests)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Requests by Department</h3>
            <div className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">Loading...</p></div>
              ) : departmentData.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">No data available</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={110} innerRadius={45} dataKey="requests" stroke="none">
                      {departmentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Second row of charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Completion Performance */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Completion Performance</h3>
            <div className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">Loading...</p></div>
              ) : completionPerformanceData.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">No completion data yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, '']} />
                    <Legend />
                    <Bar dataKey="onTime" name="On Time" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="early" name="Early" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weekly Completion Times */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Weekly Completion Times</h3>
            <div className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">Loading...</p></div>
              ) : weeklyCompletionData.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">No completion data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyCompletionData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)} hrs`, 'Avg Time']} />
                    <Area type="monotone" dataKey="avgHours" stroke={CHART_COLORS.teal} strokeWidth={3} fill="url(#colorHours)" dot={{ fill: CHART_COLORS.teal, strokeWidth: 2, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
