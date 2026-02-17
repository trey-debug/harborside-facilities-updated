import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const departments = [
  "Worship", "Events", "Kids", "Admin",
  "Outreach", "Youth", "Facilities", "IT/Tech", "Other"
];

const locations = [
  "Main Sanctuary", "Fellowship Hall", "Youth Room",
  "Kitchen", "Office Wing", "Parking Lot",
  "Exterior Grounds", "Nursery", "Gym", "Other"
];

const priorityOptions = [
  {
    value: "low",
    label: "Low Priority",
    description: "Can wait 5–7 days without issues.",
    response: "Response: 1 week",
    icon: "schedule",
    color: "cyan",
    bgChecked: "bg-cyan-50",
    borderChecked: "border-[#06b6d4]",
    textColor: "text-[#06b6d4]",
    iconBg: "bg-cyan-100",
  },
  {
    value: "medium",
    label: "Medium Priority",
    description: "Needs attention within 2–3 days.",
    response: "Response: 48 hours",
    icon: "flag",
    color: "orange",
    bgChecked: "bg-orange-50/50",
    borderChecked: "border-[#f97316]",
    textColor: "text-[#f97316]",
    iconBg: "bg-orange-100",
  },
  {
    value: "high",
    label: "High Priority",
    description: "Safety hazard or critical failure.",
    response: "Response: ASAP",
    icon: "warning",
    color: "red",
    bgChecked: "bg-red-50",
    borderChecked: "border-[#ef4444]",
    textColor: "text-[#ef4444]",
    iconBg: "bg-red-100",
  },
];

const steps = [
  { label: "Details", icon: "assignment" },
  { label: "Priority", icon: "flag" },
  { label: "Schedule", icon: "calendar_today" },
  { label: "Review", icon: "check_circle" },
];

