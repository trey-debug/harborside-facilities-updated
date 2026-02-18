import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────
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
  is_timer_active?: boolean;
  timer_started_at?: string;
  timer_paused_at?: string;
  total_elapsed_seconds?: number;
};

type ChecklistItem = { id: string; text: string; completed: boolean };

// ─── Helpers ─────────────────────────────────────────────────
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "urgent":
    case "emergency":
      return "border-2 border-red-500/20 text-red-600 bg-red-50";
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
    case "pending": return "bg-amber-100 text-amber-700";
    case "approved": return "bg-blue-100 text-blue-700";
    case "in_progress": return "bg-amber-100 text-amber-700";
    case "paused": return "bg-gray-100 text-gray-600";
    case "completed": return "bg-green-100 text-green-700";
    case "rejected": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending": return "pending";
    case "approved": return "check_circle";
    case "in_progress": return "play_circle";
    case "paused": return "pause_circle";
    case "completed": return "task_alt";
    case "rejected": return "cancel";
    default: return "help";
  }
};

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case "pending": return "border-l-amber-400";
    case "approved": return "border-l-blue-400";
    case "in_progress": return "border-l-blue-400";
    case "paused": return "border-l-gray-400";
    case "completed": return "border-l-green-400";
    case "rejected": return "border-l-red-400";
    default: return "border-l-gray-300";
  }
};

