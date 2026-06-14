import { ChevronLeft, ChevronRight, Plus, MoreHorizontal } from "lucide-react";

export default function CalendarsPage() {
  const events = [
    { day: 12, title: "Data Collection", time: "11:00 AM", type: "event", bg: "bg-[#ffe8d6]", text: "text-[#ff8e3c]" },
    { day: 14, title: "Market Research", time: "12:45 PM", type: "event", bg: "bg-[#e9f5e1]", text: "text-[#38b000]" },
    { day: 25, title: "Methods of Data", time: "10:30 AM", type: "event", bg: "bg-[#e0e8ff]", text: "text-[#4361ee]" },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1c1d21]">Calendars</h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <button className="px-6 py-2 rounded-full bg-[#1c1d21] text-[#d3f46f] text-xs font-bold">Month</button>
            <button className="px-6 py-2 rounded-full text-[#8a8c96] hover:bg-[#f4f6f8] text-xs font-bold transition-colors">Week</button>
            <button className="px-6 py-2 rounded-full text-[#8a8c96] hover:bg-[#f4f6f8] text-xs font-bold transition-colors">Day</button>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#d3f46f] flex items-center justify-center text-[#1c1d21] shadow-sm hover:bg-[#c4e656] transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2rem] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-6">
            <h3 className="text-xl font-bold text-[#1c1d21]">August 2024</h3>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f4f6f8] text-[#1c1d21] border border-slate-200">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f4f6f8] text-[#1c1d21] border border-slate-200">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f4f6f8] text-slate-400">
             <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {/* Days of week */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-4 text-center text-xs font-bold text-[#8a8c96] border-b border-r border-slate-100 last:border-r-0 h-12">
              {d}
            </div>
          ))}
          
          {/* Calendar Cells */}
          {[...Array(35)].map((_, i) => {
             const day = i - 3; // Shift to start month
             const isCurrentMonth = day > 0 && day <= 31;
             const isToday = day === 25;
             const event = events.find(e => e.day === day);

             return (
               <div key={i} className={`p-2 border-r border-b border-slate-100 last:border-r-0 ${!isCurrentMonth ? 'bg-[#f8fafc]/50' : 'bg-white'} hover:bg-slate-50 transition-colors cursor-pointer relative`}>
                 {isCurrentMonth && (
                   <>
                     <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs mb-1 ${isToday ? 'bg-[#d3f46f] text-[#1c1d21] shadow-sm' : 'text-[#1c1d21]'}`}>
                       {day}
                     </div>
                     {event && (
                       <div className={`${event.bg} ${event.text} p-1.5 rounded-lg mb-1 mx-1`}>
                         <div className="text-[9px] font-bold truncate leading-tight">{event.title}</div>
                         <div className="text-[8px] font-medium opacity-80 mt-0.5">{event.time}</div>
                       </div>
                     )}
                   </>
                 )}
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}
