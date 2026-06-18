import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, UploadCloud, RefreshCw } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { PremiumSelect } from "@/components/ui/PremiumSelect";

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseToEdit?: any | null;
}

export function AddCourseModal({ isOpen, onClose, onSuccess, courseToEdit }: AddCourseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "AI & Data",
    duration: "4 to 6 month",
    fee: "",
    max_price: "",
    discount: "",
    mode: "Online / Offline",
    trainer_name: "",
    admission_status: "Open",
  });

  React.useEffect(() => {
    if (courseToEdit && isOpen) {
      setFormData({
        title: courseToEdit.title || "",
        category: courseToEdit.category || "AI & Data",
        duration: courseToEdit.duration || "4 to 6 month",
        fee: courseToEdit.fee?.toString() || "",
        max_price: courseToEdit.max_price?.toString() || "",
        discount: courseToEdit.discount?.toString() || "",
        mode: courseToEdit.mode || "Online / Offline",
        trainer_name: courseToEdit.trainerName || courseToEdit.trainer_name || "",
        admission_status: courseToEdit.admissionStatus || courseToEdit.admission_status || "Open",
      });
    } else if (isOpen) {
      setFormData({
        title: "",
        category: "AI & Data",
        duration: "4 to 6 month",
        fee: "",
        max_price: "",
        discount: "",
        mode: "Online / Offline",
        trainer_name: "",
        admission_status: "Open",
      });
    }
  }, [courseToEdit, isOpen]);

  const categories = ["AI & Data", "Web Development", "Digital Marketing", "Finance & Accounting", "Cyber Security", "Enterprise Software", "Design"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isEdit = !!courseToEdit;
    
    try {
      const payload = {
        ...formData,
        fee: parseFloat(formData.fee) || 0,
        max_price: parseFloat(formData.max_price) || 0,
        discount: parseFloat(formData.discount) || 0,
      };

      const url = isEdit ? `${BACKEND_URL}/api/courses/${courseToEdit.id}` : `${BACKEND_URL}/api/courses`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(isEdit ? "Failed to update course" : "Failed to add course");

      onSuccess();
      setFormData({
        title: "",
        category: "AI & Data",
        duration: "4 to 6 month",
        fee: "",
        max_price: "",
        discount: "",
        mode: "Online / Offline",
        trainer_name: "",
        admission_status: "Open",
      });
      onClose();
    } catch (error) {
      console.error(isEdit ? "Error updating course:" : "Error adding course:", error);
      alert(isEdit ? "Failed to update course. Please try again." : "Failed to add course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[28px] border border-slate-200 w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#0f5a3e] p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-white fill-white/20" />
                <h3 className="text-base font-black uppercase tracking-wider">{courseToEdit ? "Edit Course" : "Add New Course"}</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Course Title *</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Advanced Data Science"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category *</label>
                  <PremiumSelect
                    value={formData.category}
                    onChange={(val) => setFormData({...formData, category: val})}
                    options={categories.map(c => ({ label: c, value: c }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Max Price (₹)</label>
                  <input
                    type="number"
                    value={formData.max_price}
                    onChange={(e) => setFormData({...formData, max_price: e.target.value})}
                    placeholder="e.g. 25000"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    placeholder="e.g. 3000"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Final Price (₹) *</label>
                  <input
                    required
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({...formData, fee: e.target.value})}
                    placeholder="e.g. 22000"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5 relative z-40">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mode</label>
                  <PremiumSelect
                    value={formData.mode}
                    onChange={(val) => setFormData({...formData, mode: val})}
                    options={[
                      { label: "Online / Offline", value: "Online / Offline" },
                      { label: "Online Only", value: "Online Only" },
                      { label: "Offline Only", value: "Offline Only" }
                    ]}
                  />
                </div>

                <div className="space-y-1.5 z-30">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    placeholder="e.g. 4 to 6 month"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5 z-20">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Trainer</label>
                  <input
                    type="text"
                    value={formData.trainer_name}
                    onChange={(e) => setFormData({...formData, trainer_name: e.target.value})}
                    placeholder="e.g. Dr. Sneha Nair"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] text-slate-800 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white rounded-xl text-xs font-black shadow-md shadow-[#0f5a3e]/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  {courseToEdit ? "Update Course" : "Save Course"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
