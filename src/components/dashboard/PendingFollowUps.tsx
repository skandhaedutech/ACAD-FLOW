import { PhoneCall } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

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

export function PendingFollowUps({ leads = [] }: { leads: Lead[] }) {
  const pendingLeads = leads.filter(l => l.followup_status === 'Pending');
  const visibleFollowups = pendingLeads.slice(0, 3);

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Follow-ups</h3>
          <span className="bg-[#e2f9d5] text-[#0f5a3e] text-[9px] font-black px-2.5 py-0.5 rounded-full border border-[#0f5a3e]/10">
            {pendingLeads.length} Pending
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {visibleFollowups.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              🎉 All caught up! No pending follow-ups.
            </div>
          ) : (
            visibleFollowups.map((item) => (
              <div key={item.id} className="bg-slate-50/50 rounded-2xl p-3 flex justify-between items-center group hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 text-[#0f5a3e] font-black flex items-center justify-center text-xs">
                    {item.student_name ? item.student_name.charAt(0) : "?"}
                  </div>
                  <div>
                    <p className="text-slate-850 font-extrabold text-xs">{item.student_name}</p>
                    <p className="text-slate-400 text-[10px] font-bold">
                      {item.created_date ? formatDistanceToNow(new Date(item.created_date), { addSuffix: true }) : 'Recently'} • {item.counselor_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={`tel:${item.phone_number}`}
                    className="w-6 h-6 rounded-full bg-[#0f5a3e] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-sm shadow-[#0f5a3e]/20"
                  >
                    <PhoneCall className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <Link href="/leads" className="mt-4 block w-full text-center py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#0f5a3e] hover:bg-slate-50 text-[11px] font-black transition-all">
        View Schedule
      </Link>
    </div>
  );
}
