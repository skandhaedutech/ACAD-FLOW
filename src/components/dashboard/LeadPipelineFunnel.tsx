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

export function LeadPipelineFunnel({ leads = [] }: { leads: Lead[] }) {
  const totalLeads = leads.length;
  
  // Calculate dynamic counts based on logical mappings of lead statuses
  const interested = leads.filter(l => l.lead_score >= 60 || ['Done', 'Admitted'].includes(l.followup_status)).length;
  const followUp = leads.filter(l => l.followup_status === 'Pending').length;
  const demoAttended = leads.filter(l => l.lead_score >= 75 || l.admission_status === 'Admitted').length;
  const admissions = leads.filter(l => l.admission_status === 'Admitted').length;

  const steps = [
    { name: "New Lead", count: totalLeads, bg: "from-[#0f5a3e] to-[#0a3f2b]", text: "text-white" },
    { name: "Interested", count: interested, bg: "from-[#15704f] to-[#0f5a3e]", text: "text-white" },
    { name: "Follow-up", count: followUp, bg: "from-[#1d8a64] to-[#15704f]", text: "text-white" },
    { name: "Demo Attended", count: demoAttended, bg: "from-[#25a87b] to-[#1d8a64]", text: "text-white" },
    { name: "Admission", count: admissions, bg: "from-[#4ad3a1] to-[#25a87b]", text: "text-slate-900" },
  ];

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Pipeline Funnel</h3>
        </div>
        
        <div className="flex flex-col gap-3">
          {steps.map((step, idx) => {
            // Compute percentage width dynamically with a minimum width
            const rawWidthPercent = totalLeads > 0 ? (step.count / totalLeads) * 100 : 100;
            const displayWidth = Math.max(rawWidthPercent - (idx * 5), 40); // ensure nesting visually looks like a funnel
            
            return (
              <div key={idx} className="flex flex-col w-full">
                <div 
                  className={`bg-gradient-to-r ${step.bg} rounded-xl py-2 px-4.5 flex justify-between items-center transition-all hover:scale-[1.01] cursor-pointer shadow-sm`} 
                  style={{ width: `${displayWidth}%` }}
                >
                  <span className="font-bold text-[9px] uppercase tracking-widest opacity-85 text-white">
                    {step.name}
                  </span>
                  <span className={`font-black text-xs ${step.text}`}>
                    {step.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
