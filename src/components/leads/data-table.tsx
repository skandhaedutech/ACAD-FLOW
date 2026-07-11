"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { 
  RefreshCw, MoreHorizontal, Search, GraduationCap, Plus, Edit, Trash2, 
  History, Calendar, FileSpreadsheet, Upload, Download, X, User, 
  MapPin, Phone, Mail, FileText, CheckCircle2, ChevronRight, Award, 
  Briefcase, Activity, Clock, MessageCircle
} from "lucide-react";
import { WhatsAppModal } from "./WhatsAppModal";
import { StatusDropdown } from "../ui/status-dropdown";
import Link from "next/link";
import { BACKEND_URL } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";

interface Lead {
  id: string;
  student_id: string;
  student_name: string;
  phone_number: string;
  email?: string;
  interested_course: string;
  lead_source: string;
  counselor_name: string;
  counselor_id?: string;
  followup_status: string;
  followup_time?: string;
  admission_status: string;
  fees: number;
  lead_score: number;
  created_date: string;
  gender?: string;
  city?: string;
  fees_discussed?: number;
  remarks?: string;
  referred_by_student_name?: string;
}

interface Counselor {
  id: string;
  name: string;
  email: string;
}

interface TimelineEvent {
  id: string;
  type: 'followup' | 'audit' | 'admission';
  date: string;
  title: string;
  description: string;
  status?: string;
}

const COURSES = [
  "Full Stack Development",
  "Data Science & AI",
  "Cyber Security",
  "AWS Cloud Computing & DevOps",
  "UI/UX Design",
  "Mobile App Development",
  "Python Programming",
  "Software Testing"
];

const SOURCES = [
  "Direct Walk-in",
  "Website Enquiry",
  "Instagram Campaigns",
  "Facebook Ads",
  "Google Maps",
  "Student Referral",
  "Educational Seminar"
];

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
  "Done",
  "Interested",
  "Not Interested",
  "Call Not Connected",
  "Converted"
];

