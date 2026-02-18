import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  heroFadeIn,
  staggerContainer,
  staggerItem,
  cardAppear,
  buttonHover,
  emptyStateFade,
  emptyStateFadeItem,
  pageTransition,
} from "@/lib/animations";
import { AnimatedCard, StaggeredList, FloatingElement, PulseGlow } from "@/lib/animations";

// ─── Harborside logo ──────────────────────────────────────────────────────────
// isolation:isolate creates a new stacking context so mix-blend-mode:multiply
// on the <img> blends ONLY against the wrapper's solid background (matching the
// page colour) — not against the dot pattern or any other layer.
// white × hsl(210 20% 97%) = hsl(210 20% 97%) → white areas become invisible.
const HarborsideLogo = () => (
  <div
    className="inline-flex"
    style={{
      background: "hsl(210, 20%, 97%)",
      isolation: "isolate",
    }}
  >
    <img
      src="/harborside-logo.png"
      alt="Harborside Christian Church"
      className="h-24 md:h-28 w-auto object-contain"
      style={{ maxWidth: "240px", mixBlendMode: "multiply" }}
    />
  </div>
);

// ─── Animated wave layers (real SVG paths from harborsidechurch.org) ──────────
// Seamless loop: two copies of each path tiled horizontally.
// animate x: 0→-50% shifts one full pattern width, then loops invisibly.
// Footer text is overlaid on the solid teal front-wave band at the bottom.
const AnimatedWaves = () => (
  <div
    className="relative overflow-hidden flex-shrink-0 -mt-16 md:-mt-20 z-10 h-[180px] md:h-[240px]"
  >
    {/* Waves — decorative, hidden from a11y tree */}
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,174,239,0.10) 40%, rgba(0,83,115,0.18) 100%)",
        }}
      />

      {/* Back wave — #00AEEF sky blue, slower */}
      <div className="absolute left-0 right-0 overflow-hidden bottom-[20px] md:bottom-[28px] h-[140px] md:h-[192px]">
        <motion.div
          style={{ width: "200%" }}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <svg width="100%" viewBox="0 0 2886 192" preserveAspectRatio="none" fill="none">
            <path d="M1109.5 28.1197C730.626 101.739 259.53 59.5946 0 11.0971V192H1443V11.0971C1330.5 -6.89309 1275.99 -4.23195 1109.5 28.1197Z" fill="#00AEEF" fillOpacity="0.42"/>
            <path d="M2552.5 28.1197C2173.626 101.739 1702.53 59.5946 1443 11.0971V192H2886V11.0971C2773.5 -6.89309 2718.99 -4.23195 2552.5 28.1197Z" fill="#00AEEF" fillOpacity="0.42"/>
          </svg>
        </motion.div>
      </div>

      {/* Front wave — #005373 ocean teal, faster */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden h-[140px] md:h-[180px]">
        <motion.div
          style={{ width: "200%" }}
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <svg width="100%" viewBox="0 0 2886 217" preserveAspectRatio="none" fill="none">
            <path d="M598.5 76.0946C308.477 169.927 97.5413 117.634 0 97V217H1443V97C1443 97 1340.5 76.0947 1226.5 42.2082C1102.01 5.20478 970.5 -44.2605 598.5 76.0946Z" fill="#005373" fillOpacity="0.82"/>
            <path d="M2041.5 76.0946C1751.477 169.927 1540.541 117.634 1443 97V217H2886V97C2886 97 2783.5 76.0947 2669.5 42.2082C2545.01 5.20478 2413.5 -44.2605 2041.5 76.0946Z" fill="#005373" fillOpacity="0.82"/>
          </svg>
        </motion.div>
      </div>
    </div>

    {/* Footer text — overlaid on the solid teal band */}
    <div className="absolute bottom-0 left-0 right-0 z-10 pb-3 md:pb-5 flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap px-4">
        {[
          { icon: "verified", label: "Secure Access" },
          { icon: "update", label: "Real-time Tracking" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-white/85 text-[16px] md:text-[18px]">
              {icon}
            </span>
            <span className="text-white/85 text-[11px] md:text-xs font-semibold">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-white/50 text-[10px] md:text-[11px] font-medium px-4 text-center">
        Harborside Church · All facilities maintained with care.
      </p>
    </div>
  </div>
);

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
    status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // ── Hero / search view ──────────────────────────────────────
  if (!hasSearched) {
    return (
      <motion.div
        className="min-h-[calc(100vh-73px)] flex flex-col"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <main className="flex-1 flex flex-col items-center justify-center relative px-4 py-20 bg-geometric">
          <div className="absolute inset-0 hero-gradient pointer-events-none" />

          {/* Hero content */}
          <motion.div
            variants={heroFadeIn}
            initial="initial"
            animate="animate"
            className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8"
          >
            {/* Harborside logo */}
            <HarborsideLogo />

            {/* Heading + sub */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-4"
            >
              <motion.h1
                variants={staggerItem}
                className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]"
              >
                Harborside Facilities{" "}
                <br className="hidden md:block" />
                <span className="text-primary">Management</span>
              </motion.h1>

              <motion.p
                variants={staggerItem}
                className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium"
              >
                Check the status of your work requests. Submit new requests and
                track maintenance in real-time.
              </motion.p>
            </motion.div>

            {/* Status check card */}
            <motion.div
              variants={cardAppear}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.35 }}
              className="w-full max-w-[600px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden"
            >
              <div className="p-8 md:p-12 flex flex-col items-center text-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="mb-6 size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                >
                  <span className="material-symbols-outlined text-4xl">search</span>
                </motion.div>

                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Check Request Status
                </h2>
                <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-md">
                  Enter the email address used to submit your facility maintenance
                  or event request to see current progress.
                </p>

                <form onSubmit={handleCheckStatus} className="w-full space-y-6">
                  <motion.div
                    variants={staggerItem}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.5 }}
                    className="text-left"
                  >
                    <Label
                      className="block text-sm font-semibold text-gray-700 mb-2 ml-1"
                      htmlFor="email"
                    >
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
                        className="pl-12 py-6 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </motion.div>

                  {/* Submit button with pulse glow */}
                  <motion.div
                    variants={staggerItem}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div
                      animate={
                        !isLoading
                          ? {
                              boxShadow: [
                                "0 4px 15px rgba(59,130,246,0.28)",
                                "0 8px 28px rgba(59,130,246,0.48)",
                                "0 4px 15px rgba(59,130,246,0.28)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-lg"
                    >
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full primary-gradient text-white font-bold py-6 rounded-lg transition-all active:scale-[0.98]"
                      >
                        {isLoading ? (
                          <>
                            <span className="material-symbols-outlined animate-spin mr-2">
                              progress_activity
                            </span>
                            Checking...
                          </>
                        ) : (
                          <>
                            Check Status
                            <span className="material-symbols-outlined ml-2 text-xl">
                              arrow_forward
                            </span>
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-8 text-sm italic text-gray-400"
                >
                  We'll search our database for requests from this email
                </motion.p>
              </div>
              <div className="h-1.5 w-full primary-gradient opacity-50" />
            </motion.div>

            {/* Submit new request CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <Link to="/submit">
                <motion.span
                  variants={buttonHover}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Submit a new work request
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </main>

        {/* ── Harborside animated waves + footer text ── */}
        <AnimatedWaves />
      </motion.div>
    );
  }

  // ── Results view ─────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-[calc(100vh-73px)] bg-background p-4 md:p-8"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header row */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex items-center justify-between mb-6"
        >
          <motion.div variants={staggerItem} className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Your Requests</h2>
            <AnimatePresence>
              <motion.span
                key={requests.length}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full"
              >
                {requests.length}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          <motion.div variants={staggerItem} className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setHasSearched(false);
                setRequests([]);
                setEmail("");
              }}
            >
              <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
              Back
            </Button>
            <Link to="/submit">
              <Button className="primary-gradient text-white font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                New Request
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Empty state */}
        {requests.length === 0 && (
          <motion.div
            variants={emptyStateFade}
            initial="initial"
            animate="animate"
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center"
          >
            <motion.div variants={emptyStateFadeItem} className="mx-auto mb-6 w-fit">
              <FloatingElement amplitude={8} duration={3.5}>
                <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-300 text-5xl">
                    description
                  </span>
                </div>
              </FloatingElement>
            </motion.div>

            <motion.h3
              variants={emptyStateFadeItem}
              className="text-xl font-bold text-gray-900 mb-2"
            >
              No Requests Found
            </motion.h3>

            <motion.p
              variants={emptyStateFadeItem}
              className="text-gray-500 mb-2 max-w-md mx-auto"
            >
              We couldn't find any work requests associated with this email address.
            </motion.p>

            <motion.p
              variants={emptyStateFadeItem}
              className="text-sm italic text-gray-400 mb-8"
            >
              Make sure you're using the same email you submitted your request with.
            </motion.p>

            <motion.div variants={emptyStateFadeItem}>
              <Link to="/submit">
                <Button className="primary-gradient text-white font-bold shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-[20px] mr-2">
                    add_circle
                  </span>
                  Submit New Request
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}

        {/* Results list */}
        {requests.length > 0 && (
          <StaggeredList className="space-y-4">
            {requests.map((request) => (
              <AnimatedCard
                key={request.id}
                hover
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        {request.work_order_id}
                      </span>
                      <span className="text-xs text-gray-400">
                        Submitted {formatDate(request.created_at)}
                      </span>
                    </div>

                    {/* Status badge – pulse on pending */}
                    {request.status === "pending" ? (
                      <PulseGlow color="#F59E0B" intensity={0.25}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(
                            request.status
                          )}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {formatStatus(request.status)}
                        </span>
                      </PulseGlow>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status === "completed" && (
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        )}
                        {request.status === "rejected" && (
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                        )}
                        {request.status === "in_progress" && (
                          <span className="material-symbols-outlined text-[16px]">sync</span>
                        )}
                        {formatStatus(request.status)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-4">{request.title}</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Department
                      </p>
                      <p className="text-sm font-semibold text-gray-700 capitalize">
                        {request.department}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Priority
                      </p>
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${getPriorityDot(request.priority)}`} />
                        <p className="text-sm font-semibold text-gray-700 capitalize">
                          {request.priority}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Requested Date
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatDate(request.requested_date)}
                      </p>
                    </div>
                    {request.completed_at && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Completed
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {formatDate(request.completed_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.status === "completed" && request.completion_notes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-green-50 border border-green-100 rounded-lg p-4 flex gap-3"
                    >
                      <span className="material-symbols-outlined text-green-600 text-[20px] mt-0.5">
                        task_alt
                      </span>
                      <div>
                        <p className="text-sm font-bold text-green-800 mb-1">Completion Notes</p>
                        <p className="text-sm text-green-700">{request.completion_notes}</p>
                        {request.actual_hours && (
                          <p className="text-xs text-green-600 mt-1">
                            Actual hours: {request.actual_hours}h
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {request.status === "rejected" && request.rejected_reason && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-red-50 border border-red-100 rounded-lg p-4 flex gap-3"
                    >
                      <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">
                        error
                      </span>
                      <div>
                        <p className="text-sm font-bold text-red-800 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-700">{request.rejected_reason}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </StaggeredList>
        )}
      </div>
    </motion.div>
  );
};

export default Index;
