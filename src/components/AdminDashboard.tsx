import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type WorkRequest = {
  id: string;
  work_order_id?: string;
  requestor_name: string;
  requestor_email: string;
  requestor_phone?: string;
  department: string;
  title: string;
  description: string;
  priority: string;
  requested_date: string;
  location: string;
  category: string;
  estimated_hours?: number;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'paused' | 'completed';
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejected_reason?: string;
  started_by?: string;
  started_at?: string;
  completed_by?: string;
  completed_at?: string;
  actual_hours?: number;
  completion_notes?: string;
  date_changed_reason?: string;
  approval_checklist?: unknown;
};

const approvalFormSchema = z.object({
  newDate: z.date().optional(),
  dateChangeReason: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).optional(),
});

type ApprovalFormData = z.infer<typeof approvalFormSchema>;

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "emergency":
    case "high":
      return "border-2 border-red-500/20 text-red-600 bg-red-50";
    case "medium":
      return "border-2 border-orange-500/20 text-orange-600 bg-orange-50";
    case "low":
      return "border-2 border-cyan-500/20 text-cyan-600 bg-cyan-50";
    default:
      return "border-2 border-gray-200 text-gray-600 bg-gray-50";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "in_progress":
      return "bg-amber-100 text-amber-700";
    case "paused":
      return "bg-gray-100 text-gray-600";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { toast } = useToast();
  const itemsPerPage = 10;

  useEffect(() => {
    fetchWorkRequests();
  }, []);

  const fetchWorkRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('work_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: "Error", description: "Failed to fetch work requests", variant: "destructive" });
        return;
      }
      setRequests(data || []);
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const activeCount = requests.filter(r => r.status === "approved" || r.status === "in_progress").length;
  const completedCount = requests.filter(r => r.status === "completed").length;
  const highPriorityCount = requests.filter(r => r.priority === "high" || r.priority === "emergency").length;

  const updateWorkRequestStatus = async (id: string, status: 'approved' | 'rejected' | 'in_progress' | 'paused' | 'completed', options?: {
    reason?: string;
    hours?: number;
    notes?: string;
    newDate?: Date;
    dateChangeReason?: string;
    checklist?: Array<{ id: string; text: string; completed: boolean }>;
  }) => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (options?.newDate && options?.dateChangeReason) {
        updateData.requested_date = format(options.newDate, 'yyyy-MM-dd');
        updateData.date_changed_reason = options.dateChangeReason;
      } else if (options?.newDate) {
        updateData.requested_date = format(options.newDate, 'yyyy-MM-dd');
      }

      if (options?.checklist && status === 'approved') {
        updateData.approval_checklist = JSON.stringify(options.checklist);
      }

      if (status === 'approved') {
        updateData.approved_by = 'admin-dashboard';
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_by = 'admin-dashboard';
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_reason = options?.reason || null;
      } else if (status === 'in_progress') {
        updateData.started_by = 'admin-dashboard';
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_by = 'admin-dashboard';
        updateData.completed_at = new Date().toISOString();
        updateData.actual_hours = options?.hours || null;
        updateData.completion_notes = options?.notes || null;
      }

      const { error } = await supabase
        .from('work_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        toast({ title: 'Status update failed', description: error.message, variant: 'destructive' });
        return;
      }

      const statusMessages: Record<string, string> = {
        approved: 'Request approved successfully',
        rejected: 'Request rejected',
        in_progress: 'Work started',
        paused: 'Work paused',
        completed: 'Work completed'
      };

      toast({ title: 'Success', description: statusMessages[status] });
      await fetchWorkRequests();
    } catch (e: unknown) {
      toast({ title: 'Status update failed', description: String(e), variant: 'destructive' });
    }
  };

  const approveRequest = (id: string, newDate?: Date, dateChangeReason?: string, checklist?: Array<{ id: string; text: string; completed: boolean }>) =>
    updateWorkRequestStatus(id, 'approved', { newDate, dateChangeReason, checklist });
  const rejectRequest = (id: string, reason?: string) => updateWorkRequestStatus(id, 'rejected', { reason });
  const startWork = (id: string) => updateWorkRequestStatus(id, 'in_progress');
  const completeWork = (id: string, hours: number, notes: string) =>
    updateWorkRequestStatus(id, 'completed', { hours, notes });

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.work_order_id && req.work_order_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    const matchesPriority = filterPriority === "all" || req.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Approval Dialog
  const ApprovalDialog = ({ request, onApprove }: { request: WorkRequest; onApprove: (newDate?: Date, dateChangeReason?: string, checklist?: Array<{ id: string; text: string; completed: boolean }>) => void }) => {
    const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
    const [newChecklistItem, setNewChecklistItem] = useState("");

    const form = useForm<ApprovalFormData>({
      resolver: zodResolver(approvalFormSchema),
      defaultValues: {
        newDate: parseISO(request.requested_date),
        dateChangeReason: "",
        checklist: []
      }
    });

    const originalDate = parseISO(request.requested_date);
    const selectedDate = form.watch("newDate");
    const dateChanged = selectedDate && format(selectedDate, 'yyyy-MM-dd') !== format(originalDate, 'yyyy-MM-dd');

    const addChecklistItem = () => {
      if (newChecklistItem.trim()) {
        setChecklistItems(prev => [...prev, { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }]);
        setNewChecklistItem("");
      }
    };

    const onSubmit = (data: ApprovalFormData) => {
      if (dateChanged && !data.dateChangeReason?.trim()) {
        form.setError("dateChangeReason", { type: "manual", message: "Please provide a reason for changing the date" });
        return;
      }
      onApprove(data.newDate, dateChanged ? data.dateChangeReason : undefined, checklistItems.length > 0 ? checklistItems : undefined);
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Work Request</DialogTitle>
            <DialogDescription>Approve "{request.title}" and optionally change the date or add checklist items.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Requested Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <span className="material-symbols-outlined ml-auto text-[18px] opacity-50">calendar_today</span>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {dateChanged && (
                <FormField control={form.control} name="dateChangeReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Date Change *</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Resource conflict, priority change..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <div className="space-y-4">
                <FormLabel>Approval Checklist</FormLabel>
                <div className="flex gap-2">
                  <Input placeholder="Add checklist item..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())} />
                  <Button type="button" onClick={addChecklistItem} size="sm">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </Button>
                </div>
                {checklistItems.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <Checkbox checked={item.completed} onCheckedChange={() => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))} />
                        <span className={cn("flex-1 text-sm", item.completed && "line-through text-gray-400")}>{item.text}</span>
                        <button type="button" onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <DialogTrigger asChild><Button variant="outline" type="button">Cancel</Button></DialogTrigger>
                <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">Approve Request</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // Complete Work Dialog
  const CompleteWorkDialog = ({ request, onComplete }: { request: WorkRequest; onComplete: (hours: number, notes: string) => void }) => {
    const [actualHours, setActualHours] = useState("");
    const [completionNotes, setCompletionNotes] = useState("");

    const handleSubmit = () => {
      const hours = parseFloat(actualHours);
      if (isNaN(hours) || hours <= 0) {
        toast({ title: "Invalid Hours", description: "Please enter a valid number of hours", variant: "destructive" });
        return;
      }
      onComplete(hours, completionNotes);
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span> Complete
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Work Request</DialogTitle>
            <DialogDescription>Mark "{request.title}" as completed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Actual Hours Worked *</label>
              <Input type="number" step="0.5" min="0" placeholder="e.g., 3.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Completion Notes</label>
              <Textarea placeholder="Add any notes about the completed work..." value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <DialogTrigger asChild><Button variant="outline" type="button">Cancel</Button></DialogTrigger>
            <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700">Complete Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8]">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 font-medium">
            <span>Admin</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-gray-600 font-semibold">Dashboard</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Facilities Overview</h2>
              <p className="text-gray-500 mt-1">Manage Harborside church work requests and maintenance activities.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchWorkRequests}
                disabled={loading}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
                Refresh
              </button>
              <button
                onClick={() => navigate("/submit")}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Request
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">error</span>
              </div>
              {pendingCount > 0 && (
                <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full">{pendingCount} new</span>
              )}
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Pending Review</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{pendingCount}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">assignment</span>
              </div>
              {activeCount > 0 && (
                <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-full">Active</span>
              )}
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">In Progress</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{activeCount}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">report</span>
              </div>
              {highPriorityCount > 0 && (
                <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">Urgent</span>
              )}
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">High Priority</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{highPriorityCount}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                {requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0}%
              </span>
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Completed</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{completedCount}</h3>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/submit")}
              className="group flex items-center gap-4 h-[80px] px-5 rounded-lg bg-gradient-to-br from-[#3c83f6] to-[#1d4ed8] hover:shadow-lg hover:shadow-primary/30 text-left transition-all"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl">add</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">Create Work Order</span>
                <span className="text-white/80 text-xs block">New maintenance request</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/tasks")}
              className="group flex items-center gap-4 h-[80px] px-5 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#7e22ce] hover:shadow-lg hover:shadow-purple-500/30 text-left transition-all"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl">checklist</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">Task Board</span>
                <span className="text-white/80 text-xs block">Manage assignments</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/analytics")}
              className="group flex items-center gap-4 h-[80px] px-5 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#15803d] hover:shadow-lg hover:shadow-green-500/30 text-left transition-all"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl">bar_chart</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">View Reports</span>
                <span className="text-white/80 text-xs block">Analytics & insights</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/calendar")}
              className="group flex items-center gap-4 h-[80px] px-5 rounded-lg bg-gradient-to-br from-[#f97316] to-[#c2410c] hover:shadow-lg hover:shadow-orange-500/30 text-left transition-all"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl">calendar_month</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">Calendar</span>
                <span className="text-white/80 text-xs block">Schedule & events</span>
              </div>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-200">
            <div className="w-full md:w-96 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full bg-gray-50 rounded-lg py-2.5 pl-10 pr-4 text-sm border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="Search by ID, title, or department..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="appearance-none px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                className="appearance-none px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="all">All Priority</option>
                <option value="emergency">Emergency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                <span className="material-symbols-outlined text-primary">hourglass_empty</span>
              </div>
              <p className="text-gray-500 text-sm">Loading work requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-gray-400 text-2xl">inbox</span>
              </div>
              <p className="text-gray-500 font-semibold">No requests found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Work Order</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                      <th className="px-6 py-3.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === req.id ? null : req.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-primary text-sm">{req.work_order_id || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900">{req.title}</span>
                          <p className="text-xs text-gray-400">{req.requestor_name} &middot; {req.location || "—"}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <span className="text-sm text-gray-600 capitalize">{req.department}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(req.status)}`}>
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            {format(parseISO(req.created_at), "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {req.status === "pending" && (
                              <>
                                <ApprovalDialog request={req} onApprove={(newDate, dateChangeReason, checklist) => approveRequest(req.id, newDate, dateChangeReason, checklist)} />
                                <button onClick={() => rejectRequest(req.id, "Rejected by admin")} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === "approved" && (
                              <button onClick={() => startWork(req.id)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Start
                              </button>
                            )}
                            {req.status === "in_progress" && (
                              <CompleteWorkDialog request={req} onComplete={(hours, notes) => completeWork(req.id, hours, notes)} />
                            )}
                            {req.status === "completed" && req.actual_hours && (
                              <span className="text-xs text-gray-400 font-semibold">{req.actual_hours}h</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expanded Row Detail */}
              {expandedRow && (() => {
                const req = paginatedRequests.find(r => r.id === expandedRow);
                if (!req) return null;
                return (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">Description</p>
                        <p className="text-gray-700">{req.description}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">Requested Date</p>
                        <p className="text-gray-700 font-semibold">{format(parseISO(req.requested_date), "PPP")}</p>
                        {req.date_changed_reason && (
                          <p className="text-amber-600 text-xs mt-1">Date changed: {req.date_changed_reason}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">Contact</p>
                        <p className="text-gray-700">{req.requestor_name}</p>
                        <p className="text-gray-500 text-xs">{req.requestor_email}</p>
                        {req.completion_notes && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-xs font-bold text-green-700">Completion Notes:</p>
                            <p className="text-xs text-green-600">{req.completion_notes}</p>
                          </div>
                        )}
                        {req.rejected_reason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-bold text-red-700">Rejection Reason:</p>
                            <p className="text-xs text-red-600">{req.rejected_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pagination */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm font-semibold text-gray-500">
                  Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of <span className="text-gray-900">{filteredRequests.length}</span> requests
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                          currentPage === page ? "bg-primary text-white" : "hover:bg-gray-200 text-gray-600"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