export function LeadsDataTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [dbCourses, setDbCourses] = useState<string[]>([]);
  const activeCourses = Array.from(new Set(dbCourses.length > 0 ? dbCourses : COURSES));
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Custom Filtering States
  const [courseFilter, setCourseFilter] = useState("all");
  const [counselorFilter, setCounselorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  
  // Selected Record States
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Custom professional dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'info' | 'success';
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: 'danger'
  });

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'info'
  });


  // Double scrollbar synchronization refs and states
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingTop = React.useRef(false);
  const isScrollingBottom = React.useRef(false);
  const [tableWidth, setTableWidth] = React.useState(0);
  const [showScrollbar, setShowScrollbar] = React.useState(false);

  const handleTopScroll = () => {
    if (isScrollingBottom.current) {
      isScrollingBottom.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isScrollingTop.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (isScrollingTop.current) {
      isScrollingTop.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isScrollingBottom.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  React.useEffect(() => {
    const updateWidth = () => {
      if (bottomScrollRef.current) {
        const scrollWidth = bottomScrollRef.current.scrollWidth;
        const clientWidth = bottomScrollRef.current.clientWidth;
        setTableWidth(scrollWidth);
        setShowScrollbar(scrollWidth > clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const observer = new MutationObserver(updateWidth);
    if (bottomScrollRef.current) {
      observer.observe(bottomScrollRef.current, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      observer.disconnect();
    };
  }, [leads, isLoading]);


  // Form Inputs State (Add / Edit)
  const [formInputs, setFormInputs] = useState({
    student_id: "",
    student_name: "",
    phone_number: "",
    email: "",
    interested_course: activeCourses[0] || COURSES[0],
    lead_source: SOURCES[0],
    counselor_id: "",
    followup_status: "Pending",
    followup_time: "One Day",
    gender: "Male",
    city: "",
    fees_discussed: "",
    remarks: "",
    referred_by_student_name: ""
  });

  // Follow-up Form State
  const [followupForm, setFollowupForm] = useState({
    followup_type: "Call",
    status: "Completed",
    remarks: "",
    next_followup_time: "One Day"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isLeadOverdue = (lead: Lead): boolean => {
    if (lead.followup_status !== 'Pending') return false;
    const dueDate = getFollowupDueDate(lead.created_date, lead.followup_time || 'One Day');
    return new Date() > dueDate;
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounselors = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/counselors`);
      if (res.ok) {
        const data = await res.json();
        setCounselors(data);
      }
    } catch (error) {
      console.error("Failed to fetch counselors:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/courses`);
      if (res.ok) {
        const data = await res.json();
        const courseNames = data.map((c: any) => c.title);
        setDbCourses(courseNames);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const fetchTimeline = async (leadId: string) => {
    setIsTimelineLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads/${leadId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlFilter = params.get("filter");
      if (urlFilter && ["all", "active", "pending", "converted", "lost"].includes(urlFilter)) {
        setActiveFilter(urlFilter);
      }
    }
    fetchLeads();
    fetchCounselors();
    fetchCourses();

    // 🔗 Supabase Realtime Synchronization Channel
    const leadsChannel = supabase
      .channel('public:leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('[SupabaseRealtime] Lead table change detected:', payload);
          fetchLeads();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        (payload) => {
          console.log('[SupabaseRealtime] Courses table change detected:', payload);
          fetchCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${BACKEND_URL}/server-api/sync-sheet`, { method: "POST" });
      await fetchLeads();
    } catch (error) {
      console.error("Manual sync failed", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  // Status changes directly inline
  const handleStatusChange = async (phoneNumber: string, type: 'followup' | 'admission' | 'followup_time', value: string) => {
    const lead = leads.find(l => l.phone_number === phoneNumber);
    if (!lead) return;

    // Optimistic UI updates
    setLeads((prev) => 
      prev.map((l) => 
        l.phone_number === phoneNumber 
          ? { 
              ...l, 
              followup_status: type === 'followup' ? value : l.followup_status, 
              admission_status: type === 'admission' ? value : l.admission_status,
              followup_time: type === 'followup_time' ? value : l.followup_time
            }
          : l
      )
    );

    const payload = {
      phone_number: phoneNumber,
      followup_status: type === 'followup' ? value : lead.followup_status,
      admission_status: type === 'admission' ? value : lead.admission_status,
      followup_time: type === 'followup_time' ? value : (lead.followup_time || 'One Day'),
    };

    try {
      const res = await fetch(`${BACKEND_URL}/server-api/update-lead`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch (error) {
      console.error("Failed to update status", error);
      fetchLeads();
    }
  };

  const handleCounselorChange = async (leadId: string, counselorId: string) => {
    // Optimistic UI updates
    setLeads((prev) => 
      prev.map((l) => 
        l.id === leadId 
          ? { 
              ...l, 
              counselor_id: counselorId || undefined,
              counselor_name: counselors.find(c => c.id === counselorId)?.name || 'Unassigned'
            }
          : l
      )
    );

    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counselor_id: counselorId || null }),
      });
      if (!res.ok) throw new Error("Failed to assign counselor");
    } catch (error) {
      console.error("Failed to update counselor", error);
      fetchLeads();
    }
  };

  // Add Lead Action
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInputs)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchLeads();
        resetForm();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAlertDialog({
          isOpen: true,
          title: "Failed to Save Lead",
          message: errorData.error || `Server responded with status ${res.status}`,
          type: "error"
        });
      }
    } catch (error: any) {
      console.error("Failed to add lead", error);
      setAlertDialog({
        isOpen: true,
        title: "Failed to Save Lead",
        message: `Network Error: ${error?.message || error}. Please ensure the backend is active. URL: ${BACKEND_URL}/server-api/leads`,
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Edit Lead Action
  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInputs)
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchLeads();
        setSelectedLead(null);
        resetForm();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAlertDialog({
          isOpen: true,
          title: "Failed to Update Lead",
          message: errorData.error || `Server responded with status ${res.status}`,
          type: "error"
        });
      }
    } catch (error: any) {
      console.error("Failed to update lead", error);
      setAlertDialog({
        isOpen: true,
        title: "Failed to Update Lead",
        message: "Could not connect to the backend server. Please verify your API configurations and make sure the backend is active.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  // Soft Delete Action
  const handleDeleteLead = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Lead Profile",
      message: "Are you sure you want to remove this lead? Soft delete will archive it in the database and remove it from the active pipeline.",
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/server-api/leads/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            fetchLeads();
          }
        } catch (error) {
          console.error("Failed to delete lead", error);
        }
      }
    });
  };


  // Log Follow-up Action
  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          ...followupForm
        })
      });
      if (res.ok) {
        setIsFollowupModalOpen(false);
        fetchLeads();
        setFollowupForm({
          followup_type: "Call",
          status: "Completed",
          remarks: "",
          next_followup_time: "One Day"
        });
      }
    } catch (error) {
      console.error("Failed to add follow-up", error);
    }
  };

  const resetForm = () => {
    setFormInputs({
      student_id: "",
      student_name: "",
      phone_number: "",
      email: "",
      interested_course: activeCourses[0] || COURSES[0],
      lead_source: SOURCES[0],
      counselor_id: "",
      followup_status: "Pending",
      followup_time: "One Day",
      gender: "Male",
      city: "",
      fees_discussed: "",
      remarks: "",
      referred_by_student_name: ""
    });
  };

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setFormInputs({
      student_id: lead.student_id || "",
      student_name: lead.student_name,
      phone_number: lead.phone_number,
      email: lead.email || "",
      interested_course: lead.interested_course || activeCourses[0] || COURSES[0],
      lead_source: lead.lead_source || SOURCES[0],
      counselor_id: lead.counselor_id || "",
      followup_status: lead.followup_status,
      followup_time: lead.followup_time || "One Day",
      gender: lead.gender || "Male",
      city: lead.city || "",
      fees_discussed: lead.fees_discussed ? String(lead.fees_discussed) : "",
      remarks: lead.remarks || "",
      referred_by_student_name: lead.referred_by_student_name || ""
    });
    setIsEditModalOpen(true);
  };

  const openFollowupModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFollowupModalOpen(true);
  };

  const openTimelineModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsTimelineModalOpen(true);
    fetchTimeline(lead.id);
  };

  const openWhatsAppModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsWhatsAppModalOpen(true);
  };

  // Client-Side CSV Export Utility
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    
    const headers = [
      "Student ID", "Student Name", "Phone Number", "Email", "Interested Course", 
      "Source", "Counselor Name", "Status", "Follow-up Time", 
      "Admission Status", "Fees Discussed", "Gender", "City", "Remarks", "Date Added"
    ];

    const rows = filteredLeads.map(lead => [
      `"${lead.student_id || ''}"`,
      `"${lead.student_name.replace(/"/g, '""')}"`,
      `"${lead.phone_number}"`,
      `"${lead.email || ''}"`,
      `"${lead.interested_course || ''}"`,
      `"${lead.lead_source || ''}"`,
      `"${lead.counselor_name || 'Unassigned'}"`,
      `"${lead.followup_status}"`,
      `"${lead.followup_time || 'One Day'}"`,
      `"${lead.admission_status}"`,
      lead.fees_discussed || 0,
      `"${lead.gender || ''}"`,
      `"${lead.city || ''}"`,
      `"${(lead.remarks || '').replace(/"/g, '""')}"`,
      `"${lead.created_date}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `acadflow_leads_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-Side CSV Import parsing and API pushing
  const handleCSVImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setIsLoading(false);
      setAlertDialog({
        isOpen: true,
        title: "File Access Error",
        message: "The requested CSV file could not be read, typically due to filesystem permissions or the file being locked by another application.",
        type: "error"
      });
    };
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(line => line.trim()).filter(line => line !== "");
        if (lines.length <= 1) return;

        // Skip headers
        const headers = lines[0].split(",").map(h => h.replace(/^["']|["']$/g, '').trim());
        
        let importCount = 0;
        for (let i = 1; i < lines.length; i++) {
          // Splitting CSV respecting quotes
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 2) continue;

          const values = matches.map(val => val.replace(/^["']|["']$/g, '').trim());
          
          const student_name = values[0];
          const phone_number = values[1];
          const email = values[2] || "";
          const interested_course = values[3] || activeCourses[0] || COURSES[0];
          const lead_source = values[4] || SOURCES[0];
          const counselor_name = values[5] || "";
          const followup_status = values[6] || "Pending";
          const followup_time = values[7] || "One Day";
          const fees_discussed = values[8] ? parseFloat(values[8]) : 0;
          const gender = values[9] || "Male";
          const city = values[10] || "";
          const remarks = values[11] || "";

          // Match Counselor ID from name
          const counselorObj = counselors.find(c => c.name.toLowerCase() === counselor_name.toLowerCase());

          const newLead = {
            student_name,
            phone_number,
            email,
            interested_course,
            lead_source,
            counselor_id: counselorObj?.id || null,
            followup_status,
            followup_time,
            gender,
            city,
            fees_discussed,
            remarks,
            referred_by_student_name: ""
          };

          // Post to database directly
          await fetch(`${BACKEND_URL}/server-api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newLead)
          });
          importCount++;
        }

        setAlertDialog({
          isOpen: true,
          title: "CSV Import Success",
          message: `Successfully imported ${importCount} leads into the database. The table has been re-synchronized.`,
          type: "success"
        });
        fetchLeads();
      } catch (err) {
        console.error("Failed to parse CSV file", err);
        setAlertDialog({
          isOpen: true,
          title: "CSV Import Failed",
          message: "Could not parse the CSV file. Please ensure it has valid headers and structure (Student Name, Phone Number, etc.).",
          type: "error"
        });
      } finally {
        setIsLoading(false);
      }

    };
    reader.readAsText(file);
    e.target.value = ""; // clear input
  };

  const filteredLeads = leads.filter((lead) => {
    if (lead.phone_number && lead.phone_number.includes('/')) return false;
    if (lead.student_name === 'March' || lead.student_name === 'April' || lead.student_name === 'Apr') return false;

    // Search Query Matches
    const matchesSearch = 
      lead.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone_number?.includes(searchQuery) ||
      lead.interested_course?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Left Tab Filters
    if (activeFilter === "active") {
      if (lead.followup_status === "Converted" || lead.followup_status === "Not Interested") return false;
    } else if (activeFilter === "converted") {
      if (lead.followup_status !== "Converted" && lead.admission_status !== "Admitted") return false;
    } else if (activeFilter === "pending") {
      if (lead.followup_status !== "Pending" || lead.admission_status === "Admitted") return false;
    } else if (activeFilter === "lost") {
      if (lead.followup_status !== "Not Interested") return false;
    }

    // Advanced Select Filters
    if (courseFilter !== "all" && lead.interested_course !== courseFilter) return false;
    if (counselorFilter !== "all" && lead.counselor_name !== counselorFilter) return false;
    if (statusFilter !== "all" && lead.followup_status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* 🚀 Sleek Glassmorphic Table Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Acadflow</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Multi-Tenant • Branch isolated • Real-time Supabase sync</p>
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-1.5 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-[#0f5a3e]/10 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/60 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-70 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sheets Backup Sync</span>
              </button>
            </div>
         </div>

         {/* Search & Bulk Utilities */}
         <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <div className="relative w-[180px] sm:w-[220px] shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leads name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] focus:border-transparent text-slate-800 shadow-sm"
              />
            </div>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleCSVFileChange} 
              className="hidden" 
            />

            <button
              onClick={handleCSVImportClick}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Import leads from CSV file"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" /> Import CSV
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Export leads to CSV file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </button>
         </div>
      </div>

      {/* 🔍 Advanced Filter Panel */}
      <div className="bg-white/80 p-4 rounded-2xl border border-slate-100/70 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Tab Filters */}
        <div className="flex gap-1.5 flex-nowrap items-center overflow-x-auto shrink-0 pb-1 lg:pb-0 scrollbar-none">
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Pending", value: "pending" },
            { label: "Converted", value: "converted" },
            { label: "Lost", value: "lost" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.value
                  ? "bg-[#0f5a3e] text-white shadow-sm shadow-[#0f5a3e]/10"
                  : "bg-slate-50 border border-slate-200/50 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdowns Wrapper */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-1 lg:max-w-[70%] xl:max-w-[60%] lg:justify-end">
          {/* Course Filter */}
          <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Course:</span>
            <select 
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Courses</option>
              {activeCourses.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>

          {/* Counselor Filter */}
          <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Counselor:</span>
            <select 
              value={counselorFilter}
              onChange={(e) => setCounselorFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Counselors</option>
              {Array.from(new Set(leads.map(l => l.counselor_name).filter(Boolean))).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 📊 Premium Lead Database Table */}
      <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-2 space-y-2">
        {showScrollbar && (
          <div 
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="overflow-x-auto custom-scrollbar bg-slate-50/50 border border-slate-100 rounded-xl p-0.5 mx-1"
          >
            <div style={{ width: `${tableWidth}px`, height: '1px' }} />
          </div>
        )}

        <div 
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="overflow-x-auto custom-scrollbar rounded-[20px] bg-slate-50/40 border border-slate-100/60"
        >
          <table className="w-full min-w-[1000px] text-sm text-left">
            <thead className="text-[9.5px] text-slate-400 uppercase tracking-widest font-black border-b border-slate-200/80 bg-slate-50/70">
              <tr>
                <th className="px-5 py-4">Student ID</th>
                <th className="px-5 py-4">Student Profile</th>
                <th className="px-5 py-4">Target Program</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Follow-up</th>
                <th className="px-5 py-4">Timeframe</th>
                <th className="px-5 py-4">Enrollment</th>
                <th className="px-5 py-4">Date Added</th>
                <th className="px-5 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-7 w-7 animate-spin mb-3 text-[#0f5a3e]" />
                      <p className="font-black text-xs uppercase tracking-widest text-[#0f5a3e]">Loading lead pipeline...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                    No leads found matching current filter scope.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const overdue = isLeadOverdue(lead);
                  const followupOptions = STATUSES.map(s => ({
                    label: s === 'Pending' && overdue ? '🔴 Overdue' : s,
                    value: s,
                    badgeColor: s === 'Pending' ? (overdue ? 'text-rose-500' : 'text-amber-500') : 
                                s === 'Done' || s === 'Converted' ? 'text-emerald-500' :
                                s === 'Not Interested' ? 'text-rose-500' : 
                                s === 'Call Not Connected' ? 'text-slate-500' : 'text-blue-500'
                  }));

                  return (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-50/80 transition-colors border-l-4 ${
                        overdue 
                          ? "bg-rose-50/20 hover:bg-rose-100/30 border-l-rose-500" 
                          : "border-l-transparent"
                      }`}
                    >
                      {/* Student ID */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block whitespace-nowrap">
                          {lead.student_id || 'N/A'}
                        </div>
                      </td>

                      {/* Name & Metadata */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                           <button 
                             onClick={() => openEditModal(lead)}
                             className="font-extrabold text-slate-800 hover:text-[#0f5a3e] text-sm leading-tight flex items-center gap-1.5 text-left transition-colors cursor-pointer"
                             title="Click to edit lead"
                           >
                             {lead.student_name}
                             {lead.gender && (
                               <span className="text-[8px] font-black text-slate-400 border border-slate-200 px-1 py-0.2 rounded uppercase">
                                 {lead.gender.slice(0, 1)}
                               </span>
                             )}
                           </button>
                           <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                             <Phone className="w-2.5 h-2.5 opacity-70" /> {lead.phone_number}
                             {lead.city && <span>• {lead.city}</span>}
                           </div>
                        </div>
                      </td>

                      {/* Course & Counselor */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <div className="text-slate-800 text-xs font-extrabold truncate max-w-[150px]">
                            {lead.interested_course || 'N/A'}
                          </div>
                          <div className="text-[9px] text-[#0f5a3e] font-black mt-0.5 uppercase tracking-wider">
                            Assign: {lead.counselor_name || 'Unassigned'}
                          </div>
                        </div>
                      </td>

                      {/* AI Lead Score */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-8 py-0.5 rounded-md text-[10px] font-black text-center border ${
                            lead.lead_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            lead.lead_score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {lead.lead_score}
                          </div>
                        </div>
                      </td>

                      {/* Follow-up Status */}
                      <td className="px-5 py-3.5">
                        <StatusDropdown 
                          value={lead.followup_status}
                          onChange={(value) => handleStatusChange(lead.phone_number, 'followup', value)}
                          options={followupOptions}
                        />
                      </td>

                      {/* Follow-up Timeframe */}
                      <td className="px-5 py-3.5">
                        <StatusDropdown 
                          value={lead.followup_time || 'One Day'}
                          onChange={(value) => handleStatusChange(lead.phone_number, 'followup_time', value)}
                          options={FOLLOWUP_TIMEFRAMES.map(tf => ({
                            label: tf,
                            value: tf,
                            badgeColor: 'text-slate-500'
                          }))}
                        />
                      </td>

                      {/* Admission Status */}
                      <td className="px-5 py-3.5">
                        <StatusDropdown 
                          value={lead.admission_status}
                          onChange={(value) => handleStatusChange(lead.phone_number, 'admission', value)}
                          options={[
                            { label: "🟢 Admitted", value: "Admitted", badgeColor: "text-emerald-500" },
                            { label: "⚪ Not Admitted", value: "Not Admitted", badgeColor: "text-slate-400" }
                          ]}
                        />
                      </td>

                      {/* Date added */}
                      <td className="px-5 py-3.5 text-slate-500 text-xs font-bold whitespace-nowrap">
                        {lead.created_date ? format(new Date(lead.created_date), "MMM d, yyyy") : "May 25, 2026"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Counselor Dropbox */}
                          <select
                            value={lead.counselor_id || ""}
                            onChange={(e) => handleCounselorChange(lead.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-black focus:outline-none cursor-pointer max-w-[125px] truncate mr-1 shadow-sm"
                            title="Assign counselor to this lead"
                          >
                            <option value="">Unassigned</option>
                            {counselors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          {/* Log Follow-up Button */}
                          <button
                            onClick={() => openFollowupModal(lead)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 rounded-lg text-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Add Follow-up remarks"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* View Timeline Button */}
                          <button
                            onClick={() => openTimelineModal(lead)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 rounded-lg text-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-colors cursor-pointer"
                            title="View chronological lead logs"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Button */}
                          <button
                            onClick={() => openWhatsAppModal(lead)}
                            className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg text-[#25D366] transition-colors cursor-pointer"
                            title="Send WhatsApp Follow-up"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(lead)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200/40 rounded-lg text-blue-600 transition-colors cursor-pointer"
                            title="Edit Lead fields"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/40 rounded-lg text-rose-600 dark:text-rose-400 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 dark:border-rose-900/40 transition-colors cursor-pointer"
                            title="Soft delete lead record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 🌟 DIALOG MODALS SECTION (AnimatePresence + Framer Motion)         */}
      {/* =================================================================== */}
      
      <AnimatePresence>
        {/* 1. ADD / EDIT LEAD MODAL */}
        {(isAddModalOpen || isEditModalOpen) && (
          <motion.div 
            key="add-edit-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-[#0f5a3e] p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-100" />
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {isAddModalOpen ? "Add New CRM Lead" : `Edit Lead: ${selectedLead?.student_name}`}
                  </h3>
                </div>
                <button 
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={isAddModalOpen ? handleAddLead : handleEditLead} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student ID - Read Only for Edit */}
                  {isEditModalOpen && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Student ID</label>
                      <input
                        type="text"
                        value={formInputs.student_id || 'Auto-generated'}
                        readOnly
                        className="w-full bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Student Name *</label>
                    <input
                      type="text"
                      required
                      value={formInputs.student_name}
                      onChange={(e) => setFormInputs({ ...formInputs, student_name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formInputs.phone_number}
                      onChange={(e) => setFormInputs({ ...formInputs, phone_number: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formInputs.email}
                      onChange={(e) => setFormInputs({ ...formInputs, email: e.target.value })}
                      placeholder="e.g. rahul@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    />
                  </div>

                  {/* Interested Course */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Interested Course</label>
                    <select
                      value={formInputs.interested_course}
                      onChange={(e) => setFormInputs({ ...formInputs, interested_course: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    >
                      {activeCourses.map(course => <option key={course} value={course}>{course}</option>)}
                    </select>
                  </div>

                  {/* Lead Source */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lead Source</label>
                    <select
                      value={formInputs.lead_source}
                      onChange={(e) => setFormInputs({ ...formInputs, lead_source: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    >
                      {SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
                    </select>
                  </div>

                  {/* Referred By */}
                  {formInputs.lead_source === 'Student Referral' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Referred By Student Name</label>
                      <input
                        type="text"
                        required
                        value={formInputs.referred_by_student_name}
                        onChange={(e) => setFormInputs({ ...formInputs, referred_by_student_name: e.target.value })}
                        placeholder="Enter referring student's name"
                        className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                      />
                    </div>
                  )}

                  {/* Counselor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Counselor Assigned</label>
                    <select
                      value={formInputs.counselor_id}
                      onChange={(e) => setFormInputs({ ...formInputs, counselor_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    >
                      <option value="">Unassigned</option>
                      {counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gender</label>
                    <select
                      value={formInputs.gender}
                      onChange={(e) => setFormInputs({ ...formInputs, gender: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={formInputs.city}
                      onChange={(e) => setFormInputs({ ...formInputs, city: e.target.value })}
                      placeholder="e.g. Pune"
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    />
                  </div>

                  {/* Fees Discussed */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expected Fees discussed (₹)</label>
                    <input
                      type="number"
                      value={formInputs.fees_discussed}
                      onChange={(e) => setFormInputs({ ...formInputs, fees_discussed: e.target.value })}
                      placeholder="e.g. 45000"
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    />
                  </div>

                  {/* Next Follow-up Timeframe */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Next Follow-up Due</label>
                    <select
                      value={formInputs.followup_time}
                      onChange={(e) => setFormInputs({ ...formInputs, followup_time: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                    >
                      {FOLLOWUP_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                  </div>
                </div>

                {/* Remarks/Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks / Conversation Notes</label>
                  <textarea
                    value={formInputs.remarks}
                    onChange={(e) => setFormInputs({ ...formInputs, remarks: e.target.value })}
                    placeholder="Enter notes about student goals, background, budget details..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white rounded-xl text-xs font-black shadow-md shadow-[#0f5a3e]/10 cursor-pointer"
                  >
                    {isAddModalOpen ? "Save New Lead" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* 2. LOG FOLLOW-UP MODAL */}
        {isFollowupModalOpen && (
          <motion.div 
            key="followup-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl text-slate-850 dark:text-slate-100"
            >
              {/* Header */}
              <div className="bg-[#0f5a3e] p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-100" />
                  <h3 className="text-base font-black uppercase tracking-wider">Log Call Follow-up</h3>
                </div>
                <button 
                  onClick={() => setIsFollowupModalOpen(false)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddFollowup} className="p-6 space-y-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Add follow-up notes for <span className="font-extrabold text-slate-800">{selectedLead?.student_name}</span>.
                </p>

                {/* Follow-up Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Follow-up Mode</label>
                  <select
                    value={followupForm.followup_type}
                    onChange={(e) => setFollowupForm({ ...followupForm, followup_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="Email">Email Communication</option>
                    <option value="Visit">Direct Academy Visit</option>
                  </select>
                </div>

                {/* Pipeline Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lead Status Result</label>
                  <select
                    value={followupForm.status}
                    onChange={(e) => setFollowupForm({ ...followupForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                  >
                    {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                {/* Next Date timeframe */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Schedule Next Contact</label>
                  <select
                    value={followupForm.next_followup_time}
                    onChange={(e) => setFollowupForm({ ...followupForm, next_followup_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                  >
                    {FOLLOWUP_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>

                {/* Remarks */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Conversation Highlights</label>
                  <textarea
                    required
                    value={followupForm.remarks}
                    onChange={(e) => setFollowupForm({ ...followupForm, remarks: e.target.value })}
                    placeholder="Student wants EMI options next, call after 5 PM..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] text-slate-900"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFollowupModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white rounded-xl text-xs font-black shadow-md shadow-[#0f5a3e]/10 cursor-pointer"
                  >
                    Log Follow-up
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* 3. TIMELINE EVENT HISTORY VIEWER MODAL */}
        {isTimelineModalOpen && (
          <motion.div 
            key="timeline-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100"
            >
              {/* Header */}
              <div className="bg-[#0f5a3e] p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-100" />
                  <h3 className="text-base font-black uppercase tracking-wider">Lead Activity Timeline</h3>
                </div>
                <button 
                  onClick={() => setIsTimelineModalOpen(false)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-800">{selectedLead?.student_name}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Course: {selectedLead?.interested_course} • Status: {selectedLead?.followup_status}
                  </p>
                </div>

                {isTimelineLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[#0f5a3e]" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fetching chronological logs...</p>
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                    No logged timeline records for this student yet.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200/80 dark:border-slate-800 pl-6 ml-3.5 space-y-6 py-2">
                    {timelineEvents.map((evt) => {
                      const isFollowup = evt.type === 'followup';
                      const isAdmission = evt.type === 'admission';
                      const isAudit = evt.type === 'audit';

                      return (
                        <div key={evt.id} className="relative">
                          {/* Circle Icon Badge */}
                          <div className={`absolute -left-[35px] w-7 h-7 rounded-full flex items-center justify-center border text-xs shadow-sm ${
                            isAdmission ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' :
                            isFollowup ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
                            'bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {isAdmission && <GraduationCap className="w-3.5 h-3.5" />}
                            {isFollowup && <Phone className="w-3.5 h-3.5" />}
                            {isAudit && <FileText className="w-3.5 h-3.5" />}
                          </div>

                          {/* Content Container */}
                          <div className="bg-slate-50/70 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4.5 space-y-1 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">{evt.title}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold whitespace-nowrap">
                                {format(new Date(evt.date), "MMM d, yyyy h:mm a")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-semibold">
                              {evt.description}
                            </p>
                            {evt.status && (
                              <span className="inline-block text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-350 border border-black/5 dark:border-white/5 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                                Outcome: {evt.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 4. WHATSAPP CLICK-TO-CHAT MODAL */}
        <WhatsAppModal 
          isOpen={isWhatsAppModalOpen} 
          onClose={() => setIsWhatsAppModalOpen(false)} 
          lead={selectedLead} 
        />

        {/* 5. CUSTOM CONFIRMATION DIALOG */}
        {confirmDialog.isOpen && (
          <motion.div 
            key="confirm-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-850 dark:text-slate-100"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  confirmDialog.type === 'danger' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                }`}>
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all cursor-pointer shadow-md ${
                    confirmDialog.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 5. CUSTOM ALERT DIALOG */}
        {alertDialog.isOpen && (
          <motion.div 
            key="alert-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-850 dark:text-slate-100"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  alertDialog.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {alertDialog.type === 'success' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <X className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {alertDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    {alertDialog.message}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
