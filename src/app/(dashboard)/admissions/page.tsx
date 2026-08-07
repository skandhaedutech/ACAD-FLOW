"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Search, Plus, ChevronRight, Phone, Mail, Award, Clock,
  FileText, Download, Check, GraduationCap, RefreshCw, ChevronDown,
  Calendar, CreditCard, User, BookOpen, Trash2, Printer, CheckCircle2,
  DollarSign, TrendingUp, AlertCircle, Edit3, Save, X, PlusCircle
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

interface Installment {
  id?: string;
  admission_id?: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string | null;
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

  // Installment State
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoadingInstallments, setIsLoadingInstallments] = useState(false);
  const [isEditingInstallments, setIsEditingInstallments] = useState(false);
  const [editInstallments, setEditInstallments] = useState<Installment[]>([]);
  const [isSavingInstallments, setIsSavingInstallments] = useState(false);

  // Edit Mode for personal info
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAdmissionId, setEditingAdmissionId] = useState<string | null>(null);

  // Add/Edit Admission Form State
  const [formState, setFormState] = useState({
    // Student Info
    student_id: "",
    student_name: "",
    phone_number: "",
    email: "",
    gender: "Male",
    date_of_joining: "",
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

  // Form installment schedule for new admissions
  const [formInstallments, setFormInstallments] = useState<{amount: number; due_date: string}[]>([]);

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

  // Fetch installments for a specific admission
  const fetchInstallments = useCallback(async (admissionId: string) => {
    setIsLoadingInstallments(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/installments?admission_id=${admissionId}`);
      if (res.ok) {
        const data = await res.json();
        setInstallments(data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch installments:", err);
      setInstallments([]);
    } finally {
      setIsLoadingInstallments(false);
    }
  }, []);

  // Save installments
  const saveInstallments = async () => {
    if (!selectedStudent) return;
    setIsSavingInstallments(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admission_id: selectedStudent.id,
          installments: editInstallments.map(i => ({
            amount: i.amount,
            due_date: i.due_date,
            paid: i.paid,
            paid_date: i.paid_date || null
          }))
        })
      });
      if (res.ok) {
        await fetchInstallments(selectedStudent.id);
        setIsEditingInstallments(false);
      }
    } catch (err) {
      console.error("Failed to save installments:", err);
    } finally {
      setIsSavingInstallments(false);
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

  // Fetch installments when selected student changes
  useEffect(() => {
    if (selectedStudent?.id) {
      fetchInstallments(selectedStudent.id);
      setIsEditingInstallments(false);
    } else {
      setInstallments([]);
    }
  }, [selectedStudent?.id, fetchInstallments]);

  // Listen for Lead Conversion Query Params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("convert") === "true") {
        setActiveTab("add");
        
        const courseParam = params.get("course") || "Full Stack Development";
        let cFees = 35000;
        if (courseParam.includes("Python")) cFees = 30000;
        else if (courseParam.includes("UI/UX") || courseParam.includes("Design")) cFees = 32000;
        else if (courseParam.includes("Digital Marketing")) cFees = 30000;
        else if (courseParam.includes("AI")) cFees = 40000;

        const paid = 10000;
        setFormState(prev => ({
          ...prev,
          student_name: params.get("name") || "",
          phone_number: params.get("phone") || "",
          email: params.get("email") || "",
          course: courseParam,
          counselor_name: params.get("counselor") || "Anita",
          course_fees: cFees,
          discount: 0,
          final_fees: cFees,
          amount_paid: paid,
          pending_amount: cFees - paid
        }));
        
        // Clean URL to prevent prefilling again on reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Calculate fees dynamically
  useEffect(() => {
    const fees = Number(formState.course_fees) || 0;
    const discount = Number(formState.discount) || 0;
    const paid = Number(formState.amount_paid) || 0;
    
    const final = Math.max(fees - discount, 0);
    const pending = Math.max(final - paid, 0);
    
    setFormState(prev => {
      if (prev.final_fees === final && prev.pending_amount === pending) return prev;
      return {
        ...prev,
        final_fees: final,
        pending_amount: pending
      };
    });
  }, [formState.course_fees, formState.discount, formState.amount_paid]);

  // Auto-generate form installments when installment option or fees change
  useEffect(() => {
    const pending = formState.pending_amount;
    if (pending <= 0) {
      setFormInstallments([]);
      return;
    }

    let count = 0;
    if (formState.installment_option === "2 Installments") count = 2;
    else if (formState.installment_option === "3 Installments") count = 3;
    else if (formState.installment_option === "Monthly EMI Scheme") count = 6;
    
    if (count === 0) {
      setFormInstallments([]);
      return;
    }

    const perInstallment = Math.round(pending / count);
    const admDate = new Date(formState.admission_date || new Date());
    const newInstallments = Array.from({ length: count }, (_, i) => {
      const dueDate = new Date(admDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      return {
        amount: i === count - 1 ? pending - perInstallment * (count - 1) : perInstallment,
        due_date: format(dueDate, "yyyy-MM-dd")
      };
    });
    setFormInstallments(newInstallments);
  }, [formState.installment_option, formState.pending_amount, formState.admission_date]);

  // Handle Form Change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form helper
  const resetAdmissionForm = () => {
    setFormState({
      student_id: "",
      student_name: "",
      phone_number: "",
      email: "",
      gender: "Male",
      date_of_joining: "",
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
    setFormInstallments([]);
    setIsEditMode(false);
    setEditingAdmissionId(null);
  };

  // Open Edit Mode - pre-fills form with selected student data
  const handleOpenEditAdmission = (student: Admission) => {
    setIsEditMode(true);
    setEditingAdmissionId(student.id);
    setFormState({
      student_id: student.student_id || "",
      student_name: student.student_name || "",
      phone_number: student.phone_number || "",
      email: student.email || "",
      gender: "Male",
      date_of_joining: "",
      address: "",
      course: student.course || "Full Stack Development",
      course_duration: "6 Months",
      batch: "Morning (9 AM - 11 AM)",
      trainer: "Amit Sharma",
      course_fees: student.total_fee || 35000,
      discount: 0,
      final_fees: student.total_fee || 35000,
      amount_paid: student.amount_paid || 0,
      pending_amount: student.pending_amount || 0,
      payment_mode: "UPI",
      transaction_id: "",
      installment_option: "3 Installments",
      college_name: "",
      degree: "",
      year_of_study: "4th Year",
      skill_level: "Beginner",
      lead_source: "Instagram",
      counselor_name: student.counselor_name || "Anita",
      admission_date: student.admission_date ? format(new Date(student.admission_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
    // Set custom emis preview if they exist in the state
    setActiveTab("add");
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Delete Admission
  const handleDeleteAdmission = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete the admission record for "${studentName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/admissions/${studentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchAdmissions();
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(null);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete admission.");
      }
    } catch (err) {
      console.error("Failed to delete admission:", err);
      alert("Network error while deleting admission. Please try again.");
    }
  };

  // Submit Admission
  const handleAddAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const url = isEditMode && editingAdmissionId
        ? `${BACKEND_URL}/server-api/admissions/${editingAdmissionId}`
        : `${BACKEND_URL}/server-api/admissions`;
      const method = isEditMode ? "PUT" : "POST";

      const payload = {
        ...formState,
        custom_emis: formInstallments.length > 0 ? formInstallments : undefined
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMessage(isEditMode ? "Admission updated successfully!" : "Admission created successfully! Lead has been marked as Converted.");
        resetAdmissionForm();
        await fetchAdmissions();
        setTimeout(() => {
          setSuccessMessage("");
          setActiveTab("list");
        }, 1500);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || `Failed to ${isEditMode ? 'update' : 'create'} admission record.`);
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

  // Helper: get installment status label based on due date and paid status
  const getInstallmentStatus = (inst: Installment): string => {
    if (inst.paid) return "Paid";
    if (!inst.due_date) return "Upcoming";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inst.due_date);
    due.setHours(0, 0, 0, 0);
    if (due < today) return "Overdue";
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    if (due <= sevenDaysFromNow) return "Pending";
    return "Upcoming";
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

  // Start editing installments
  const startEditingInstallments = () => {
    if (installments.length > 0) {
      setEditInstallments(installments.map(i => ({ ...i })));
    } else if (selectedStudent) {
      // Pre-populate with default schedule based on pending amount
      const pending = selectedStudent.pending_amount;
      const count = 3;
      const perInstallment = Math.round(pending / count);
      const admDate = new Date(selectedStudent.admission_date);
      setEditInstallments(
        Array.from({ length: count }, (_, i) => {
          const dueDate = new Date(admDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          return {
            amount: i === count - 1 ? pending - perInstallment * (count - 1) : perInstallment,
            due_date: format(dueDate, "yyyy-MM-dd"),
            paid: false,
            paid_date: null
          };
        })
      );
    }
    setIsEditingInstallments(true);
  };

  // Render installment rows (real data from DB or fallback prompt)
  const renderInstallmentSection = () => {
    if (!selectedStudent) return null;

    // Editing mode
    if (isEditingInstallments) {
      return (
        <div className="space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edit Installment Schedule</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingInstallments(false)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveInstallments}
                disabled={isSavingInstallments}
                className="text-[10px] font-black text-white bg-[#0f5a3e] hover:bg-[#0a3f2b] px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {isSavingInstallments ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {editInstallments.map((inst, idx) => (
              <div key={idx} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="text-[10px] font-black text-slate-400 w-5 shrink-0">#{idx + 1}</div>
                
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    value={inst.amount}
                    onChange={(e) => {
                      const updated = [...editInstallments];
                      updated[idx].amount = parseFloat(e.target.value || "0");
                      setEditInstallments(updated);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f5a3e]"
                  />
                </div>
                
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={inst.due_date || ""}
                    onChange={(e) => {
                      const updated = [...editInstallments];
                      updated[idx].due_date = e.target.value;
                      setEditInstallments(updated);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f5a3e]"
                  />
                </div>
                
                <div className="flex flex-col items-center gap-1 pt-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Paid</label>
                  <input
                    type="checkbox"
                    checked={inst.paid}
                    onChange={(e) => {
                      const updated = [...editInstallments];
                      updated[idx].paid = e.target.checked;
                      if (e.target.checked) {
                        updated[idx].paid_date = format(new Date(), "yyyy-MM-dd");
                      } else {
                        updated[idx].paid_date = null;
                      }
                      setEditInstallments(updated);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#0f5a3e] focus:ring-[#0f5a3e] cursor-pointer accent-[#0f5a3e]"
                  />
                </div>
                
                <button
                  onClick={() => {
                    setEditInstallments(editInstallments.filter((_, i) => i !== idx));
                  }}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1 mt-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => {
              const lastDate = editInstallments.length > 0 
                ? new Date(editInstallments[editInstallments.length - 1].due_date || new Date())
                : new Date(selectedStudent.admission_date);
              const nextDate = new Date(lastDate);
              nextDate.setMonth(nextDate.getMonth() + 1);
              setEditInstallments([...editInstallments, {
                amount: 0,
                due_date: format(nextDate, "yyyy-MM-dd"),
                paid: false,
                paid_date: null
              }]);
            }}
            className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0f5a3e]/30 text-[10px] font-black text-slate-400 hover:text-[#0f5a3e] transition-colors flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Installment Row
          </button>
        </div>
      );
    }

    // View mode - show real installments from DB
    if (isLoadingInstallments) {
      return (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Installments</h4>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-10 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    if (installments.length === 0) {
      // No installments set — show setup prompt
      return (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Installments</h4>
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center space-y-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold text-amber-700">No installment schedule configured yet.</p>
            <button
              onClick={startEditingInstallments}
              className="text-[10px] font-black text-white bg-[#0f5a3e] hover:bg-[#0a3f2b] px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 mx-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Set Up Due Dates
            </button>
          </div>
        </div>
      );
    }

    // Display real installments from DB
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Installments</h4>
          <button
            onClick={startEditingInstallments}
            className="text-[10px] font-black text-[#0f5a3e] hover:text-[#0a3f2b] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#0f5a3e]/5 transition-colors"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="bg-slate-50/30 rounded-2xl overflow-hidden border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] text-slate-400 uppercase tracking-wider font-black border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Term</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Paid Date</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.map((inst, idx) => {
                const status = getInstallmentStatus(inst);
                return (
                  <tr key={inst.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-800 text-[11px]">Installment {idx + 1}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-bold text-[10px]">
                      {inst.due_date ? format(new Date(inst.due_date), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 font-black text-[10px]">₹{Number(inst.amount).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-bold text-[10px]">
                      {inst.paid_date ? format(new Date(inst.paid_date), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">{getStatusBadge(status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 pb-8 text-[#1c1d21] page-enter">
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
          <div key={idx} className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group animate-slide-up stagger-${idx + 1}`}>
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
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-black transition-all duration-200 ${
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
        <div className="space-y-4 tab-content-enter">
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
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => setSelectedStudent(student)}
                                  className="text-[#0f5a3e] hover:bg-[#0f5a3e]/10 rounded-lg p-1.5 transition-colors" 
                                  title="View Details"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleOpenEditAdmission(student)}
                                  className="text-[#4361ee]/80 hover:text-[#4361ee] hover:bg-[#4361ee]/10 rounded-lg p-1.5 transition-colors" 
                                  title="Edit"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAdmission(student.id, student.student_name)}
                                  className="text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
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

            {/* Right Side Detail Drawer */}
            <div className="xl:col-span-1">
              {selectedStudent ? (
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden animate-slide-in-right">
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
                    <div className="w-11 h-11 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 text-[#0f5a3e] flex items-center justify-center text-[#0f5a3e] text-sm font-black uppercase">
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

                  {/* EMI schedule - REAL DATA */}
                  {renderInstallmentSection()}

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

      {/* TAB 2: ADD/EDIT ADMISSION FORM */}
      {activeTab === "add" && (
        <form onSubmit={handleAddAdmission} className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-sm space-y-8 tab-content-enter">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-1">
                {isEditMode ? "Edit Student Admission" : "Academy Admission Registration"}
              </h3>
              <p className="text-slate-400 text-xs font-semibold">
                {isEditMode ? "Modify enrollment records and student profile settings." : "Fill out all enrollment fields below to register the student and convert the lead record."}
              </p>
            </div>
            {isEditMode && (
              <button 
                type="button" 
                onClick={resetAdmissionForm}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" /> Cancel Edit
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="animate-slide-up bg-rose-50 border border-rose-250/20 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="animate-slide-up bg-emerald-50 border border-emerald-250/20 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
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
                  value={formState.student_id || "Auto-generated"} 
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

            {/* Installment Due Date Preview */}
            {formInstallments.length > 0 && (
              <div className="mt-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/50 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0f5a3e]" />
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Installment Due Date Schedule</h5>
                </div>
                <div className="space-y-2">
                  {formInstallments.map((inst, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                      <div className="text-[10px] font-black text-slate-400 w-20 shrink-0">EMI #{idx + 1}</div>
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Amount (₹)</label>
                        <input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => {
                            const updated = [...formInstallments];
                            updated[idx].amount = parseFloat(e.target.value || "0");
                            setFormInstallments(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f5a3e]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Due Date</label>
                        <input
                          type="date"
                          value={inst.due_date}
                          onChange={(e) => {
                            const updated = [...formInstallments];
                            updated[idx].due_date = e.target.value;
                            setFormInstallments(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f5a3e]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 font-semibold">
                  💡 You can adjust the due dates and amounts above. They will be saved with the admission record.
                </p>
              </div>
            )}
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
              {isSaving ? "Saving Admission..." : (isEditMode ? "Save Changes" : "Save Admission & Convert Lead")}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PENDING PAYMENTS */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 tab-content-enter">
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
                  <th className="px-5 py-4">Counselor</th>
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
                            onClick={() => {
                              setSelectedStudent(student);
                              setActiveTab("list");
                            }}
                            className="bg-[#0f5a3e]/10 hover:bg-[#0f5a3e]/20 text-[#0f5a3e] border border-[#0f5a3e]/20 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors"
                          >
                            Set Due Dates
                          </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tab-content-enter">
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
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-6 tab-content-enter">
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative flex flex-col justify-between max-h-[90vh] animate-scale-in">
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