const exportCSV = (requests: WorkRequest[]) => {
  const headers = ["Work Order", "Title", "Requestor", "Department", "Priority", "Status", "Requested Date", "Submitted Date"];
  const rows = requests.map(r => [
    r.work_order_id || `WO-${r.id.slice(-4)}`,
    `"${r.title.replace(/"/g, '""')}"`,
    `"${r.requestor_name}"`,
    r.department,
    r.priority,
    r.status,
    r.requested_date,
    r.created_at ? format(parseISO(r.created_at), "yyyy-MM-dd") : ""
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `work-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── ITEMS_PER_PAGE ──────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export const WorkOrderManagement = () => {
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Dialog states
  const [approveTarget, setApproveTarget] = useState<WorkRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WorkRequest | null>(null);
  const [completeTarget, setCompleteTarget] = useState<WorkRequest | null>(null);

  const { toast } = useToast();

  // ─── Fetch ───────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data || []) as WorkRequest[]);
    } catch {
      toast({ title: "Error", description: "Failed to load work orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── Realtime ────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("work_requests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_requests" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setRequests(prev => [payload.new as WorkRequest, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setRequests(prev => prev.map(r => r.id === (payload.new as WorkRequest).id ? payload.new as WorkRequest : r));
        } else if (payload.eventType === "DELETE") {
          setRequests(prev => prev.filter(r => r.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Filtering + Pagination ──────────────────────────────
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !search || [r.title, r.requestor_name, r.department, r.work_order_id || ""].some(f => f.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, search, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const activeCount = requests.filter(r => r.status === "in_progress").length;
  const highPriorityCount = requests.filter(r => ["high", "urgent", "emergency"].includes(r.priority) && !["completed", "rejected"].includes(r.status)).length;
  const completedCount = requests.filter(r => r.status === "completed").length;
  const completionRate = requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0;

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  // ─── Actions ─────────────────────────────────────────────
  const handlePause = async (req: WorkRequest) => {
    try {
      const { error } = await supabase.rpc("update_work_request_status", { _request_id: req.id, _status: "paused" });
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "paused" as const } : r));
      toast({ title: "Paused", description: `${req.work_order_id || req.title} has been paused.` });
    } catch (e: unknown) {
      toast({ title: "Failed to pause", description: e instanceof Error ? e.message : "Could not pause work order", variant: "destructive" });
    }
  };

  const handleResume = async (req: WorkRequest) => {
    try {
      const { error } = await supabase.rpc("update_work_request_status", { _request_id: req.id, _status: "in_progress" });
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "in_progress" as const } : r));
      toast({ title: "Resumed", description: `${req.work_order_id || req.title} is back in progress.` });
    } catch (e: unknown) {
      toast({ title: "Failed to resume", description: e instanceof Error ? e.message : "Could not resume work order", variant: "destructive" });
    }
  };

  const handleStartWork = async (req: WorkRequest) => {
    try {
      const { error } = await supabase.rpc("start_work", { approved_id: req.id, started_by_user: "Admin" });
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "in_progress" as const, started_at: new Date().toISOString(), started_by: "Admin" } : r));
      toast({ title: "Work Started", description: `${req.work_order_id || req.title} is now in progress.` });
    } catch (e: unknown) {
      toast({ title: "Failed to start work", description: e instanceof Error ? e.message : "Could not start work", variant: "destructive" });
    }
  };

  // ─── Page numbers for pagination ─────────────────────────
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ═══════════════════════════════════════════════════════════
  // APPROVAL DIALOG
  // ═══════════════════════════════════════════════════════════
  const ApprovalDialog = () => {
    const [newDate, setNewDate] = useState(approveTarget?.requested_date || "");
    const [dateReason, setDateReason] = useState("");
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [newItemText, setNewItemText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (approveTarget) {
        setNewDate(approveTarget.requested_date);
        setDateReason("");
        setChecklistItems([]);
        setNewItemText("");
      }
    }, []);

    if (!approveTarget) return null;

    const dateChanged = newDate !== approveTarget.requested_date;

    const addChecklistItem = () => {
      if (!newItemText.trim()) return;
      setChecklistItems(prev => [...prev, { id: crypto.randomUUID(), text: newItemText.trim(), completed: false }]);
      setNewItemText("");
    };

    const handleSubmit = async () => {
      if (dateChanged && !dateReason.trim()) {
        toast({ title: "Reason required", description: "Please provide a reason for the date change.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      try {
        if (dateChanged) {
          const { error } = await supabase.rpc("update_work_request_status", {
            _request_id: approveTarget.id, _status: "approved", _user_name: "Admin",
            _reason: dateReason.trim(), _new_requested_date: newDate
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc("approve_work_request", {
            _request_id: approveTarget.id, _approved_by_user: "Admin"
          });
          if (error) throw error;
        }
        // Save checklist if items exist
        if (checklistItems.length > 0) {
          await supabase.from("work_requests").update({ approval_checklist: checklistItems }).eq("id", approveTarget.id);
        }
        setRequests(prev => prev.map(r => r.id === approveTarget.id ? {
          ...r, status: "approved" as const, approved_by: "Admin", approved_at: new Date().toISOString(),
          requested_date: dateChanged ? newDate : r.requested_date,
          approval_checklist: checklistItems.length > 0 ? checklistItems : r.approval_checklist
        } : r));
        toast({ title: "Approved", description: `${approveTarget.work_order_id || approveTarget.title} has been approved.` });
        setApproveTarget(null);
      } catch (e: unknown) {
        toast({ title: "Approval failed", description: e instanceof Error ? e.message : "Failed to approve work order", variant: "destructive" });
      } finally { setSubmitting(false); }
    };

    return (
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Work Order</DialogTitle>
            <DialogDescription>Review and approve this work request.</DialogDescription>
          </DialogHeader>

          {/* Summary */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <span className="material-symbols-outlined text-blue-600">assignment</span>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-sm text-gray-900">{approveTarget.work_order_id || `WO-${approveTarget.id.slice(-4)}`}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-sm text-gray-600 truncate">{approveTarget.title}</span>
            </div>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", getPriorityBadge(approveTarget.priority))}>
              {approveTarget.priority}
            </span>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            {dateChanged && (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Date changed from {format(parseISO(approveTarget.requested_date), "MMM d, yyyy")} — reason required
                </div>
                <Textarea placeholder="Why is the date being changed?" value={dateReason} onChange={e => setDateReason(e.target.value)} className="min-h-[60px]" />
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>Approval Checklist (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add checklist item..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} className="shrink-0">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                {checklistItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">check_box_outline_blank</span>
                    <span className="flex-1">{item.text}</span>
                    <button onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || (dateChanged && !dateReason.trim())}
              className="bg-green-600 hover:bg-green-700 text-white">
              {submitting ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // REJECT DIALOG
  // ═══════════════════════════════════════════════════════════
  const RejectDialog = () => {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const quickReasons = ["Budget constraints", "Duplicate request", "Out of scope", "Needs more info", "Safety concern"];

    useEffect(() => { if (rejectTarget) setReason(""); }, []);

    if (!rejectTarget) return null;

    const handleSubmit = async () => {
      if (reason.trim().length < 10) {
        toast({ title: "Reason too short", description: "Please provide at least 10 characters.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.rpc("update_work_request_status", {
          _request_id: rejectTarget.id, _status: "rejected", _user_name: "Admin", _reason: reason.trim()
        });
        if (error) throw error;
        setRequests(prev => prev.map(r => r.id === rejectTarget.id ? { ...r, status: "rejected" as const, rejected_by: "Admin", rejected_at: new Date().toISOString(), rejected_reason: reason.trim() } : r));
        toast({ title: "Rejected", description: `${rejectTarget.work_order_id || rejectTarget.title} has been rejected.` });
        setRejectTarget(null);
      } catch (e: unknown) {
        toast({ title: "Rejection failed", description: e instanceof Error ? e.message : "Failed to reject work order", variant: "destructive" });
      } finally { setSubmitting(false); }
    };

    return (
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Work Order</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this request.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
            <span className="material-symbols-outlined text-red-600">assignment</span>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-sm text-gray-900">{rejectTarget.work_order_id || `WO-${rejectTarget.id.slice(-4)}`}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-sm text-gray-600 truncate">{rejectTarget.title}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {quickReasons.map(qr => (
                <button key={qr} onClick={() => setReason(qr)}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-full border transition-all",
                    reason === qr ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}>
                  {qr}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Textarea placeholder="Explain why this request is being rejected..." value={reason} onChange={e => setReason(e.target.value)} className="min-h-[100px]" />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{reason.length} characters {reason.length < 10 && reason.length > 0 ? "(min 10)" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              This action cannot be undone.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || reason.trim().length < 10}
              className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // COMPLETE DIALOG
  // ═══════════════════════════════════════════════════════════
  const CompleteWorkDialog = () => {
    const [hours, setHours] = useState(completeTarget?.estimated_hours || 1);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (completeTarget) {
        setHours(completeTarget.estimated_hours || 1);
        setNotes("");
      }
    }, []);

    if (!completeTarget) return null;

    const checklist = Array.isArray(completeTarget.approval_checklist) ? completeTarget.approval_checklist as ChecklistItem[] : [];
    const completedItems = checklist.filter(i => i.completed).length;
    const incompleteItems = checklist.length - completedItems;
    const hoursDiff = completeTarget.estimated_hours ? Math.abs(hours - completeTarget.estimated_hours) : 0;

    const handleSubmit = async () => {
      if (hours <= 0) {
        toast({ title: "Invalid hours", description: "Hours must be greater than 0.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.rpc("complete_work", {
          started_id: completeTarget.id, completed_by_user: "Admin",
          actual_hours_worked: hours, notes: notes.trim() || null
        });
        if (error) throw error;
        setRequests(prev => prev.map(r => r.id === completeTarget.id ? {
          ...r, status: "completed" as const, completed_by: "Admin",
          completed_at: new Date().toISOString(), actual_hours: hours,
          completion_notes: notes.trim() || null
        } : r));
        toast({ title: "Completed", description: `${completeTarget.work_order_id || completeTarget.title} marked as complete.` });
        setCompleteTarget(null);
      } catch (e: unknown) {
        toast({ title: "Completion failed", description: e instanceof Error ? e.message : "Failed to complete work order", variant: "destructive" });
      } finally { setSubmitting(false); }
    };

    return (
      <Dialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
            <DialogDescription>Record the actual hours and any completion notes.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
            <span className="material-symbols-outlined text-green-600">task_alt</span>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-sm text-gray-900">{completeTarget.work_order_id || `WO-${completeTarget.id.slice(-4)}`}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-sm text-gray-600 truncate">{completeTarget.title}</span>
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-2">
            <Label>Actual Hours</Label>
            <div className="flex items-center gap-3">
              <button onClick={() => setHours(h => Math.max(0.5, h - 0.5))} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <Input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 0)} className="w-24 text-center font-bold text-lg" />
              <button onClick={() => setHours(h => h + 0.5)} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
              {completeTarget.estimated_hours && (
                <span className="text-xs text-gray-400">est. {completeTarget.estimated_hours}h</span>
              )}
            </div>
            {hoursDiff > 2 && completeTarget.estimated_hours && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Significantly {hours > completeTarget.estimated_hours ? "over" : "under"} the estimated {completeTarget.estimated_hours}h
              </div>
            )}
          </div>

          {/* Checklist progress */}
          {checklist.length > 0 && (
            <div className="space-y-2">
              <Label>Checklist Progress</Label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(completedItems / checklist.length) * 100}%` }} />
              </div>
              <div className="text-xs text-gray-500">{completedItems} of {checklist.length} items completed</div>
              {incompleteItems > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  {incompleteItems} checklist item{incompleteItems > 1 ? "s" : ""} still incomplete
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Completion Notes (optional)</Label>
            <Textarea placeholder="Any notes about the completed work..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[80px]" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || hours <= 0}
              className="bg-green-600 hover:bg-green-700 text-white">
              {submitting ? "Completing..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // ACTION BUTTONS
  // ═══════════════════════════════════════════════════════════
  const ActionButtons = ({ req }: { req: WorkRequest }) => {
    switch (req.status) {
      case "pending":
        return (
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); setApproveTarget(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all">
              Approve
            </button>
            <button onClick={(e) => { e.stopPropagation(); setRejectTarget(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all">
              Reject
            </button>
          </div>
        );
      case "approved":
        return (
          <button onClick={(e) => { e.stopPropagation(); handleStartWork(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all">
            Start Work
          </button>
        );
      case "in_progress":
        return (
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); setCompleteTarget(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all">
              Complete
            </button>
            <button onClick={(e) => { e.stopPropagation(); handlePause(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all">
              Pause
            </button>
          </div>
        );
      case "paused":
        return (
          <button onClick={(e) => { e.stopPropagation(); handleResume(req); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all">
            Resume
          </button>
        );
      case "completed":
        return (
          <span className="text-xs font-bold text-green-600">{req.actual_hours ? `${req.actual_hours}h` : "Done"}</span>
        );
      case "rejected":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-bold text-red-500 cursor-help underline decoration-dashed">Rejected</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{req.rejected_reason || "No reason provided"}</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // EXPANDED ROW
  // ═══════════════════════════════════════════════════════════
  const ExpandedRowDetail = ({ req }: { req: WorkRequest }) => (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-gray-50 border-t border-gray-100 p-5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Description</span>
                <p className="text-sm text-gray-700 mt-1">{req.description || "No description provided."}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Category</span>
                  <p className="text-sm text-gray-900 mt-0.5 capitalize">{req.category}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Location</span>
                  <p className="text-sm text-gray-900 mt-0.5">{req.location}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Requested Date</span>
                  <p className="text-sm text-gray-900 mt-0.5">{format(parseISO(req.requested_date), "MMM d, yyyy")}</p>
                  {req.date_changed_reason && (
                    <p className="text-xs text-amber-600 mt-0.5">Changed: {req.date_changed_reason}</p>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Est. Hours</span>
                  <p className="text-sm text-gray-900 mt-0.5">{req.estimated_hours ? `${req.estimated_hours}h` : "—"}</p>
                </div>
              </div>
            </div>
            {/* Contact */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Requestor</span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{req.requestor_name}</p>
                <p className="text-xs text-gray-500">{req.requestor_email}</p>
                {req.requestor_phone && <p className="text-xs text-gray-500">{req.requestor_phone}</p>}
              </div>
            </div>
          </div>

          {/* Status-specific boxes */}
          {req.status === "completed" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-2">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Completed {req.completed_at ? format(parseISO(req.completed_at), "MMM d, yyyy") : ""} by {req.completed_by || "—"}
              </div>
              <div className="text-sm text-gray-700">
                {req.actual_hours && <span className="mr-4">Actual hours: <strong>{req.actual_hours}h</strong></span>}
                {req.completion_notes && <p className="mt-1 text-gray-600">{req.completion_notes}</p>}
              </div>
            </div>
          )}

          {req.status === "rejected" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Rejected {req.rejected_at ? format(parseISO(req.rejected_at), "MMM d, yyyy") : ""} by {req.rejected_by || "—"}
              </div>
              <p className="text-sm text-red-600">{req.rejected_reason || "No reason provided."}</p>
            </div>
          )}

          {Array.isArray(req.approval_checklist) && (req.approval_checklist as ChecklistItem[]).length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
                Approval Checklist
              </div>
              <div className="space-y-1">
                {(req.approval_checklist as ChecklistItem[]).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-blue-500">
                      {item.completed ? "check_box" : "check_box_outline_blank"}
                    </span>
                    <span className={item.completed ? "line-through text-gray-400" : "text-gray-700"}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  // ═══════════════════════════════════════════════════════════
  // SKELETON LOADER
  // ═══════════════════════════════════════════════════════════
  const SkeletonRows = () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-40" /><div className="h-3 bg-gray-100 rounded w-24 mt-1" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3"><div className="h-7 bg-gray-200 rounded w-20" /></td>
        </tr>
      ))}
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* Breadcrumb + Header */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <span className="hover:text-primary cursor-pointer">Admin</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-gray-900 font-bold">Work Orders</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Work Order Management</h1>
            <p className="text-gray-500 mt-1">Review, approve, and track all facility work requests.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRequests} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
              <span className={cn("material-symbols-outlined text-[18px]", loading && "animate-spin")}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Pending */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Pending Review</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{pendingCount}</h3>
              </div>
            </div>
            {pendingCount > 0 && <div className="mt-3 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full inline-block">Needs attention</div>}
          </div>
          {/* Active */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">engineering</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">In Progress</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{activeCount}</h3>
              </div>
            </div>
          </div>
          {/* High Priority */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined">priority_high</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">High Priority</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{highPriorityCount}</h3>
              </div>
            </div>
            {highPriorityCount > 0 && <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full inline-block">Active alerts</div>}
          </div>
          {/* Completed */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Completed</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{completedCount}</h3>
              </div>
            </div>
            <div className="mt-3 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block">{completionRate}% rate</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full lg:w-auto">
              <span className="material-symbols-outlined text-[20px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <Input
                placeholder="Search work orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-white border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36 bg-white border-gray-200">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
                  <span className="material-symbols-outlined text-[20px]">table_rows</span>
                </button>
                <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                </button>
              </div>

              {/* Export */}
              <button onClick={() => exportCSV(filtered)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400 font-bold">
            Showing {filtered.length} work order{filtered.length !== 1 ? "s" : ""} · {pendingCount} pending
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Work Order</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Title / Requestor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? <SkeletonRows /> : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        {requests.length === 0 ? (
                          <div className="text-center py-16">
                            <span className="material-symbols-outlined text-gray-300 text-5xl block mb-3">church</span>
                            <h3 className="font-extrabold text-gray-900 text-lg mb-1">All caught up!</h3>
                            <p className="text-gray-400 text-sm">No work orders have been submitted yet.</p>
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <span className="material-symbols-outlined text-gray-300 text-5xl block mb-3">search_off</span>
                            <h3 className="font-extrabold text-gray-900 text-lg mb-1">No work orders found</h3>
                            <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters.</p>
                            <button onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}
                              className="px-4 py-2 text-sm font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
                              Clear Filters
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : paginated.map(req => (
                    <>
                      <tr
                        key={req.id}
                        onClick={() => setExpandedRow(expandedRow === req.id ? null : req.id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-gray-50/80",
                          expandedRow === req.id && "bg-gray-50/50"
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="font-extrabold text-xs text-gray-900">{req.work_order_id || `WO-${req.id.slice(-4)}`}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm text-gray-900 truncate max-w-[240px]">{req.title}</div>
                          <div className="text-xs text-gray-400">{req.requestor_name}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-600 capitalize">{req.department}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1", getPriorityBadge(req.priority))}>
                            {(req.priority === "urgent" || req.priority === "emergency") && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            )}
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1", getStatusBadge(req.status))}>
                            <span className="material-symbols-outlined text-[14px]">{getStatusIcon(req.status)}</span>
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-600">{format(parseISO(req.requested_date), "MMM d")}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionButtons req={req} />
                        </td>
                      </tr>
                      {expandedRow === req.id && <ExpandedRowDetail key={`exp-${req.id}`} req={req} />}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-bold">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} requests
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  {getPageNumbers().map(pn => (
                    <button key={pn} onClick={() => setPage(pn)}
                      className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        pn === page ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"
                      )}>
                      {pn}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARD VIEW */}
        {viewMode === "card" && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-3 bg-gray-100 rounded" />
                      <div className="h-3 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                {requests.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-gray-300 text-5xl block mb-3">church</span>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-1">All caught up!</h3>
                    <p className="text-gray-400 text-sm">No work orders have been submitted yet.</p>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-gray-300 text-5xl block mb-3">search_off</span>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-1">No work orders found</h3>
                    <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters.</p>
                    <button onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}
                      className="px-4 py-2 text-sm font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map(req => {
                  const checklist = Array.isArray(req.approval_checklist) ? req.approval_checklist as ChecklistItem[] : [];
                  const checklistProgress = checklist.length > 0 ? (checklist.filter(i => i.completed).length / checklist.length) * 100 : 0;

                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 hover:shadow-md transition-all",
                        getStatusBorderColor(req.status)
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs text-gray-500">{req.work_order_id || `WO-${req.id.slice(-4)}`}</span>
                          <h3 className="font-bold text-sm text-gray-900 truncate mt-0.5">{req.title}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{req.requestor_name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1", getPriorityBadge(req.priority))}>
                            {(req.priority === "urgent" || req.priority === "emergency") && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                            {req.priority}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1", getStatusBadge(req.status))}>
                            <span className="material-symbols-outlined text-[12px]">{getStatusIcon(req.status)}</span>
                            {req.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">groups</span>
                          <span className="capitalize truncate">{req.department}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
                          <span className="truncate">{req.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">calendar_today</span>
                          {format(parseISO(req.requested_date), "MMM d")}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">category</span>
                          <span className="capitalize truncate">{req.category}</span>
                        </div>
                      </div>

                      {/* Checklist progress bar */}
                      {checklist.length > 0 && req.status === "in_progress" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Checklist</span>
                            <span>{Math.round(checklistProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${checklistProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <span className="text-xs text-gray-400">{formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}</span>
                        <ActionButtons req={req} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card Pagination */}
            {!loading && filtered.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6">
                <span className="text-xs text-gray-400 font-bold">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} requests
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  {getPageNumbers().map(pn => (
                    <button key={pn} onClick={() => setPage(pn)}
                      className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        pn === page ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"
                      )}>
                      {pn}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <ApprovalDialog />
      <RejectDialog />
      <CompleteWorkDialog />
    </div>
  );
};

export default WorkOrderManagement;
