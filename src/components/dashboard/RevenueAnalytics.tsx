import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ArrowUpRight } from "lucide-react";

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

export function RevenueAnalytics({ stats, leads = [] }: { stats: any, leads: Lead[] }) {
  // Calculate dynamic financial values from leads database
  const collectedRevenue = stats.revenue || 0;
  
  // Potential revenue = Hot leads (score >= 75) not yet admitted * average fee (75k)
  const potentialRevenue = leads.filter(l => l.lead_score >= 75 && l.admission_status !== 'Admitted').length * 75000;
  
  // Pending billing = Admitted students with 0 or unrecorded fee entries
  const pendingRevenue = leads.filter(l => l.admission_status === 'Admitted' && l.fees === 0).length * 75000;

  // Render responsive mock growth trend ending at the actual collected revenue
  const monthlyData = [
    { month: "Jan", revenue: collectedRevenue * 0.2 },
    { month: "Feb", revenue: collectedRevenue * 0.4 },
    { month: "Mar", revenue: collectedRevenue * 0.5 },
    { month: "Apr", revenue: collectedRevenue * 0.7 },
    { month: "May", revenue: collectedRevenue },
  ];

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Revenue</h3>
            <p className="text-slate-400 text-[10px] font-semibold">Total collected</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-800">₹{collectedRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-black text-[#0f5a3e] flex items-center gap-1 justify-end">
              <ArrowUpRight className="w-3.5 h-3.5" /> Growth trend
            </p>
          </div>
        </div>

        {/* Dynamic metrics breakdown grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest mb-0.5">Expected Pipeline</p>
            <p className="text-slate-800 font-black text-xs">₹{potentialRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50/30 p-3 rounded-2xl border border-rose-100/50">
            <p className="text-rose-600 text-[9px] font-extrabold uppercase tracking-widest mb-0.5">Pending Fees</p>
            <p className="text-rose-600 font-black text-xs">₹{pendingRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Collection Target Achievement Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-550">
            <span>COLLECTION TARGET ACHIEVEMENT</span>
            <span className="text-[#0f5a3e]">{Math.round((collectedRevenue / Math.max(collectedRevenue + pendingRevenue, 1)) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
            <div 
              className="h-full bg-gradient-to-r from-[#0f5a3e] to-[#25a87b] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.round((collectedRevenue / Math.max(collectedRevenue + pendingRevenue, 1)) * 100), 100)}%` }}
            />
          </div>
          <p className="text-[9.5px] font-semibold text-slate-400 leading-normal">
            ₹{collectedRevenue.toLocaleString()} collected of ₹{(collectedRevenue + pendingRevenue).toLocaleString()} total billed enrollments.
          </p>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-[140px] w-full mt-4">
        {collectedRevenue === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-slate-100">
            No admissions revenue collected yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f5a3e" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0f5a3e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1c1d21', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '11px' }}
                labelStyle={{ color: '#8492a6', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0f5a3e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
