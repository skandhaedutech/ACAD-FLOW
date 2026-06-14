import { Video, Calendar, Clock, MoreVertical, Users } from "lucide-react";

export default function ClassesPage() {
  const schedule = [
    { time: "09:00 AM", title: "React Native Basics", batch: "Batch A - Morning", instructor: "Taylor Swift", duration: "1h 30m", attendees: 45, status: "Live Now", statusBg: "bg-[#ffe8d6]", statusText: "text-[#ff8e3c]" },
    { time: "11:30 AM", title: "Python Data Structures", batch: "Batch B - Noon", instructor: "Ed Sheeran", duration: "2h 00m", attendees: 32, status: "Upcoming", statusBg: "bg-[#e0e8ff]", statusText: "text-[#4361ee]" },
    { time: "02:00 PM", title: "UI/UX Prototyping", batch: "Design Cohort", instructor: "Dua Lipa", duration: "1h 00m", attendees: 28, status: "Upcoming", statusBg: "bg-[#e0e8ff]", statusText: "text-[#4361ee]" },
    { time: "04:30 PM", title: "Node.js Backend", batch: "Batch C - Evening", instructor: "Bruno Mars", duration: "2h 30m", attendees: 50, status: "Upcoming", statusBg: "bg-[#e0e8ff]", statusText: "text-[#4361ee]" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1c1d21]">My Classes</h2>
          <p className="text-[#8a8c96] text-sm mt-1">Today's live schedule and upcoming batches.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border-2 border-[#f4f6f8] text-[#1c1d21] font-bold px-6 py-2.5 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
            View Calendar
          </button>
          <button className="bg-[#1c1d21] text-[#d3f46f] font-bold px-6 py-2.5 rounded-full hover:bg-black transition-colors shadow-sm">
            Schedule Class
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <h3 className="font-bold text-[#1c1d21] mb-8 text-lg">Today's Schedule</h3>
        
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[5.5rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {schedule.map((item, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              {/* Timeline dot */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${item.status === 'Live Now' ? 'bg-[#d3f46f]' : 'bg-slate-200'} absolute left-[5.5rem] -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 shadow-sm z-10`}>
                <Video className={`w-4 h-4 ${item.status === 'Live Now' ? 'text-[#1c1d21]' : 'text-slate-500'}`} />
              </div>
              
              {/* Content Card */}
              <div className="w-[calc(100%-8rem)] md:w-[calc(50%-3rem)] ml-auto md:ml-0 p-5 bg-[#f4f6f8] rounded-[1.5rem] group-hover:bg-[#e0e8ff] transition-colors border border-transparent group-hover:border-[#4361ee]/20 cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-[10px] font-bold px-3 py-1 rounded-full ${item.statusBg} ${item.statusText}`}>
                    {item.status}
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </div>
                
                <h4 className="font-bold text-[#1c1d21] text-lg mb-1">{item.title}</h4>
                <p className="text-[#8a8c96] text-xs font-semibold mb-4">{item.batch}</p>
                
                <div className="flex items-center gap-4 text-xs font-semibold text-[#1c1d21]">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#4361ee]" /> {item.time} ({item.duration})
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm">
                    <Users className="w-3.5 h-3.5 text-[#ff8e3c]" /> {item.attendees} Joining
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
