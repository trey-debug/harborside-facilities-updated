import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SuccessCelebration } from "@/components/SuccessCelebration";
import {
  stepVariants,
  staggerContainer,
  staggerItem,
  priorityCardSelected,
  priorityIconBounce,
  rippleEffect,
  submitButtonPulse,
  buttonHover,
  cardAppear,
} from "@/lib/animations";
import { RippleButton } from "@/lib/animations";
import { useFormStepTransition } from "@/lib/animations";

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────

const departments = [
  "Worship", "Events", "Kids", "Admin",
  "Outreach", "Youth", "Facilities", "IT/Tech", "Other",
];

const locations = [
  "Main Sanctuary", "Fellowship Hall", "Youth Room",
  "Kitchen", "Office Wing", "Parking Lot",
  "Exterior Grounds", "Nursery", "Gym", "Other",
];

const priorityOptions = [
  {
    value: "low",
    label: "Low Priority",
    description: "Can wait 5–7 days without issues.",
    response: "Response: 1 week",
    icon: "schedule",
    borderColor: "#06b6d4",
    bgColor: "rgb(236 254 255 / 0.5)",
    textColor: "text-[#06b6d4]",
    iconBg: "bg-cyan-100",
    glowColor: "#06b6d4",
  },
  {
    value: "medium",
    label: "Medium Priority",
    description: "Needs attention within 2–3 days.",
    response: "Response: 48 hours",
    icon: "flag",
    borderColor: "#f97316",
    bgColor: "rgb(255 247 237 / 0.5)",
    textColor: "text-[#f97316]",
    iconBg: "bg-orange-100",
    glowColor: "#f97316",
  },
  {
    value: "high",
    label: "High Priority",
    description: "Safety hazard or critical failure.",
    response: "Response: ASAP",
    icon: "warning",
    borderColor: "#ef4444",
    bgColor: "rgb(254 242 242 / 0.5)",
    textColor: "text-[#ef4444]",
    iconBg: "bg-red-100",
    glowColor: "#ef4444",
  },
];

const steps = [
  { label: "Details",  icon: "assignment"     },
  { label: "Priority", icon: "flag"           },
  { label: "Schedule", icon: "calendar_today" },
  { label: "Review",   icon: "check_circle"   },
];

// ─────────────────────────────────────────────────────────────
// Animated stepper dot
// ─────────────────────────────────────────────────────────────

