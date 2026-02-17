export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "emergency":
      return "bg-red-50 text-red-700 border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "medium":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "low":
      return "bg-gray-50 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "paused":
      return "bg-gray-50 text-gray-600 border-gray-200";
    case "approved":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "pending":
      return "bg-gray-50 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case "completed":
      return "check_circle";
    case "in_progress":
      return "play_circle";
    case "paused":
      return "pause_circle";
    case "approved":
      return "schedule";
    case "pending":
      return "pending";
    case "rejected":
      return "cancel";
    default:
      return "schedule";
  }
};

export interface WorkRequest {
  id: string;
  title: string;
  description: string;
  department: string;
  requestor_name: string;
  requestor_email: string;
  requestor_phone?: string;
  priority: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'paused' | 'completed';
  requested_date: string;
  location: string;
  category: string;
  estimated_hours?: number;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  started_by?: string;
  started_at?: string;
  completed_by?: string;
  completed_at?: string;
  actual_hours?: number;
  completion_notes?: string;
  work_order_id?: string;
  date_changed_reason?: string;
}
