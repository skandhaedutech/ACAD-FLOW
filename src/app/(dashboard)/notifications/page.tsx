"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Bell, BellOff, Check, CheckCircle2, ChevronRight, RefreshCw, 
  Trash2, Phone, MessageSquare, Eye, Play, Sparkles, ShieldAlert,
  ArrowUpRight, Clock, AlertTriangle, Info, ShieldCheck, HeartPulse
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string; // 'LEAD_ALERT' | 'FOLLOWUP_ALERT' | 'PAYMENT_ALERT' | 'ADMISSION_ALERT' | 'AI_INSIGHT' | 'SYSTEM_ALERT' | 'COUNSELOR_ALERT'
  priority: string; // 'High' | 'Medium' | 'Low'
  is_read: boolean;
  is_resolved: boolean;
  action_url: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'LEAD_ALERT' | 'ADMISSION_ALERT' | 'PAYMENT_ALERT' | 'AI_INSIGHT' | 'SYSTEM_ALERT' | 'unread' | 'important'

  // Fetch notifications list
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Supabase Realtime synchronization channel
    const notifsChannel = supabase
      .channel('notifications-sync-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('[Realtime] Notifications updated:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, []);

  // Action methods
  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/${id}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/${id}/resolve`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_resolved: true, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error("Failed to resolve:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.is_read && !n.is_resolved);
      if (unreadNotifs.length === 0) return;

      // Optimistic update
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Try bulk endpoint first
      let bulkSuccess = false;
      try {
        const res = await fetch(`${BACKEND_URL}/api/notifications/mark-all-read`, {
          method: "POST" // or PUT depending on backend
        });
        if (res.ok) bulkSuccess = true;
      } catch (err) {
        console.warn("Bulk endpoint failed, falling back to sequential update.");
      }

      // Fallback to sequential updates if bulk failed (prevents overloading backend)
      if (!bulkSuccess) {
        for (const n of unreadNotifs) {
          try {
            await fetch(`${BACKEND_URL}/api/notifications/${n.id}/read`, {
              method: "PUT"
            });
          } catch (e) {
            console.error(`Failed to mark ${n.id} read:`, e);
          }
        }
      }

      // Re-fetch to ensure sync with backend
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  // Get Notification Icon based on alert type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAD_ALERT":
        return <span className="text-sm">🔥</span>;
      case "FOLLOWUP_ALERT":
        return <span className="text-sm">📞</span>;
      case "ADMISSION_ALERT":
        return <span className="text-sm">🎓</span>;
      case "PAYMENT_ALERT":
        return <span className="text-sm">💰</span>;
      case "AI_INSIGHT":
        return <span className="text-sm">🧠</span>;
      case "COUNSELOR_ALERT":
        return <span className="text-sm">👤</span>;
      case "SYSTEM_ALERT":
      default:
        return <span className="text-sm">🔄</span>;
    }
  };

  // Time elapsed helper
  const getTimeAgo = (dateStr: string) => {
    try {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.max(Math.floor(diffMs / 60000), 0);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return "Recent";
    }
  };

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const total = notifications.filter(n => !n.is_resolved).length;
    const unread = notifications.filter(n => !n.is_read && !n.is_resolved).length;
    const followups = notifications.filter(n => n.type === "FOLLOWUP_ALERT" && !n.is_resolved).length;
    const payments = notifications.filter(n => n.type === "PAYMENT_ALERT" && !n.is_resolved).length;
    const ai = notifications.filter(n => n.type === "AI_INSIGHT" && !n.is_resolved).length;

    return { total, unread, followups, payments, ai };
  }, [notifications]);

  // Filter list mapping
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (n.is_resolved) return false; // resolved alerts are hidden in inbox
      
      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return !n.is_read;
      if (activeFilter === "important") return n.priority === "High";
      return n.type === activeFilter;
    });
  }, [notifications, activeFilter]);

  return (
    <div className="w-full space-y-6 pb-8 text-[#1c1d21]">
      {/* 1. Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f5a3e] text-white p-2.5 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0f5a3e]/10">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Daily Action Center</h2>
            <p className="text-slate-400 text-xs font-semibold">Monitor academy triggers, AI follow-up suggestions, and collection reminders</p>
          </div>
        </div>

        <button 
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm self-start md:self-auto"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Mark all as read
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Total Inbox", value: metrics.total, icon: <Bell className="text-slate-500" />, desc: "Active alerts" },
          { title: "Unread Alerts", value: metrics.unread, icon: <Clock className="text-amber-500" />, desc: "Require opening" },
          { title: "Pending Follow-ups", value: metrics.followups, icon: <Phone className="text-[#4361ee]" />, desc: "Missed schedules" },
          { title: "Payment Alerts", value: metrics.payments, icon: <AlertTriangle className="text-rose-500 animate-bounce" />, desc: "Overdue fee EMIs" },
          { title: "AI Recommendations", value: metrics.ai, icon: <Sparkles className="text-purple-500" />, desc: "Smart recommendations" }
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

      {/* 3. Action Center Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side Category Filters */}
        <div className="lg:col-span-1 bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm space-y-1">
          <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Categories</p>
          {[
            { id: "all", label: "All Notifications" },
            { id: "LEAD_ALERT", label: "Lead Alerts" },
            { id: "ADMISSION_ALERT", label: "Enrollments" },
            { id: "PAYMENT_ALERT", label: "Overdue Payments" },
            { id: "AI_INSIGHT", label: "AI Recommendations" },
            { id: "SYSTEM_ALERT", label: "System Syncs" },
            { id: "unread", label: "Unread Dues" },
            { id: "important", label: "High Priority" }
          ].map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  isActive 
                    ? "bg-[#0f5a3e] text-white font-black shadow-md shadow-[#0f5a3e]/10" 
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            );
          })}
        </div>

        {/* Main Feed Column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-3">
              Action Feed ({filteredNotifications.length} active)
            </h3>

            <div className="space-y-4">
              {isLoading ? (
                <div className="py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[#0f5a3e]" />
                  Loading Action Center...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center space-y-3">
                  <span className="text-3xl">🎉</span>
                  <p className="text-slate-850">You're all caught up!</p>
                  <p className="text-slate-400 font-medium text-[11px]">No active notifications pending your attention in this filter.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  // Determine priority styling
                  let priorityStyles = "bg-slate-100 text-slate-600 border-slate-200";
                  let borderHighlight = "border-slate-100";
                  if (notif.priority === "High") {
                    priorityStyles = "bg-rose-50 text-rose-600 border-rose-100";
                    borderHighlight = "border-l-4 border-l-rose-500 border-slate-150/80";
                  } else if (notif.priority === "Medium") {
                    priorityStyles = "bg-amber-50 text-amber-600 border-amber-100";
                    borderHighlight = "border-l-4 border-l-amber-400 border-slate-150/80";
                  } else if (notif.priority === "Low") {
                    priorityStyles = "bg-blue-50 text-blue-600 border-blue-100";
                    borderHighlight = "border-l-4 border-l-blue-400 border-slate-150/80";
                  }

                  const isRead = notif.is_read;

                  return (
                    <div 
                      key={notif.id}
                      className={`bg-slate-50/40 rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all hover:bg-slate-50 hover:shadow-sm ${borderHighlight} ${
                        !isRead ? "bg-emerald-50/10 font-bold" : ""
                      }`}
                    >
                      {/* Left: Icon and details */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-150/80 flex items-center justify-center shrink-0 shadow-sm">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-slate-800 font-black text-xs leading-none">{notif.title}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityStyles}`}>
                              {notif.priority}
                            </span>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] font-medium leading-relaxed">{notif.message}</p>
                          <span className="text-slate-400 text-[9px] font-extrabold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {getTimeAgo(notif.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto whitespace-nowrap">
                        {/* Quick action triggers */}
                        {notif.type === "FOLLOWUP_ALERT" && (
                          <button className="bg-blue-50 hover:bg-blue-100 text-[#4361ee] p-1.5 rounded-lg border border-blue-200/40 transition-colors flex items-center justify-center" title="Call student">
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {notif.type === "PAYMENT_ALERT" && (
                          <button className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border border-rose-200/40 transition-colors flex items-center justify-center" title="Payment reminder">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {notif.action_url && (
                          <a 
                            href={notif.action_url}
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-200 flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3 h-3" />
                            Action
                          </a>
                        )}
                        {!isRead && (
                          <button 
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-1.5 rounded-xl border border-slate-200 transition-all"
                            title="Mark as Read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleResolve(notif.id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-[#0f5a3e] px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-250/20 flex items-center gap-1 transition-all"
                          title="Mark Resolved"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#0f5a3e]" />
                          Resolve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
