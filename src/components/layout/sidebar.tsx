"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  Lightbulb,
  PieChart,
  Bell,
  DatabaseZap,
  Settings,
  CircleDot,
  Sparkles,
  ArrowRight
} from "lucide-react";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Admissions", icon: UserPlus, href: "/admissions" },
  { label: "Courses", icon: BookOpen, href: "/courses" },
  { label: "Counselors", icon: GraduationCap, href: "/counselors" },
  { label: "AI Insights", icon: Lightbulb, href: "/ai-insights" },
  { label: "Reports", icon: PieChart, href: "/reports" },
  { label: "Notifications", icon: Bell, href: "/notifications", badge: 3 },
  { label: "Integrations", icon: DatabaseZap, href: "/integrations" },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/server-api/notifications`);
        if (res.ok) {
          const data = await res.json();
          const unread = data.filter((n: any) => !n.is_read && !n.is_resolved).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.warn("Failed to fetch notifications for sidebar:", err);
      }
    };

    fetchUnreadCount();

    const notifsChannel = supabase
      .channel('sidebar-notifications-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-[260px] py-8 border-r border-slate-100 dark:border-slate-800 relative z-10 shrink-0 print:hidden">
      {/* Logo */}
      <div className="px-8 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#0f5a3e]/10 rounded-xl">
           <CircleDot className="w-5 h-5 text-[#0f5a3e] dark:text-[#d3f46f]" strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-850 dark:text-slate-50">AcadFlow</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-hide pb-4">
        <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Menu</p>
        
        {routes.map((route) => {
          const isActive = pathname === route.href || (pathname === '/' && route.label === 'Dashboard');
          const finalBadge = route.label === "Notifications" ? unreadCount : route.badge;
          
          return (
            <Link
              href={route.href}
              key={route.href}
              prefetch={false}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all group cursor-pointer",
                isActive 
                  ? "bg-[#0f5a3e] text-white shadow-sm shadow-[#0f5a3e]/10" 
                  : "text-slate-500 dark:text-slate-400 hover:text-[#0f5a3e] dark:hover:text-[#d3f46f] hover:bg-slate-50 dark:hover:bg-slate-800/40"
              )}
            >
              <div className="flex items-center gap-3.5">
                <route.icon 
                  className={cn(
                    "h-4 w-4", 
                    isActive ? "text-white" : "text-slate-400 group-hover:text-[#0f5a3e] dark:group-hover:text-[#d3f46f]"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {route.label}
              </div>
              {(finalBadge || 0) > 0 && (
                <span className={cn(
                  "text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-[#0f5a3e]/10 dark:bg-[#0f5a3e]/20 text-[#0f5a3e] dark:text-[#d3f46f]"
                )}>
                  {finalBadge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      

      {/* Settings at the bottom */}
      <div className="px-4">
        <Link
          href="/settings"
          prefetch={false}
          className="flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0f5a3e] dark:hover:text-[#d3f46f] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <Settings className="h-4 w-4 text-slate-400 group-hover:text-[#0f5a3e] dark:group-hover:text-[#d3f46f]" strokeWidth={2} />
            Settings
          </div>
        </Link>
      </div>
    </div>
  );
};
