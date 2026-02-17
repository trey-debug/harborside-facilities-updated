import { cn } from "@/lib/utils";
import { getPriorityColor, getStatusColor, getStatusIcon, WorkRequest } from "@/lib/calendar-utils";

interface WorkRequestCardProps {
  request: WorkRequest;
  variant?: 'compact' | 'detailed';
  className?: string;
  onClick?: () => void;
}

export const WorkRequestCard = ({
  request,
  variant = 'compact',
  className,
  onClick
}: WorkRequestCardProps) => {
  const statusIcon = getStatusIcon(request.status);

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all",
          className
        )}
        onClick={onClick}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-gray-900 leading-tight line-clamp-2">{request.title}</h3>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border shrink-0", getPriorityColor(request.priority))}>
              {request.priority}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">{statusIcon}</span>
              <span className="capitalize">{request.status.replace('_', ' ')}</span>
            </div>
            <span>·</span>
            <span className="capitalize">{request.department}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="truncate">{request.location}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-6", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{request.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{request.description}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border", getPriorityColor(request.priority))}>
              {request.priority}
            </span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1", getStatusColor(request.status))}>
              <span className="material-symbols-outlined text-[14px]">{statusIcon}</span>
              <span className="capitalize">{request.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase">Requestor</p>
            <p className="font-bold text-gray-900">{request.requestor_name}</p>
            <p className="text-xs text-gray-500">{request.requestor_email}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase">Department</p>
            <p className="capitalize text-gray-900">{request.department}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase">Category</p>
            <p className="text-gray-900">{request.category}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase">Location</p>
            <div className="flex items-center gap-1 text-gray-900">
              <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
              <span>{request.location}</span>
            </div>
          </div>

          {request.estimated_hours && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase">Estimated Hours</p>
              <p className="text-gray-900">{request.estimated_hours}h</p>
            </div>
          )}

          {request.actual_hours && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase">Actual Hours</p>
              <p className="text-gray-900">{request.actual_hours}h</p>
            </div>
          )}
        </div>

        {/* Completion Notes */}
        {request.completion_notes && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Completion Notes</p>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{request.completion_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
