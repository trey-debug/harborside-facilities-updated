import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalendarFiltersProps {
  filterDepartment: string;
  setFilterDepartment: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const CalendarFilters = ({
  filterDepartment,
  setFilterDepartment,
  filterStatus,
  setFilterStatus,
  onRefresh,
  loading
}: CalendarFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-44 bg-white border-gray-200">
            <span className="material-symbols-outlined text-[16px] text-gray-400 mr-2">groups</span>
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="worship">Worship</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="kids">Kids</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="outreach">Outreach</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-white border-gray-200">
            <span className="material-symbols-outlined text-[16px] text-gray-400 mr-2">filter_list</span>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Legend */}
        <div className="hidden lg:flex items-center gap-4 ml-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span>Emergency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
            <span>Low</span>
          </div>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        Refresh
      </button>
    </div>
  );
};
