"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Users, UserPlus, Edit, Trash2, Search, Mail, Phone, 
  MapPin, Shield, X, RefreshCw, Sparkles, AlertCircle, ChevronRight
} from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { PremiumSelect } from "@/components/ui/PremiumSelect";

interface Counselor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  branch?: string;
  role: string;
  created_at?: string;
}

export default function CounselorsPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);

  // Form Inputs State
  const [formInputs, setFormInputs] = useState({
    name: "",
    email: "",
    phone: "",
    branch: "",
    role: "Counselor"
  });

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const fetchCounselors = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/counselors`);
      if (res.ok) {
        const data = await res.json();
        setCounselors(data);
      }
    } catch (error) {
      console.error("Failed to fetch counselors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselors();

    const counselorsChannel = supabase
      .channel('public:counselors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'counselors' },
        () => {
          fetchCounselors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(counselorsChannel);
    };
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/counselors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInputs)
      });
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }
      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      setIsAddModalOpen(false);
      resetForm();
      fetchCounselors();
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounselor) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/counselors/${selectedCounselor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInputs)
      });
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }
      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      setIsEditModalOpen(false);
      resetForm();
      setSelectedCounselor(null);
      fetchCounselors();
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Archive Team Member",
      message: `Are you sure you want to remove ${name}? They will lose access to the dashboard immediately.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/counselors/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            fetchCounselors();
          }
        } catch (error) {
          console.error("Failed to delete counselor:", error);
        }
      }
    });
  };

  const resetForm = () => {
    setFormInputs({
      name: "",
      email: "",
      phone: "",
      branch: "",
      role: "Counselor"
    });
    setFormError("");
  };

  const openEditModal = (counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setFormInputs({
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone || "",
      branch: counselor.branch || "",
      role: counselor.role
    });
    setIsEditModalOpen(true);
  };

  const filteredCounselors = useMemo(() => {
    return counselors.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.branch && c.branch.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [counselors, searchQuery]);

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* 🌟 Premium Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0f5a3e] via-[#0a3f2a] to-slate-900 p-8 md:p-10 shadow-2xl shadow-[#0f5a3e]/20 border border-white/10"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-[#d3f46f]/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3 h-3 text-[#d3f46f]" /> Access Management
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d3f46f] to-emerald-300">Directory</span>
            </h2>
            <p className="text-emerald-100/80 font-medium max-w-md text-sm leading-relaxed">
              Configure counselor profiles, define routing access control, and manage your academy's personnel efficiently.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#d3f46f] hover:bg-[#bce050] text-[#0f5a3e] px-6 py-3.5 rounded-2xl text-sm font-black shadow-[0_0_20px_rgba(211,244,111,0.3)] hover:shadow-[0_0_25px_rgba(211,244,111,0.5)] transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>
      </motion.div>

      {/* 📊 Premium Cards Grid */}
      <div className="px-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <Users className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="mt-4 font-bold text-sm text-slate-500 dark:text-slate-400 animate-pulse">Syncing directory...</p>
          </div>
        ) : filteredCounselors.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 border-dashed"
          >
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No members found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">We couldn't find any team members matching your current search filters. Try adjusting your keywords.</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-6 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Search
            </button>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {filteredCounselors.map((c) => (
              <motion.div 
                key={c.id} 
                variants={itemVariants}
                className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Decorative background blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-50 to-fuchsia-50 dark:from-indigo-900/10 dark:to-fuchsia-900/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 dark:from-indigo-900/40 dark:to-fuchsia-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg font-black shadow-inner border border-white/50 dark:border-white/5">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {c.name}
                      </h3>
                      <span className={`inline-flex items-center mt-1 gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        c.role === 'Super Admin' || c.role === 'Admin'
                          ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400'
                          : c.role === 'Accounts'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {c.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center transition-colors"
                      title="Edit Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center justify-center transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100/50 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-100/50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {c.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100/50 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-fuchsia-100/50 dark:bg-fuchsia-900/30 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-fuchsia-500" />
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {c.phone || "No phone added"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100/50 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-orange-100/50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {c.branch || "Global Access (All Branches)"}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 🌟 PREMIUM DIALOG MODALS                                           */}
      {/* =================================================================== */}
      
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <motion.div 
            key="add-edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="relative bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-8 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[50px] rounded-full pointer-events-none -mr-20 -mt-20" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">
                      {isAddModalOpen ? "New Team Member" : "Update Profile"}
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1 font-medium">
                      Fill out the information below to {isAddModalOpen ? "grant access" : "update access"}.
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                    className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="p-8 space-y-5">
                
                {formError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm font-semibold"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formInputs.name}
                      onChange={(e) => setFormInputs({ ...formInputs, name: e.target.value })}
                      placeholder="e.g. Priya Nair"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formInputs.email}
                      onChange={(e) => setFormInputs({ ...formInputs, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formInputs.phone}
                      onChange={(e) => setFormInputs({ ...formInputs, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Branch</label>
                    <input
                      type="text"
                      value={formInputs.branch}
                      onChange={(e) => setFormInputs({ ...formInputs, branch: e.target.value })}
                      placeholder="e.g. Mumbai South"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Access Level</label>
                  <PremiumSelect
                    value={formInputs.role}
                    onChange={(val) => setFormInputs({ ...formInputs, role: val })}
                    options={[
                      { label: "Counselor (Standard Access)", value: "Counselor" },
                      { label: "Admin (Full Control)", value: "Admin" },
                      { label: "Accounts (Billing Only)", value: "Accounts" }
                    ]}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                    className="w-full sm:w-1/3 px-6 py-4 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-2/3 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 disabled:opacity-50 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {isAddModalOpen ? "Save Member Profile" : "Update Profile"}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* CUSTOM CONFIRMATION DIALOG */}
        {confirmDialog.isOpen && (
          <motion.div 
            key="confirm-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
                {confirmDialog.message}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/25 transition-all"
                >
                  Yes, Remove Access
                </button>
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
