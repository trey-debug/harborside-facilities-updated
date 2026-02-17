import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface StatusRequest {
  id: string;
  work_order_id: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  status: string;
  requested_date: string;
  created_at: string;
  rejected_reason?: string;
  rejected_by?: string;
  approved_by?: string;
  started_by?: string;
  started_at?: string;
  completed_by?: string;
  completed_at?: string;
  actual_hours?: number;
  completion_notes?: string;
}

const Index = () => {
  const [email, setEmail] = useState("");
  const [requests, setRequests] = useState<StatusRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from("work_requests")
        .select("*")
        .eq("requestor_email", email.trim())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);

      if (!data || data.length === 0) {
        toast({
          title: "No requests found",
          description: "No work requests found for this email address.",
        });
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-blue-100 text-blue-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = {
      emergency: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-blue-500",
      low: "bg-gray-400",
    };
    return colors[priority] || "bg-gray-400";
  };

  const formatStatus = (status: string) =>
    status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Hero + search view
  if (!hasSearched) {
    return (
      <div className="min-h-[calc(100vh-73px)]">
        <main className="flex-1 flex flex-col items-center justify-center relative px-4 py-20 bg-geometric">
          <div className="absolute inset-0 hero-gradient pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-white shadow-xl shadow-primary/10 border border-primary/10">
              <span className="material-symbols-outlined text-primary text-6xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                church
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                Harborside Facilities{" "}
                <br className="hidden md:block" />
                <span className="text-primary">Management</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                Check the status of your work requests. Submit new requests and track maintenance in real-time.
              </p>
            </div>

            {/* Status Check Card */}
            <div className="w-full max-w-[600px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
              <div className="p-8 md:p-12 flex flex-col items-center text-center">
                <div className="mb-6 size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">search</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Check Request Status</h2>
                <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-md">
                  Enter the email address used to submit your facility maintenance or event request to see current progress.
                </p>
                <form onSubmit={handleCheckStatus} className="w-full space-y-6">
                  <div className="text-left">
                    <Label className="block text-sm font-semibold text-gray-700 mb-2 ml-1" htmlFor="email">
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                        <span className="material-symbols-outlined">mail</span>
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="e.g., name@church.org"
                        className="pl-12 py-6 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full primary-gradient text-white font-bold py-6 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                        Checking...
                      </>
                    ) : (
                      <>
                        Check Status
                        <span className="material-symbols-outlined ml-2 text-xl">arrow_forward</span>
                      </>
                    )}
                  </Button>
                </form>
                <p className="mt-8 text-sm italic text-gray-400">
                  We'll search our database for requests from this email
                </p>
              </div>
              <div className="h-1.5 w-full primary-gradient opacity-50" />
            </div>
          </div>
        </main>

        <div className="w-full px-10 py-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">verified</span>
              <span className="text-sm font-semibold text-gray-500">Secure Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">update</span>
              <span className="text-sm font-semibold text-gray-500">Real-time Tracking</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium">Harborside Church. All facilities maintained with care.</p>
        </div>
      </div>
    );
  }

  // Results view
  return (
    <div className="min-h-[calc(100vh-73px)] bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Your Requests</h2>
            <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
              {requests.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setHasSearched(false); setRequests([]); setEmail(""); }}>
              <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
              Back
            </Button>
            <Link to="/submit">
              <Button className="primary-gradient text-white font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                New Request
              </Button>
            </Link>
          </div>
        </div>

        {requests.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-gray-300 text-5xl">description</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-500 mb-2 max-w-md mx-auto">
              We couldn't find any work requests associated with this email address.
            </p>
            <p className="text-sm italic text-gray-400 mb-8">
              Make sure you're using the same email you submitted your request with.
            </p>
            <Link to="/submit">
              <Button className="primary-gradient text-white font-bold shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[20px] mr-2">add_circle</span>
                Submit New Request
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      {request.work_order_id}
                    </span>
                    <span className="text-xs text-gray-400">
                      Submitted {formatDate(request.created_at)}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(request.status)}`}>
                    {request.status === "completed" && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                    {request.status === "rejected" && <span className="material-symbols-outlined text-[16px]">cancel</span>}
                    {request.status === "pending" && <span className="material-symbols-outlined text-[16px]">schedule</span>}
                    {request.status === "in_progress" && <span className="material-symbols-outlined text-[16px]">sync</span>}
                    {formatStatus(request.status)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4">{request.title}</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Department</p>
                    <p className="text-sm font-semibold text-gray-700 capitalize">{request.department}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Priority</p>
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${getPriorityDot(request.priority)}`} />
                      <p className="text-sm font-semibold text-gray-700 capitalize">{request.priority}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Requested Date</p>
                    <p className="text-sm font-semibold text-gray-700">{formatDate(request.requested_date)}</p>
                  </div>
                  {request.completed_at && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Completed</p>
                      <p className="text-sm font-semibold text-gray-700">{formatDate(request.completed_at)}</p>
                    </div>
                  )}
                </div>

                {request.status === "completed" && request.completion_notes && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex gap-3">
                    <span className="material-symbols-outlined text-green-600 text-[20px] mt-0.5">task_alt</span>
                    <div>
                      <p className="text-sm font-bold text-green-800 mb-1">Completion Notes</p>
                      <p className="text-sm text-green-700">{request.completion_notes}</p>
                      {request.actual_hours && (
                        <p className="text-xs text-green-600 mt-1">Actual hours: {request.actual_hours}h</p>
                      )}
                    </div>
                  </div>
                )}

                {request.status === "rejected" && request.rejected_reason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex gap-3">
                    <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">error</span>
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700">{request.rejected_reason}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
