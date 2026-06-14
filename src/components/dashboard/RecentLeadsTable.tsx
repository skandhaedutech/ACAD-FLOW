import { MoreHorizontal, GraduationCap } from "lucide-react";
import Link from "next/link";
import { StatusDropdown } from "../ui/status-dropdown";

interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  email?: string;
  interested_course: string;
  lead_source: string;
  counselor_name: string;
  followup_status: string;
  admission_status: string;
  fees: number;
  lead_score: number;
  created_date: string;
}

export function RecentLeadsTable({ 
  leads = [], 
  onStatusChange 
}: { 
  leads: Lead[];
  onStatusChange?: (phoneNumber: string, type: 'followup' | 'admission', value: string) => void;
}) {
  const recentLeads = leads
    .filter(lead => lead.phone_number && !lead.phone_number.includes('/') && lead.student_name !== 'March' && lead.student_name !== 'April' && lead.student_name !== 'Apr')
    .slice(0, 4);

  return (
    <div className="bg-white rounded-[28px] shadow-sm border border-slate-100/80 p-5 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Leads</h3>
          <Link href="/leads" className="text-xs font-semibold text-[#0f5a3e] hover:underline flex items-center gap-0.5">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto rounded-2xl bg-slate-50/50 border border-slate-100">
          <table className="w-full min-w-[700px] text-sm text-left">
            <thead className="text-[9px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-200 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Course</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Score</th>
                <th className="px-4 py-3.5">Follow-up</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs font-semibold">
                    No leads found. Sync Google Sheets first.
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead, idx) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800 font-extrabold text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                        {lead.student_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#4361ee] text-[11px] font-bold truncate max-w-[110px]">
                      {lead.interested_course || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] font-medium lowercase">
                      {lead.lead_source || 'direct'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center bg-[#e2f9d5] text-[#0f5a3e] px-2 py-0.5 rounded font-bold text-[9px] border border-[#0f5a3e]/10">
                        {lead.lead_score || 50}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown 
                        value={lead.followup_status}
                        onChange={(value) => onStatusChange && onStatusChange(lead.phone_number, 'followup', value)}
                        options={[
                          { label: "Pending", value: "Pending", badgeColor: "text-amber-500" },
                          { label: "Done", value: "Done", badgeColor: "text-emerald-500" },
                          { label: "Lost", value: "Not Interested", badgeColor: "text-rose-500" }
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {lead.followup_status !== "Converted" && lead.admission_status !== "Admitted" ? (
                        <Link 
                          href={`/admissions?convert=true&name=${encodeURIComponent(lead.student_name)}&phone=${encodeURIComponent(lead.phone_number)}&email=${encodeURIComponent(lead.email || '')}&course=${encodeURIComponent(lead.interested_course || '')}&counselor=${encodeURIComponent(lead.counselor_name || '')}`}
                          className="inline-flex items-center gap-1 bg-[#0f5a3e]/10 hover:bg-[#0f5a3e] text-[#0f5a3e] hover:text-white px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:scale-105 shadow-sm whitespace-nowrap"
                        >
                          <GraduationCap className="w-3 h-3" />
                          <span>Convert</span>
                        </Link>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200/50 cursor-default select-none whitespace-nowrap">
                          Converted
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
