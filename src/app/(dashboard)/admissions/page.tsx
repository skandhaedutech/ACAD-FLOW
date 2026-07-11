"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, Plus, ChevronRight, Phone, Mail, Award, Clock,
  FileText, Download, Check, GraduationCap, RefreshCw, ChevronDown,
  Calendar, CreditCard, User, BookOpen, Trash2, Printer, CheckCircle2,
  DollarSign, TrendingUp, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";
import { BACKEND_URL } from "@/lib/config";

interface Admission {
  id: string;
  student_id: string;
  student_name: string;
  phone_number: string;
  email: string;
  course: string;
  total_fee: number;
  amount_paid: number;
  pending_amount: number;
  emi_status: string; // 'Paid' | 'Pending' | 'Overdue' | 'Upcoming'
  counselor_name: string;
  admission_date: string;
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Admission | null>(null);
  
  // Tabs State: 'list' | 'add' | 'payments' | 'analytics' | 'profiles'
  const [activeTab, setActiveTab] = useState<string>("list");
  
  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptStudent, setReceiptStudent] = useState<Admission | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("All");
  const [filterEmiStatus, setFilterEmiStatus] = useState("All");
  const [filterCounselor, setFilterCounselor] = useState("All");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Add Admission Form State
  const [formState, setFormState] = useState({
    // Student Info
    student_id: "",
    student_name: "",
    phone_number: "",
    email: "",
    gender: "Male",
    date_of_birth: "",
    address: "",
    
    // Course Details
    course: "Full Stack Development",
    course_duration: "6 Months",
    batch: "Morning (9 AM - 11 AM)",
    trainer: "Amit Sharma",
    course_fees: 35000,
    discount: 0,
    final_fees: 35000,
    
    // Payment Details
    amount_paid: 10000,
    pending_amount: 25000,
    payment_mode: "UPI",
    transaction_id: "",
    installment_option: "3 Installments",
    
    // Academic Details
    college_name: "",
    degree: "",
    year_of_study: "4th Year",
    skill_level: "Beginner",
    
    // CRM details
    lead_source: "Instagram",
    counselor_name: "Anita",
    admission_date: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch admissions
  const fetchAdmissions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/admissions?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAdmissions(data);
        if (data.length > 0 && !selectedStudent) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch admissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();

    // 🔗 Supabase Realtime synchronization channels
    const admissionsChannel = supabase
      .channel('admissions-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          console.log('[Realtime] Leads updated, reloading admissions...');
          fetchAdmissions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admissions' },
        () => {
          console.log('[Realtime] Admissions updated, reloading admissions...');
          fetchAdmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(admissionsChannel);
    };
  }, []);

  // Listen for Lead Conversion Query Params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("convert") === "true") {
        setActiveTab("add");
        
        const cFees = params.get("course")?.includes("Python") ? 30000 : 35000;
        setFormState(prev => ({
          ...prev,
          student_name: params.get("name") || "",
          phone_number: params.get("phone") || "",
          email: params.get("email") || "",
          course: params.get("course") || "Full Stack Development",
          counselor_name: params.get("counselor") || "Anita",
          course_fees: cFees,
          final_fees: cFees,
          pending_amount: cFees - prev.amount_paid
        }));
        
        // Clean URL to prevent prefilling again on reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Calculate fees dynamically
  useEffect(() => {
    const final = Math.max(formState.course_fees - formState.discount, 0);
    const pending = Math.max(final - formState.amount_paid, 0);
    setFormState(prev => ({
      ...prev,
      final_fees: final,
      pending_amount: pending
    }));
  }, [formState.course_fees, formState.discount, formState.amount_paid]);

  // Handle Form Change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numberFields = ["course_fees", "discount", "amount_paid"];
    
    setFormState(prev => ({
      ...prev,
      [name]: numberFields.includes(name) ? parseFloat(value || "0") : value
    }));
  };

  // Submit Admission
  const handleAddAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${BACKEND_URL}/server-api/admissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });

      if (res.ok) {
        setSuccessMessage("Admission created successfully! Lead has been marked as Converted.");
        // Reset form
        setFormState({
          student_id: "",
          student_name: "",
          phone_number: "",
          email: "",
          gender: "Male",
          date_of_birth: "",
          address: "",
          course: "Full Stack Development",
          course_duration: "6 Months",
          batch: "Morning (9 AM - 11 AM)",
          trainer: "Amit Sharma",
          course_fees: 35000,
          discount: 0,
          final_fees: 35000,
          amount_paid: 10000,
          pending_amount: 25000,
          payment_mode: "UPI",
          transaction_id: "",
          installment_option: "3 Installments",
          college_name: "",
          degree: "",
          year_of_study: "4th Year",
          skill_level: "Beginner",
          lead_source: "Instagram",
          counselor_name: "Anita",
          admission_date: format(new Date(), "yyyy-MM-dd"),
          notes: ""
        });
        await fetchAdmissions();
        setTimeout(() => {
          setSuccessMessage("");
          setActiveTab("list");
        }, 1500);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to create admission record.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Mark Payment as Paid
  const handleMarkPaymentPaid = async (studentId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/admissions/${studentId}/pay`, {
        method: "PUT"
      });
      if (res.ok) {
        await fetchAdmissions();
        // Update selected student if active
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent(prev => prev ? { ...prev, emi_status: "Paid", pending_amount: 0, amount_paid: prev.total_fee } : null);
        }
      }
    } catch (err) {
      console.error("Failed to update payment status:", err);
    }
  };

  // Filter admissions based on search & dropdowns
  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch = 
      adm.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.phone_number.includes(searchQuery) ||
      adm.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCourse = filterCourse === "All" || adm.course === filterCourse;
    const matchesEmiStatus = filterEmiStatus === "All" || adm.emi_status === filterEmiStatus;
    const matchesCounselor = filterCounselor === "All" || adm.counselor_name === filterCounselor;

    return matchesSearch && matchesCourse && matchesEmiStatus && matchesCounselor;
  });

  // Extract dropdown options dynamically
  const uniqueCourses = useMemo(() => {
    return ["All", ...Array.from(new Set(admissions.map(a => a.course).filter(Boolean)))];
  }, [admissions]);

  const uniqueCounselors = useMemo(() => {
    return ["All", ...Array.from(new Set(admissions.map(a => a.counselor_name).filter(Boolean)))];
  }, [admissions]);

  // Aggregate Metrics for Top Cards
  const metrics = useMemo(() => {
    const total = admissions.length;
    const today = admissions.filter(a => {
      try {
        return format(new Date(a.admission_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      } catch(e) {
        return false;
      }
    }).length;
    const revenue = admissions.reduce((sum, a) => sum + a.amount_paid, 0);
    const pending = admissions.reduce((sum, a) => sum + a.pending_amount, 0);

    return { total, today, revenue, pending };
  }, [admissions]);

  // Course wise charts data
  const courseChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    admissions.forEach(a => {
      counts[a.course] = (counts[a.course] || 0) + 1;
    });
    
    const colors = ["#0f5a3e", "#4361ee", "#ff8e3c", "#3ca2ff", "#10b981", "#ffb703"];
    
    const data = Object.keys(counts).map((course, idx) => ({
      name: course,
      count: counts[course],
      color: colors[idx % colors.length]
    }));

    if (data.length === 0) {
      return [
        { name: "Full Stack Development", count: 8, color: "#0f5a3e" },
        { name: "Python Programming", count: 4, color: "#4361ee" },
        { name: "UI/UX Design", count: 2, color: "#ff8e3c" }
      ];
    }
    return data;
  }, [admissions]);

  // Helper for generating EMIs list
  const generateEmiSchedule = (student: Admission) => {
    const total = student.total_fee;
    const emiCount = 3;
    const emiAmount = Math.round(total / emiCount);
    
    let emi1Status = "Paid";
    let emi2Status = "Upcoming";
    let emi3Status = "Upcoming";

    if (student.emi_status === "Paid") {
      emi1Status = "Paid";
      emi2Status = "Paid";
      emi3Status = "Paid";
    } else if (student.emi_status === "Overdue") {
      emi1Status = "Paid";
      emi2Status = "Overdue";
      emi3Status = "Upcoming";
    } else if (student.emi_status === "Pending") {
      emi1Status = "Paid";
      emi2Status = "Pending";
      emi3Status = "Upcoming";
    } else if (student.emi_status === "Upcoming") {
      emi1Status = "Paid";
      emi2Status = "Upcoming";
      emi3Status = "Upcoming";
    }

    const admDate = new Date(student.admission_date);

    return [
      {
        no: 1,
        dueDate: format(new Date(admDate.getFullYear(), admDate.getMonth() + 1, admDate.getDate()), "MMM dd, yyyy"),
        amount: emiAmount,
        status: emi1Status,
        paidDate: format(new Date(admDate.getFullYear(), admDate.getMonth() + 1, admDate.getDate() - 3), "MMM dd, yyyy"),
        method: "GPay"
      },
      {
        no: 2,
        dueDate: format(new Date(admDate.getFullYear(), admDate.getMonth() + 2, admDate.getDate()), "MMM dd, yyyy"),
        amount: emiAmount,
        status: emi2Status,
        paidDate: emi2Status === "Paid" ? format(new Date(admDate.getFullYear(), admDate.getMonth() + 2, admDate.getDate() - 2), "MMM dd, yyyy") : "-",
        method: emi2Status === "Paid" ? "Bank Transfer" : "-"
      },
      {
        no: 3,
        dueDate: format(new Date(admDate.getFullYear(), admDate.getMonth() + 3, admDate.getDate()), "MMM dd, yyyy"),
        amount: emiAmount,
        status: emi3Status,
        paidDate: emi3Status === "Paid" ? format(new Date(admDate.getFullYear(), admDate.getMonth() + 3, admDate.getDate() - 1), "MMM dd, yyyy") : "-",
        method: emi3Status === "Paid" ? "UPI" : "-"
      }
    ];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-100">Paid</span>;
      case "Overdue":
        return <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-rose-100 animate-pulse">Overdue</span>;
      case "Pending":
        return <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-amber-100">Pending</span>;
      case "Upcoming":
        return <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100">Upcoming</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-100">{status}</span>;
    }
  };

  const renderFilterDropdown = (
    label: string, 
    value: string, 
    options: string[], 
    onChange: (val: string) => void, 
    id: string
  ) => {
    const isOpen = activeDropdown === id;
    return (
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(isOpen ? null : id)}
          className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}:</span>
          <span className="text-slate-900 font-black">{value}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-100 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setActiveDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#0f5a3e]/10 hover:text-[#0f5a3e] flex items-center justify-between transition-colors"
                >
                  {opt}
                  {value === opt && <Check className="w-3.5 h-3.5 text-[#0f5a3e]" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Open receipt PDF model
  const openReceipt = (student: Admission) => {
    setReceiptStudent(student);
    setShowReceiptModal(true);
  };

  return (
    <div className="w-full space-y-6 pb-8 text-[#1c1d21]">
      {/* 1. Top Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f5a3e] text-white p-2.5 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0f5a3e]/10">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Student Enrollment System</h2>
            <p className="text-slate-400 text-xs font-semibold">Convert converted leads, manage billing profiles & monitor collection analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={() => setActiveTab("add")}
            className="flex items-center gap-2 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white px-5 py-2.5 rounded-xl text-xs font-black hover:scale-105 transition-all shadow-md shadow-[#0f5a3e]/10"
          >
            <Plus className="w-4 h-4" /> Add Admission
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Admissions", value: metrics.total, icon: <GraduationCap className="text-[#0f5a3e]" />, desc: "Overall enrolled students" },
          { title: "Today's Admissions", value: metrics.today, icon: <Calendar className="text-[#4361ee]" />, desc: "Completed today" },
          { title: "Revenue Generated", value: `₹${metrics.revenue.toLocaleString()}`, icon: <DollarSign className="text-emerald-500" />, desc: "Total collected fees" },
          { title: "Pending Fees", value: `₹${metrics.pending.toLocaleString()}`, icon: <AlertCircle className="text-rose-500" />, desc: "Outstanding collection dues" }
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="flex justify-between items-start">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{card.title}</div>
              <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-[#0f5a3e]/10 transition-colors">
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{card.value}</h3>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: "list", label: "Admissions List", icon: GraduationCap },
          { id: "add", label: "Add Admission Form", icon: Plus },
          { id: "payments", label: "Pending Payments", icon: CreditCard },
          { id: "analytics", label: "Course-wise Admissions", icon: TrendingUp },
          { id: "profiles", label: "Student Profiles", icon: User }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-black transition-all ${
                isActive 
                  ? "border-[#0f5a3e] text-[#0f5a3e] bg-slate-50/50" 
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}
      
      {/* TAB 1: ADMISSIONS LIST */}
      {activeTab === "list" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filters Toolbar */}
          <div className="bg-slate-50/80 rounded-[24px] p-4 border border-slate-200/50 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 outline-none focus:border-slate-400 transition-colors shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {renderFilterDropdown("Course", filterCourse, uniqueCourses, setFilterCourse, "course")}
              {renderFilterDropdown("EMI", filterEmiStatus, ["All", "Paid", "Pending", "Overdue", "Upcoming"], setFilterEmiStatus, "emi")}
              {renderFilterDropdown("Counselor", filterCounselor, uniqueCounselors, setFilterCounselor, "counselor")}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Left Side Table */}
            <div className="xl:col-span-2 min-w-0 bg-white rounded-[28px] shadow-sm overflow-hidden p-2 border border-slate-100">
              <div className="overflow-x-auto rounded-[20px] bg-slate-50/50 border border-slate-100">
                <table className="w-full min-w-[900px] text-sm text-left">
                  <thead className="text-[9.5px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-4">Student ID</th>
                      <th className="px-4 py-4">Student Name</th>
                      <th className="px-4 py-4">Course</th>
                      <th className="px-4 py-4">Total Fee</th>
                      <th className="px-4 py-4">Amount Paid</th>
                      <th className="px-4 py-4">Pending</th>
                      <th className="px-4 py-4">EMI Status</th>
                      <th className="px-4 py-4">Counselor</th>
                      <th className="px-4 py-4">Admission Date</th>
                      <th className="px-4 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[#0f5a3e]" />
                            <p className="font-bold text-xs">Fetching admissions...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAdmissions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-xs font-semibold">
                          No admitted students found matching selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAdmissions.map((student) => {
                        const isSelected = selectedStudent?.id === student.id;
                        return (
                          <tr 
                            key={student.id} 
                            onClick={() => setSelectedStudent(student)}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                              isSelected ? "bg-slate-100/50" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="text-[11px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                {student.student_id || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-extrabold text-slate-800 text-xs">{student.student_name}</div>
                              <div className="text-slate-400 text-[10px] truncate max-w-[120px] font-bold">{student.phone_number}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[#4361ee] text-[11px] font-bold truncate block max-w-[120px]">
                                {student.course}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-800 text-[11px] font-bold">
                              ₹{student.total_fee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-emerald-600 text-[11px] font-bold">
                              ₹{student.amount_paid.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-amber-600 text-[11px] font-bold">
                              ₹{student.pending_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(student.emi_status)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px] font-bold">
                              {student.counselor_name}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[10px] font-bold whitespace-nowrap">
                              {format(new Date(student.admission_date), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button className="text-[#0f5a3e] hover:scale-110 transition-transform p-1">
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side Detail Drawer */}
            <div className="xl:col-span-1">
              {selectedStudent ? (
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Student Profile</h3>
                      <p className="text-[10px] text-slate-400 font-bold">Details & Payment Schedules</p>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Award className="w-3.5 h-3.5 text-[#0f5a3e]" />
                      <span className="text-[10px] text-emerald-700 font-black">Admitted</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 flex items-center justify-center text-[#0f5a3e] text-sm font-black uppercase">
                      {selectedStudent.student_name.charAt(0)}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-slate-800 font-extrabold text-sm truncate">{selectedStudent.student_name}</h4>
                      <p className="text-[#4361ee] text-[10px] font-bold truncate block">{selectedStudent.course}</p>
                      {selectedStudent.student_id && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-black text-[#0f5a3e] bg-[#0f5a3e]/10 px-2 py-0.5 rounded-md border border-[#0f5a3e]/20 uppercase tracking-wider">
                            {selectedStudent.student_id}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedStudent.phone_number}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold truncate">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedStudent.email || "No Email"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee Summary */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fee Summary</h4>
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        Counselor: {selectedStudent.counselor_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Total</p>
                        <p className="text-slate-800 font-black text-xs">₹{selectedStudent.total_fee.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-xl">
                        <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">Paid</p>
                        <p className="text-emerald-700 font-black text-xs">₹{selectedStudent.amount_paid.toLocaleString()}</p>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-xl">
                        <p className="text-[9px] font-black text-amber-600 uppercase mb-0.5">Pending</p>
                        <p className="text-amber-700 font-black text-xs">₹{selectedStudent.pending_amount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Payment Progress</span>
                        <span className="text-[#0f5a3e] font-black">
                          {selectedStudent.total_fee > 0 ? Math.round((selectedStudent.amount_paid / selectedStudent.total_fee) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#0f5a3e] to-[#25a87b] rounded-full transition-all duration-500"
                          style={{ width: `${selectedStudent.total_fee > 0 ? (selectedStudent.amount_paid / selectedStudent.total_fee) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EMI schedule */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Installments</h4>
                    <div className="bg-slate-50/30 rounded-2xl overflow-hidden border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[9px] text-slate-400 uppercase tracking-wider font-black border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Term</th>
                            <th className="px-3 py-2.5">Due Date</th>
                            <th className="px-3 py-2.5">Amount</th>
                            <th className="px-3 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {generateEmiSchedule(selectedStudent).map((emi) => (
                            <tr key={emi.no} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2.5 font-bold text-slate-800 text-[11px]">Installment {emi.no}</td>
                              <td className="px-3 py-2.5 text-slate-400 font-bold text-[10px]">{emi.dueDate}</td>
                              <td className="px-3 py-2.5 text-slate-800 font-black text-[10px]">₹{emi.amount.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right">{getStatusBadge(emi.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons: Invoice/Receipt */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => openReceipt(selectedStudent)}
                      className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Receipt
                    </button>
                    {selectedStudent.emi_status !== "Paid" && (
                      <button 
                        onClick={() => handleMarkPaymentPaid(selectedStudent.id)}
                        className="py-2.5 rounded-xl bg-[#0f5a3e] hover:bg-[#083a27] text-white font-black text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[28px] p-12 border border-slate-100 shadow-sm text-center text-slate-400 text-xs font-semibold">
                   Please select a student from the table list to load full fee breakdowns and installment timelines.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADD ADMISSION FORM */}
      {activeTab === "add" && (
        <form onSubmit={handleAddAdmission} className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-sm space-y-8 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-1">Academy Admission Registration</h3>
            <p className="text-slate-400 text-xs font-semibold">Fill out all enrollment fields below to register the student and convert the lead record.</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-250/20 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-250/20 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {successMessage}
            </div>
          )}

          {/* Section 1: Student Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#0f5a3e] uppercase tracking-widest border-b border-slate-100 pb-2">1. Student Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Student ID</label>
                <input 
                  type="text" 
                  name="student_id" 
                  value="Auto-generated" 
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-450 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Student Full Name *</label>
                <input 
                  type="text" required name="student_name" value={formState.student_name} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone Number *</label>
                <input 
                  type="tel" required name="phone_number" value={formState.phone_number} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Email Address</label>
                <input 
                  type="email" name="email" value={formState.email} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Gender</label>
                <select 
                  name="gender" value={formState.gender} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Date of Birth</label>
                <input 
                  type="date" name="date_of_birth" value={formState.date_of_birth} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Residential Address</label>
                <input 
                  type="text" name="address" value={formState.address} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Course details */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#0f5a3e] uppercase tracking-widest border-b border-slate-100 pb-2">2. Course Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Selected Course *</label>
                <select 
                  name="course" value={formState.course} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>Full Stack Development</option>
                  <option>Python Programming</option>
                  <option>AI & Data Science</option>
                  <option>UI/UX Design</option>
                  <option>Beginner Python Course</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Course Duration</label>
                <select 
                  name="course_duration" value={formState.course_duration} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>9 Months</option>
                  <option>12 Months</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Batch Timing</label>
                <select 
                  name="batch" value={formState.batch} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>Morning (9 AM - 11 AM)</option>
                  <option>Afternoon (2 PM - 4 PM)</option>
                  <option>Evening (6 PM - 8 PM)</option>
                  <option>Weekend Fast-Track</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Trainer Assigned</label>
                <input 
                  type="text" name="trainer" value={formState.trainer} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Fee & Payment Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#0f5a3e] uppercase tracking-widest border-b border-slate-100 pb-2">3. Payment Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Base Course Fees (₹)</label>
                <input 
                  type="number" name="course_fees" value={formState.course_fees} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Discount (₹)</label>
                <input 
                  type="number" name="discount" value={formState.discount} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Final Fees (₹)</label>
                <input 
                  type="number" disabled name="final_fees" value={formState.final_fees}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Admission Paid Amount (₹)</label>
                <input 
                  type="number" name="amount_paid" value={formState.amount_paid} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Outstanding Balance (₹)</label>
                <input 
                  type="number" disabled name="pending_amount" value={formState.pending_amount}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Payment Mode</label>
                <select 
                  name="payment_mode" value={formState.payment_mode} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>UPI</option>
                  <option>GPay</option>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Card Payment</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Transaction ID</label>
                <input 
                  type="text" name="transaction_id" value={formState.transaction_id} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Installment Plan</label>
                <select 
                  name="installment_option" value={formState.installment_option} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>One-Time Payment</option>
                  <option>2 Installments</option>
                  <option>3 Installments</option>
                  <option>Monthly EMI Scheme</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#0f5a3e] uppercase tracking-widest border-b border-slate-100 pb-2">4. Academic Background (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">College/School Name</label>
                <input 
                  type="text" name="college_name" value={formState.college_name} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Degree/Course of Study</label>
                <input 
                  type="text" name="degree" value={formState.degree} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Year of Study</label>
                <select 
                  name="year_of_study" value={formState.year_of_study} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>Graduated</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Current Skill Level</label>
                <select 
                  name="skill_level" value={formState.skill_level} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-855"
                >
                  <option>Beginner (No prior coding)</option>
                  <option>Intermediate (Know basic syntax)</option>
                  <option>Advanced (Know project architectures)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: CRM Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#0f5a3e] uppercase tracking-widest border-b border-slate-100 pb-2">5. CRM & Enrollment Mapping</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Original Lead Source</label>
                <select 
                  name="lead_source" value={formState.lead_source} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>Instagram</option>
                  <option>Website</option>
                  <option>Referral</option>
                  <option>Facebook</option>
                  <option>WhatsApp</option>
                  <option>Direct Walk-In</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Counselor in Charge</label>
                <select 
                  name="counselor_name" value={formState.counselor_name} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-850"
                >
                  <option>Anita</option>
                  <option>Rajesh</option>
                  <option>Priya</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Date of Admission</label>
                <input 
                  type="date" name="admission_date" value={formState.admission_date} onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Enrollment Remarks / Notes</label>
              <textarea 
                rows={3} name="notes" value={formState.notes} onChange={handleFormChange}
                placeholder="Mention batch exceptions, specific requirements, or counselor remarks..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0f5a3e] text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" disabled={isSaving}
              className="bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white px-8 py-3.5 rounded-xl text-xs font-black hover:scale-105 transition-transform disabled:opacity-75 shadow-md shadow-[#0f5a3e]/10"
            >
              {isSaving ? "Saving Admission..." : "Save Admission & Convert Lead"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PENDING PAYMENTS */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Pending Installments & EMI Trackers</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Monitor students with outstanding fee collections, overdue installments, and upcoming dues.</p>
          </div>

          <div className="overflow-x-auto rounded-[20px] bg-slate-50/50 border border-slate-100">
            <table className="w-full min-w-[1100px] text-sm text-left">
              <thead className="text-[9px] text-slate-400 uppercase tracking-widest font-black border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Total Fees</th>
                  <th className="px-5 py-4">Amount Paid</th>
                  <th className="px-5 py-4">Pending Dues</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">counselor</th>
                  <th className="px-5 py-4 text-center">Installment Collection Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admissions.filter(a => a.emi_status !== "Paid").length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-xs font-semibold">
                      Excellent! No students have pending payments or outstanding collections.
                    </td>
                  </tr>
                ) : (
                  admissions.filter(a => a.emi_status !== "Paid").map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-extrabold text-slate-800 text-xs">{student.student_name}</div>
                        <div className="text-slate-400 text-[10px] font-bold">{student.phone_number}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[#4361ee] text-[11px] font-bold">{student.course}</td>
                      <td className="px-5 py-3.5 text-slate-800 text-[11px] font-black">₹{student.total_fee.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-emerald-600 text-[11px] font-black">₹{student.amount_paid.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-rose-500 text-[11px] font-black">₹{student.pending_amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(student.emi_status)}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px] font-bold">{student.counselor_name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleMarkPaymentPaid(student.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250/20 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors"
                          >
                            Mark Paid
                          </button>
                          <a 
                            href={`https://wa.me/${student.phone_number}?text=${encodeURIComponent(`Hello ${student.student_name}, this is a friendly reminder that your installment fee of ₹${Math.round(student.pending_amount/2)} for ${student.course} is due. Please complete the transfer. Thank you!`)}`}
                            target="_blank" rel="noreferrer"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors"
                          >
                            WhatsApp Alert
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COURSE-WISE ADMISSIONS ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Main Chart Column */}
          <div className="lg:col-span-2 bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Course Enrollment Metrics</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Volume distribution of admitted students across courses.</p>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Students">
                    {courseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Distribution List */}
          <div className="lg:col-span-1 bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Admission Percentages</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Proportional course performance allocation.</p>
            </div>

            <div className="h-[180px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    stroke="none"
                  >
                    {courseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800">{admissions.length}</span>
                <span className="text-[9px] text-slate-400 font-extrabold tracking-widest">TOTAL</span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              {courseChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border border-slate-150/40 rounded-xl p-2.5 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-extrabold truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <span className="text-slate-800 font-black">{item.count} students</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STUDENT PROFILES & DETAILS */}
      {activeTab === "profiles" && (
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Student Academic Directory</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Examine background information, degree files, and batch notes of admitted students.</p>
            </div>
            
            <div className="relative w-full lg:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Search profiles directory..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredAdmissions.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-400 text-xs font-semibold">
                No profiles found matching search query.
              </div>
            ) : (
              filteredAdmissions.map((student) => (
                <div 
                  key={student.id} 
                  onClick={() => {
                    setSelectedStudent(student);
                    setActiveTab("list");
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 border border-slate-100/80 hover:border-slate-200 transition-all cursor-pointer space-y-4 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 text-[#0f5a3e] flex items-center justify-center font-black text-sm uppercase">
                        {student.student_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{student.student_name}</h4>
                        <p className="text-[9px] text-[#4361ee] font-black uppercase mt-0.5">{student.course}</p>
                        {student.student_id && (
                          <p className="text-[8px] font-black text-[#0f5a3e] bg-[#0f5a3e]/10 px-1.5 py-0.5 rounded inline-block mt-1 border border-[#0f5a3e]/15">
                            {student.student_id}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(student.emi_status)}
                  </div>

                  <div className="space-y-1.5 text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="text-slate-800 font-extrabold">{student.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="text-slate-800 font-extrabold truncate max-w-[130px]">{student.email || "No Email"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admitted Date:</span>
                      <span className="text-slate-800 font-extrabold">{format(new Date(student.admission_date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Counselor:</span>
                      <span className="text-[#0f5a3e] font-black">{student.counselor_name}</span>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-150/40 p-2.5 rounded-xl flex justify-between items-center text-[10px] font-black text-slate-700">
                    <span>Balance Fee:</span>
                    <span className="text-rose-500 font-black">₹{student.pending_amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Printable Invoice/Receipt Modal */}
      {showReceiptModal && receiptStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative flex flex-col justify-between max-h-[90vh]">
            <button 
              onClick={() => setShowReceiptModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
            >
              ✕
            </button>
            
            {/* Printable Receipt Block */}
            <div id="printable-receipt" className="flex-1 overflow-y-auto pr-2 space-y-6 font-sans">
              <div className="border-b-2 border-slate-100 pb-4 text-center">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">ACADFLOW ACADEMY</h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Student Enrollment Payment Receipt</p>
              </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-semibold leading-relaxed">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">STUDENT DETAILS</p>
                  <p className="text-slate-800 font-extrabold mt-1">{receiptStudent.student_name}</p>
                  {receiptStudent.student_id && (
                    <p className="text-[#0f5a3e] font-black">ID: {receiptStudent.student_id}</p>
                  )}
                  <p>Phone: {receiptStudent.phone_number}</p>
                  <p>Email: {receiptStudent.email || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase">RECEIPT DETAILS</p>
                  <p className="text-slate-800 font-extrabold mt-1">Receipt ID: REC-{receiptStudent.id.substring(0, 8).toUpperCase()}</p>
                  <p>Date: {format(new Date(receiptStudent.admission_date), "MMM d, yyyy")}</p>
                  <p>Status: <span className="text-emerald-600 font-black">ADMITTED</span></p>
                </div>
              </div>

              <div className="border border-slate-150/80 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-50 border-b border-slate-150/80 px-4 py-2 font-black text-[9px] text-slate-400 uppercase flex justify-between">
                  <span>Course Details</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between font-extrabold text-slate-800">
                    <span>{receiptStudent.course} (Registration)</span>
                    <span>₹{receiptStudent.total_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-bold border-t border-slate-100 pt-2">
                    <span>Course Fees:</span>
                    <span>₹{receiptStudent.total_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-600 font-bold">
                    <span>Amount Paid:</span>
                    <span>₹{receiptStudent.amount_paid.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-150/80 px-4 py-2 font-black text-[11px] text-slate-800 flex justify-between">
                  <span>OUTSTANDING BALANCE</span>
                  <span className="text-rose-500">₹{receiptStudent.pending_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-500 font-semibold space-y-1">
                <p className="font-extrabold text-slate-800 text-[10px]">Payment Information</p>
                <p>Payment Method: UPI / GPay</p>
                <p>Transaction ID: TXN-{receiptStudent.id.substring(24).toUpperCase()}</p>
                <p className="text-[9px] text-slate-550 leading-relaxed pt-2 border-t border-slate-100 mt-2">
                  * Note: This is an automatically generated receipt. In case of discrepancies, please contact your counselor: {receiptStudent.counselor_name}.
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-xs transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-[#0f5a3e] hover:bg-[#083a27] text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
