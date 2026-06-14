"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Phone, CheckCircle2, ChevronRight, User, Clock } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { PremiumSelect } from "@/components/ui/PremiumSelect";

interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  interested_course: string;
  followup_status: string;
  followup_time?: string;
  created_date: string;
  counselor_name: string;
}

const FOLLOWUP_TIMEFRAMES = [
  "One Day",
  "Two Days",
  "Three days",
  "Within a Week",
  "Within a Month",
  "Today",
  "Immediate"
];

const STATUSES = [
  "Pending",
  "Interested",
  "Not Interested",
  "Call Not Connected",
  "Done",
  "Converted"
];

const getFollowupDueDate = (createdDateStr: string, timeframe: string): Date => {
  const date = new Date(createdDateStr);
  if (isNaN(date.getTime())) return new Date();
  
  switch (timeframe) {
    case 'Today':
    case 'Immediate':
      break;
    case 'One Day':
      date.setDate(date.getDate() + 1);
      break;
    case 'Two Days':
      date.setDate(date.getDate() + 2);
      break;
    case 'Three days':
      date.setDate(date.getDate() + 3);
      break;
    case 'Within a Week':
      date.setDate(date.getDate() + 7);
      break;
    case 'Within a Month':
      date.setDate(date.getDate() + 30);
      break;
    default:
      date.setDate(date.getDate() + 1);
      break;
  }
  return date;
};

import { getUser } from "@/app/login/actions";

export function DailyFollowupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [overdueLeads, setOverdueLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>("");

  // Forms state for each lead
  const [followupForms, setFollowupForms] = useState<Record<string, any>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const initializeModal = async () => {
      try {
        const user = await getUser();
        const currentUsername = user || "unknown";
        setUsername(currentUsername);

        const todayDateStr = new Date().toDateString();
        const storageKey = `lastFollowupModalDate_${currentUsername}`;
        const lastShownDate = localStorage.getItem(storageKey);

        // We only pop up once per day per user automatically.
        if (lastShownDate === todayDateStr) {
          setIsLoading(false);
          return; 
        }

        const res = await fetch(`${BACKEND_URL}/api/leads`);
        if (res.ok) {
          const leads: Lead[] = await res.json();
          const today = new Date();
          
          // Find all leads that are pending and due today or overdue
          const pendingOverdue = leads.filter(lead => {
            if (lead.followup_status !== "Pending") return false;
            const dueDate = getFollowupDueDate(lead.created_date, lead.followup_time || "One Day");
            // Set both to midnight for accurate day comparison
            dueDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            return dueDate <= today;
          });

          if (pendingOverdue.length > 0) {
            setOverdueLeads(pendingOverdue);
            
            // Initialize form states
            const initialForms: Record<string, any> = {};
            pendingOverdue.forEach(lead => {
              initialForms[lead.id] = {
                followup_type: "Call",
                status: "Interested", // Default to interested
                remarks: "",
                next_followup_time: "Within a Week"
              };
            });
            setFollowupForms(initialForms);
            
            // Show modal and update local storage
            setIsOpen(true);
            localStorage.setItem(storageKey, todayDateStr);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leads for daily followup:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModal();
  }, []);

  const handleUpdateForm = (leadId: string, field: string, value: string) => {
    setFollowupForms(prev => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        [field]: value
      }
    }));
  };

  const handleSubmitFollowup = async (lead: Lead) => {
    setSubmittingIds(prev => new Set(prev).add(lead.id));
    const form = followupForms[lead.id];
    
    try {
      // 1. Post to follow-up history
      const res = await fetch(`${BACKEND_URL}/api/leads/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          ...form
        })
      });

      if (res.ok) {
        // Remove from the local list
        setOverdueLeads(prev => prev.filter(l => l.id !== lead.id));
        
        // If it's the last one, close the modal automatically after a tiny delay
        if (overdueLeads.length === 1) {
          setTimeout(() => setIsOpen(false), 800);
        }
      }
    } catch (err) {
      console.error("Failed to submit follow-up", err);
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#f8f9fa] rounded-[2.5rem] border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#0f5a3e] to-[#0a3f2b] p-8 text-white shrink-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[50px] rounded-full pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Today's Follow-up Target List</h3>
                <p className="text-emerald-100 text-sm mt-1 font-medium">
                  You have <span className="font-black text-white px-2 py-0.5 bg-white/20 rounded-md mx-1">{overdueLeads.length}</span> students pending follow-up today.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            {overdueLeads.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <h4 className="text-xl font-black text-slate-800">All caught up!</h4>
                <p className="text-slate-500 font-medium">You've cleared out all your daily follow-ups.</p>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="mt-6 px-6 py-3 bg-[#0f5a3e] text-white rounded-xl font-bold hover:bg-[#0a3f2b] transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              overdueLeads.map(lead => {
                const form = followupForms[lead.id];
                const isSubmitting = submittingIds.has(lead.id);
                if (!form) return null;

                return (
                  <div key={lead.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col xl:flex-row gap-6 hover:shadow-md transition-shadow">
                    
                    {/* Left: Lead Info */}
                    <div className="xl:w-1/3 shrink-0 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-base leading-none">{lead.student_name}</h4>
                          <span className="text-xs font-bold text-[#4361ee] mt-1 block">{lead.interested_course}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-2">
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {lead.phone_number}
                        </p>
                        <p className="text-[10px] font-bold text-rose-500 flex items-center gap-2 bg-rose-50 px-2 py-1 rounded border border-rose-100 w-fit">
                          <Clock className="w-3 h-3" />
                          Overdue / Due Today
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick Action Form */}
                    <div className="xl:w-2/3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">What happened on the call?</label>
                        <input
                          type="text"
                          value={form.remarks}
                          onChange={e => handleUpdateForm(lead.id, "remarks", e.target.value)}
                          placeholder="e.g. Student asked to callback after 1 month"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e]"
                        />
                      </div>

                      <div className="space-y-1.5 z-20">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Update</label>
                        <PremiumSelect
                          value={form.status}
                          onChange={(val) => handleUpdateForm(lead.id, "status", val)}
                          options={STATUSES.map(s => ({ label: s, value: s }))}
                        />
                      </div>

                      <div className="space-y-1.5 z-10">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Next Follow-up In</label>
                        <PremiumSelect
                          value={form.next_followup_time}
                          onChange={(val) => handleUpdateForm(lead.id, "next_followup_time", val)}
                          options={FOLLOWUP_TIMEFRAMES.map(t => ({ label: t, value: t }))}
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end mt-2">
                        <button
                          disabled={isSubmitting || !form.remarks.trim()}
                          onClick={() => handleSubmitFollowup(lead)}
                          className="flex items-center gap-2 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isSubmitting ? "Saving..." : "Log & Next"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
