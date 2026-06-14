import { Search, MoreVertical, Send, Phone, Video } from "lucide-react";

export default function MessagesPage() {
  const contacts = [
    { name: "Rahul Kumar", role: "Lead - Hot", msg: "When does the next batch start?", time: "10:30 AM", unread: 2, active: true },
    { name: "Priya Mehta", role: "Counselor", msg: "I've sent the curriculum to Sneha.", time: "09:15 AM", unread: 0, active: false },
    { name: "Neha Verma", role: "Student", msg: "Thank you for the update!", time: "Yesterday", unread: 0, active: false },
    { name: "Aman Singh", role: "Instructor", msg: "Can we reschedule tomorrow's class?", time: "Yesterday", unread: 1, active: false },
    { name: "Vikram Singh", role: "Admitted", msg: "Payment completed.", time: "Monday", unread: 0, active: false },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      
      {/* Left Sidebar - Contact List */}
      <div className="w-[320px] bg-white rounded-[2rem] p-5 flex flex-col shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
        <h2 className="text-xl font-bold text-[#1c1d21] mb-5 px-2">Messages</h2>
        
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a8c96]" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            className="w-full h-11 pl-11 pr-4 text-sm bg-[#f4f6f8] rounded-full focus:outline-none focus:ring-2 focus:ring-[#d3f46f] text-[#1c1d21] placeholder:text-[#8a8c96] font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide -mx-2 px-2">
          {contacts.map((contact, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-[1.5rem] cursor-pointer transition-colors ${contact.active ? 'bg-[#1c1d21]' : 'hover:bg-[#f4f6f8]'}`}>
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${contact.active ? 'bg-[#33353b] text-white' : 'bg-[#e0e8ff] text-[#4361ee]'}`}>
                  {contact.name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#38b000] border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold text-sm truncate ${contact.active ? 'text-white' : 'text-[#1c1d21]'}`}>{contact.name}</h4>
                  <span className={`text-[10px] font-semibold ${contact.active ? 'text-[#8a8c96]' : 'text-[#8a8c96]'}`}>{contact.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate font-medium ${contact.active ? 'text-slate-400' : 'text-slate-500'}`}>{contact.msg}</p>
                  {contact.unread > 0 && (
                    <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${contact.active ? 'bg-[#d3f46f] text-[#1c1d21]' : 'bg-[#ff6b6b] text-white'}`}>
                      {contact.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content - Chat Window */}
      <div className="flex-1 bg-white rounded-[2rem] flex flex-col shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Chat Header */}
        <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#33353b] text-white flex items-center justify-center font-bold text-lg relative">
              R
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#38b000] border-2 border-white rounded-full" />
            </div>
            <div>
              <h3 className="font-bold text-[#1c1d21] text-lg">Rahul Kumar</h3>
              <p className="text-[#8a8c96] text-[11px] font-semibold">Online • Lead Score: 85</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center hover:bg-slate-200 text-[#1c1d21]">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center hover:bg-slate-200 text-[#1c1d21]">
              <Video className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center hover:bg-slate-200 text-[#1c1d21]">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#f4f6f8]/50 space-y-6">
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-[#8a8c96] bg-white px-3 py-1 rounded-full shadow-sm">Today, 10:00 AM</span>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#33353b] text-white flex items-center justify-center font-bold text-xs shrink-0">R</div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%]">
              <p className="text-[#1c1d21] text-sm font-medium leading-relaxed">Hi, I saw your ad on Instagram for the Full Stack Web Development course. Could you send me the detailed syllabus?</p>
            </div>
          </div>
          
          <div className="flex gap-4 flex-row-reverse">
             <div className="w-8 h-8 rounded-full bg-[#d3f46f] text-[#1c1d21] flex items-center justify-center font-bold text-xs shrink-0">A</div>
            <div className="bg-[#1c1d21] text-white p-4 rounded-2xl rounded-tr-sm shadow-sm max-w-[70%]">
              <p className="text-sm font-medium leading-relaxed">Hello Rahul! Thanks for reaching out. I'd be happy to share that with you.</p>
              <div className="mt-3 bg-white/10 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-colors">
                 <div className="w-10 h-10 rounded-lg bg-[#d3f46f] flex items-center justify-center text-[#1c1d21]">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-white">FullStack_Syllabus.pdf</p>
                   <p className="text-[10px] text-slate-400">2.4 MB</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#33353b] text-white flex items-center justify-center font-bold text-xs shrink-0">R</div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%]">
              <p className="text-[#1c1d21] text-sm font-medium leading-relaxed">Awesome, thanks! When does the next batch start?</p>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="h-24 border-t border-slate-100 px-8 py-4 bg-white flex items-center gap-4">
          <button className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center hover:bg-slate-200 text-[#1c1d21] shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input 
            type="text" 
            placeholder="Type your message..." 
            className="flex-1 h-12 bg-[#f4f6f8] rounded-full px-6 focus:outline-none text-[#1c1d21] font-medium"
          />
          <button className="w-12 h-12 rounded-full bg-[#d3f46f] flex items-center justify-center hover:bg-[#c4e656] text-[#1c1d21] shrink-0 transition-transform hover:scale-105 shadow-sm">
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
