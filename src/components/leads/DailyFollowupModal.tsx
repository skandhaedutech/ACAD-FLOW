"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, AlertCircle, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { getUserRole, getUser } from "@/app/login/actions";

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

type CategorizedLeads = {
  overdue: Lead[];
  today: Lead[];
  upcoming: Lead[];
  pending: Lead[]; // Pending but not fitting others explicitly
};

export function DailyFollowupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<keyof CategorizedLeads>('today');
  const [leads, setLeads] = useState<CategorizedLeads>({
    overdue: [],
    today: [],
    upcoming: [],
    pending: []
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeModal = async () => {
      try {
        const role = await getUserRole();
        if (role !== "Admin" && role !== "Super Admin") {
          setIsLoading(false);
          return;
        }

        const username = await getUser();
        const sessionKey = `followupModalShown_${username}`;
        
        if (sessionStorage.getItem(sessionKey) === 'true') {
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${BACKEND_URL}/server-api/leads`);
        if (res.ok) {
          const allLeads: Lead[] = await res.json();
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const categorized: CategorizedLeads = {
            overdue: [],
            today: [],
            upcoming: [],
            pending: []
          };

          allLeads.forEach(lead => {
            if (lead.followup_status === "Converted" || lead.followup_status === "Not Interested" || lead.followup_status === "Done") {
              return;
            }
            
            const dueDate = getFollowupDueDate(lead.created_date, lead.followup_time || "One Day");
            dueDate.setHours(0, 0, 0, 0);
            const timeDiff = dueDate.getTime() - today.getTime();

            if (lead.followup_status === "Pending" || lead.followup_status === "Call Not Connected") {
               if (timeDiff < 0) {
                  categorized.overdue.push(lead);
               } else if (timeDiff === 0) {
                  categorized.today.push(lead);
               } else {
                  categorized.upcoming.push(lead);
               }
            } else {
               categorized.pending.push(lead);
            }
          });

          setLeads(categorized);
          if (categorized.overdue.length > 0) setActiveTab('overdue');
          
          if (categorized.overdue.length > 0 || categorized.today.length > 0 || categorized.upcoming.length > 0) {
            setIsOpen(true);
            sessionStorage.setItem(sessionKey, 'true');
          }
        }
      } catch (err) {
        console.error("Failed to fetch leads for admin followup modal:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModal();
  }, []);

  if (!isOpen) return null;

  const currentList = leads[activeTab];

  const tabs: { key: keyof CategorizedLeads; label: string; icon: any; count: number; color: string }[] = [
    { key: 'overdue', label: 'Overdue', icon: AlertCircle, count: leads.overdue.length, color: 'text-rose-500 bg-rose-50' },
    { key: 'today', label: 'Today', icon: Clock, count: leads.today.length, color: 'text-amber-500 bg-amber-50' },
    { key: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: leads.upcoming.length, color: 'text-blue-500 bg-blue-50' },
    { key: 'pending', label: 'Other Pending', icon: Calendar, count: leads.pending.length, color: 'text-slate-500 bg-slate-50' }
  ];

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
          className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#0f5a3e] p-6 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black">Admin Follow-up Dashboard</h3>
                <p className="text-emerald-100 text-xs font-semibold mt-0.5">Session Overview of Actionable Leads</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-6 pt-4 border-b border-slate-100 shrink-0 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.key 
                    ? "border-[#0f5a3e] text-[#0f5a3e]" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? "" : "opacity-60"}`} />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tab.color}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* List Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            {currentList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="text-lg font-black text-slate-600">No {activeTab} leads</h4>
                <p className="text-slate-400 text-sm font-medium mt-1">You are all caught up for this category.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                 <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-wider font-black border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-5 py-3.5">Counselor</th>
                      <th className="px-5 py-3.5">Follow-up Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentList.map(lead => {
                      const dueDate = getFollowupDueDate(lead.created_date, lead.followup_time || "One Day");
                      const priority = activeTab === 'overdue' ? 'High' : activeTab === 'today' ? 'Medium' : 'Low';
                      const priorityColor = priority === 'High' ? 'bg-rose-100 text-rose-700' : priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-extrabold text-slate-800">{lead.student_name}</div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{lead.phone_number}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                              {lead.counselor_name || "Unassigned"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-slate-700">
                               {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">{lead.followup_time || "One Day"}</div>
                          </td>
                          <td className="px-5 py-4">
                             <span className="text-xs font-black text-slate-600 border border-slate-200 px-2 py-1 rounded-md">
                               {lead.followup_status}
                             </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${priorityColor}`}>
                              {priority}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
