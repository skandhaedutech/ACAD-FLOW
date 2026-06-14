import { Trophy, MessageCircle, Heart, Search } from "lucide-react";

export default function CommunityPage() {
  const posts = [
    { name: "Rahul Kumar", role: "Student", avatar: "R", avatarBg: "bg-[#e0e8ff] text-[#4361ee]", time: "2h ago", content: "Just completed the first module of the Full Stack course! The React concepts are finally making sense.", likes: 24, comments: 5 },
    { name: "Taylor Swift", role: "Instructor", avatar: "T", avatarBg: "bg-[#1c1d21] text-[#d3f46f]", time: "5h ago", content: "Reminder: Tomorrow's live session will cover Advanced State Management. Please review the pre-reading materials.", likes: 156, comments: 32 },
    { name: "Sneha Iyer", role: "Student", avatar: "S", avatarBg: "bg-[#ffe8d6] text-[#ff8e3c]", time: "Yesterday", content: "Can someone help me debug this Python loop? I'm getting an indentation error.", likes: 8, comments: 14 },
  ];

  return (
    <div className="flex gap-6 pb-8">
      
      {/* Main Feed */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-[2rem] p-6 flex gap-4 items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
           <div className="w-12 h-12 rounded-full bg-[#ffc8c8] flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
             <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" className="w-full h-full object-cover" />
           </div>
           <input 
             type="text" 
             placeholder="Share an update or ask a question..." 
             className="flex-1 bg-[#f4f6f8] rounded-full h-12 px-6 text-sm font-medium focus:outline-none text-[#1c1d21]"
           />
           <button className="bg-[#1c1d21] text-[#d3f46f] px-6 py-3 rounded-full text-xs font-bold hover:bg-black transition-colors shrink-0">
             Post
           </button>
        </div>

        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center font-bold ${post.avatarBg}`}>
                    {post.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1c1d21] text-sm leading-tight">{post.name}</h4>
                    <p className="text-[10px] font-semibold text-[#8a8c96] mt-0.5">{post.role} • {post.time}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-[#1c1d21] text-sm font-medium leading-relaxed mb-6">
                {post.content}
              </p>
              
              <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                <button className="flex items-center gap-2 text-xs font-bold text-[#8a8c96] hover:text-[#ff6b6b] transition-colors group">
                  <div className="p-2 rounded-full group-hover:bg-[#ffc8c8] transition-colors">
                    <Heart className="w-4 h-4" />
                  </div>
                  {post.likes}
                </button>
                <button className="flex items-center gap-2 text-xs font-bold text-[#8a8c96] hover:text-[#4361ee] transition-colors group">
                   <div className="p-2 rounded-full group-hover:bg-[#e0e8ff] transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  {post.comments}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar - Leaderboard */}
      <div className="w-[320px] shrink-0 space-y-6">
        <div className="bg-[#1c1d21] rounded-[2rem] p-6 relative overflow-hidden">
           <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#d3f46f]/10 rounded-full blur-2xl" />
           <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-[#d3f46f] flex items-center justify-center text-[#1c1d21]">
               <Trophy className="w-5 h-5" />
             </div>
             <h3 className="font-bold text-white text-lg">Top Learners</h3>
           </div>
           
           <div className="space-y-4 relative z-10">
             {[
               { name: "Rahul Kumar", pts: "1,240", bg: "bg-[#e0e8ff] text-[#4361ee]" },
               { name: "Neha Verma", pts: "980", bg: "bg-[#ffe8d6] text-[#ff8e3c]" },
               { name: "Vikram Singh", pts: "850", bg: "bg-[#e9f5e1] text-[#38b000]" },
             ].map((student, i) => (
               <div key={i} className="flex items-center justify-between p-3 bg-[#27292d] rounded-[1.25rem]">
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${student.bg}`}>
                     {i+1}
                   </div>
                   <span className="text-white text-xs font-bold">{student.name}</span>
                 </div>
                 <span className="text-[#d3f46f] text-[10px] font-bold">{student.pts} pts</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
