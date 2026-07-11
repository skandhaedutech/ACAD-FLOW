"use client";

import { useEffect, useState } from "react";
import { KPICards } from "@/components/dashboard/KPICards";
import { LeadPipelineFunnel } from "@/components/dashboard/LeadPipelineFunnel";
import { LeadSourceAnalytics } from "@/components/dashboard/LeadSourceAnalytics";
import { RecentLeadsTable } from "@/components/dashboard/RecentLeadsTable";
import { PendingFollowUps } from "@/components/dashboard/PendingFollowUps";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { RevenueAnalytics } from "@/components/dashboard/RevenueAnalytics";
import { GoogleSheetsSyncStatus } from "@/components/dashboard/GoogleSheetsSyncStatus";
import { supabase } from "@/lib/supabase";
import { RefreshCw } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  interested_course: string;
  lead_source: string;
  counselor_name: string;
  followup_status: string;
  admission_status: string;
  fees: number;
  lead_score: number;
  created_date: string;
}

interface Stats {
  totalLeads: number;
  activeLeads: number;
  admissions: number;
  revenue: number;
  whatsappStats?: {
    totalSent: number;
    followupReminders: number;
    admissionReminders: number;
  };
}

interface Insight {
  type: string;
  icon: string;
  title: string;
  desc: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, activeLeads: 0, admissions: 0, revenue: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [leadsRes, statsRes, insightsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/server-api/leads`),
        fetch(`${BACKEND_URL}/server-api/stats`),
        fetch(`${BACKEND_URL}/server-api/insights`)
      ]);

      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        // Handle both array format and full AI object format from backend
        if (Array.isArray(insightsData)) {
          setInsights(insightsData);
        } else if (insightsData && insightsData.widgets) {
          // Convert full AI insights object into dashboard-friendly array
          const w = insightsData.widgets;
          const converted: Insight[] = [];
          if (w.admissionIntelligence) {
            converted.push({ type: 'positive', icon: 'TrendingUp', title: 'Admission Intelligence', desc: `${w.admissionIntelligence.growth}. ${w.admissionIntelligence.probabilityDesc}` });
          }
          if (w.revenueForecasting) {
            converted.push({ type: 'positive', icon: 'DollarSign', title: 'Revenue Forecasting', desc: `${w.revenueForecasting.expectedRevenue}. ${w.revenueForecasting.expectedEmiThisWeek}` });
          }
          if (w.riskDetection) {
            converted.push({ type: 'warning', icon: 'AlertCircle', title: 'Risk Detection', desc: `${w.riskDetection.dropRiskCount} students at drop risk. ${w.riskDetection.overloadAlert}` });
          }
          setInsights(converted.length > 0 ? converted : []);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadUpdate = async (phoneNumber: string, type: 'followup' | 'admission', value: string) => {
    // 1. Find the target lead
    const leadIndex = leads.findIndex(l => l.phone_number === phoneNumber);
    if (leadIndex === -1) return;
    
    const lead = leads[leadIndex];
    const oldFollowupStatus = lead.followup_status;
    const oldAdmissionStatus = lead.admission_status;

    // 2. Optimistic Update for Leads Array
    const updatedLeads = [...leads];
    updatedLeads[leadIndex] = {
      ...lead,
      followup_status: type === 'followup' ? value : oldFollowupStatus,
      admission_status: type === 'admission' ? value : oldAdmissionStatus,
    };
    setLeads(updatedLeads);

    // 3. Optimistic Update for KPI Stats
    setStats((prev) => {
      let newAdmissions = prev.admissions;
      let newActiveLeads = prev.activeLeads;

      if (type === 'admission') {
        if (value === 'Admitted' && oldAdmissionStatus !== 'Admitted') {
          newAdmissions += 1;
        } else if (value !== 'Admitted' && oldAdmissionStatus === 'Admitted') {
          newAdmissions -= 1;
        }
      }

      if (type === 'followup') {
        const wasActive = !['Not Interested', 'Converted'].includes(oldFollowupStatus);
        const isActive = !['Not Interested', 'Converted'].includes(value);
        if (isActive && !wasActive) {
          newActiveLeads += 1;
        } else if (!isActive && wasActive) {
          newActiveLeads -= 1;
        }
      }

      return {
        ...prev,
        admissions: newAdmissions,
        activeLeads: newActiveLeads,
      };
    });

    // 4. API PUT Call
    const payload = {
      phone_number: phoneNumber,
      followup_status: type === 'followup' ? value : oldFollowupStatus,
      admission_status: type === 'admission' ? value : oldAdmissionStatus,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/server-api/update-lead`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch (error) {
      console.error("Failed to update status on API:", error);
      fetchData(); // Rollback on error
    }
  };

  useEffect(() => {
    fetchData();

    // 🔗 Supabase Realtime synchronization channels
    const leadsChannel = supabase
      .channel('dashboard-leads-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          console.log('[Realtime] Leads updated, reloading dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admissions' },
        () => {
          console.log('[Realtime] Admissions updated, reloading dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          console.log('[Realtime] Notifications updated, reloading dashboard...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-[#8a8c96]">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-[#d3f46f]" />
        <p className="text-sm font-bold">Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-8">
      {/* 1. Google Sheets Sync Status */}
      <GoogleSheetsSyncStatus />

      {/* 2. Top KPI Cards */}
      <KPICards stats={stats} />

      {/* 3. Middle Row: Pipeline, Insights, Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <LeadPipelineFunnel leads={leads} />
        </div>
        <div className="lg:col-span-1">
          <RevenueAnalytics stats={stats} leads={leads} />
        </div>
        <div className="lg:col-span-1">
          <AIInsightsPanel insights={insights} />
        </div>
      </div>

      {/* 4. Bottom Row: Sources, Leads Table, Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <LeadSourceAnalytics leads={leads} />
        </div>
        <div className="lg:col-span-2">
          <RecentLeadsTable leads={leads} onStatusChange={handleLeadUpdate} />
        </div>
        <div className="lg:col-span-1">
          <PendingFollowUps leads={leads} />
        </div>
      </div>
    </div>
  );
}