export const WorkRequestForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workOrderId, setWorkOrderId] = useState("");
  const [descCharCount, setDescCharCount] = useState(0);

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

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return formData.title && formData.location && formData.department && formData.description;
      case 1:
        return formData.priority;
      case 2:
        return formData.requestedDate && formData.name && formData.email;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("work_requests")
        .insert({
          requestor_name: formData.name,
          requestor_email: formData.email,
          location: formData.location,
          department: formData.department.toLowerCase(),
          title: formData.title,
          description: formData.description,
          priority: formData.priority as "low" | "medium" | "high" | "emergency",
          requested_date: formData.requestedDate,
          category: "General",
        })
        .select("work_order_id")
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to submit work request. Please try again.", variant: "destructive" });
        return;
      }

      setWorkOrderId(data?.work_order_id || "");
      setIsSubmitted(true);
      toast({ title: "Success", description: `Work request submitted! ID: ${data?.work_order_id}` });
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#f5f7f8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Request Submitted!</h2>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 mb-4">
            <p className="text-sm font-semibold text-green-700 mb-1">Your Work Order ID:</p>
            <p className="text-2xl font-extrabold text-green-700 font-mono">{workOrderId}</p>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Our facilities team will review your request shortly. Save your work order ID to check status later.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px] align-middle mr-1">arrow_back</span>
              Back to Home
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setCurrentStep(0);
                setFormData({ title: "", location: "", department: "", description: "", priority: "medium", requestedDate: "", name: "", email: "" });
                setDescCharCount(0);
              }}
              className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-blue-500/20"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-[#ebf2fe] to-[#f5f7f8] py-8 px-4">
      <div className="w-full max-w-[700px] mx-auto">
        {/* Glass card */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-6 md:p-10 shadow-xl">
          {/* Header icon */}
          <div className="mx-auto bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-primary">
            <span className="material-symbols-outlined text-3xl">content_paste</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Submit Work Request</h1>
          <p className="text-gray-500 text-sm text-center mb-8">Fill out the form to request facilities maintenance or repairs.</p>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-10 relative px-2">
            <div className="absolute left-0 top-4 w-full h-[2px] bg-gray-200 -z-0" />
            {steps.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-1.5 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < currentStep
                      ? "bg-green-500 text-white shadow-sm"
                      : i === currentStep
                      ? "bg-primary text-white shadow-md ring-4 ring-primary/20"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < currentStep ? (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                  )}
                </div>
                <span className={`text-[11px] font-bold uppercase ${
                  i < currentStep ? "text-green-600" : i === currentStep ? "text-primary" : "text-gray-400"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: Details */}
          {currentStep === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Request Title *</label>
                <Input
                  placeholder="e.g. Broken AC Unit in Sanctuary"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="rounded-lg border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Location / Room *</label>
                  <div className="relative">
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
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Department *</label>
                  <div className="relative">
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
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Description *</label>
                <Textarea
                  placeholder="Describe the issue or work needed in detail..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="rounded-lg border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="text-xs text-gray-400 text-right">{descCharCount}/500 characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Priority */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Select Priority Level</h3>
                <p className="text-sm text-gray-500">Choose the urgency level for your request.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {priorityOptions.map((opt) => (
                  <label key={opt.value} className="relative group cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={opt.value}
                      checked={formData.priority === opt.value}
                      onChange={() => handleInputChange("priority", opt.value)}
                      className="peer sr-only"
                    />
                    <div className={`h-full flex flex-col p-5 bg-white border-2 border-gray-200 rounded-xl transition-all
                      peer-checked:${opt.borderChecked} peer-checked:${opt.bgChecked} peer-checked:shadow-md
                      hover:border-gray-300`}
                      style={formData.priority === opt.value ? {
                        borderColor: opt.value === "low" ? "#06b6d4" : opt.value === "medium" ? "#f97316" : "#ef4444",
                        backgroundColor: opt.value === "low" ? "rgb(236 254 255 / 0.5)" : opt.value === "medium" ? "rgb(255 247 237 / 0.5)" : "rgb(254 242 242 / 0.5)",
                      } : {}}
                    >
                      {formData.priority === opt.value && (
                        <div className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-white text-[16px]">check</span>
                        </div>
                      )}
                      {opt.value === "high" && (
                        <div className="absolute top-0 right-0 bg-[#ef4444] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg rounded-tr-xl">
                          URGENT
                        </div>
                      )}
                      <div className={`w-11 h-11 rounded-full ${opt.iconBg} ${opt.textColor} flex items-center justify-center mb-3`}>
                        <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{opt.label}</h3>
                      <p className="text-sm text-gray-500 mb-3 flex-grow">{opt.description}</p>
                      <span className={`text-xs font-bold ${opt.textColor} uppercase`}>{opt.response}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Schedule & Contact */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="material-symbols-outlined text-primary">schedule</span> Scheduling
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Requested Date *</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={formData.requestedDate}
                      min={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => handleInputChange("requestedDate", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 pl-11 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary text-[20px]">
                      calendar_today
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="material-symbols-outlined text-primary">person</span> Contact Info
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Full Name *</label>
                  <Input
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="rounded-lg border-gray-200 px-4 py-3"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-900 text-sm font-bold uppercase tracking-wider">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="your.email@church.org"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="rounded-lg border-gray-200 px-4 py-3"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-5">
              {/* Request Details Card */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">assignment</span> Request Details
                  </h3>
                  <button onClick={() => setCurrentStep(0)} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
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
              </div>

              {/* Priority Card */}
              <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 ${
                formData.priority === "high" ? "border-l-[#ef4444]" : formData.priority === "medium" ? "border-l-[#f97316]" : "border-l-[#06b6d4]"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Priority Level</h3>
                  <button onClick={() => setCurrentStep(1)} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    formData.priority === "high" ? "bg-red-50" : formData.priority === "medium" ? "bg-orange-50" : "bg-cyan-50"
                  }`}>
                    <span className={`material-symbols-outlined text-3xl ${
                      formData.priority === "high" ? "text-[#ef4444]" : formData.priority === "medium" ? "text-[#f97316]" : "text-[#06b6d4]"
                    }`}>
                      {formData.priority === "high" ? "warning" : formData.priority === "medium" ? "flag" : "schedule"}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 capitalize">{formData.priority} Priority</p>
                    <p className="text-gray-500 text-xs">
                      {formData.priority === "high" ? "Response: ASAP" : formData.priority === "medium" ? "Estimated response: 24–48 Hours" : "Estimated response: 1 Week"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule & Contact Card */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span> Schedule & Contact
                  </h3>
                  <button onClick={() => setCurrentStep(2)} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs font-semibold mb-0.5">Requested Date</p>
                    <p className="text-gray-900 font-semibold">{formData.requestedDate ? format(new Date(formData.requestedDate + "T12:00:00"), "PPP") : "—"}</p>
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
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center gap-4 mt-8">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Home
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={() => canGoNext() && setCurrentStep((s) => s + 1)}
                disabled={!canGoNext()}
                className="flex items-center gap-2 px-7 py-3 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentStep === 0 ? "Next: Set Priority" : currentStep === 1 ? "Next: Schedule" : "Next: Review"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
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
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
