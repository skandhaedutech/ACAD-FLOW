export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col max-w-3xl">
      <h2 className="text-2xl font-black text-[#1c1d21] tracking-tight mb-6">Settings</h2>
      
      <div className="bg-[#1c1d21] rounded-[24px] p-2 shadow-xl border border-white/5">
         <div className="bg-[#222327] rounded-[20px] divide-y divide-white/5">
            <div className="p-6 flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-colors rounded-t-[20px]">
               <div>
                  <h3 className="text-white font-bold">Profile Details</h3>
                  <p className="text-[#8a8c96] text-xs">Update your academy profile and admin details.</p>
               </div>
               <span className="text-[#8a8c96] group-hover:text-white transition-colors">→</span>
            </div>
            <div className="p-6 flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-colors">
               <div>
                  <h3 className="text-white font-bold">Team Management</h3>
                  <p className="text-[#8a8c96] text-xs">Add or remove counselors and set permissions.</p>
               </div>
               <span className="text-[#8a8c96] group-hover:text-white transition-colors">→</span>
            </div>
            <div className="p-6 flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-colors rounded-b-[20px]">
               <div>
                  <h3 className="text-[#e63946] font-bold">Danger Zone</h3>
                  <p className="text-[#8a8c96] text-xs">Disconnect Google Sheets or reset workspace.</p>
               </div>
               <span className="text-[#e63946]">→</span>
            </div>
         </div>
      </div>
    </div>
  );
}
