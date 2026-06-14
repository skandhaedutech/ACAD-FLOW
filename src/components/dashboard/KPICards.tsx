import { Users, UserCheck, CheckCircle, Clock, DollarSign, Activity, ArrowUpRight, Ban, CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";

export function KPICards({ stats }: { stats: any }) {
  const conversionRate = stats.totalLeads > 0 ? Math.round((stats.admissions / stats.totalLeads) * 100) : 0;

  const kpis = [
    { 
      title: "Total Leads", 
      value: stats.totalLeads || 0, 
      icon: <Users className="w-4.5 h-4.5 text-white" />,
      trend: "Total registered enquiries",
      isPrimary: true,
      link: "/leads?filter=all"
    },
    { 
      title: "Active Leads", 
      value: stats.activeLeads || 0, 
      icon: <Activity className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "In progress follow-ups",
      isPrimary: false,
      link: "/leads?filter=active"
    },
    { 
      title: "Follow-ups Due", 
      value: stats.followupsDue || 0, 
      icon: <CalendarDays className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Action items due today",
      isPrimary: false,
      link: "/leads?filter=pending"
    },
    { 
      title: "Admissions", 
      value: stats.admissions || 0, 
      icon: <CheckCircle className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Enrolled academy students",
      isPrimary: false,
      link: "/leads?filter=converted"
    },
    { 
      title: "Pending Reviews", 
      value: (stats.totalLeads - stats.admissions - (stats.lostLeads || 0)) || 0, 
      icon: <Clock className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Pipeline remaining",
      isPrimary: false,
      link: "/leads?filter=pending"
    },
    { 
      title: "Lost Leads", 
      value: stats.lostLeads || 0, 
      icon: <Ban className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Marked as not interested",
      isPrimary: false,
      link: "/leads?filter=lost"
    },
    { 
      title: "Revenue", 
      value: `₹${(stats.revenue || 0).toLocaleString()}`, 
      icon: <DollarSign className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Collected contract payments",
      isPrimary: false,
      link: "/leads?filter=converted"
    },
    { 
      title: "Conversion Rate", 
      value: `${conversionRate}%`, 
      icon: <UserCheck className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: "Leads to admissions ratio",
      isPrimary: false,
      link: "/leads?filter=converted"
    },
    { 
      title: "WhatsApp Actions", 
      value: stats.whatsappStats?.totalSent || 0, 
      icon: <MessageCircle className="w-4.5 h-4.5 text-[#0f5a3e]" />,
      trend: `${stats.whatsappStats?.followupReminders || 0} follow-ups sent`,
      isPrimary: false,
      link: "/leads"
    },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {kpis.map((kpi, idx) => (
        <div 
          key={idx} 
          className={`flex-1 min-w-[140px] xl:min-w-[150px] rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all group ${
            kpi.isPrimary 
              ? "bg-gradient-to-br from-[#0f5a3e] to-[#0a3f2b] border-[#0f5a3e] text-white shadow-sm shadow-[#0f5a3e]/10" 
              : "bg-white border-slate-100/80 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[9px] font-black uppercase tracking-wider ${
              kpi.isPrimary ? "text-[#d3f46f]/90" : "text-slate-400"
            }`}>
              {kpi.title}
            </span>
            <Link 
              href={kpi.link}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                kpi.isPrimary 
                  ? "bg-white/10 border-white/15 hover:bg-white/20" 
                  : "bg-slate-50 border-slate-100 group-hover:bg-[#0f5a3e]/10 group-hover:border-[#0f5a3e]/10 hover:bg-[#0f5a3e]/20"
              }`}
            >
              {kpi.isPrimary ? <ArrowUpRight className="w-3.5 h-3.5 text-white" /> : <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0f5a3e]" />}
            </Link>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-black tracking-tight leading-none mb-1.5 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${kpi.isPrimary ? "bg-[#d3f46f]" : "bg-[#0f5a3e]"}`} />
              {kpi.value}
            </h3>
            <p className={`text-[8px] font-semibold tracking-wide ${
              kpi.isPrimary ? "text-slate-300" : "text-slate-400"
            }`}>
              {kpi.trend}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
