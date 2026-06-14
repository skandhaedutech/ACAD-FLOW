import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

export function LeadSourceAnalytics({ leads = [] }: { leads: Lead[] }) {
  // Group and compute lead source metrics dynamically
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.lead_source || 'Unknown';
    const formattedSrc = src.charAt(0).toUpperCase() + src.slice(1).toLowerCase();
    sourceCounts[formattedSrc] = (sourceCounts[formattedSrc] || 0) + 1;
  });

  const total = leads.length;
  const colors = ["#0f5a3e", "#25a87b", "#ff8e3c", "#3ca2ff", "#10b981"];
  
  const chartData = Object.keys(sourceCounts).map((name, index) => {
    const count = sourceCounts[name];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      name,
      value: pct,
      count,
      color: colors[index % colors.length]
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Lead Acquisition Channels</h3>
        </div>
        
        <div className="flex items-center justify-center relative min-h-[160px]">
          {total === 0 ? (
            <div className="text-center text-slate-400 text-xs font-semibold">
              No source metrics available
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1c1d21', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '11px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 leading-none">{total}</span>
                <span className="text-[9px] text-slate-400 font-extrabold tracking-widest mt-1">Leads</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/20">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">{item.name}</span>
            <span className="text-[10px] text-slate-800 ml-auto font-black">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
