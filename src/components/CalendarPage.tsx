import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { WorkRequest } from "@/lib/calendar-utils";
import { WorkRequestCard } from "@/components/calendar/WorkRequestCard";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<WorkRequest | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [dateChangeReason, setDateChangeReason] = useState("");
  const [pendingDateChanges, setPendingDateChanges] = useState<Array<{id: string, oldDate: string, newDate: string, workOrderId: string}>>([]);
  const { toast } = useToast();

  useEffect(() => { fetchWorkRequests(); }, []);

  const fetchWorkRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_requests')
        .select('*')
        .order('requested_date', { ascending: true });
      if (error) {
        console.error('Error fetching work requests:', error);
        toast({ title: "Error", description: "Failed to fetch work requests", variant: "destructive" });
        return;
      }
      setWorkRequests(data || []);
    } catch (error) {
      console.error('Error fetching work requests:', error);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = workRequests.filter(request => {
    const matchesDepartment = filterDepartment === "all" || request.department === filterDepartment;
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    return matchesDepartment && matchesStatus;
  });

  const getRequestsForDate = (date: Date) => {
    return filteredRequests.filter(request => {
      const requestDate = parseISO(pendingChanges.get(request.id) || request.requested_date);
      return isSameDay(requestDate, date);
    });
  };

  const hasRequestsOnDate = (date: Date) => getRequestsForDate(date).length > 0;

  const getDatePriorityColor = (date: Date) => {
    const requests = getRequestsForDate(date);
    if (requests.length === 0) return "";
    const hasEmergency = requests.some(r => r.priority === "emergency");
    const hasHigh = requests.some(r => r.priority === "high");
    if (hasEmergency) return "bg-red-50 border-red-300";
    if (hasHigh) return "bg-orange-50 border-orange-300";
    return "bg-blue-50 border-blue-300";
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    }
  };

  const getCurrentWeekDates = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, request: WorkRequest) => {
    if (!isDragMode) return;
    setDraggedItem(request);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', request.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDragMode || !draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    if (!isDragMode || !draggedItem) return;
    e.preventDefault();
    const newDate = format(targetDate, 'yyyy-MM-dd');
    const currentDateStr = pendingChanges.get(draggedItem.id) || draggedItem.requested_date;
    if (newDate !== currentDateStr) {
      setPendingDateChanges(prev => {
        const existing = prev.find(change => change.id === draggedItem.id);
        const newChange = {
          id: draggedItem.id,
          oldDate: draggedItem.requested_date,
          newDate,
          workOrderId: draggedItem.work_order_id || `WO-${draggedItem.id.slice(-4)}`
        };
        return existing ? prev.map(c => c.id === draggedItem.id ? newChange : c) : [...prev, newChange];
      });
      setPendingChanges(prev => new Map(prev.set(draggedItem.id, newDate)));
      if (!dateChangeReason && pendingDateChanges.length === 0) {
        setShowReasonDialog(true);
      }
      toast({ title: "Work order moved", description: `${draggedItem.work_order_id || 'Work order'} moved to ${format(targetDate, 'MMMM d, yyyy')}` });
    }
    setDraggedItem(null);
  };

  const handleDayClick = (date: Date) => setSelectedDate(date);

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast({ title: "No changes to save", description: "No work orders have been moved." });
      return;
    }
    if (pendingDateChanges.length > 0 && !dateChangeReason.trim()) {
      setShowReasonDialog(true);
      return;
    }
    setSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(([id, newDate]) => ({
        id, requested_date: newDate, date_changed_reason: dateChangeReason.trim() || null
      }));
      for (const update of updates) {
        const { error } = await supabase
          .from('work_requests')
          .update({ requested_date: update.requested_date, date_changed_reason: update.date_changed_reason })
          .eq('id', update.id);
        if (error) throw error;
      }
      for (const change of pendingDateChanges) {
        const workRequest = workRequests.find(req => req.id === change.id);
        if (workRequest) {
          try {
            await supabase.functions.invoke('notify-date-change', {
              body: {
                workOrderId: change.workOrderId, title: workRequest.title,
                oldDate: change.oldDate, newDate: change.newDate,
                reason: dateChangeReason.trim() || 'No reason provided',
                department: workRequest.department, requestorName: workRequest.requestor_name,
                requestorEmail: workRequest.requestor_email
              }
            });
          } catch (webhookError) {
            console.error(`Failed to send webhook for ${change.workOrderId}:`, webhookError);
          }
        }
      }
      setWorkRequests(prev => prev.map(request => {
        const newDate = pendingChanges.get(request.id);
        return newDate ? { ...request, requested_date: newDate } : request;
      }));
      setPendingChanges(new Map());
      setPendingDateChanges([]);
      setDateChangeReason("");
      toast({ title: "Changes saved", description: `${updates.length} work order${updates.length > 1 ? 's' : ''} updated successfully.` });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ title: "Error saving changes", description: "Failed to update work orders. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReasonDialogSave = () => {
    if (!dateChangeReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for changing the date.", variant: "destructive" });
      return;
    }
    setShowReasonDialog(false);
  };

  const handleReasonDialogCancel = () => {
    setPendingChanges(new Map());
    setPendingDateChanges([]);
    setDateChangeReason("");
    setShowReasonDialog(false);
    toast({ title: "Changes cancelled", description: "Date changes have been cancelled." });
  };

  const selectedDateRequests = selectedDate ? getRequestsForDate(selectedDate) : [];

  // Priority border color for calendar work order chips
  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "border-l-red-500";
      case "high": return "border-l-orange-500";
      case "medium": return "border-l-blue-500";
      case "low": return "border-l-gray-400";
      default: return "border-l-gray-400";
    }
  };

  // Work Orders Sidebar (drag mode)
  const WorkOrdersSidebar = () => {
    if (!isDragMode) return null;
    const allPendingRequests = filteredRequests.filter(request =>
      ['pending', 'approved', 'in_progress'].includes(request.status)
    );
    return (
      <div className={cn(
        "fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-xl",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900">Work Orders</h3>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Drag work orders to calendar days</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {allPendingRequests.map((request) => {
              const hasChanges = pendingChanges.has(request.id);
              const currentDateStr = pendingChanges.get(request.id) || request.requested_date;
              return (
                <div
                  key={request.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, request)}
                  className={cn(
                    "p-3 rounded-xl border-2 cursor-move hover:shadow-md transition-all bg-white",
                    request.priority === "emergency" && "border-red-300 bg-red-50",
                    request.priority === "high" && "border-orange-300 bg-orange-50",
                    request.priority === "medium" && "border-blue-300 bg-blue-50",
                    request.priority === "low" && "border-gray-200 bg-gray-50",
                    hasChanges && "ring-2 ring-amber-400 ring-opacity-50",
                    draggedItem?.id === request.id && "opacity-50 scale-95"
                  )}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {hasChanges && <span className="text-amber-500 font-bold text-xs mt-0.5">●</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-xs text-gray-900">
                          {request.work_order_id || `WO-${request.id.slice(-4)}`}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs font-bold rounded-full",
                          request.priority === "emergency" && "bg-red-100 text-red-700",
                          request.priority === "high" && "bg-orange-100 text-orange-700",
                          request.priority === "medium" && "bg-blue-100 text-blue-700",
                          request.priority === "low" && "bg-gray-100 text-gray-600"
                        )}>
                          {request.priority}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">{request.title}</h4>
                      <div className="text-xs text-gray-500">
                        <div className="capitalize">{request.department}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {format(parseISO(currentDateStr), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  </div>
                  {hasChanges && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded-lg font-bold">
                      Moved — click Save to confirm
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Weekly view
  const WeeklyView = () => {
    const weekDates = getCurrentWeekDates();
    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-7 gap-0 border-b border-gray-200 bg-gray-50">
          {weekDates.map((date, index) => (
            <div key={index} className="p-4 text-center border-r border-gray-100 last:border-r-0">
              <div className="font-bold text-xs text-gray-400 uppercase">{format(date, 'EEE')}</div>
              <div className={cn(
                "font-extrabold text-2xl mt-1 text-gray-900",
                isSameDay(date, new Date()) && "text-primary",
                selectedDate && isSameDay(date, selectedDate) && "text-primary"
              )}>
                {format(date, 'd')}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{format(date, 'MMM')}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-0">
          {weekDates.map((date, index) => {
            const requests = getRequestsForDate(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isDropTarget = isDragMode && draggedItem;
            const isToday = isSameDay(date, new Date());
            return (
              <div
                key={index}
                className={cn(
                  "border-r border-gray-100 last:border-r-0 flex flex-col min-h-[500px] transition-all",
                  isDropTarget && "border-primary/50 border-2",
                  isToday && "bg-blue-50/30",
                  isSelected && "bg-primary/5"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <button
                  className={cn(
                    "p-3 flex flex-col h-full items-start justify-start transition-all",
                    "hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                    isDropTarget && "bg-primary/5"
                  )}
                  onClick={() => handleDayClick(date)}
                >
                  <div className="w-full space-y-2 flex-1">
                    {requests.map((request, ri) => {
                      const hasChanges = pendingChanges.has(request.id);
                      return (
                        <div
                          key={ri}
                          draggable={isDragMode}
                          onDragStart={(e) => handleDragStart(e, request)}
                          className={cn(
                            "w-full p-2 rounded-lg border-l-4 border bg-white text-xs transition-all shadow-sm",
                            getPriorityBorderColor(request.priority),
                            "border-gray-100",
                            isDragMode && "cursor-move hover:scale-[1.02] hover:shadow-md",
                            hasChanges && "ring-2 ring-amber-400 ring-opacity-70",
                            draggedItem?.id === request.id && "opacity-50 scale-95"
                          )}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {hasChanges && <span className="text-amber-500 font-bold">●</span>}
                            <span className="font-extrabold text-gray-900">{request.work_order_id || `WO-${request.id.slice(-4)}`}</span>
                          </div>
                          <div className="font-bold text-gray-700 line-clamp-2 mb-1" title={request.title}>{request.title}</div>
                          <div className="text-gray-400 capitalize">{request.department} · {request.status.replace('_', ' ')}</div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col bg-[#f5f7f8]">
      {/* Header */}
      <div className="flex-none px-4 md:px-8 py-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">Work Request Calendar</h1>
              <p className="text-gray-500 mt-1">Schedule and manage work orders across your facilities.</p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  viewMode === 'month' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  viewMode === 'week' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Week
              </button>
            </div>
          </div>
          <CalendarFilters
            filterDepartment={filterDepartment}
            setFilterDepartment={setFilterDepartment}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onRefresh={fetchWorkRequests}
            loading={loading}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsDragMode(!isDragMode); setSidebarOpen(!isDragMode); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-all",
                  isDragMode
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{isDragMode ? "drag_indicator" : "open_with"}</span>
                {isDragMode ? "Exit Drag Mode" : "Drag & Drop"}
              </button>

              {pendingChanges.size > 0 && (
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/20"
                >
                  {saving ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Saving...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">save</span> Save Changes ({pendingChanges.size})</>
                  )}
                </button>
              )}

              {isDragMode && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Drag work orders from the sidebar or calendar to reschedule
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate('prev')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <h2 className="text-lg font-extrabold text-gray-900 min-w-[220px] text-center">
                {viewMode === 'month'
                  ? format(currentDate, "MMMM yyyy")
                  : `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`
                }
              </h2>
              <button onClick={() => navigate('next')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Today
              </button>
            </div>
          </div>

          {/* Calendar Display */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                  </div>
                  <p className="text-gray-500 text-sm">Loading calendar...</p>
                </div>
              </div>
            ) : viewMode === 'month' ? (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                onMonthChange={setCurrentDate}
                className="w-full h-full text-lg"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
                  month: "space-y-4 w-full flex-1",
                  table: "w-full h-full border-collapse space-y-1",
                  head_row: "",
                  head_cell: "text-gray-400 rounded-md w-full font-bold text-xs uppercase p-4",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-blue-50 flex-1 h-full min-h-[140px]",
                  day: "h-full w-full p-0 font-normal aria-selected:opacity-100 text-base",
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
                  day_today: "bg-blue-50 text-primary font-bold",
                  day_outside: "day-outside text-gray-300 opacity-50",
                  day_disabled: "text-gray-300 opacity-50",
                  day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-primary",
                  day_hidden: "invisible",
                }}
                modifiers={{ hasRequests: (date) => hasRequestsOnDate(date) }}
                modifiersClassNames={{ hasRequests: "" }}
                components={{
                  Day: ({ date }) => {
                    const dayRequests = getRequestsForDate(date);
                    const isDropTarget = isDragMode && draggedItem;
                    return (
                      <div
                        className={cn(
                          "relative w-full h-full min-h-[140px] p-2",
                          isDropTarget && "border-2 border-primary/40 border-dashed bg-blue-50/50",
                          "transition-all"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, date)}
                      >
                        <button
                          className={cn(
                            "w-full h-full flex flex-col items-start justify-start text-left p-3 rounded-lg",
                            dayRequests.length > 0 && getDatePriorityColor(date),
                            "hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary/30",
                            isDropTarget && "bg-blue-50/50"
                          )}
                          onClick={() => handleDayClick(date)}
                        >
                          <div className={cn(
                            "font-extrabold mb-3 text-lg",
                            isSameDay(date, new Date()) ? "text-primary" : "text-gray-900"
                          )}>
                            {format(date, 'd')}
                          </div>
                          <div className="w-full space-y-1 flex-1">
                            {dayRequests.slice(0, 3).map((request, idx) => {
                              const hasChanges = pendingChanges.has(request.id);
                              return (
                                <div
                                  key={idx}
                                  draggable={isDragMode}
                                  onDragStart={(e) => handleDragStart(e, request)}
                                  onClick={(e) => { if (isDragMode) e.stopPropagation(); }}
                                  className={cn(
                                    "w-full p-1.5 rounded-md text-xs transition-all border-l-3 border bg-white shadow-sm",
                                    getPriorityBorderColor(request.priority),
                                    "border-gray-100",
                                    isDragMode && "cursor-move hover:scale-[1.02] hover:shadow-md",
                                    hasChanges && "ring-1 ring-amber-400",
                                    draggedItem?.id === request.id && "opacity-50 scale-95"
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    {hasChanges && <span className="text-amber-500 font-bold">●</span>}
                                    <span className="font-extrabold truncate text-gray-900">
                                      {request.work_order_id || `WO-${request.id.slice(-4)}`}
                                    </span>
                                  </div>
                                  <div className="truncate font-bold text-gray-500" title={request.title}>
                                    {request.title}
                                  </div>
                                </div>
                              );
                            })}
                            {dayRequests.length > 3 && (
                              <div className="text-xs text-gray-400 text-center py-1 font-bold">
                                +{dayRequests.length - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  }
                }}
              />
            ) : (
              <WeeklyView />
            )}
          </div>
        </div>

        {/* Selected Date Sidebar */}
        {selectedDate && !isDragMode && (
          <div className="w-80 border-l border-gray-100 bg-white flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDateRequests.length} work request{selectedDateRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDateRequests.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-gray-300 text-4xl block mb-3">event_busy</span>
                  <p className="text-gray-400 text-sm">No work requests scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateRequests.map((request) => (
                    <WorkRequestCard key={request.id} request={request} onClick={() => {}} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Work Orders Sidebar for Drag Mode */}
      <WorkOrdersSidebar />

      {/* Date Change Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for Date Change</DialogTitle>
            <DialogDescription>
              Please provide a reason for changing the scheduled date{pendingDateChanges.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingDateChanges.length > 0 && (
              <div className="space-y-2">
                {pendingDateChanges.map((change, index) => (
                  <div key={index} className="text-sm bg-gray-50 border border-gray-100 p-3 rounded-lg">
                    <div className="font-extrabold text-gray-900">{change.workOrderId}</div>
                    <div className="text-gray-500">
                      {format(parseISO(change.oldDate), 'MMM d, yyyy')} → {format(parseISO(change.newDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for date change</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Resource conflict, priority change, client request..."
                value={dateChangeReason}
                onChange={(e) => setDateChangeReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleReasonDialogCancel}>Cancel Changes</Button>
            <Button onClick={handleReasonDialogSave} disabled={!dateChangeReason.trim()}>Save Reason</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
