"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, ArrowRight } from "lucide-react";
import { getCounselorId } from "@/app/login/actions";
import { BACKEND_URL } from "@/lib/config";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  student_name: string;
  counselor_id: string;
}

export function AssignedLeadsPopup() {
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [counselorId, setCounselorId] = useState<string | null>(null);

  const checkAssignedLeads = async (currentCounselorId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/leads`);
      if (res.ok) {
        const allLeads = await res.json();
        
        // Filter leads assigned to this counselor
        const assignedLeads = allLeads.filter((l: Lead) => l.counselor_id === currentCounselorId);
        
        // Check local storage for already acknowledged leads
        const acknowledgedIdsStr = localStorage.getItem(`acknowledged_leads_${currentCounselorId}`);
        const acknowledgedIds = acknowledgedIdsStr ? JSON.parse(acknowledgedIdsStr) : [];
        
        const newlyAssigned = assignedLeads.filter((l: Lead) => !acknowledgedIds.includes(l.id));
        
        if (newlyAssigned.length > 0) {
          setNewLeads(newlyAssigned);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch leads for assignment check", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await getCounselorId();
      setCounselorId(id);
      if (id) {
        checkAssignedLeads(id);
      }
    };
    init();
  }, []);

  // Listen for real-time lead updates (in case admin assigns while they are logged in)
  useEffect(() => {
    if (!counselorId) return;

    const leadsChannel = supabase
      .channel('assigned-leads-check')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          checkAssignedLeads(counselorId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [counselorId]);

  const handleAcknowledge = () => {
    if (!counselorId) return;
    
    const acknowledgedIdsStr = localStorage.getItem(`acknowledged_leads_${counselorId}`);
    const acknowledgedIds = acknowledgedIdsStr ? JSON.parse(acknowledgedIdsStr) : [];
    
    const newIdsToAcknowledge = newLeads.map(l => l.id);
    const updatedAcknowledgedIds = [...new Set([...acknowledgedIds, ...newIdsToAcknowledge])];
    
    localStorage.setItem(`acknowledged_leads_${counselorId}`, JSON.stringify(updatedAcknowledgedIds));
    setIsOpen(false);
  };

  if (!isOpen || newLeads.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-gradient-to-br from-[#0f5a3e] to-[#0a3f2a] rounded-2xl shadow-2xl border border-[#d3f46f]/30 overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d3f46f]/20 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-[#d3f46f]" />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-tight">New Leads Assigned</h3>
                <p className="text-emerald-100/80 text-xs mt-0.5">
                  Admin assigned {newLeads.length} new {newLeads.length === 1 ? 'student' : 'students'} to you.
                </p>
              </div>
            </div>
            <button 
              onClick={handleAcknowledge}
              className="text-emerald-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-emerald-200">
              {newLeads.slice(0, 2).map(l => l.student_name).join(', ')}
              {newLeads.length > 2 && ` and ${newLeads.length - 2} more`}
            </div>
            <Link 
              href="/leads" 
              onClick={handleAcknowledge}
              className="text-[10px] font-bold text-[#1c1d21] bg-[#d3f46f] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white transition-colors"
            >
              View Leads
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