const StepDot = ({
  step,
  index,
  currentStep,
}: {
  step: { label: string; icon: string };
  index: number;
  currentStep: number;
}) => {
  const isCompleted = index < currentStep;
  const isActive    = index === currentStep;

  return (
    <div className="flex flex-col items-center gap-1.5 relative z-10">
      <motion.div
        animate={
          isActive
            ? { scale: [1, 1.12, 1], transition: { duration: 0.4 } }
            : { scale: 1 }
        }
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          isCompleted
            ? "bg-green-500 text-white shadow-sm"
            : isActive
            ? "bg-primary text-white shadow-md ring-4 ring-primary/20"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
            >
              {/* Draw checkmark via SVG for delight */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <motion.path
                  d="M3 8 L6.5 11.5 L13 5"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35 }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="material-symbols-outlined text-[18px]"
            >
              {step.icon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <span
        className={`text-[11px] font-bold uppercase transition-colors ${
          isCompleted ? "text-green-600" : isActive ? "text-primary" : "text-gray-400"
        }`}
      >
        {step.label}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Priority card
// ─────────────────────────────────────────────────────────────

interface PriorityCardProps {
  opt: (typeof priorityOptions)[number];
  selected: boolean;
  onSelect: (value: string) => void;
}

const PriorityCard = ({ opt, selected, onSelect }: PriorityCardProps) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [iconAnimate, setIconAnimate] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selected) return;

    // Ripple from click point
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const id = Date.now();
      setRipples((prev) => [
        ...prev,
        { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
      ]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
    }

    setIconAnimate(true);
    setTimeout(() => setIconAnimate(false), 600);
    onSelect(opt.value);
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={handleClick}
      animate={selected ? "animate" : "initial"}
      variants={priorityCardSelected}
      whileHover={selected ? {} : { y: -3, boxShadow: "0 8px 20px rgba(0,0,0,0.10)" }}
      whileTap={{ scale: 0.97 }}
      className="relative h-full flex flex-col p-5 bg-white border-2 rounded-xl cursor-pointer overflow-hidden transition-colors select-none"
      style={
        selected
          ? { borderColor: opt.borderColor, backgroundColor: opt.bgColor }
          : { borderColor: "#E5E7EB" }
      }
    >
      {/* Click ripples */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            variants={rippleEffect}
            initial="initial"
            animate="animate"
            style={{
              position: "absolute",
              left: r.x - 30,
              top: r.y - 30,
              width: 60,
              height: 60,
              borderRadius: "50%",
              backgroundColor: `${opt.borderColor}44`,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Selected checkmark badge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-sm z-10"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <motion.path
                d="M3 8 L6.5 11.5 L13 5"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35 }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Urgent badge for high */}
      {opt.value === "high" && (
        <div className="absolute top-0 right-0 bg-[#ef4444] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg rounded-tr-xl">
          URGENT
        </div>
      )}

      {/* Icon */}
      <motion.div
        animate={iconAnimate ? "animate" : "initial"}
        variants={priorityIconBounce}
        className={`w-11 h-11 rounded-full ${opt.iconBg} ${opt.textColor} flex items-center justify-center mb-3`}
      >
        <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
      </motion.div>

      <h3 className="text-base font-bold text-gray-900 mb-1">{opt.label}</h3>
      <p className="text-sm text-gray-500 mb-3 flex-grow">{opt.description}</p>
      <span className={`text-xs font-bold ${opt.textColor} uppercase`}>
        {opt.response}
      </span>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export const WorkRequestForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { direction, setDirection } = useFormStepTransition();
  const submitControls = useAnimation();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workOrderId, setWorkOrderId] = useState("");
  const [descCharCount, setDescCharCount] = useState(0);

  // Field-level shake refs
  const titleControls    = useAnimation();
  const locControls      = useAnimation();
  const deptControls     = useAnimation();
  const descControls     = useAnimation();
  const dateControls     = useAnimation();
  const nameControls     = useAnimation();
  const emailControls    = useAnimation();

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    department: "",
    description: "",
    priority: "medium",
    requestedDate: "",
    name: "",
    email: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "description") setDescCharCount(value.length);
  };

  const shake = (controls: ReturnType<typeof useAnimation>) =>
    controls.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.4 } });

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!(formData.title && formData.location && formData.department && formData.description);
      case 1:
        return !!formData.priority;
      case 2:
        return !!(formData.requestedDate && formData.name && formData.email);
      default:
        return true;
    }
  };

  const handleNext = () => {
    // Shake empty required fields for step 0
    if (currentStep === 0) {
      if (!formData.title)       shake(titleControls);
      if (!formData.location)    shake(locControls);
      if (!formData.department)  shake(deptControls);
      if (!formData.description) shake(descControls);
    }
    if (currentStep === 2) {
      if (!formData.requestedDate) shake(dateControls);
      if (!formData.name)          shake(nameControls);
      if (!formData.email)         shake(emailControls);
    }
    if (!canGoNext()) return;

    setDirection("forward");
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    setDirection("backward");
    setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    submitControls.start("loading");

    try {
      const { data, error } = await supabase
        .from("work_requests")
        .insert({
          requestor_name:  formData.name,
          requestor_email: formData.email,
          location:        formData.location,
          department:      formData.department.toLowerCase(),
          title:           formData.title,
          description:     formData.description,
          priority:        formData.priority as "low" | "medium" | "high" | "emergency",
          requested_date:  formData.requestedDate,
          category:        "General",
        })
        .select("work_order_id")
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit work request. Please try again.",
          variant: "destructive",
        });
        submitControls.start("idle");
        return;
      }

      setWorkOrderId(data?.work_order_id || "");
      setIsSubmitted(true);
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
      submitControls.start("idle");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success celebration screen ──────────────────────────────
  if (isSubmitted) {
    return (
      <SuccessCelebration
        workOrderId={workOrderId}
        requestorEmail={formData.email}
        onViewStatus={() => navigate("/")}
        onSubmitAnother={() => {
          setIsSubmitted(false);
          setCurrentStep(0);
          setFormData({
            title: "", location: "", department: "", description: "",
            priority: "medium", requestedDate: "", name: "", email: "",
          });
          setDescCharCount(0);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Form
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-[#ebf2fe] to-[#f5f7f8] py-8 px-4">
      <div className="w-full max-w-[700px] mx-auto">
        <motion.div
          variants={cardAppear}
          initial="initial"
          animate="animate"
          className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-6 md:p-10 shadow-xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mx-auto bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-primary"
            >
              <span className="material-symbols-outlined text-3xl">content_paste</span>
            </motion.div>
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">
              Submit Work Request
            </h1>
            <p className="text-gray-500 text-sm text-center">
              Fill out the form to request facilities maintenance or repairs.
            </p>
          </div>

          {/* ── Animated stepper ── */}
          <div className="flex items-center justify-between mb-10 relative px-2">
            {/* Background line */}
            <div className="absolute left-0 top-4 w-full h-[2px] bg-gray-200 -z-0" />

            {/* Progress fill */}
            <motion.div
              className="absolute left-0 top-4 h-[2px] bg-primary -z-0"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />

            {steps.map((step, i) => (
              <StepDot key={step.label} step={step} index={i} currentStep={currentStep} />
            ))}
          </div>

          {/* ── Step content (direction-aware transitions) ── */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* ── Step 0: Details ── */}
              {currentStep === 0 && (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="flex flex-col gap-5"
                >
                  {/* Title */}
                  <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
                    <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                      Request Title *
                    </label>
                    <motion.div animate={titleControls}>
                      <Input
                        placeholder="e.g. Broken AC Unit in Sanctuary"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        className="rounded-lg border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Location + Department */}
                  <motion.div
                    variants={staggerItem}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                        Location / Room *
                      </label>
                      <motion.div animate={locControls} className="relative">
                        <select
                          value={formData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary pr-10"
                        >
                          <option value="">Select location</option>
                          {locations.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          expand_more
                        </span>
                      </motion.div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                        Department *
                      </label>
                      <motion.div animate={deptControls} className="relative">
                        <select
                          value={formData.department}
                          onChange={(e) => handleInputChange("department", e.target.value)}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary pr-10"
                        >
                          <option value="">Select department</option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          expand_more
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Description */}
                  <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
                    <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                      Description *
                    </label>
                    <motion.div animate={descControls}>
                      <Textarea
                        placeholder="Describe the issue or work needed in detail..."
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={4}
                        maxLength={500}
                        className="rounded-lg border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      />
                    </motion.div>
                    <div className="flex justify-end">
                      <motion.span
                        animate={{ color: descCharCount > 450 ? "#ef4444" : "#9CA3AF" }}
                        className="text-xs"
                      >
                        {descCharCount}/500
                      </motion.span>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* ── Step 1: Priority ── */}
              {currentStep === 1 && (
                <div className="flex flex-col gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Select Priority Level
                    </h3>
                    <p className="text-sm text-gray-500">
                      Choose the urgency level for your request.
                    </p>
                  </motion.div>

                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {priorityOptions.map((opt) => (
                      <motion.div key={opt.value} variants={staggerItem} className="h-full">
                        <PriorityCard
                          opt={opt}
                          selected={formData.priority === opt.value}
                          onSelect={(val) => handleInputChange("priority", val)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* ── Step 2: Schedule & Contact ── */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Scheduling */}
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col gap-5"
                  >
                    <motion.h3
                      variants={staggerItem}
                      className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2"
                    >
                      <span className="material-symbols-outlined text-primary">schedule</span>
                      Scheduling
                    </motion.h3>

                    <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
                      <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                        Requested Date *
                      </label>
                      <motion.div animate={dateControls} className="relative group">
                        <input
                          type="date"
                          value={formData.requestedDate}
                          min={format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) => handleInputChange("requestedDate", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-4 py-3 pl-11 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary text-[20px] transition-colors">
                          calendar_today
                        </span>
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Contact */}
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col gap-5"
                  >
                    <motion.h3
                      variants={staggerItem}
                      className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2"
                    >
                      <span className="material-symbols-outlined text-primary">person</span>
                      Contact Info
                    </motion.h3>

                    <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
                      <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                        Full Name *
                      </label>
                      <motion.div animate={nameControls}>
                        <Input
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="rounded-lg border-gray-200 px-4 py-3"
                        />
                      </motion.div>
                    </motion.div>

                    <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
                      <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">
                        Email Address *
                      </label>
                      <motion.div animate={emailControls}>
                        <Input
                          type="email"
                          placeholder="your.email@church.org"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="rounded-lg border-gray-200 px-4 py-3"
                        />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </div>
              )}

              {/* ── Step 3: Review ── */}
              {currentStep === 3 && (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="flex flex-col gap-5"
                >
                  {/* Request details */}
                  <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">assignment</span>
                        Request Details
                      </h3>
                      <button
                        onClick={() => { setDirection("backward"); setCurrentStep(0); }}
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                      </button>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{formData.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed mt-1">{formData.description}</p>
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-gray-400 text-[18px]">location_on</span>
                        {formData.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-gray-400 text-[18px]">business</span>
                        {formData.department}
                      </span>
                    </div>
                  </motion.div>

                  {/* Priority */}
                  <motion.div
                    variants={staggerItem}
                    className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4`}
                    style={{
                      borderLeftColor:
                        formData.priority === "high"
                          ? "#ef4444"
                          : formData.priority === "medium"
                          ? "#f97316"
                          : "#06b6d4",
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Priority Level
                      </h3>
                      <button
                        onClick={() => { setDirection("backward"); setCurrentStep(1); }}
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          formData.priority === "high"
                            ? "bg-red-50"
                            : formData.priority === "medium"
                            ? "bg-orange-50"
                            : "bg-cyan-50"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-3xl ${
                            formData.priority === "high"
                              ? "text-[#ef4444]"
                              : formData.priority === "medium"
                              ? "text-[#f97316]"
                              : "text-[#06b6d4]"
                          }`}
                        >
                          {formData.priority === "high"
                            ? "warning"
                            : formData.priority === "medium"
                            ? "flag"
                            : "schedule"}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900 capitalize">
                          {formData.priority} Priority
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formData.priority === "high"
                            ? "Response: ASAP"
                            : formData.priority === "medium"
                            ? "Estimated response: 24–48 Hours"
                            : "Estimated response: 1 Week"}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Schedule & contact */}
                  <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        Schedule & Contact
                      </h3>
                      <button
                        onClick={() => { setDirection("backward"); setCurrentStep(2); }}
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs font-semibold mb-0.5">Requested Date</p>
                        <p className="text-gray-900 font-semibold">
                          {formData.requestedDate
                            ? format(new Date(formData.requestedDate + "T12:00:00"), "PPP")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-semibold mb-0.5">Contact Name</p>
                        <p className="text-gray-900 font-semibold">{formData.name}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-400 text-xs font-semibold mb-0.5">Email</p>
                        <p className="text-gray-900 font-semibold">{formData.email}</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Navigation buttons ── */}
          <div className="flex justify-between items-center gap-4 mt-8">
            {/* Back / Home */}
            {currentStep > 0 ? (
              <RippleButton
                onClick={handleBack}
                rippleColor="rgba(107,114,128,0.2)"
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
              </RippleButton>
            ) : (
              <RippleButton
                onClick={() => navigate("/")}
                rippleColor="rgba(107,114,128,0.2)"
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Home
              </RippleButton>
            )}

            {/* Next / Submit */}
            {currentStep < 3 ? (
              <RippleButton
                onClick={handleNext}
                rippleColor="rgba(255,255,255,0.35)"
                className="flex items-center gap-2 px-7 py-3 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentStep === 0
                  ? "Next: Set Priority"
                  : currentStep === 1
                  ? "Next: Schedule"
                  : "Next: Review"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </RippleButton>
            ) : (
              /* Submit with pulse glow */
              <motion.div
                variants={submitButtonPulse}
                animate={isLoading ? "loading" : "idle"}
                className="rounded-lg"
              >
                <motion.div
                  variants={buttonHover}
                  initial="rest"
                  whileHover={isLoading ? {} : "hover"}
                  whileTap={isLoading ? {} : "tap"}
                >
                  <RippleButton
                    onClick={handleSubmit}
                    disabled={isLoading}
                    rippleColor="rgba(255,255,255,0.35)"
                    className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-primary/90 transition-all disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Request
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </>
                    )}
                  </RippleButton>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
