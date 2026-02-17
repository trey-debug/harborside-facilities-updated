import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface PersonalTask {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-50 text-red-600 border border-red-200";
    case "high": return "bg-orange-50 text-orange-600 border border-orange-200";
    case "medium": return "bg-blue-50 text-blue-600 border border-blue-200";
    case "low": return "bg-gray-50 text-gray-500 border border-gray-200";
    default: return "bg-gray-50 text-gray-500 border border-gray-200";
  }
};

export const PersonalTaskBoard = () => {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState<{ title: string; description: string; priority: "low" | "medium" | "high" | "urgent" }>({
    title: "", description: "", priority: "medium"
  });
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('personal_tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data || []) as PersonalTask[]);
    } catch {
      toast({ title: "Error", description: "Failed to load personal tasks", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast({ title: "Error", description: "Title is required", variant: "destructive" }); return; }
    try {
      const taskData = { title: formData.title.trim(), description: formData.description.trim() || null, priority: formData.priority, user_id: session?.user?.id || '00000000-0000-0000-0000-000000000001' };
      if (editingTask) {
        const { error } = await supabase.from('personal_tasks').update(taskData).eq('id', editingTask.id);
        if (error) throw error;
        toast({ title: "Success", description: "Task updated" });
      } else {
        const { error } = await supabase.from('personal_tasks').insert([taskData]);
        if (error) throw error;
        toast({ title: "Success", description: "Task created" });
      }
      setFormData({ title: "", description: "", priority: "medium" }); setEditingTask(null); setIsDialogOpen(false); fetchTasks();
    } catch {
      toast({ title: "Error", description: "Failed to save task", variant: "destructive" });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: "todo" | "in_progress" | "completed") => {
    try {
      const { error } = await supabase.from('personal_tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      fetchTasks(); toast({ title: "Success", description: "Task status updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update task status", variant: "destructive" });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('personal_tasks').delete().eq('id', taskId);
      if (error) throw error;
      fetchTasks(); toast({ title: "Success", description: "Task deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  };

  const openEditDialog = (task: PersonalTask) => {
    setEditingTask(task); setFormData({ title: task.title, description: task.description || "", priority: task.priority }); setIsDialogOpen(true);
  };

  const openNewTaskDialog = () => {
    setEditingTask(null); setFormData({ title: "", description: "", priority: "medium" }); setIsDialogOpen(true);
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const TaskCard = ({ task }: { task: PersonalTask }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm text-gray-900 leading-tight">{task.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(task)}>
              <span className="material-symbols-outlined text-[16px] mr-2">edit</span> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
              <span className="material-symbols-outlined text-[16px] mr-2">delete</span> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {task.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", getPriorityBadge(task.priority))}>{task.priority}</span>
        <div className="flex gap-1">
          {task.status === "todo" && (
            <button onClick={() => updateTaskStatus(task.id, "in_progress")} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">play_arrow</span> Start
            </button>
          )}
          {task.status === "in_progress" && (
            <button onClick={() => updateTaskStatus(task.id, "completed")} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check</span> Complete
            </button>
          )}
          {task.status === "completed" && (
            <button onClick={() => updateTaskStatus(task.id, "todo")} className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100">Reopen</button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="material-symbols-outlined text-primary">checklist</span>
          </div>
          <p className="text-gray-500 text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Personal Task Board</h1>
            <p className="text-gray-500 mt-1">Manage your tasks and stay organized.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button onClick={openNewTaskDialog} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-lg">add</span> Add Task
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
                <DialogDescription>{editingTask ? "Update your task details" : "Create a new personal task"}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label htmlFor="title">Title</Label><Input id="title" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter task title" required /></div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description" rows={3} /></div>
                <div><Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={value => setFormData(prev => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingTask ? "Update Task" : "Create Task"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="size-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">To Do</p>
              <h3 className="text-2xl font-extrabold text-gray-900">{todoTasks.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="size-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined">play_circle</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">In Progress</p>
              <h3 className="text-2xl font-extrabold text-gray-900">{inProgressTasks.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="size-11 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Completed</p>
              <h3 className="text-2xl font-extrabold text-gray-900">{completedTasks.length}</h3>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* To Do */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">pending_actions</span>
                To Do <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 ml-1">{todoTasks.length}</span>
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {todoTasks.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2 block">inbox</span>
                  <p className="text-gray-400 text-sm">No pending tasks</p>
                </div>
              ) : todoTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/30">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">play_circle</span>
                In Progress <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 ml-1">{inProgressTasks.length}</span>
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {inProgressTasks.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2 block">hourglass_empty</span>
                  <p className="text-gray-400 text-sm">No tasks in progress</p>
                </div>
              ) : inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-green-100 bg-green-50/30">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">task_alt</span>
                Completed <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 ml-1">{completedTasks.length}</span>
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2 block">check_circle</span>
                  <p className="text-gray-400 text-sm">No completed tasks yet</p>
                </div>
              ) : completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
