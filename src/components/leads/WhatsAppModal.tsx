import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Send, RefreshCw } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  interested_course?: string;
  counselor_name?: string;
  fees_discussed?: number;
}

interface Template {
  id: string;
  template_name: string;
  message_content: string;
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function WhatsAppModal({ isOpen, onClose, lead }: WhatsAppModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplateId && lead) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        generatePreview(template.message_content, lead);
      }
    } else {
      setPreviewContent("");
    }
  }, [selectedTemplateId, lead, templates]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/whatsapp/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = (content: string, currentLead: Lead) => {
    let processed = content;
    processed = processed.replace(/\{\{student_name\}\}/g, currentLead.student_name || "Student");
    processed = processed.replace(/\{\{course_name\}\}/g, currentLead.interested_course || "Course");
    processed = processed.replace(/\{\{academy_name\}\}/g, "AcadFlow Academy");
    processed = processed.replace(/\{\{counselor_name\}\}/g, currentLead.counselor_name || "Counselor");
    processed = processed.replace(/\{\{fees\}\}/g, currentLead.fees_discussed ? currentLead.fees_discussed.toString() : "the discussed amount");
    processed = processed.replace(/\{\{admission_date\}\}/g, new Date().toLocaleDateString());
    processed = processed.replace(/\{\{brochure_link\}\}/g, "https://acadflow.com/brochures/course.pdf");
    
    setPreviewContent(processed);
  };

  const handleOpenWhatsApp = async () => {
    if (!lead || !selectedTemplateId) return;
    
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setIsSending(true);
    try {
      // 1. Log activity to backend
      await fetch(`${BACKEND_URL}/server-api/whatsapp/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          activity_type: "WhatsApp Follow-up Sent",
          description: `Sent ${template.template_name} to ${lead.phone_number}`
        })
      });
      
      // 2. Open WhatsApp URL in a new tab
      // Clean phone number (remove spaces, plus, hyphens)
      const cleanPhone = lead.phone_number.replace(/\D/g, "");
      // Add country code if it doesn't exist (assuming +91 for India as default if exactly 10 digits)
      const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      
      const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(previewContent)}`;
      window.open(whatsappUrl, '_blank');
      
      // 3. Close modal
      onClose();
    } catch (error) {
      console.error("Failed to log activity", error);
    } finally {
      setIsSending(false);
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
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#25D366] p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-white fill-white/20" />
                <h3 className="text-base font-black uppercase tracking-wider">WhatsApp Follow-up</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-slate-50/50">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[#25D366]" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  No templates available. Please ask your administrator to run the migration script.
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Select Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#25D366] text-slate-800 shadow-sm"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.template_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>Message Preview</span>
                      <span className="text-[#25D366]">To: {lead?.student_name}</span>
                    </label>
                    <div className="relative">
                      {/* Chat bubble tail */}
                      <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-slate-200 transform -rotate-45 rounded-tl"></div>
                      <div className="relative bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700 whitespace-pre-wrap font-medium shadow-sm leading-relaxed">
                        {previewContent}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white p-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400">
                Variables are auto-filled using {lead?.student_name}'s data
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenWhatsApp}
                  disabled={isSending || templates.length === 0}
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black shadow-md shadow-[#25D366]/20 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Open WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
